/**
 * Part 相关类型定义
 */

/**
 * Part 类型枚举
 */
export type PartType = 'text' | 'tool_use' | 'tool_result' | 'thinking' | 'resource';

/**
 * Part 数据内容类型
 * 用于替代 any，提供更安全的类型推断
 */
export interface PartData {
  // 通用字段
  text?: string;
  output?: string;
  title?: string;
  
  // 任务委托相关
  description?: string;
  subagent_type?: string;
  name?: string;
  
  // 推理相关
  thinking?: string;
  
  // Patch 相关
  patchFiles?: Array<{ path: string; content: string }>;
  
  // Step finish 相关
  stepFinishReason?: 'stop' | 'tool-calls';
  
  // TODOs 相关
  todos?: Array<{ content: string; status: string; priority: string }>;
  
  // 其他未知字段
  [key: string]: unknown;
}

/**
 * 工具输入参数类型
 * 当 input 字段是 JSON 字符串时，解析后的对象类型
 */
export interface ToolInput {
  // 通用字段
  filePath?: string;
  command?: string;
  pattern?: string;
  url?: string;
  query?: string;
  content?: string;
  
  // 任务委托
  description?: string;
  subagent_type?: string;
  name?: string;
  
  // TODO 任务
  todos?: Array<{ content: string; status: string; priority: string }>;
  
  // 其他未知字段
  [key: string]: unknown;
}

/**
 * Part 状态数据类型
 * 用于替代 any，提供更安全的类型推断
 */
export interface PartStateData {
  status?: 'pending' | 'running' | 'in_progress' | 'completed' | 'error' | string;
  input?: string;
  output?: string;
  result?: unknown;
  error?: string;
  time?: {
    start?: number;
    end?: number;
  };
  // 其他未知字段
  [key: string]: unknown;
}

/**
 * Part 状态枚举
 */
export type PartState = 'in_progress' | 'completed' | 'error' | 'pending';

/**
 * Part 数据传输对象
 * 用于 API 传输和前端展示
 */
export interface PartDTO {
  /** 部件唯一标识符 */
  id: string;
  /** 所属消息 ID */
  messageID: string;
  /** 所属会话 ID */
  sessionID: string;
  /** 部件类型 */
  type?: PartType;
  /** 工具名称（如 'bash', 'read', 'write' 等） */
  tool?: string;
  /** 部件状态 */
  state?: PartState;
  /** 部件创建时间 */
  createdAt: Date;
  /** 部件内容数据 */
  data: unknown;
}

/**
 * Part 简要信息
 * 用于列表展示，减少数据传输量
 */
export interface PartSummary {
  id: string;
  messageID: string;
  sessionID: string;
  type?: PartType;
  tool?: string;
  state?: PartState;
  createdAt: Date;
}

/**
 * 检查对象是否为 PartDTO
 * @param obj - 待检查的对象
 * @returns 是否为 PartDTO
 */
export function isPartDTO(obj: unknown): obj is PartDTO {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const record = obj as Record<string, unknown>;

  // 检查必填字段
  if (typeof record.id !== 'string') {
    return false;
  }
  if (typeof record.messageID !== 'string') {
    return false;
  }
  if (typeof record.sessionID !== 'string') {
    return false;
  }

  // 检查可选字段 - 类型
  if (record.type !== undefined) {
    const validTypes: PartType[] = ['text', 'tool_use', 'tool_result', 'thinking', 'resource'];
    if (!validTypes.includes(record.type as PartType)) {
      return false;
    }
  }

  // 检查可选字段 - 工具名称
  if (record.tool !== undefined && typeof record.tool !== 'string') {
    return false;
  }

  // 检查可选字段 - 状态
  if (record.state !== undefined) {
    const validStates: PartState[] = ['in_progress', 'completed', 'error', 'pending'];
    if (!validStates.includes(record.state as PartState)) {
      return false;
    }
  }

  // 检查时间字段
  if (!(record.createdAt instanceof Date)) {
    return false;
  }

  // data 字段可以是任何类型
  if (record.data === undefined) {
    return false;
  }

  return true;
}

/**
 * 检查对象是否为 PartSummary
 * @param obj - 待检查的对象
 * @returns 是否为 PartSummary
 */
export function isPartSummary(obj: unknown): obj is PartSummary {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const record = obj as Record<string, unknown>;

  if (typeof record.id !== 'string') {
    return false;
  }
  if (typeof record.messageID !== 'string') {
    return false;
  }
  if (typeof record.sessionID !== 'string') {
    return false;
  }

  if (record.type !== undefined) {
    const validTypes: PartType[] = ['text', 'tool_use', 'tool_result', 'thinking', 'resource'];
    if (!validTypes.includes(record.type as PartType)) {
      return false;
    }
  }

  if (record.tool !== undefined && typeof record.tool !== 'string') {
    return false;
  }

  if (record.state !== undefined) {
    const validStates: PartState[] = ['in_progress', 'completed', 'error', 'pending'];
    if (!validStates.includes(record.state as PartState)) {
      return false;
    }
  }

  if (!(record.createdAt instanceof Date)) {
    return false;
  }

  return true;
}

/**
 * 将 PartMeta 转换为 PartDTO
 * @param meta - PartMeta 对象
 * @returns PartDTO 对象
 */
export function partMetaToDTO(meta: {
  id: string;
  messageID: string;
  sessionID: string;
  type?: string;
  tool?: string;
  state?: string;
  createdAt: Date;
  data: unknown;
}): PartDTO {
  const validTypes: PartType[] = ['text', 'tool_use', 'tool_result', 'thinking', 'resource'];
  const validStates: PartState[] = ['in_progress', 'completed', 'error', 'pending'];

  const type = meta.type && validTypes.includes(meta.type as PartType)
    ? (meta.type as PartType)
    : undefined;

  const state = meta.state && validStates.includes(meta.state as PartState)
    ? (meta.state as PartState)
    : undefined;

  return {
    id: meta.id,
    messageID: meta.messageID,
    sessionID: meta.sessionID,
    type,
    tool: meta.tool,
    state,
    createdAt: meta.createdAt,
    data: meta.data,
  };
}