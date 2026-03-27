import { useState, useEffect, useCallback } from 'react'

// Types from components
export interface Session {
  id: string
  name: string
  status: 'running' | 'waiting' | 'completed' | 'error'
  startTime: string
  progress?: number
  parentID?: string
}

export interface Activity {
  id: string
  type: 'tool' | 'message' | 'plan' | 'task' | 'error'
  content: string
  timestamp: string
  sessionId?: string
  sessionName?: string
}

export interface Plan {
  id: string
  name: string
  status: 'active' | 'completed' | 'paused'
  totalTasks: number
  completedTasks: number
  sessions: number
}

// API response wrapper
interface ApiState<T> {
  data: T | null
  loading: boolean
  error: Error | null
}

// API response with pagination info
interface SessionsResponse {
  sessions: Session[]
  total: number
  running: number
}

// Hook for fetching session list
export function useSessions(limit?: number) {
  const [state, setState] = useState<ApiState<SessionsResponse | null>>({
    data: null,
    loading: true,
    error: null,
  })

  const fetchSessions = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    try {
      const result = await window.electronAPI.api.getSessions(limit)
      setState({ data: result, loading: false, error: null })
    } catch (err) {
      setState({ data: null, loading: false, error: err as Error })
    }
  }, [limit])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  return { ...state, refetch: fetchSessions }
}

// Hook for fetching single session
export function useSession(id: string | null) {
  const [state, setState] = useState<ApiState<Session>>({
    data: null,
    loading: true,
    error: null,
  })

  const fetchSession = useCallback(async () => {
    if (!id) {
      setState({ data: null, loading: false, error: null })
      return
    }
    setState(prev => ({ ...prev, loading: true, error: null }))
    try {
      const result = await window.electronAPI.api.getSession(id)
      setState({ data: result, loading: false, error: null })
    } catch (err) {
      setState({ data: null, loading: false, error: err as Error })
    }
  }, [id])

  useEffect(() => {
    fetchSession()
  }, [fetchSession])

  return { ...state, refetch: fetchSession }
}

// Hook for fetching activity data
// 获取活动数据时的默认 limit（获取足够多的数据用于 StatsPanel 统计）
const DEFAULT_ACTIVITY_LIMIT = 1000

// Activity API 响应类型（与后端 sessions.ts /activity 端点匹配）
export interface ActivityApiResponse {
  // 旧格式兼容：某些客户端代码检查 activity.messages
  activity?: {
    messages?: Array<{
      id: string
      sessionID: string
      role: string
      agent?: string
      content: string
      tokens?: any
      cost?: number
      modelID?: string
      providerID?: string
      finish?: string
      createdAt: string
    }>
  }
  session: {
    id: string
    title: string
    directory?: string
    updatedAt?: string
  }
  messages: Array<{
    id: string
    sessionID: string
    role: string
    agent?: string
    content: string
    tokens?: any
    cost?: number
    modelID?: string
    providerID?: string
    finish?: string
    createdAt: string
  }>
  parts: Array<{
    id: string
    messageID: string
    sessionID: string
    type: string
    tool?: string
    agent?: string
    subagentType?: string
    action?: string
    status?: string
    timeStart?: number
    timeEnd?: number
    error?: string
    data?: any
    input?: string
    output?: string
    createdAt: string
  }>
  all?: any[]
  stats?: {
    totalMessages: number
    totalParts: number
    toolCount: number
    reasoningCount: number
  }
}

export function useActivity(id: string | null) {
  const [state, setState] = useState<ApiState<ActivityApiResponse | null>>({
    data: null,
    loading: true,
    error: null,
  })

  const fetchActivity = useCallback(async () => {
    if (!id) {
      setState({ data: null, loading: false, error: null })
      return
    }
    setState(prev => ({ ...prev, loading: true, error: null }))
    try {
      // 传递更大的 limit 以获取足够的活动数据进行统计
      const result = await window.electronAPI.api.getActivity(id, DEFAULT_ACTIVITY_LIMIT)
      setState({ data: result, loading: false, error: null })
    } catch (err) {
      setState({ data: null, loading: false, error: err as Error })
    }
  }, [id])

  useEffect(() => {
    fetchActivity()
  }, [fetchActivity])

  return { ...state, refetch: fetchActivity }
}

// API 返回的 Plan 进度数据结构
interface PlanProgress {
  total: number
  completed: number
  percentage: number
  items: { content: string; completed: boolean; line: number }[]
}

interface PlanApiResponse {
  projectPath?: string
  progress: PlanProgress | null
  error?: string
}

