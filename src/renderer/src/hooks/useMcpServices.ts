import { useState, useEffect, useCallback } from 'react'

// MCP 服务数据类型
export interface McpService {
  name: string
  status: 'running' | 'stopped' | 'error'
  enabled: boolean
}

// API response wrapper
interface ApiState<T> {
  data: T | null
  loading: boolean
  error: Error | null
}

// Hook for fetching MCP services list
export function useMcpServices() {
  const [state, setState] = useState<ApiState<McpService[]>>({
    data: null,
    loading: true,
    error: null,
  })

  const fetchMcpServices = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    try {
      const result = await window.electronAPI.api.getMcpServices()
      // 后端返回 { success: true, data: [...] } 格式
      const data = result?.data ?? result
      setState({ data, loading: false, error: null })
    } catch (err) {
      setState({ data: null, loading: false, error: err as Error })
    }
  }, [])

  useEffect(() => {
    fetchMcpServices()
  }, [fetchMcpServices])

  return { ...state, refetch: fetchMcpServices }
}