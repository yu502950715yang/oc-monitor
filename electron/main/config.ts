/**
 * OC 监控助手 - 配置文件
 * 
 * 在此文件中修改应用的各项配置
 */

export const config = {
  // ====================
  // 应用配置
  // ====================
  app: {
    /** 应用名称（显示在窗口标题） */
    name: 'OC 监控助手',
    
    /** 应用版本 */
    version: '0.1.0',
  },

  // ====================
  // 服务器配置
  // ====================
  server: {
    /** HTTP 服务器端口 */
    port: 50234,
    
    /** 服务器主机地址（仅支持本机） */
    host: 'localhost',
  },

  // ====================
  // OpenCode 存储配置
  // ====================
  storage: {
    /** OpenCode 根目录
     * Windows 默认: C:\Users\<用户名>\.local\share\opencode\
     * macOS 默认: ~/.local/share/opencode/
     * 
     * 可以通过设置环境变量 XDG_DATA_HOME 来覆盖
     * 此目录包含 opencode.db (SQLite) 和 storage/ (JSON 文件)
     */
    rootPath: '',  // 空字符串表示使用默认路径
    
    /** 会话目录名称 (JSON 存储) */
    sessionDir: 'session',
    
    /** 消息目录名称 (JSON 存储) */
    messageDir: 'message',
    
    /** 部件目录名称 (JSON 存储) */
    partDir: 'part',
    
    /** SQLite 数据库文件名 */
    dbFileName: 'opencode.db',
  },

  // ====================
  // 文件监控配置
  // ====================
  watcher: {
    /** 文件变化防抖延迟（毫秒） */
    debounceDelay: 100,
    
    /** 是否忽略初始扫描 */
    ignoreInitial: true,
  },

  // ====================
  // 前端轮询配置
  // ====================
  polling: {
    /** 数据轮询间隔（毫秒） */
    interval: 3000,
  },

  // ====================
  // 窗口配置
  // ====================
  window: {
    /** 默认窗口宽度 */
    width: 1200,
    
    /** 默认窗口高度 */
    height: 800,
    
    /** 是否允许窗口最大化 */
    maximizable: true,
    
    /** 是否允许窗口最小化 */
    minimizable: true,
    
    /** 是否允许窗口关闭 */
    closable: true,
  },

  // ====================
  // 日志配置
  // ====================
  log: {
    /** 日志级别: info, warn, error, debug */
    level: 'info',
    
    /** 日志文件最大大小（字节） */
    maxSize: 10 * 1024 * 1024,  // 10MB
  },
} as const;

export type Config = typeof config;