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
      // 从 data 字段提取消息内容
      const msgData = m.data as any;
      let content = "";
      
      if (msgData) {
        // 尝试从 data 中提取文本内容
        if (typeof msgData.content === "string") {
          content = msgData.content.slice(0, 500); // 限制长度
        } else if (Array.isArray(msgData)) {
          // 如果是数组，尝试提取文本部分
          const textParts = msgData
            .filter((item: any) => item.type === "text")
            .map((item: any) => item.text || "")
            .join("");
          content = textParts.slice(0, 500);
        }
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
    const partList = parts.slice(-maxItems).map((p) => {
      const state = p.state as any;
      return {
        id: p.id,
        messageID: p.messageID,
        sessionID: p.sessionID,
        type: p.type,
        tool: p.tool,
        action: formatCurrentAction(p), // 格式化后的可读描述
        status: state?.status,
        input: state?.input ? (typeof state.input === "string" ? state.input.slice(0, 500) : JSON.stringify(state.input).slice(0, 500)) : undefined,
        output: state?.output ? (typeof state.output === "string" ? state.output.slice(0, 500) : JSON.stringify(state.output).slice(0, 500)) : undefined,
        createdAt: p.createdAt.toISOString(),
      };
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
      children: children.map((child) => ({
        id: child.id,
        title: child.title,
        projectID: child.projectID,
        parentID: child.parentID,
      })),
    };

    return c.json(tree);
  });
}