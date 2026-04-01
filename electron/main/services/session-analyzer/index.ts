import type { SessionMeta, MessageMeta, PartMeta } from "../storage/parser";

// ==================== 类型定义 ====================

export interface SessionSummary {
  total: number;
  running: number;
  waiting: number;
  completed: number;
  error: number;
  byStatus: {
    running: SessionMeta[];
    waiting: SessionMeta[];
    completed: SessionMeta[];
    error: SessionMeta[];
  };
}

export interface ModelUsage {
  modelID: string;
  providerID: string;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cacheTokens: number;
  reasoningTokens: number;
  totalCost: number;
  currency: string;
  messageCount: number;
}

export interface ModelUsageStats {
  models: ModelUsage[];
  totalTokens: number;
  totalCost: number;
  currency: string;
  topModels: ModelUsage[];
}

export interface ProjectStats {
  totalProjects: number;
  projectMap: Map<string, {
    sessionCount: number;
    sessions: SessionMeta[];
    latestSession: SessionMeta | null;
  }>;
}

export interface DailyReport {
  date: string;
  totalSessions: number;
  newSessions: number;
  completedSessions: number;
  activeSessions: number;
  tokensUsed: number;
  cost: number;
  currency: string;
  topProjects: { name: string; count: number }[];
  topModels: { modelID: string; tokens: number }[];
}

export interface WeeklyReport {
  weekStart: string;
  weekEnd: string;
  totalSessions: number;
  completedSessions: number;
  activeDays: number;
  tokensUsed: number;
  cost: number;
  currency: string;
  dailyBreakdown: {
    date: string;
    sessions: number;
    tokens: number;
  }[];
  topProjects: { name: string; count: number }[];
}

export interface MonthlyReport {
  year: number;
  month: number;
  monthName: string;
  totalSessions: number;
  completedSessions: number;
  tokensUsed: number;
  cost: number;
  currency: string;
  dailyBreakdown: {
    date: string;
    sessions: number;
    tokens: number;
  }[];
  weeklyBreakdown: {
    weekNumber: number;
    sessions: number;
    tokens: number;
  }[];
  topProjects: { name: string; count: number }[];
  topModels: { modelID: string; tokens: number }[];
}

// ==================== 辅助函数 ====================

/**
 * 从 message data 中提取 token 信息
 */
function extractTokens(messageData: unknown): {
  input: number;
  output: number;
  cache: number;
  reasoning: number;
  total: number;
  modelID: string;
  providerID: string;
} {
  const data = messageData as any;
  const tokens = data?.tokens;
  
  if (!tokens) {
    return {
      input: 0,
      output: 0,
      cache: 0,
      reasoning: 0,
      total: 0,
      modelID: '',
      providerID: '',
    };
  }

  const input = Number(tokens.input || tokens.prompt || 0) || 0;
  const output = Number(tokens.output || tokens.completion || 0) || 0;
  const reasoning = Number(tokens.reasoning || 0) || 0;
  
  let cache = 0;
  if (typeof tokens.cache === 'number') {
    cache = tokens.cache;
  } else if (tokens.cache && typeof tokens.cache === 'object') {
    cache = Number(tokens.cache?.read || 0) + Number(tokens.cache?.write || 0);
  }

  const total = input + output + reasoning + cache;

  return {
    input,
    output,
    cache,
    reasoning,
    total,
    modelID: data?.modelID || '',
    providerID: data?.providerID || '',
  };
}

/**
 * 判断会话是否在指定日期范围内
 */
function isSessionInDateRange(session: SessionMeta, startDate: Date, endDate: Date): boolean {
  const createdAt = session.createdAt.getTime();
  return createdAt >= startDate.getTime() && createdAt <= endDate.getTime();
}

/**
 * 获取日期字符串 (YYYY-MM-DD)
 */
function getDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * 获取月份名称
 */
function getMonthName(year: number, month: number): string {
  const date = new Date(year, month - 1, 1);
  return date.toLocaleString('zh-CN', { month: 'long' });
}

