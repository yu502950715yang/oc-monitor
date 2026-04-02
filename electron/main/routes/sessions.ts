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
import { agentRegistry } from "../services/agentRegistry";
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
      directory: s.directory,
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
    let clientTokenPrices: Record<string, { currency: string; cache: number; input: number; output: number; reasoning: number }> = {};
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
    const defaultPrices: Record<string, { currency: string; cache: number; input: number; output: number; reasoning: number }> = {
      // MiniMax 系列
      'minimax-m2.5': { currency: '¥', cache: 0.00021, input: 0.00210, output: 0.00840, reasoning: 0.00840 },
      'minimax-m2.5-free': { currency: '¥', cache: 0.00021, input: 0.00210, output: 0.00840, reasoning: 0.00840 },
      'minimax': { currency: '¥', cache: 0.00021, input: 0.00210, output: 0.00840, reasoning: 0.00840 },
      // Moonshot (Kimi)
      'kimi-k2.5': { currency: '¥', cache: 0.00000, input: 0.00100, output: 0.00400, reasoning: 0.00400 },
      'moonshotai': { currency: '¥', cache: 0.00000, input: 0.00100, output: 0.00400, reasoning: 0.00400 },
      // GLM (Zhipu)
      'glm-5': { currency: '¥', cache: 0.00010, input: 0.00100, output: 0.00400, reasoning: 0.00400 },
      'glm': { currency: '¥', cache: 0.00010, input: 0.00100, output: 0.00400, reasoning: 0.00400 },
      'zai-org': { currency: '¥', cache: 0.00010, input: 0.00100, output: 0.00400, reasoning: 0.00400 },
      // OpenAI
      'gpt-5-nano': { currency: '$', cache: 0.00000, input: 0.00010, output: 0.00020, reasoning: 0.00020 },
      'gpt-4o': { currency: '$', cache: 0.00021, input: 0.00250, output: 0.01000, reasoning: 0.01000 },
      // Anthropic
      'claude-3.5-sonnet': { currency: '$', cache: 0.00015, input: 0.00300, output: 0.01500, reasoning: 0.01500 },
      // Google
      'gemini-1.5-pro': { currency: '$', cache: 0.00000, input: 0.00035, output: 0.00140, reasoning: 0.00140 },
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
        const reasoning = Number(tokens.reasoning || 0) || 0;
        let cache = 0;
        if (typeof tokens.cache === 'number') {
          cache = tokens.cache;
        } else if (tokens.cache && typeof tokens.cache === 'object') {
          cache = Number(tokens.cache.read || 0) + Number(tokens.cache.write || 0);
        }
        // 直接使用分项累加计算 total（包含 reasoning）
        const total = input + output + reasoning + cache;
        
        inputTokens += input;
        outputTokens += output;
        cacheTokens += cache;
        totalTokens += total;
        
        // 使用前端配置的价格计算费用（必须在 if(tokens) 块内）
        const modelId = msgData?.modelID || '';
        const modelKey = extractModelKey(modelId);
        const price = tokenPrices[modelKey];
        
        if (price) {
          const cost = (cache * price.cache + input * price.input + output * price.output + reasoning * (price.reasoning || price.output)) / 1000;
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
        const input = Number(tokens.input || tokens.prompt || 0) || 0;
        const output = Number(tokens.output || tokens.completion || 0) || 0;
        const reasoning = Number(tokens.reasoning || 0) || 0;
        
        // 处理 cache 字段
        let cache = 0;
        if (typeof tokens.cache === 'number') {
          cache = tokens.cache;
        } else if (tokens.cache && typeof tokens.cache === 'object') {
          cache = Number(tokens.cache.read || 0) + Number(tokens.cache.write || 0);
        }
        
        // 累加各类 token
        inputTokens += input;
        outputTokens += output;
        reasoningTokens += reasoning;
        cacheTokens += cache;
        
        // 直接使用分项累加计算 total（包含 reasoning）
        totalTokens += input + output + reasoning + cache;
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

    // 解析前端传来的价格配置
    let clientTokenPrices: Record<string, { currency: string; cache: number; input: number; output: number; reasoning: number }> = {};
    const pricesParam = c.req.query("prices");
    if (pricesParam) {
      try {
        clientTokenPrices = JSON.parse(decodeURIComponent(pricesParam as string));
      } catch (e) {
        // ignore parse error
      }
    }

    // Token 价格配置（单位：每 K tokens 的价格）
    const defaultPrices: Record<string, { currency: string; cache: number; input: number; output: number; reasoning: number }> = {
      // MiniMax 系列
      'minimax-m2.5': { currency: '¥', cache: 0.00021, input: 0.00210, output: 0.00840, reasoning: 0.00840 },
      'minimax-m2.5-free': { currency: '¥', cache: 0.00021, input: 0.00210, output: 0.00840, reasoning: 0.00840 },
      'minimax': { currency: '¥', cache: 0.00021, input: 0.00210, output: 0.00840, reasoning: 0.00840 },
      // Moonshot (Kimi)
      'kimi-k2.5': { currency: '¥', cache: 0.00000, input: 0.00100, output: 0.00400, reasoning: 0.00400 },
      'moonshotai': { currency: '¥', cache: 0.00000, input: 0.00100, output: 0.00400, reasoning: 0.00400 },
      // GLM (Zhipu)
      'glm-5': { currency: '¥', cache: 0.00010, input: 0.00100, output: 0.00400, reasoning: 0.00400 },
      'glm': { currency: '¥', cache: 0.00010, input: 0.00100, output: 0.00400, reasoning: 0.00400 },
      'zai-org': { currency: '¥', cache: 0.00010, input: 0.00100, output: 0.00400, reasoning: 0.00400 },
      // OpenAI
      'gpt-5-nano': { currency: '$', cache: 0.00000, input: 0.00010, output: 0.00020, reasoning: 0.00020 },
      'gpt-4o': { currency: '$', cache: 0.00021, input: 0.00250, output: 0.01000, reasoning: 0.01000 },
      // Anthropic
      'claude-3.5-sonnet': { currency: '$', cache: 0.00015, input: 0.00300, output: 0.01500, reasoning: 0.01500 },
      // Google
      'gemini-1.5-pro': { currency: '$', cache: 0.00000, input: 0.00035, output: 0.00140, reasoning: 0.00140 },
    };

    // 合并前端配置和默认配置（前端配置优先）
    const tokenPrices = { ...defaultPrices, ...clientTokenPrices };

    // 从 modelID 提取模型标识
    const extractModelKey = (modelId: string): string => {
      if (!modelId) return '';
      const modelIdLower = modelId.toLowerCase();

      // 1. 首先检查精确匹配（完全相等）
      for (const key of Object.keys(tokenPrices)) {
        if (modelIdLower === key.toLowerCase()) {
          return key;
        }
      }

      // 2. 然后检查包含匹配（但优先匹配更长的 key）
      const sortedKeys = Object.keys(tokenPrices).sort((a, b) => b.length - a.length);
      for (const key of sortedKeys) {
        if (modelIdLower.includes(key.toLowerCase())) {
          return key;
        }
      }

      return '';
    };

    // 成本计算
    let totalCost = 0;
    let costCurrency = '¥';

    // 收集 message 时间序列数据用于计算 outputSpeed
    const messageTimeSeries: { timestamp: number; output: number }[] = [];
    const now = Date.now();

    for (const m of messages) {
      const msgData = m.data as any;
      const tokens = msgData?.tokens;

      if (tokens) {
        const output = Number(tokens.output || tokens.completion || 0) || 0;
        const input = Number(tokens.input || tokens.prompt || 0) || 0;
        const reasoning = Number(tokens.reasoning || 0) || 0;
        let cache = 0;
        if (typeof tokens.cache === 'number') {
          cache = tokens.cache;
        } else if (tokens.cache && typeof tokens.cache === 'object') {
          cache = Number(tokens.cache.read || 0) + Number(tokens.cache.write || 0);
        }

        // 使用前端配置的价格计算费用
        const modelId = msgData?.modelID || '';
        const modelKey = extractModelKey(modelId);
        const price = tokenPrices[modelKey];

        if (price) {
          const cost = (cache * price.cache + input * price.input + output * price.output + reasoning * (price.reasoning || price.output)) / 1000;
          totalCost += cost;
          costCurrency = price.currency;
        }

        // 收集时间序列数据用于计算 outputSpeed
        const msgCreatedAt = m.createdAt?.getTime?.() || new Date(m.createdAt as any).getTime();
        if (msgCreatedAt && output > 0) {
          messageTimeSeries.push({ timestamp: msgCreatedAt, output });
        }
      }
    }

    // 计算 outputSpeed（最近 5 分钟的平均每秒输出 token）
    const fiveMinutesAgo = now - 300000;
    let recentOutput = 0;
    for (const point of messageTimeSeries) {
      if (point.timestamp >= fiveMinutesAgo) {
        recentOutput += point.output;
      }
    }
    const outputSpeed = Math.round((recentOutput / 300) * 100) / 100; // tok/s，保留两位小数

    // 计算 sessionDuration 和 durationProgress
    const sessionCreatedAt = session.createdAt?.getTime?.() || new Date(session.createdAt as any).getTime();
    const sessionDuration = now - sessionCreatedAt;
    const fiveHoursInMs = 5 * 60 * 60 * 1000;
    const durationProgress = Math.min(Math.round((sessionDuration / fiveHoursInMs) * 100), 100);

    // 提取 projectName（从 directory 路径的最后一段）
    const projectName = session.directory ? session.directory.split(/[/\\]/).pop() || '' : '';

    return c.json({
      session: {
        id: session.id,
        title: session.title,
        status: session.status,
        directory: session.directory,
        createdAt: session.createdAt.toISOString(),
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
      liveSummary: {
        projectName,
        totalCost: Math.round(totalCost * 100) / 100,
        currency: costCurrency,
        outputSpeed,
        sessionDuration,
        durationProgress,
      },
    });
  });

  // Get token history for a session
  app.get("/api/sessions/:id/token-history", async (c) => {
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

    // 提取每个消息的 token 数据
    const tokenHistory = messages
      .map((m) => {
        const msgData = m.data as any;
        const tokens = msgData?.tokens;
        if (!tokens) return null;

        let cacheTokens = 0;
        const cache = tokens.cache;
        if (typeof cache === 'number') {
          cacheTokens = cache;
        } else if (cache && typeof cache === 'object') {
          cacheTokens = Number(cache.read || 0) + Number(cache.write || 0);
        }

        return {
          timestamp: m.createdAt.toISOString(),
          total: Number(tokens.total || 0) || 
            (Number(tokens.input || tokens.prompt || 0) || 0) +
            (Number(tokens.output || tokens.completion || 0) || 0) +
            (Number(tokens.reasoning || 0) || 0) +
            cacheTokens,
          input: Number(tokens.input || tokens.prompt || 0) || 0,
          output: Number(tokens.output || tokens.completion || 0) || 0,
          reasoning: Number(tokens.reasoning || 0) || 0,
          cache: cacheTokens,
          modelID: tokens.modelID || msgData?.modelID || null,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return c.json({ tokenHistory });
  });

  // Get MCP tool statistics for a session
  app.get("/api/sessions/:id/mcp-stats", async (c) => {
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

    const parts = await getPartsForSession(sessionID);
    const toolParts = parts.filter(p => p.type === "tool");

    // MCP 工具统计
    const mcpPrefixes = config.mcp?.toolPrefixes || ["context7_", "websearch_"];
    const mcpStatsMap: Record<string, { total: number; errors: number }> = {};

    for (const p of toolParts) {
      const tool = p.tool || "";
      for (const prefix of mcpPrefixes) {
        if (tool.startsWith(prefix)) {
          if (!mcpStatsMap[prefix]) {
            mcpStatsMap[prefix] = { total: 0, errors: 0 };
          }
          mcpStatsMap[prefix].total++;

          const state = p.state as any;
          if (state?.status === "error" || state?.error) {
            mcpStatsMap[prefix].errors++;
          }
          break;
        }
      }
    }

    const mcpStats = Object.entries(mcpStatsMap).map(([tool, stats]) => ({
      tool,
      total: stats.total,
      errors: stats.errors,
      successRate: stats.total > 0 ? Math.round(((stats.total - stats.errors) / stats.total) * 100) : 0,
    }));

    return c.json({ mcpStats });
  });  // Get error log for a session
  app.get("/api/sessions/:id/error-log", async (c) => {
    const sessionID = c.req.param("id");
    if (!checkStorageExists()) return c.json({error:"STORAGE_NOT_FOUND"},404);
    const session=await getSession(sessionID);
    if(!session)return c.json({error:"SESSION_NOT_FOUND"},404);
    const parts=await getPartsForSession(sessionID);
    const toolParts=parts.filter(p=>p.type==="tool");
    const errors=toolParts.filter(p=>{const s=p.state as any;return s?.status==="error"||s?.error}).map(p=>({id:p.id,toolName:p.tool,error:(p.state as any)?.error,timestamp:p.createdAt.toISOString()})).sort((a,b)=>new Date(b.timestamp).getTime()-new Date(a.timestamp).getTime());
    return c.json({errors});
  });


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

  // Get agent tree for a session (智能体树)
  app.get("/api/sessions/:id/agent-tree", async (c) => {
    const sessionID = c.req.param("id");

    if (!checkStorageExists()) {
      return c.json({ 
        error: "STORAGE_NOT_FOUND", 
        sessionId: sessionID, 
        nodes: [], 
        total: 0 
      }, 404);
    }

    const session = await getSession(sessionID);
    if (!session) {
      return c.json({ 
        error: "SESSION_NOT_FOUND", 
        sessionId: sessionID, 
        nodes: [], 
        total: 0 
      }, 404);
    }

    const parts = await getPartsForSession(sessionID);

    // 过滤有 subagentType 的工具调用
    const agentParts = parts.filter(p => {
      if (p.type !== "tool") return false;
      const state = p.state as Record<string, unknown> | undefined;
      if (!state) return false;
      const input = state.input;
      if (!input) return false;
      if (typeof input === "object") return !!(input as Record<string, unknown>).subagent_type;
      if (typeof input === "string") {
        try { return !!JSON.parse(input).subagent_type; } catch { return false; }
      }
      return false;
    });

    // 构建节点
    const agentNodes = agentParts.map((p) => {
      const state = p.state as Record<string, unknown> | undefined;
      let input = state?.input;
      let subagentType = "";

      if (typeof input === "string") {
        try { subagentType = JSON.parse(input).subagent_type || ""; } catch { subagentType = ""; }
      } else if (typeof input === "object" && input !== null) {
        subagentType = (input as Record<string, unknown>).subagent_type as string || "";
      }

      const timeObj = state?.time as Record<string, number> | undefined;
      const agentMode = agentRegistry.isSubAgent(subagentType) ? "subagent" : "main";

      return {
        id: p.id,
        messageID: p.messageID,
        subagentType,
        agentMode,
        action: formatCurrentAction(p) || "",
        status: state?.status as string || "",
        timeStart: timeObj?.start,
        timeEnd: timeObj?.end,
        createdAt: p.createdAt.toISOString(),
        parentId: null as string | null,
        level: 0,
      };
    });

    // 按时间排序并构建层级
    const sortedNodes = agentNodes.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const mainAgents = sortedNodes.filter(n => n.agentMode === "main");
    const subAgents = sortedNodes.filter(n => n.agentMode === "subagent");

    for (const subAgent of subAgents) {
      const parent = mainAgents.find(m => new Date(m.createdAt).getTime() < new Date(subAgent.createdAt).getTime());
      if (parent) { subAgent.parentId = parent.id; subAgent.level = 1; }
    }

    return c.json({ 
      sessionId: sessionID, 
      nodes: [...mainAgents, ...subAgents], 
      total: agentNodes.length 
    });
  });

  // Unified tree endpoint - returns all sessions, agents, and tools in a tree structure
  // 可以通过 sessionId 查询参数指定会话，不指定则返回所有会话
  app.get("/api/unified-tree", async (c) => {
    const sessionId = c.req.query("sessionId");
    
    if (!checkStorageExists()) {
      return c.json({
        error: "STORAGE_NOT_FOUND",
        message: "OpenCode storage directory does not exist.",
        nodes: [],
      });
    }

    const allNodes: Array<{
      id: string;
      type: "session" | "agent" | "tool";
      parentId: string | null;
      level: number;
      status: string;
      // Session-specific
      title?: string;
      projectID?: string;
      // Agent-specific
      subagentType?: string;
      action?: string;
      // Tool-specific
      toolName?: string;
    }> = [];

    // Get all sessions
    const allSessions = await getAllSessions();

    // Determine which sessions to process
    let sessionsToProcess: typeof allSessions = [];
    
    if (sessionId) {
      // 如果指定了 sessionId，只处理该会话及其子会话
      const targetSession = allSessions.find(s => s.id === sessionId);
      if (targetSession) {
        sessionsToProcess = [targetSession];
        // 递归获取所有子会话
        const getAllChildren = (parentId: string): SessionMeta[] => {
          const children = allSessions.filter(s => s.parentID === parentId);
          return children.concat(children.flatMap(c => getAllChildren(c.id)));
        };
        const childSessions = getAllChildren(sessionId);
        sessionsToProcess = [targetSession, ...childSessions];
      }
    } else {
      // 如果没有指定 sessionId，处理所有根会话
      sessionsToProcess = allSessions.filter((s) => !s.parentID);
    }

    // Recursive function to process sessions and their children
    async function processSession(session: typeof allSessions[0], level: number, parentId: string | null) {
      // Add session node
      allNodes.push({
        id: session.id,
        type: "session",
        parentId,
        level,
        status: session.status,
        title: session.title,
        projectID: session.projectID,
      });

      // Get parts (tool calls) for this session
      const parts = await getPartsForSession(session.id);

      // Separate agent calls (subagent_type) and regular tool calls
      const agentParts: typeof parts = [];
      const toolParts: typeof parts = [];

      for (const part of parts) {
        if (part.type !== "tool") continue;
        const state = part.state as Record<string, unknown> | undefined;
        if (!state) continue;
        const input = state.input;
        let hasSubagentType = false;

        if (typeof input === "object" && input !== null) {
          hasSubagentType = !!(input as Record<string, unknown>).subagent_type;
        } else if (typeof input === "string") {
          try {
            hasSubagentType = !!JSON.parse(input).subagent_type;
          } catch {
            hasSubagentType = false;
          }
        }

        if (hasSubagentType) {
          agentParts.push(part);
        } else {
          toolParts.push(part);
        }
      }

      // Process agent nodes
      for (const agentPart of agentParts) {
        const state = agentPart.state as Record<string, unknown> | undefined;
        let input = state?.input;
        let subagentType = "";
        let action = "";

        if (typeof input === "string") {
          try {
            const parsed = JSON.parse(input);
            subagentType = parsed.subagent_type || "";
          } catch {
            subagentType = "";
          }
        } else if (typeof input === "object" && input !== null) {
          subagentType = (input as Record<string, unknown>).subagent_type as string || "";
        }

        const formattedAction = formatCurrentAction(agentPart);
        action = formattedAction || state?.action as string || "";

        allNodes.push({
          id: agentPart.id,
          type: "agent",
          parentId: session.id,
          level: level + 1,
          status: (state?.status as string) || "",
          subagentType,
          action,
        });
      }

      // Process tool nodes - attach to the last agent or session
      let lastAgentId: string | null = null;
      for (const toolPart of toolParts) {
        const state = toolPart.state as Record<string, unknown> | undefined;
        const toolName = (state?.input as Record<string, unknown>)?.name as string || toolPart.tool || "";

        // Only add if it has a meaningful tool name
        if (toolName) {
          allNodes.push({
            id: toolPart.id,
            type: "tool",
            parentId: lastAgentId || session.id,
            level: level + 2,
            status: (state?.status as string) || "",
            toolName,
          });
        }
      }

      // Update last agent ID for subsequent tools
      if (agentParts.length > 0) {
        const lastAgent = agentParts[agentParts.length - 1];
        lastAgentId = lastAgent.id;
      }

      // Recursively process child sessions
      const children = allSessions.filter((s) => s.parentID === session.id);
      for (const child of children) {
        await processSession(child, level + 1, session.id);
      }
    }

    // Process selected sessions
    for (const session of sessionsToProcess) {
      // 判断是否是根会话（没有父会话）
      const isRoot = !session.parentID || (sessionId && session.id === sessionId);
      const parentId = isRoot ? null : (session.parentID || null);
      await processSession(session, isRoot ? 0 : 1, parentId);
    }

    return c.json({
      nodes: allNodes,
      total: allNodes.length,
      sessionCount: sessionsToProcess.length,
    });
  });
}