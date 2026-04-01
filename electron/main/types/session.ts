/**
 * Session 相关类型定义
 */

import type { SessionStatus } from './index';

/**
 * Session 数据传输对象
 * 用于 API 传输和前端展示
 */
export interface SessionDTO {
  /** 会话唯一标识符 */
  id: string;
  /** 所属项目 ID */
  projectID: string;
  /** 父会话 ID（用于会话树结构） */
  parentID?: string;
  /** 会话标题 */
  title: string;
  /** 会话工作目录 */
  directory: string;
  /** 会话创建时间 */
  createdAt: Date;
  /** 会话最后更新时间 */
  updatedAt: Date;
  /** 会话状态 */
  status: SessionStatus;
}

/**
 * Session 简要信息
 * 用于列表展示，减少数据传输量
 */
export interface SessionSummary {
  id: string;
  title: string;
  status: SessionStatus;
  updatedAt: Date;
}

/**
 * 检查对象是否为 SessionDTO
 * @param obj - 待检查的对象
 * @returns 是否为 SessionDTO
 */
export function isSessionDTO(obj: unknown): obj is SessionDTO {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const record = obj as Record<string, unknown>;

  // 检查必填字段
  if (typeof record.id !== 'string') {
    return false;
  }
  if (typeof record.projectID !== 'string') {
    return false;
  }
  if (typeof record.title !== 'string') {
    return false;
  }
  if (typeof record.directory !== 'string') {
    return false;
  }

  // 检查可选字段
  if (record.parentID !== undefined && typeof record.parentID !== 'string') {
    return false;
  }

  // 检查时间字段
  if (!(record.createdAt instanceof Date)) {
    return false;
  }
  if (!(record.updatedAt instanceof Date)) {
    return false;
  }

  // 检查状态字段
  const validStatuses: SessionStatus[] = ['running', 'waiting', 'completed', 'error'];
  if (!validStatuses.includes(record.status as SessionStatus)) {
    return false;
  }

  return true;
}

/**
 * 检查对象是否为 SessionSummary
 * @param obj - 待检查的对象
 * @returns 是否为 SessionSummary
 */
export function isSessionSummary(obj: unknown): obj is SessionSummary {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const record = obj as Record<string, unknown>;

  if (typeof record.id !== 'string') {
    return false;
  }
  if (typeof record.title !== 'string') {
    return false;
  }

  const validStatuses: SessionStatus[] = ['running', 'waiting', 'completed', 'error'];
  if (!validStatuses.includes(record.status as SessionStatus)) {
    return false;
  }

  if (!(record.updatedAt instanceof Date)) {
    return false;
  }

  return true;
}

/**
 * 将 SessionMeta 转换为 SessionDTO
 * @param meta - SessionMeta 对象
 * @returns SessionDTO 对象
 */
export function sessionMetaToDTO(meta: {
  id: string;
  projectID: string;
  parentID?: string;
  title: string;
  directory: string;
  createdAt: Date;
  updatedAt: Date;
  status: SessionStatus;
}): SessionDTO {
  return {
    id: meta.id,
    projectID: meta.projectID,
    parentID: meta.parentID,
    title: meta.title,
    directory: meta.directory,
    createdAt: meta.createdAt,
    updatedAt: meta.updatedAt,
    status: meta.status,
  };
}