// ==================== SessionAnalyzer 类 ====================

class Analyzer {
  /**
   * 获取会话摘要统计
   */
  getSessionsSummary(sessions: SessionMeta[]): SessionSummary {
    const byStatus: SessionSummary['byStatus'] = {
      running: [],
      waiting: [],
      completed: [],
      error: [],
    };

    for (const session of sessions) {
      const status = session.status;
      if (byStatus[status]) {
        byStatus[status].push(session);
      }
    }

    return {
      total: sessions.length,
      running: byStatus.running.length,
      waiting: byStatus.waiting.length,
      completed: byStatus.completed.length,
      error: byStatus.error.length,
      byStatus,
    };
  }

  /**
   * 获取模型使用统计
   * 需要同时传入 messages 数据来计算 token
   */
  getModelUsageStats(
    sessions: SessionMeta[],
    messagesMap: Map<string, MessageMeta[]>
  ): ModelUsageStats {
    const modelMap = new Map<string, ModelUsage>();

    // 遍历所有会话的 messages
    for (const session of sessions) {
      const messages = messagesMap.get(session.id) || [];
      
      for (const message of messages) {
        const tokenInfo = extractTokens(message.data);
        
        if (!tokenInfo.modelID) continue;

        const existing = modelMap.get(tokenInfo.modelID);
        
        if (existing) {
          existing.inputTokens += tokenInfo.input;
          existing.outputTokens += tokenInfo.output;
          existing.cacheTokens += tokenInfo.cache;
          existing.reasoningTokens += tokenInfo.reasoning;
          existing.totalTokens += tokenInfo.total;
          existing.messageCount += 1;
        } else {
          modelMap.set(tokenInfo.modelID, {
            modelID: tokenInfo.modelID,
            providerID: tokenInfo.providerID,
            inputTokens: tokenInfo.input,
            outputTokens: tokenInfo.output,
            cacheTokens: tokenInfo.cache,
            reasoningTokens: tokenInfo.reasoning,
            totalTokens: tokenInfo.total,
            totalCost: 0,
            currency: '¥',
            messageCount: 1,
          });
        }
      }
    }

    const models = Array.from(modelMap.values());
    const totalTokens = models.reduce((sum, m) => sum + m.totalTokens, 0);
    const totalCost = models.reduce((sum, m) => sum + m.totalCost, 0);

    // 按 token 使用量排序，取前5
    const topModels = [...models]
      .sort((a, b) => b.totalTokens - a.totalTokens)
      .slice(0, 5);

    return {
      models,
      totalTokens,
      totalCost,
      currency: '¥',
      topModels,
    };
  }

  /**
   * 获取项目统计
   */
  getProjectStats(sessions: SessionMeta[]): ProjectStats {
    const projectMap = new Map<string, {
      sessionCount: number;
      sessions: SessionMeta[];
      latestSession: SessionMeta | null;
    }>();

    for (const session of sessions) {
      // 使用 directory 作为项目标识，如果没有则使用 projectID
      const projectKey = session.directory || session.projectID || 'unknown';
      
      const existing = projectMap.get(projectKey);
      
      if (existing) {
        existing.sessionCount += 1;
        existing.sessions.push(session);
        
        // 更新最新会话
        if (!existing.latestSession || 
            session.updatedAt.getTime() > existing.latestSession.updatedAt.getTime()) {
          existing.latestSession = session;
        }
      } else {
        projectMap.set(projectKey, {
          sessionCount: 1,
          sessions: [session],
          latestSession: session,
        });
      }
    }

    return {
      totalProjects: projectMap.size,
      projectMap,
    };
  }

  /**
   * 生成每日报告
   */
  generateDailyReport(
    sessions: SessionMeta[],
    date: string | Date,
    messagesMap?: Map<string, MessageMeta[]>
  ): DailyReport {
    const targetDate = typeof date === 'string' ? new Date(date) : date;
    targetDate.setHours(0, 0, 0, 0);
    
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);

