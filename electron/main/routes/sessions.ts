import type { Hono } from "hono";
import {
  getRootSessions,
  getSession,
  getMessagesForSession,
  getPartsForSession,
  getSessionTree,
  checkStorageExists,
  getChildSessions,
  getStorageInfo,
  type SessionMeta,
} from "../services/storage/parser";
import { formatCurrentAction } from "../logic/activityLogic";
import log from "electron-log";

const MAX_SESSIONS_LIMIT = 20;
const MAX_MESSAGES_LIMIT = 100;

export function registerSessionRoutes(app: Hono) {
  // Get storage info (for debugging)
  app.get("/api/storage-info", (c) => {
    const info = getStorageInfo();
    return c.json(info);
  });

  // Get all recent sessions
  app.get("/api/sessions", async (c) => {
    if (!checkStorageExists()) {
      return c.json({
        error: "STORAGE_NOT_FOUND",
        message: "OpenCode storage directory does not exist. Please ensure OpenCode is installed.",
        sessions: [],
      });
    }

    const sessions = await getRootSessions(MAX_SESSIONS_LIMIT);
    const sessionList = sessions.map((s) => ({
      id: s.id,
      projectID: s.projectID,
      title: s.title,
      parentID: s.parentID,
      updatedAt: s.updatedAt.toISOString(),
      createdAt: s.createdAt.toISOString(),
    }));

    return c.json(sessionList);
  });

  // Get single session by ID
  app.get("/api/sessions/:id", async (c) => {
    const sessionID = c.req.param("id");

    if (!checkStorageExists()) {
      return c.json(
        {
          error: "SESSION_NOT_FOUND",
          message: `Session '${sessionID}' not found`,
        },
        404
      );
    }

    const session = await getSession(sessionID);
    if (!session) {
      return c.json(
        {
          error: "SESSION_NOT_FOUND",
          message: `Session '${sessionID}' not found`,
        },
        404
      );
    }

    return c.json({
      id: session.id,
      projectID: session.projectID,
      title: session.title,
      parentID: session.parentID,
      directory: session.directory,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    });
  });

  // Get session activity (messages + parts for a session)
  app.get("/api/sessions/:id/activity", async (c) => {
    const sessionID = c.req.param("id");
    const limit = c.req.query("limit");
    const maxItems = limit ? parseInt(limit, 10) : MAX_MESSAGES_LIMIT;

    if (!checkStorageExists()) {
      return c.json(
        {
          error: "SESSION_NOT_FOUND",
          message: `Session '${sessionID}' not found`,
        },
        404
      );
    }

    const session = await getSession(sessionID);
    if (!session) {
      return c.json(
        {
          error: "SESSION_NOT_FOUND",
          message: `Session '${sessionID}' not found`,
        },
        404
      );
    }

    const messages = await getMessagesForSession(sessionID);
    const parts = await getPartsForSession(sessionID);

    const messageList = messages.slice(-maxItems).map((m) => {
      // 尝试从多个位置提取消息内容
      const msgData = m.data as any;
      let content = "";
      
      // 1. 尝试从 data.data 中提取（如果 data 是一个对象）
      if (msgData?.content && typeof msgData.content === "string") {
        content = msgData.content.slice(0, 500);
      } 
      // 2. 尝试从 data.data 中提取（如果 data 是一个数组）
      else if (Array.isArray(msgData)) {
        const textParts = msgData
          .filter((item: any) => item.type === "text")
          .map((item: any) => item.text || "")
          .join("");
        content = textParts.slice(0, 500);
      }
      // 3. 尝试从消息文件的根级别提取 content 字段
      else if (typeof (m as any).content === "string") {
        content = ((m as any).content || "").slice(0, 500);
      }
      
      return {
        id: m.id,
        sessionID: m.sessionID,
        role: m.role,
        agent: m.agent,
        content,
        createdAt: m.createdAt.toISOString(),
      };
    });

    // 转换 parts 为活动流格式
    // 先收集 text 类型的内容，用于补充消息
    const textContents = new Map<string, string>();
    parts.forEach(p => {
      if (p.type === 'text' && p.data) {
        const textData = p.data as any;
        if (textData?.text) {
          textContents.set(p.messageID, textData.text.slice(0, 500));
        }
      }
    });

    const partList = parts.slice(-maxItems).map((p) => {
      const state = p.state as any;
      // 如果是 text 类型，尝试从 data 中提取内容
      let action = p.type === 'text' ? null : formatCurrentAction(p);
      
      // 对于 text 类型，尝试从 data 提取文本内容作为 action
      if (p.type === 'text' && p.data) {
        const textData = p.data as any;
        if (textData?.text) {
          action = textData.text.slice(0, 100);
        }
      }
      
      return {
        id: p.id,
        messageID: p.messageID,
        sessionID: p.sessionID,
        type: p.type,
        tool: p.tool,
        action,
        status: state?.status,
        input: state?.input ? (typeof state.input === "string" ? state.input.slice(0, 500) : JSON.stringify(state.input).slice(0, 500)) : undefined,
        output: state?.output ? (typeof state.output === "string" ? state.output.slice(0, 500) : JSON.stringify(state.output).slice(0, 500)) : undefined,
        createdAt: p.createdAt.toISOString(),
      };
    });
    
    // 用 text 内容补充消息
    messageList.forEach(m => {
      const textContent = textContents.get(m.id);
      if (textContent && !m.content) {
        m.content = textContent;
      }
    });

    // 按时间合并消息和工具调用
    const allActivities = [
      ...messageList.map(m => ({ ...m, activityType: "message" })),
      ...partList.map(p => ({ ...p, activityType: "part" })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return c.json({
      session: {
        id: session.id,
        title: session.title,
        directory: session.directory,
        updatedAt: session.updatedAt.toISOString(),
      },
      messages: messageList,
      parts: partList,
      all: allActivities.slice(-maxItems),
      stats: {
        totalMessages: messages.length,
        totalParts: parts.length,
        toolCount: parts.filter(p => p.type === "tool").length,
        reasoningCount: parts.filter(p => p.type === "reasoning").length,
      },
    });
  });

  // Get messages for a session
  app.get("/api/sessions/:id/messages", async (c) => {
    const sessionID = c.req.param("id");

    if (!checkStorageExists()) {
      return c.json(
        {
          error: "SESSION_NOT_FOUND",
          message: `Session '${sessionID}' not found`,
        },
        404
      );
    }

    const session = await getSession(sessionID);
    if (!session) {
      return c.json(
        {
          error: "SESSION_NOT_FOUND",
          message: `Session '${sessionID}' not found`,
        },
        404
      );
    }

    const messages = await getMessagesForSession(sessionID);
    const messageList = messages.slice(-MAX_MESSAGES_LIMIT).map((m) => ({
      id: m.id,
      sessionID: m.sessionID,
      role: m.role,
      agent: m.agent,
      createdAt: m.createdAt.toISOString(),
    }));

    return c.json(messageList);
  });

  // Get parts (tool calls) for a session
  app.get("/api/sessions/:id/parts", async (c) => {
    const sessionID = c.req.param("id");
    const limit = c.req.query("limit");
    const typeFilter = c.req.query("type");
    const maxItems = limit ? parseInt(limit, 10) : MAX_MESSAGES_LIMIT;

    if (!checkStorageExists()) {
      return c.json(
        {
          error: "SESSION_NOT_FOUND",
          message: `Session '${sessionID}' not found`,
        },
        404
      );
    }

    const session = await getSession(sessionID);
    if (!session) {
      return c.json(
        {
          error: "SESSION_NOT_FOUND",
          message: `Session '${sessionID}' not found`,
        },
        404
      );
    }

    const parts = await getPartsForSession(sessionID);
    
    let filteredParts = parts;
    if (typeFilter) {
      filteredParts = parts.filter(p => p.type === typeFilter);
    }

    const partList = filteredParts.slice(-maxItems).map((p) => {
      const state = p.state as any;
      return {
        id: p.id,
        messageID: p.messageID,
        sessionID: p.sessionID,
        type: p.type,
        tool: p.tool,
        action: formatCurrentAction(p),
        status: state?.status,
        input: state?.input ? (typeof state.input === "string" ? state.input.slice(0, 500) : JSON.stringify(state.input).slice(0, 500)) : undefined,
        output: state?.output ? (typeof state.output === "string" ? state.output.slice(0, 500) : JSON.stringify(state.output).slice(0, 500)) : undefined,
        createdAt: p.createdAt.toISOString(),
      };
    });

    return c.json({
      session: {
        id: session.id,
        title: session.title,
      },
      parts: partList,
      stats: {
        total: parts.length,
        toolCount: parts.filter(p => p.type === "tool").length,
        reasoningCount: parts.filter(p => p.type === "reasoning").length,
      },
    });
  });

  // Get session tree
  app.get("/api/sessions/:id/tree", async (c) => {
    const sessionID = c.req.param("id");

    if (!checkStorageExists()) {
      return c.json(
        {
          error: "SESSION_NOT_FOUND",
          message: `Session '${sessionID}' not found`,
        },
        404
      );
    }

    const session = await getSession(sessionID);
    if (!session) {
      return c.json(
        {
          error: "SESSION_NOT_FOUND",
          message: `Session '${sessionID}' not found`,
        },
        404
      );
    }

    const children = await getChildSessions(sessionID);
    const tree = {
      id: session.id,
      title: session.title,
      projectID: session.projectID,
      parentID: session.parentID,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      children: children.map((child) => ({
        id: child.id,
        title: child.title,
        projectID: child.projectID,
        parentID: child.parentID,
        createdAt: child.createdAt.toISOString(),
        updatedAt: child.updatedAt.toISOString(),
      })),
    };

    return c.json(tree);
  });
}