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
export function useActivity(id: string | null) {
  const [state, setState] = useState<ApiState<Activity[]>>({
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
      const result = await window.electronAPI.api.getActivity(id)
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