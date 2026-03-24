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
    getSessions: () => ipcRenderer.invoke('api:fetch', '/api/sessions'),
    getSession: (id: string) => ipcRenderer.invoke('api:fetch', `/api/sessions/${id}`),
    getActivity: (id: string) => ipcRenderer.invoke('api:fetch', `/api/sessions/${id}/activity`),
    getSessionTree: (id: string) => ipcRenderer.invoke('api:fetch', `/api/sessions/${id}/tree`),
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
        getSessions: () => Promise<any>
        getSession: (id: string) => Promise<any>
        getActivity: (id: string) => Promise<any>
        getSessionTree: (id: string) => Promise<any>
        getPlan: () => Promise<any>
        health: () => Promise<any>
      }
    }
  }
}