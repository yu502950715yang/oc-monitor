import { contextBridge, ipcRenderer } from 'electron'

// 使用 contextBridge 暴露安全的 API
contextBridge.exposeInMainWorld('electronAPI', {
  // 应用信息
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getPlatform: () => ipcRenderer.invoke('app:getPlatform'),
  
  // 窗口控制
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  
  // 事件监听
  onUpdateAvailable: (callback: (info: any) => void) => {
    ipcRenderer.on('update-available', (_, info) => callback(info))
    return () => ipcRenderer.removeAllListeners('update-available')
  },

// 后端 API 调用
    api: {
      getSessions: (limit?: number) => {
        const url = limit ? `/api/sessions?limit=${limit}` : '/api/sessions'
        return ipcRenderer.invoke('api:fetch', url)
      },
      getSession: (id: string) => ipcRenderer.invoke('api:fetch', `/api/sessions/${id}`),
      getActivity: (id: string, limit?: number, filters?: Record<string, string[] | undefined>) => {
        const params = new URLSearchParams()
        if (limit) params.set('limit', String(limit))
        // 添加筛选参数
        if (filters) {
          if (filters.type?.length) params.set('type', filters.type.join(','))
          if (filters.tool?.length) params.set('tool', filters.tool.join(','))
          if (filters.status?.length) params.set('status', filters.status.join(','))
          if (filters.role?.length) params.set('role', filters.role.join(','))
          if (filters.agent?.length) params.set('agent', filters.agent.join(','))
          if (filters.subagentType?.length) params.set('subagentType', filters.subagentType.join(','))
        }
        const queryString = params.toString()
        const url = `/api/sessions/${id}/activity${queryString ? '?' + queryString : ''}`
        return ipcRenderer.invoke('api:fetch', url)
      },
      getSessionTree: (id: string) => ipcRenderer.invoke('api:fetch', `/api/sessions/${id}/tree`),
      getSessionStats: (id: string) => ipcRenderer.invoke('api:fetch', `/api/sessions/${id}/stats`),
      getDashboard: (id: string) => ipcRenderer.invoke('api:fetch', `/api/sessions/${id}/dashboard`),
      getPlan: () => ipcRenderer.invoke('api:fetch', '/api/plan'),
      health: () => ipcRenderer.invoke('api:fetch', '/api/health'),
    },
})

// 类型声明
declare global {
  interface Window {
    electronAPI: {
      getVersion: () => Promise<string>
      getPlatform: () => Promise<string>
      minimize: () => void
      maximize: () => void
      close: () => void
      onUpdateAvailable: (callback: (info: any) => void) => () => void
      api: {
        getSessions: (limit?: number) => Promise<any>
        getSession: (id: string) => Promise<any>
        getActivity: (id: string, limit?: number, filters?: Record<string, string[] | undefined>) => Promise<any>
        getSessionTree: (id: string) => Promise<any>
        getSessionStats: (id: string) => Promise<any>
        getDashboard: (id: string) => Promise<any>
        getPlan: () => Promise<any>
        health: () => Promise<any>
      }
    }
  }
}