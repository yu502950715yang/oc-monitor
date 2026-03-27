import { useState, useEffect, useCallback } from 'react'

// 配置数据类型
export interface AppConfig {
  server: {
    port: number
  }
  polling: {
    interval: number
  }
  window: {
    width: number
    height: number
  }
  storage: {
    path: string
  }
  mcp: {
    version: string
    toolPrefixes: string[]
    displayNames: Record<string, string>
    colors: Record<string, string>
    healthThreshold: number
  }
}

// API response wrapper
interface ApiState<T> {
  data: T | null
  loading: boolean
  error: Error | null
}

// Hook for fetching app config
export function useConfig() {
  const [state, setState] = useState<ApiState<AppConfig | null>>({
    data: null,
    loading: true,
    error: null,
  })

  const fetchConfig = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    try {
      const result = await window.electronAPI.api.getConfig()
      // 后端返回 { success: true, data: ... } 格式
      const data = result?.data ?? result
      setState({ data, loading: false, error: null })
    } catch (err) {
      setState({ data: null, loading: false, error: err as Error })
    }
  }, [])

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  return { ...state, refetch: fetchConfig }
}