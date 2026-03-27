// Global type declarations for Electron preload API

export interface ElectronAPI {
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
    getSessionStats: (id: string) => Promise<any>
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

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}