    // 筛选当天的会话
    const daySessions = sessions.filter(s => 
      isSessionInDateRange(s, targetDate, nextDate)
    );

    // 统计项目
    const projectCount = new Map<string, number>();
    for (const session of daySessions) {
      const projectKey = session.directory || session.projectID || 'unknown';
      projectCount.set(projectKey, (projectCount.get(projectKey) || 0) + 1);
    }

    const topProjects = Array.from(projectCount.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 统计模型
    let tokensUsed = 0;
    const modelTokens = new Map<string, number>();

    if (messagesMap) {
      for (const session of daySessions) {
        const messages = messagesMap.get(session.id) || [];
        for (const message of messages) {
          const tokenInfo = extractTokens(message.data);
          tokensUsed += tokenInfo.total;
          
          if (tokenInfo.modelID) {
            modelTokens.set(
              tokenInfo.modelID, 
              (modelTokens.get(tokenInfo.modelID) || 0) + tokenInfo.total
            );
          }
        }
      }
    }

    const topModels = Array.from(modelTokens.entries())
      .map(([modelID, tokens]) => ({ modelID, tokens }))
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, 5);

    // 计算活动会话数（当天有更新的会话）
    const activeSessions = daySessions.filter(s => {
      const updated = new Date(s.updatedAt);
      return updated >= targetDate && updated < nextDate;
    }).length;

