/**
 * OpenCode事件类型
 */
export interface OpenCodeEvent {
  id: string
  session_id: string
  event_type: string
  content: string
  timestamp: string
  agent_type?: string
  metadata?: Record<string, unknown>
}

/**
 * 会话类型 - 与后端 sessions API 匹配
 */
export interface Session {
  id: string
  session_id: string
  start_time?: string  // 后端返回 first_event_time
  end_time?: string    // 后端返回 last_event_time
  agent_count: number  // 后端未返回，暂时为 0
  event_count: number
  status: 'active' | 'completed' | 'error'  // 后端未返回，暂时为 'active'
}

/**
 * 统计数据类型
 */
export interface Statistics {
  total_sessions: number
  active_sessions: number
  total_events: number
  events_today: number
  agent_types: Record<string, number>
  event_types: Record<string, number>
}

/**
 * API响应类型
 */
export interface ApiResponse<T> {
  data: T
  message?: string
  success: boolean
}

/**
 * 事件列表查询参数
 */
export interface EventQueryParams {
  session_id?: string
  event_type?: string
  limit?: number
  offset?: number
}

/**
 * 代理类型
 */
export interface Agent {
  name: string
  eventCount: number
  status: 'busy' | 'idle' | 'unknown'
}

/**
 * 代理活动类型
 */
export interface AgentActivity {
  id: string
  type: string
  input: any
  output: string
  timestamp: string
  tool?: string
}
