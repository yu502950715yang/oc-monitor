import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import log from 'electron-log'
import { startServer, stopServer, getServerPort } from './server'
import { handleApiRequest } from './server'
import { config } from './config'

// 配置日志
log.transports.file.level = config.log.level
log.transports.file.maxSize = config.log.maxSize
log.info('应用启动...')

// 全局异常处理
process.on('uncaughtException', (error) => {
  log.error('未捕获异常:', error)
  app.exit(1)
})

process.on('unhandledRejection', (reason) => {
  log.error('未处理的Promise拒绝:', reason)
})

let mainWindow: BrowserWindow | null = null

const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged

function createWindow() {
  mainWindow = new BrowserWindow({
    width: config.window.width,
    height: config.window.height,
    title: config.app.name,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  // 根据环境加载不同URL
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  log.info('主窗口创建完成')
}

// IPC 处理器
ipcMain.handle('app:getVersion', () => {
  return app.getVersion()
})

ipcMain.handle('api:fetch', async (_, path: string, method: string = 'GET') => {
  const result = await handleApiRequest(path, method);
  // 如果状态码不是 2xx，抛出错误让前端捕获
  if (result.status >= 400) {
    throw new Error(result.data.message || result.data.error || 'API Error');
  }
  return result.data;
});

ipcMain.handle('app:getPlatform', () => {
  return process.platform
})

// 窗口控制
ipcMain.on('window:minimize', () => {
  mainWindow?.minimize()
})

ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})

ipcMain.on('window:close', () => {
  mainWindow?.close()
})

app.whenReady().then(() => {
  log.info('Electron应用就绪')
  
  // 启动 API 服务器
  try {
    startServer()
    log.info(`API 服务器已启动，端口: ${getServerPort()}`)
  } catch (error) {
    log.error('启动 API 服务器失败:', error)
  }

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  log.info('所有窗口已关闭')
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 优雅关闭
app.on('before-quit', () => {
  log.info('应用即将退出，关闭服务器...')
  stopServer()
})

app.on('will-quit', () => {
  log.info('应用已退出')
})