    return {
      date: getDateString(targetDate),
      totalSessions: daySessions.length,
      newSessions: daySessions.length,
      completedSessions: daySessions.filter(s => s.status === 'completed').length,
      activeSessions,
      tokensUsed,
      cost: 0, // TODO: 可根据配置的计算价格
      currency: '¥',
      topProjects,
      topModels,
    };
  }

  /**
   * 生成每周报告
   */
  generateWeeklyReport(
    sessions: SessionMeta[],
    weekStart: string | Date,
    messagesMap?: Map<string, MessageMeta[]>
  ): WeeklyReport {
    const start = typeof weekStart === 'string' ? new Date(weekStart) : weekStart;
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    // 筛选本周的会话
    const weekSessions = sessions.filter(s => 
      isSessionInDateRange(s, start, end)
    );

    // 每日明细
    const dailyBreakdown: WeeklyReport['dailyBreakdown'] = [];
    for (let i = 0; i < 7; i++) {
      const dayStart = new Date(start);
      dayStart.setDate(dayStart.getDate() + i);
      
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const daySessions = weekSessions.filter(s => 
        isSessionInDateRange(s, dayStart, dayEnd)
      );

      let dayTokens = 0;
      if (messagesMap) {
        for (const session of daySessions) {
          const messages = messagesMap.get(session.id) || [];
          for (const message of messages) {
            const tokenInfo = extractTokens(message.data);
            dayTokens += tokenInfo.total;
          }
        }
      }

      dailyBreakdown.push({
        date: getDateString(dayStart),
        sessions: daySessions.length,
        tokens: dayTokens,
      });
    }

    // 统计项目
    const projectCount = new Map<string, number>();
    for (const session of weekSessions) {
      const projectKey = session.directory || session.projectID || 'unknown';
      projectCount.set(projectKey, (projectCount.get(projectKey) || 0) + 1);
    }

    const topProjects = Array.from(projectCount.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 总计
    let tokensUsed = 0;
    if (messagesMap) {
      for (const session of weekSessions) {
        const messages = messagesMap.get(session.id) || [];
        for (const message of messages) {
          const tokenInfo = extractTokens(message.data);
          tokensUsed += tokenInfo.total;
        }
      }
    }

    const activeDays = dailyBreakdown.filter(d => d.sessions > 0).length;

    return {
      weekStart: getDateString(start),
      weekEnd: getDateString(new Date(end.getTime() - 1)),
      totalSessions: weekSessions.length,
      completedSessions: weekSessions.filter(s => s.status === 'completed').length,
      activeDays,
      tokensUsed,
      cost: 0,
      currency: '¥',
      dailyBreakdown,
      topProjects,
    };
  }

  /**
   * 生成月度报告
   */
  generateMonthlyReport(
    sessions: SessionMeta[],
    year: number,
    month: number,
    messagesMap?: Map<string, MessageMeta[]>
  ): MonthlyReport {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    // 筛选本月的会话
    const monthSessions = sessions.filter(s => 
      isSessionInDateRange(s, start, end)
    );

    // 每日明细
    const daysInMonth = new Date(year, month, 0).getDate();
    const dailyBreakdown: MonthlyReport['dailyBreakdown'] = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStart = new Date(year, month - 1, day);
      const dayEnd = new Date(year, month - 1, day + 1);

      const daySessions = monthSessions.filter(s => 
        isSessionInDateRange(s, dayStart, dayEnd)
      );

      let dayTokens = 0;
      if (messagesMap) {
        for (const session of daySessions) {
          const messages = messagesMap.get(session.id) || [];
          for (const message of messages) {
            const tokenInfo = extractTokens(message.data);
            dayTokens += tokenInfo.total;
          }
        }
      }

      dailyBreakdown.push({
        date: getDateString(dayStart),
        sessions: daySessions.length,
        tokens: dayTokens,
      });
    }

    // 每周明细
    const weeklyBreakdown: MonthlyReport['weeklyBreakdown'] = [];
    const weekCount = Math.ceil(daysInMonth / 7);
    
    for (let week = 1; week <= weekCount; week++) {
      const weekStartDay = (week - 1) * 7 + 1;
      const weekEndDay = Math.min(week * 7, daysInMonth);
      
      const weekStartDate = new Date(year, month - 1, weekStartDay);
      const weekEndDate = new Date(year, month - 1, weekEndDay + 1);

      const weekSessions = monthSessions.filter(s => 
        isSessionInDateRange(s, weekStartDate, weekEndDate)
      );

      let weekTokens = 0;
      if (messagesMap) {
        for (const session of weekSessions) {
          const messages = messagesMap.get(session.id) || [];
          for (const message of messages) {
            const tokenInfo = extractTokens(message.data);
            weekTokens += tokenInfo.total;
          }
        }
      }

      weeklyBreakdown.push({
        weekNumber: week,
        sessions: weekSessions.length,
        tokens: weekTokens,
      });
    }

    // 统计项目
    const projectCount = new Map<string, number>();
    for (const session of monthSessions) {
      const projectKey = session.directory || session.projectID || 'unknown';
      projectCount.set(projectKey, (projectCount.get(projectKey) || 0) + 1);
    }

    const topProjects = Array.from(projectCount.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 统计模型
    const modelTokens = new Map<string, number>();
    let totalTokens = 0;

    if (messagesMap) {
      for (const session of monthSessions) {
        const messages = messagesMap.get(session.id) || [];
        for (const message of messages) {
          const tokenInfo = extractTokens(message.data);
          totalTokens += tokenInfo.total;
          
          if (tokenInfo.modelID) {
            modelTokens.set(
              tokenInfo.modelID,
              (modelTokens.get(tokenInfo.modelID) || 0) + tokenInfo.total
            );
          }
        }
      }
    }

    const topModels = Array.from(modelTokens.entries())
      .map(([modelID, tokens]) => ({ modelID, tokens }))
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, 5);

    return {
      year,
      month,
      monthName: getMonthName(year, month),
      totalSessions: monthSessions.length,
      completedSessions: monthSessions.filter(s => s.status === 'completed').length,
      tokensUsed: totalTokens,
      cost: 0,
      currency: '¥',
      dailyBreakdown,
      weeklyBreakdown,
      topProjects,
      topModels,
    };
  }
}

// ==================== 导出单例 ====================

export const sessionAnalyzer = new Analyzer();