// Hook for fetching plan progress
export function usePlan() {
  const [state, setState] = useState<ApiState<PlanProgress | null>>({
    data: null,
    loading: true,
    error: null,
  })

  const fetchPlan = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    try {
      const result = await window.electronAPI.api.getPlan() as PlanApiResponse
      setState({ data: result.progress, loading: false, error: null })
    } catch (err) {
      setState({ data: null, loading: false, error: err as Error })
    }
  }, [])

  useEffect(() => {
    fetchPlan()
  }, [fetchPlan])

  return { ...state, refetch: fetchPlan }
}

// Session Tree API response type
export interface SessionTreeNode {
  id: string
  title: string
  projectID: string
  parentID?: string
  createdAt?: string
  updatedAt?: string
  children: SessionTreeNode[]
}

// Hook for fetching session tree
export function useSessionTree(id: string | null) {
  const [state, setState] = useState<ApiState<SessionTreeNode | null>>({
    data: null,
    loading: true,
    error: null,
  })

  const fetchSessionTree = useCallback(async () => {
    if (!id) {
      setState({ data: null, loading: false, error: null })
      return
    }
    setState(prev => ({ ...prev, loading: true, error: null }))
    try {
      const result = await window.electronAPI.api.getSessionTree(id)
      setState({ data: result, loading: false, error: null })
    } catch (err) {
      setState({ data: null, loading: false, error: err as Error })
    }
  }, [id])

  useEffect(() => {
    fetchSessionTree()
  }, [fetchSessionTree])

  return { ...state, refetch: fetchSessionTree }
}

// Session Stats API response type
export interface SessionStatsResponse {
  session: {
    id: string
    title: string
    status: string
    createdAt: string
    updatedAt: string
  }
  counts: {
    totalMessages: number
    totalParts: number
    toolCount: number
    reasoningCount: number
  }
  tools: {
    totalTools: number
    errorCount: number
    mcpCount: number
    skillCount: number
    errorRate: number
  }
  tokens: {
    total: number
    input?: number
    output?: number
    cache?: number
    cost?: number
    currency?: string
  }
  topSkills: { name: string; count: number }[]
}

// Hook for fetching session stats
export function useSessionStats(id: string | null) {
  const [state, setState] = useState<ApiState<SessionStatsResponse | null>>({
    data: null,
    loading: true,
    error: null,
  })

  const fetchSessionStats = useCallback(async () => {
    if (!id) {
      setState({ data: null, loading: false, error: null })
      return
    }
    setState(prev => ({ ...prev, loading: true, error: null }))
    try {
      // 获取前端配置的价格
      let tokenPrices: Record<string, { currency: string; cache: number; input: number; output: number }> = {}
      try {
        const stored = localStorage.getItem('tokenPriceConfigs')
        if (stored) {
          const configs = JSON.parse(stored)
          configs.forEach((c: any) => {
            tokenPrices[c.id] = {
              currency: c.currency,
              cache: c.cachePrice,
              input: c.inputPrice,
              output: c.outputPrice,
            }
          })
        }
      } catch (e) {
      }
      
      const result = await window.electronAPI.api.getSessionStats(id, tokenPrices)
      setState({ data: result, loading: false, error: null })
    } catch (err) {
      setState({ data: null, loading: false, error: err as Error })
    }
  }, [id])

  useEffect(() => {
    fetchSessionStats()
  }, [fetchSessionStats])

  return { ...state, refetch: fetchSessionStats }
}

// Dashboard API response type
export interface DashboardData {
  tokenData: {
    timestamp: string
    total: number
    input: number
    output: number
    reasoning: number
    cache: number
    cost: number
  }[]
  toolStats: {
    tool: string
    total: number
    completed: number
    errors: number
    avgDuration: number
    successRate: number
  }[]
  mcpStats: {
    tool: string
    total: number
    completed: number
    errors: number
    avgDuration: number
    successRate: number
  }[]
  errors: {
    id: string
    toolName: string
    timestamp: string
    error: string
    input?: string
    output?: string
  }[]
}

// Hook for fetching dashboard data
export function useDashboard(id: string | null) {
  const [state, setState] = useState<ApiState<DashboardData | null>>({
    data: null,
    loading: true,
    error: null,
  })

  const fetchDashboard = useCallback(async () => {
    if (!id) {
      setState({ data: null, loading: false, error: null })
      return
    }
    setState(prev => ({ ...prev, loading: true, error: null }))
    try {
      const result = await window.electronAPI.api.getDashboard(id)
      setState({ data: result, loading: false, error: null })
    } catch (err) {
      setState({ data: null, loading: false, error: err as Error })
    }
  }, [id])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  return { ...state, refetch: fetchDashboard }
}