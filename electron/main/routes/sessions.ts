import type { Hono } from "hono";
import {
  getRootSessions,
  getAllSessions,
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
import { config } from "../config";

const MAX_SESSIONS_LIMIT = 20;
const MAX_MESSAGES_LIMIT = 100;

export function registerSessionRoutes(app: Hono) {
  // Get storage info (for debugging)
  app.get("/api/storage-info", (c) => {
    const info = getStorageInfo();
    return c.json(info);
  });

  // Get all recent sessions (with pagination support)
  app.get("/api/sessions", async (c) => {
    if (!checkStorageExists()) {
      return c.json({
        error: "STORAGE_NOT_FOUND",
        message: "OpenCode storage directory does not exist. Please ensure OpenCode is installed.",
        sessions: [],
        total: 0,
        running: 0,
      });
    }

    const limit = c.req.query("limit");
    const maxSessions = limit ? parseInt(limit, 10) : MAX_SESSIONS_LIMIT;

    // 获取所有根会话用于统计
    const allRootSessions = await getRootSessions(1000); // 获取足够多的数据用于统计
    
    // 计算运行中的会话数
    const runningCount = allRootSessions.filter(s => s.status === 'running').length;
    
    // 限制返回数量
    const sessions = allRootSessions.slice(0, maxSessions);
    const sessionList = sessions.map((s) => ({
      id: s.id,
      projectID: s.projectID,
      title: s.title,
      parentID: s.parentID,
      status: s.status,
      updatedAt: s.updatedAt.toISOString(),
      createdAt: s.createdAt.toISOString(),
    }));

    return c.json({
      sessions: sessionList,
      total: allRootSessions.length,
      running: runningCount,
    });
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
      status: session.status,
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
        content = msgData.content;
      } 
      // 2. 尝试从 data.data 中提取（如果 data 是一个数组）
      else if (Array.isArray(msgData)) {
        content = msgData
          .filter((item: any) => item.type === "text")
          .map((item: any) => item.text || "")
          .join("");
      }
      // 3. 尝试从消息文件的根级别提取 content 字段
      else if (typeof (m as any).content === "string") {
        content = (m as any).content || "";
      }
      
      return {
        id: m.id,
        sessionID: m.sessionID,
        role: m.role,
        agent: m.agent,
        content,
        // 增强字段：Token和费用信息
        tokens: msgData?.tokens,
        cost: msgData?.cost,
        modelID: msgData?.modelID,
        providerID: msgData?.providerID,
        finish: msgData?.finish,
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
          textContents.set(p.messageID, textData.text);
        }
      }
    });

    // 构建 messageID -> agent 的映射（用于关联 parts 到其 agent）
    const messageAgentMap = new Map<string, string>();
    messages.forEach(m => {
      if (m.agent) {
        messageAgentMap.set(m.id, m.agent);
      }
    });

    const partList = parts.slice(-maxItems).map((p) => {
      const state = p.state as any;
      const data = p.data as any;
      // 如果是 text 类型，尝试从 data 中提取内容
      let action = p.type === 'text' ? null : formatCurrentAction(p);
      
      // 对于 text 类型，尝试从 data 提取文本内容作为 action
      if (p.type === 'text' && p.data) {
        const textData = p.data as any;
        if (textData?.text) {
          action = textData.text;
        }
      }
      
      // 关联该 part 对应的 agent（通过 messageID 查找）
      const agent = messageAgentMap.get(p.messageID);
      
      // 提取 subagent_type（用于 task/delegate_task/agent/subtask 工具调用）
      let subagentType: string | undefined;
      if (p.type === 'tool' && state?.input) {
        const input = state.input;
        if (typeof input === 'string') {
          try {
            const parsed = JSON.parse(input);
            subagentType = parsed?.subagent_type;
          } catch (e) {
            // 解析失败，忽略
          }
        } else if (typeof input === 'object' && input !== null) {
          subagentType = (input as any)?.subagent_type;
        }
      }
      
      return {
        id: p.id,
        messageID: p.messageID,
        sessionID: p.sessionID,
        type: p.type,
        tool: p.tool,
        agent,  // 关联的 agent（来自父 message）
        subagentType,  // 子 agent 类型（task/agent/subtask 调用时）
        action,
        status: state?.status,
        // 增强字段：时间信息
        timeStart: state?.time?.start,
        timeEnd: state?.time?.end,
        // 增强字段：错误信息
        error: state?.error,
        // 增强字段：完整data对象（包含tokens等）
        data: data,
        input: state?.input ? (typeof state.input === "string" ? state.input : JSON.stringify(state.input)) : undefined,
        output: state?.output ? (typeof state.output === "string" ? state.output : JSON.stringify(state.output)) : undefined,
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

  // Get session stats for StatsPanel (full data without limit)
  app.get("/api/sessions/:id/stats", async (c) => {
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

    // 获取完整的 messages 和 parts 数据（不使用 limit 限制）
    const messages = await getMessagesForSession(sessionID);
    const parts = await getPartsForSession(sessionID);

    // 统计数据
    const toolParts = parts.filter(p => p.type === "tool");
    const reasoningParts = parts.filter(p => p.type === "reasoning");

    // 计算 token 总数：直接使用 API 返回的 total
    // 注意：根据数据分析，total = input + output + cache，不包含 reasoning
    let totalTokens = 0;
    let tokenCount = 0;
    for (const m of messages) {
      const msgData = m.data as any;
      const tokens = msgData?.tokens;
      if (tokens && tokens.total) {
        const t = Number(tokens.total) || 0;
        totalTokens += t;
        tokenCount++;
      }
    }
    console.log(`[Token Summary] tokenCount=${tokenCount}, totalTokens=${totalTokens}`);

    // 计算错误数量：type === "tool" 且 (state.status === "error" 或 state.error 存在)
    const errorCount = toolParts.filter(p => {
      const state = p.state as any;
      return state?.status === "error" || state?.error;
    }).length;

    // 计算 MCP 工具数量：type === "tool" 且 tool 以前缀匹配 config.mcp.toolPrefixes
    const mcpPrefixes = config.mcp?.toolPrefixes || ["context7_", "websearch_"];
    const mcpCount = toolParts.filter(p => {
      const tool = p.tool || "";
      return mcpPrefixes.some(prefix => tool.startsWith(prefix));
    }).length;

    // 计算 skill 工具数量：type === "tool" 且 tool === "skill"
    const skillCount = toolParts.filter(p => p.tool === "skill").length;

    // 计算错误率
    const errorRate = toolParts.length > 0 ? (errorCount / toolParts.length) * 100 : 0;

    // 提取 topSkills：从 skill 工具调用中提取 skill 名称（从 state.input.name）
    const skillMap = new Map<string, number>();
    for (const p of toolParts) {
      if (p.tool === "skill") {
        const state = p.state as any;
        const skillName = state?.input?.name;
        if (skillName) {
          skillMap.set(skillName, (skillMap.get(skillName) || 0) + 1);
        }
      }
    }

    // 按调用次数排序
    const topSkills = Array.from(skillMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return c.json({
      session: {
        id: session.id,
        title: session.title,
        status: session.status,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
      },
      counts: {
        totalMessages: messages.length,
        totalParts: parts.length,
        toolCount: toolParts.length,
        reasoningCount: reasoningParts.length,
      },
      tools: {
        totalTools: toolParts.length,
        errorCount,
        mcpCount,
        skillCount,
        errorRate: Math.round(errorRate * 100) / 100,
      },
      tokens: {
        total: totalTokens,
      },
      topSkills,
    });
  });

  // Get dashboard data
  app.get("/api/sessions/:id/dashboard", async (c) => {
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
    const parts = await getPartsForSession(sessionID);

    // Token data
    const tokenData = [];
    for (const m of messages) {
      const msgData = m.data as any;
      const tokens = msgData?.tokens;
      const cost = msgData?.cost;
      if (tokens) {
        // 提取各部分 token
        const input = Number(tokens.input) || Number(tokens.prompt) || 0;
        const output = Number(tokens.output) || Number(tokens.completion) || 0;
        const reasoning = Number(tokens.reasoning) || Number(tokens.reasoning_tokens) || 0;
        
        // cache 可能是对象 { read: number, write: number } 或数字
        let cache = 0;
        if (typeof tokens.cache === 'number') {
          cache = tokens.cache;
        } else if (tokens.cache?.read) {
          cache = Number(tokens.cache.read) || 0;
        }
        
        // 直接使用 API 返回的 total，不重新计算
        // 因为 OpenAI 的 total 计算方式可能与 input+output+reasoning+cache 不同
        const total = Number(tokens.total) || 0;
        
        // cost 处理
        let costValue = 0;
        if (typeof cost === 'number') {
          costValue = cost;
        } else if (cost?.total) {
          costValue = Number(cost.total) || 0;
        }
        
        tokenData.push({
          timestamp: m.createdAt.toISOString(),
          total,
          input,
          output,
          reasoning,
          cache,
          cost: costValue,
        });
      }
    }

    // Tool stats
    const toolParts = parts.filter(p => p.type === "tool");
    const toolMap = new Map();

    for (const p of toolParts) {
      const tool = p.tool || "unknown";
      const state = p.state as any;
      const status = state?.status;
      const hasError = status === "error" || state?.error;
      let duration = 0;
      if (state?.time?.start && state?.time?.end) {
        duration = state.time.end - state.time.start;
      }

      const existing = toolMap.get(tool) || { tool, total: 0, completed: 0, errors: 0, durations: [] };
      existing.total++;
      if (status === "completed") existing.completed++;
      if (hasError) existing.errors++;
      if (duration > 0) existing.durations.push(duration);
      toolMap.set(tool, existing);
    }

    const toolStats = Array.from(toolMap.values())
      .map(item => ({
        tool: item.tool,
        total: item.total,
        completed: item.completed,
        errors: item.errors,
        avgDuration: item.durations.length > 0 ? Math.round(item.durations.reduce((a: number, b: number) => a + b, 0) / item.durations.length) : 0,
        successRate: item.total > 0 ? Math.round((item.completed / item.total) * 10000) / 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // MCP stats
    const mcpMap = new Map();
    for (const p of toolParts) {
      const tool = p.tool || "";
      if (!tool.startsWith("context7_") && !tool.startsWith("websearch_")) continue;

      let baseTool = tool.startsWith("context7_") ? "context7" : "websearch";
      const state = p.state as any;
      const status = state?.status;
      const hasError = status === "error" || state?.error;
      let duration = 0;
      if (state?.time?.start && state?.time?.end) {
        duration = state.time.end - state.time.start;
      }

      const existing = mcpMap.get(baseTool) || { tool: baseTool, total: 0, completed: 0, errors: 0, durations: [] };
      existing.total++;
      if (status === "completed") existing.completed++;
      if (hasError) existing.errors++;
      if (duration > 0) existing.durations.push(duration);
      mcpMap.set(baseTool, existing);
    }

    const mcpStats = Array.from(mcpMap.values())
      .map(item => ({
        tool: item.tool,
        total: item.total,
        completed: item.completed,
        errors: item.errors,
        avgDuration: item.durations.length > 0 ? Math.round(item.durations.reduce((a: number, b: number) => a + b, 0) / item.durations.length) : 0,
        successRate: item.total > 0 ? Math.round((item.completed / item.total) * 10000) / 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // Errors
    const errors = [];
    for (const p of toolParts) {
      const state = p.state as any;
      const hasError = state?.status === "error" || state?.error;
      if (hasError) {
        errors.push({
          id: p.id,
          toolName: p.tool || "unknown",
          timestamp: p.createdAt.toISOString(),
          error: state?.error || state?.status || "Unknown error",
          input: state?.input ? (typeof state.input === "string" ? state.input : JSON.stringify(state.input)) : undefined,
          output: state?.output ? (typeof state.output === "string" ? state.output : JSON.stringify(state.output)) : undefined,
        });
      }
    }
    errors.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return c.json({ tokenData, toolStats, mcpStats, errors });
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
    const messages = await getMessagesForSession(sessionID);
    
    // 构建 messageID -> agent 的映射
    const messageAgentMap = new Map<string, string>();
    messages.forEach(m => {
      if (m.agent) {
        messageAgentMap.set(m.id, m.agent);
      }
    });
    
    let filteredParts = parts;
    if (typeFilter) {
      filteredParts = parts.filter(p => p.type === typeFilter);
    }

    const partList = filteredParts.slice(-maxItems).map((p) => {
      const state = p.state as any;
      const data = p.data as any;
      
      // 关联该 part 对应的 agent
      const agent = messageAgentMap.get(p.messageID);
      
      // 提取 subagent_type
      let subagentType: string | undefined;
      if (p.type === 'tool' && state?.input) {
        const input = state.input;
        if (typeof input === 'string') {
          try {
            const parsed = JSON.parse(input);
            subagentType = parsed?.subagent_type;
          } catch (e) {
            // 解析失败，忽略
          }
        } else if (typeof input === 'object' && input !== null) {
          subagentType = (input as any)?.subagent_type;
        }
      }
      
      return {
        id: p.id,
        messageID: p.messageID,
        sessionID: p.sessionID,
        type: p.type,
        tool: p.tool,
        agent,
        subagentType,
        action: formatCurrentAction(p),
        status: state?.status,
        // 增强字段：时间信息
        timeStart: state?.time?.start,
        timeEnd: state?.time?.end,
        // 增强字段：错误信息
        error: state?.error,
        // 增强字段：完整data对象
        data: data,
        input: state?.input ? (typeof state.input === "string" ? state.input : JSON.stringify(state.input)) : undefined,
        output: state?.output ? (typeof state.output === "string" ? state.output : JSON.stringify(state.output)) : undefined,
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
      status: session.status,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      children: children.map((child) => ({
        id: child.id,
        title: child.title,
        projectID: child.projectID,
        parentID: child.parentID,
        status: child.status,
        createdAt: child.createdAt.toISOString(),
        updatedAt: child.updatedAt.toISOString(),
      })),
    };

    return c.json(tree);
  });
}