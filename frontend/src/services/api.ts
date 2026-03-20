import axios, { type AxiosInstance, type AxiosError } from 'axios'
import type { OpenCodeEvent, Session, Statistics, ApiResponse, EventQueryParams, Agent, AgentActivity } from '@/types'

// API基础URL配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7000'
const API_PREFIX = '/api/v1'

// WebSocket URL配置
export const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:7000'

// 创建axios实例
const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}${API_PREFIX}`,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器 - 添加认证token等
apiClient.interceptors.request.use(
  (config) => {
    // 可以在这里添加认证token
    // const token = localStorage.getItem('token')
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`
    // }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器 - 统一错误处理
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse<unknown>>) => {
    let errorMessage = '请求失败'
    
    if (error.response) {
      // 服务器返回错误
      const data = error.response.data
      errorMessage = data?.message || `服务器错误: ${error.response.status}`
    } else if (error.request) {
      // 请求发出但没有收到响应
      errorMessage = '网络连接失败，请检查后端服务是否运行'
    } else {
      // 请求配置出错
      errorMessage = error.message || '请求配置错误'
    }
    
    console.error('API请求错误:', errorMessage, error)
    return Promise.reject(new Error(errorMessage))
  }
)

// ==================== 事件API ====================

/**
 * 获取事件列表
 * 后端直接返回数组，不是 ApiResponse 包装格式
 */
export async function fetchEvents(params?: EventQueryParams): Promise<OpenCodeEvent[]> {
  const response = await apiClient.get<OpenCodeEvent[]>('/events', { params })
  return response.data || []
}

/**
 * 获取单个事件详情
 */
export async function fetchEvent(eventId: string): Promise<OpenCodeEvent> {
  const response = await apiClient.get<OpenCodeEvent>(`/events/${eventId}`)
  return response.data
}

/**
 * 提交新事件
 * 后端直接返回 EventResponse，不是 ApiResponse 包装格式
 */
export async function postEvent(event: Partial<OpenCodeEvent>): Promise<OpenCodeEvent> {
  const response = await apiClient.post<OpenCodeEvent>('/events', event)
  return response.data
}

// ==================== 统计API ====================

/**
 * 获取统计数据
 * 后端直接返回 Statistics 对象
 */
export async function fetchStatistics(): Promise<Statistics> {
  const response = await apiClient.get<Statistics>('/statistics')
  return response.data
}

// ==================== 会话API ====================

/**
 * 获取会话列表
 * 后端直接返回数组，不是 ApiResponse 包装格式
 */
export async function fetchSessions(): Promise<{ sessions: Session[] }> {
  const response = await apiClient.get<Session[]>('/sessions')
  return { sessions: response.data || [] }
}

/**
 * 获取会话详情
 */
export async function fetchSession(sessionId: string): Promise<Session> {
  const response = await apiClient.get<Session>(`/sessions/${sessionId}`)
  return response.data
}

/**
 * 获取会话事件列表
 */
export async function fetchSessionEvents(sessionId: string): Promise<OpenCodeEvent[]> {
  const response = await apiClient.get<OpenCodeEvent[]>(`/sessions/${sessionId}/events`)
  return response.data || []
}

// ==================== 智能体API ====================

/**
 * 获取智能体列表
 * 后端返回 Agent 数组
 */
export async function fetchAgents(sessionId: string): Promise<Agent[]> {
  const response = await apiClient.get<Agent[]>(`/sessions/${sessionId}/agents`)
  return response.data || []
}

/**
 * 获取智能体活动
 * 返回指定智能体在会话中的活动记录
 */
export async function fetchAgentEvents(sessionId: string, agentName: string): Promise<AgentActivity[]> {
  const response = await apiClient.get<AgentActivity[]>(`/sessions/${sessionId}/agents/${agentName}/events`)
  return response.data || []
}

// ==================== 健康检查 ====================

/**
 * API健康检查
 */
export async function healthCheck(): Promise<boolean> {
  try {
    await apiClient.get('/health')
    return true
  } catch {
    return false
  }
}

export default apiClient
