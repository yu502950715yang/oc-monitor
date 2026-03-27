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
      getActivity: (id: string, limit?: number) => {
        const url = limit ? `/api/sessions/${id}/activity?limit=${limit}` : `/api/sessions/${id}/activity`
        return ipcRenderer.invoke('api:fetch', url)
      },
      getSessionTree: (id: string) => ipcRenderer.invoke('api:fetch', `/api/sessions/${id}/tree`),
      getSessionStats: (id: string, tokenPrices?: Record<string, { currency: string; cache: number; input: number; output: number }>) => {
        const url = tokenPrices 
          ? `/api/sessions/${id}/stats?prices=${encodeURIComponent(JSON.stringify(tokenPrices))}`
          : `/api/sessions/${id}/stats`
        return ipcRenderer.invoke('api:fetch', url)
      },
      getDashboard: (id: string) => ipcRenderer.invoke('api:fetch', `/api/sessions/${id}/dashboard`),
      getPlan: () => ipcRenderer.invoke('api:fetch', '/api/plan'),
      getConfig: () => ipcRenderer.invoke('api:fetch', '/api/config'),
      getMcpServices: () => ipcRenderer.invoke('api:fetch', '/api/mcp-services'),
      saveMcpMappings: (mappings: any[]) => ipcRenderer.invoke('api:fetch', '/api/config/mcp-mapping', 'POST', JSON.stringify({ mappings })),
      saveMcpService: (service: { name: string; displayName: string; type: string }) => 
        ipcRenderer.invoke('api:fetch', '/api/mcp-services', 'POST', JSON.stringify(service)),
      deleteMcpService: (name: string) => 
        ipcRenderer.invoke('api:fetch', '/api/mcp-services?name=' + encodeURIComponent(name), 'DELETE'),
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
        getActivity: (id: string, limit?: number) => Promise<any>
        getSessionTree: (id: string) => Promise<any>
        getSessionStats: (id: string, tokenPrices?: Record<string, { currency: string; cache: number; input: number; output: number }>) => Promise<any>
        getDashboard: (id: string) => Promise<any>
        getPlan: () => Promise<any>
        getConfig: () => Promise<any>
        getMcpServices: () => Promise<any>
        saveMcpMappings: (mappings: any[]) => Promise<any>
        saveMcpService: (service: { name: string; displayName: string; type: string }) => Promise<any>
        deleteMcpService: (name: string) => Promise<any>
        health: () => Promise<any>
      }
    }
  }
}