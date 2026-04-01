/**
 * Message 相关类型定义
 */

/**
 * 消息角色类型
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * Message 数据传输对象
 * 用于 API 传输和前端展示
 */
export interface MessageDTO {
  /** 消息唯一标识符 */
  id: string;
  /** 所属会话 ID */
  sessionID: string;
  /** 消息角色 */
  role: MessageRole;
  /** 智能体名称（如 'build', 'oracle' 等） */
  agent?: string;
  /** 消息创建时间 */
  createdAt: Date;
  /** 消息内容数据 */
  data: unknown;
}

/**
 * Message 简要信息
 * 用于列表展示，减少数据传输量
 */
export interface MessageSummary {
  id: string;
  sessionID: string;
  role: MessageRole;
  agent?: string;
  createdAt: Date;
}

/**
 * 检查对象是否为 MessageDTO
 * @param obj - 待检查的对象
 * @returns 是否为 MessageDTO
 */
export function isMessageDTO(obj: unknown): obj is MessageDTO {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const record = obj as Record<string, unknown>;

  // 检查必填字段
  if (typeof record.id !== 'string') {
    return false;
  }
  if (typeof record.sessionID !== 'string') {
    return false;
  }

  // 检查角色字段
  const validRoles: MessageRole[] = ['user', 'assistant', 'system'];
  if (!validRoles.includes(record.role as MessageRole)) {
    return false;
  }

  // 检查可选字段
  if (record.agent !== undefined && typeof record.agent !== 'string') {
    return false;
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
 * 检查对象是否为 MessageSummary
 * @param obj - 待检查的对象
 * @returns 是否为 MessageSummary
 */
export function isMessageSummary(obj: unknown): obj is MessageSummary {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const record = obj as Record<string, unknown>;

  if (typeof record.id !== 'string') {
    return false;
  }
  if (typeof record.sessionID !== 'string') {
    return false;
  }

  const validRoles: MessageRole[] = ['user', 'assistant', 'system'];
  if (!validRoles.includes(record.role as MessageRole)) {
    return false;
  }

  if (record.agent !== undefined && typeof record.agent !== 'string') {
    return false;
  }

  if (!(record.createdAt instanceof Date)) {
    return false;
  }

  return true;
}

/**
 * 将 MessageMeta 转换为 MessageDTO
 * @param meta - MessageMeta 对象
 * @returns MessageDTO 对象
 */
export function messageMetaToDTO(meta: {
  id: string;
  sessionID: string;
  role: string;
  agent?: string;
  createdAt: Date;
  data: unknown;
}): MessageDTO {
  const validRoles: MessageRole[] = ['user', 'assistant', 'system'];
  const role = validRoles.includes(meta.role as MessageRole)
    ? (meta.role as MessageRole)
    : 'user';

  return {
    id: meta.id,
    sessionID: meta.sessionID,
    role,
    agent: meta.agent,
    createdAt: meta.createdAt,
    data: meta.data,
  };
}