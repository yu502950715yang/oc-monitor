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
    
    // 解析前端传来的价格配置
    let clientTokenPrices: Record<string, { currency: string; cache: number; input: number; output: number }> = {};
    const pricesParam = c.req.query("prices");
    if (pricesParam) {
      try {
        clientTokenPrices = JSON.parse(decodeURIComponent(pricesParam as string));
      } catch (e) {
        // ignore parse error
      }
    }

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

    // 计算 token 详细数据：input, output, cache, total
    let totalTokens = 0;
    let inputTokens = 0;
    let outputTokens = 0;
    let cacheTokens = 0;
    let totalCost = 0;
    let costCurrency = '¥';
    
    // Token 价格配置（单位：每 K tokens 的价格）
    // 优先使用前端配置，备用默认配置
    const defaultPrices: Record<string, { currency: string; cache: number; input: number; output: number }> = {
      // MiniMax 系列
      'minimax-m2.5': { currency: '¥', cache: 0.00021, input: 0.00210, output: 0.00840 },
      'minimax-m2.5-free': { currency: '¥', cache: 0.00021, input: 0.00210, output: 0.00840 },
      'minimax': { currency: '¥', cache: 0.00021, input: 0.00210, output: 0.00840 },
      // Moonshot (Kimi)
      'kimi-k2.5': { currency: '¥', cache: 0.00000, input: 0.00100, output: 0.00400 },
      'moonshotai': { currency: '¥', cache: 0.00000, input: 0.00100, output: 0.00400 },
      // GLM (Zhipu)
      'glm-5': { currency: '¥', cache: 0.00010, input: 0.00100, output: 0.00400 },
      'glm': { currency: '¥', cache: 0.00010, input: 0.00100, output: 0.00400 },
      'zai-org': { currency: '¥', cache: 0.00010, input: 0.00100, output: 0.00400 },
      // OpenAI
      'gpt-5-nano': { currency: '$', cache: 0.00000, input: 0.00010, output: 0.00020 },
      'gpt-4o': { currency: '$', cache: 0.00021, input: 0.00250, output: 0.01000 },
      // Anthropic
      'claude-3.5-sonnet': { currency: '$', cache: 0.00015, input: 0.00300, output: 0.01500 },
      // Google
      'gemini-1.5-pro': { currency: '$', cache: 0.00000, input: 0.00035, output: 0.00140 },
    };
    
    // 合并前端配置和默认配置（前端配置优先）
    const tokenPrices = { ...defaultPrices, ...clientTokenPrices };
    
    // 从 modelID 提取模型标识
    const extractModelKey = (modelId: string): string => {
      if (!modelId) return '';
      const modelIdLower = modelId.toLowerCase();
      
      // 1. 首先检查精确匹配（完全相等）
      for (const key of Object.keys(clientTokenPrices)) {
        if (modelIdLower === key.toLowerCase()) {
          return key;
        }
      }
      
      // 2. 然后检查包含匹配（但优先匹配更长的 key）
      const sortedKeys = Object.keys(clientTokenPrices).sort((a, b) => b.length - a.length);
      for (const key of sortedKeys) {
        if (modelIdLower.includes(key.toLowerCase())) {
          return key;
        }
      }
      
      return '';
    };
    
    // 计算 token 和费用
    for (const m of messages) {
      const msgData = m.data as any;
      const tokens = msgData?.tokens;
      
      if (tokens) {
        const input = Number(tokens.input || tokens.prompt || 0) || 0;
        const output = Number(tokens.output || tokens.completion || 0) || 0;
        let cache = 0;
        if (typeof tokens.cache === 'number') {
          cache = tokens.cache;
        } else if (tokens.cache && typeof tokens.cache === 'object') {
          cache = Number(tokens.cache.read || 0) + Number(tokens.cache.write || 0);
        }
        const total = Number(tokens.total) || 0;
        
        inputTokens += input;
        outputTokens += output;
        cacheTokens += cache;
        totalTokens += total;
        
        // 使用前端配置的价格计算费用（必须在 if(tokens) 块内）
        const modelId = msgData?.modelID || '';
        const modelKey = extractModelKey(modelId);
        const price = tokenPrices[modelKey];
        
        if (price) {
          const cost = (cache * price.cache + input * price.input + output * price.output) / 1000;
          totalCost += cost;
          costCurrency = price.currency;
        } else {
        }
      }
    }
    

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
        input: inputTokens,
        output: outputTokens,
        cache: cacheTokens,
        cost: totalCost,
        currency: costCurrency,
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
    const toolParts = parts.filter(p => p.type === "tool");

    // Token 统计
    let totalTokens = 0;
    let inputTokens = 0;
    let outputTokens = 0;
    let reasoningTokens = 0;
    let cacheTokens = 0;

    for (const m of messages) {
      const msgData = m.data as any;
      const tokens = msgData?.tokens;
      if (tokens) {
        inputTokens += Number(tokens.input || tokens.prompt || 0) || 0;
        outputTokens += Number(tokens.output || tokens.completion || 0) || 0;
        reasoningTokens += Number(tokens.reasoning || 0) || 0;
        
        // 处理 cache 字段
        const cache = tokens.cache;
        if (typeof cache === 'number') {
          cacheTokens += cache;
        } else if (cache && typeof cache === 'object') {
          cacheTokens += Number(cache.read || 0) + Number(cache.write || 0);
        }
        
        totalTokens += Number(tokens.total || 0) || (inputTokens + outputTokens + reasoningTokens + cacheTokens);
      }
    }

    // 工具调用统计
    const toolStats: Record<string, { total: number; completed: number; errors: number; avgDuration: number }> = {};
    for (const p of toolParts) {
      const toolName = p.tool || "unknown";
      if (!toolStats[toolName]) {
        toolStats[toolName] = { total: 0, completed: 0, errors: 0, avgDuration: 0 };
      }
      toolStats[toolName].total++;
      
      const state = p.state as any;
      if (state?.status === "completed") {
        toolStats[toolName].completed++;
      }
      if (state?.status === "error" || state?.error) {
        toolStats[toolName].errors++;
      }
      
      // 计算平均耗时
      if (state?.time?.start && state?.time?.end) {
        const duration = state.time.end - state.time.start;
        const prevAvg = toolStats[toolName].avgDuration;
        const count = toolStats[toolName].total - 1;
        toolStats[toolName].avgDuration = (prevAvg * count + duration) / toolStats[toolName].total;
      }
    }

    // MCP 工具统计
    const mcpPrefixes = config.mcp?.toolPrefixes || ["context7_", "websearch_"];
    const mcpStats: Record<string, number> = {};
    for (const p of toolParts) {
      const tool = p.tool || "";
      for (const prefix of mcpPrefixes) {
        if (tool.startsWith(prefix)) {
          mcpStats[prefix] = (mcpStats[prefix] || 0) + 1;
          break;
        }
      }
    }

    // 错误统计
    const errorCount = toolParts.filter(p => {
      const state = p.state as any;
      return state?.status === "error" || state?.error;
    }).length;

    return c.json({
      session: {
        id: session.id,
        title: session.title,
        status: session.status,
      },
      tokenData: {
        total: totalTokens,
        input: inputTokens,
        output: outputTokens,
        reasoning: reasoningTokens,
        cache: cacheTokens,
      },
      toolStats: Object.entries(toolStats).map(([tool, stats]) => ({
        tool,
        ...stats,
        successRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
      })),
      mcpStats,
      errors: {
        count: errorCount,
        rate: toolParts.length > 0 ? Math.round((errorCount / toolParts.length) * 100) : 0,
      },
    });
  });

  // Get child sessions for a parent session
  app.get("/api/sessions/:id/children", async (c) => {
    const sessionID = c.req.param("id");

    if (!checkStorageExists()) {
      return c.json({
        error: "STORAGE_NOT_FOUND",
        message: "OpenCode storage directory does not exist.",
        children: [],
      });
    }

    const children = await getChildSessions(sessionID);
    const childList = children.map((s) => ({
      id: s.id,
      projectID: s.projectID,
      title: s.title,
      status: s.status,
      updatedAt: s.updatedAt.toISOString(),
      createdAt: s.createdAt.toISOString(),
    }));

    return c.json({
      children: childList,
    });
  });

  // Get session tree (recursive)
  app.get("/api/sessions/:id/tree", async (c) => {
    const sessionID = c.req.param("id");

    if (!checkStorageExists()) {
      return c.json(
        {
          error: "STORAGE_NOT_FOUND",
          message: "OpenCode storage directory does not exist.",
        },
        404
      );
    }

    try {
      const tree = await getSessionTree(sessionID);
      if (!tree) {
        return c.json(
          {
            error: "SESSION_NOT_FOUND",
            message: `Session '${sessionID}' not found`,
          },
          404
        );
      }

      return c.json(tree);
    } catch (error) {
      log.error("Error getting session tree:", error);
      return c.json(
        {
          error: "INTERNAL_ERROR",
          message: "Failed to get session tree",
        },
        500
      );
    }
  });

  // Get all sessions (flattened tree)
  app.get("/api/sessions/all", async (c) => {
    if (!checkStorageExists()) {
      return c.json({
        sessions: [],
        total: 0,
      });
    }

    const sessions = await getAllSessions();
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
      total: sessions.length,
    });
  });
}