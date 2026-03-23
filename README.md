# OC 监控助手

> 实时监控 OpenCode 智能体活动的桌面应用程序

简体中文 | [English](./README_en.md)

## 项目简介

OC 监控助手是一个基于 Electron 开发的桌面应用程序，用于实时监控 [OpenCode](https://opencode.com) 智能体的工作状态。通过简洁的中文界面，用户可以直观地查看智能体的会话、活动流和计划进度。

本项目是 [OCWatch](https://github.com/ocm-ai/ocwatch) 的桌面版封装，保留了核心监控功能，同时提供了更易于部署的桌面应用体验。

## 功能特性

### 核心功能

- 📋 **会话列表** - 显示当前和历史的 OpenCode 会话
- 🔄 **实时活动流** - 实时展示智能体的工具调用、操作和消息
- 📊 **计划进度** - 显示当前计划的任务完成状态
- 🌳 **活动树可视化** - 图形化展示智能体会话的父子层级关系

### 用户体验

- 🇨🇳 **全中文界面** - 专为中文用户设计
- 🌙 **深色主题** - 护眼设计，专注数据显示
- ⚡ **轻量快速** - Electron + Vite 高性能架构
- 🔒 **安全可靠** - 仅读取数据，不修改任何文件

## 技术栈

| 层级 | 技术选择 |
|------|----------|
| 桌面框架 | Electron 33+ |
| 后端服务 | Node.js + Hono (嵌入式) |
| 前端框架 | React 19 + Vite |
| UI 样式 | Tailwind CSS |
| 可视化 | @xyflow/react |
| 文件监控 | chokidar |
| 打包工具 | electron-builder |

## 系统要求

- **操作系统**: Windows 10/11 (x64) 或 macOS 10.15+
- **内存**: 至少 4GB RAM
- **硬盘**: 至少 500MB 可用空间

## 快速开始

### 方式一：直接运行（推荐）

下载或克隆项目后：

```bash
# 进入项目目录
cd E:\code\oc-monitor

# 运行开发模式
npm run dev
```

### 方式二：运行打包后的应用

```bash
# Windows
release\win-unpacked\OCMonitor.exe
```

### 方式三：构建安装包

```bash
# 安装依赖
npm install

# 构建 Windows 安装包
npm run build:win

# 构建 macOS 安装包（需要在 macOS 上运行）
npm run build:mac
```

构建完成后，安装包会生成在 `release` 目录下。

## 项目结构

```
oc-monitor/
├── electron/                 # Electron 主进程代码
│   ├── main/
│   │   ├── index.ts         # 应用入口
│   │   ├── server.ts        # Hono HTTP 服务器
│   │   ├── routes/          # API 路由
│   │   └── services/        # 后端服务
│   │       ├── storage/     # OpenCode 存储解析器
│   │       └── watcher.ts   # 文件监控服务
│   └── preload/             # 预加载脚本
├── src/renderer/            # React 前端代码
│   └── src/
│       ├── components/      # UI 组件
│       ├── hooks/           # React Hooks
│       ├── context/         # 状态管理
│       └── App.tsx          # 主应用组件
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

## 数据来源

应用会读取 OpenCode 的本地存储目录来获取监控数据：

- **Windows**: `C:\Users\<用户名>\.local\share\opencode\storage\`
- **macOS**: `~/.local/share/opencode/storage/`

存储目录包含以下内容：

| 目录/文件 | 说明 |
|-----------|------|
| `session/*.json` | 会话元数据 |
| `message/*.json` | 消息内容 |
| `part/*.json` | 工具调用和部件 |
| `.sisyphus/boulder.json` | 计划进度数据 |

## 常见问题

### Q: 为什么显示"暂无会话"？

请确保：
1. OpenCode 正在运行或曾经运行过
2. OpenCode 存储目录存在且包含数据
3. 数据路径正确（见上文"数据来源"）

### Q: 活动流不实时更新？

应用使用 3 秒轮询机制更新数据。如果需要更实时的更新，可以修改 `src/renderer/src/hooks/usePolling.ts` 中的轮询间隔。

### Q: 如何查看日志？

日志文件位置：
- **Windows**: `%APPDATA%\OCMonitor\logs\`
- **macOS**: `~/Library/Logs/OCMonitor/`

### Q: 可以自定义监控路径吗？

可以！所有配置都在 `electron/main/config.ts` 文件中，详见下文"配置文件说明"。

## 配置文件说明

所有可配置的选项都在 `electron/main/config.ts` 文件中：

```typescript
export const config = {
  // ====================
  // 应用配置
  // ====================
  app: {
    name: 'OC 监控助手',      // 应用名称（窗口标题）
    version: '0.1.0',         // 应用版本
  },

  // ====================
  // 服务器配置
  // ====================
  server: {
    port: 50234,              // HTTP 服务器端口
    host: 'localhost',        // 服务器主机地址
  },

  // ====================
  // OpenCode 存储配置
  // ====================
  storage: {
    rootPath: '',             // OpenCode 存储根目录（空=自动检测）
    sessionDir: 'session',    // 会话目录名称
    messageDir: 'message',    // 消息目录名称
    partDir: 'part',          // 部件目录名称
  },

  // ====================
  // 文件监控配置
  // ====================
  watcher: {
    debounceDelay: 100,       // 文件变化防抖延迟（毫秒）
    ignoreInitial: true,      // 是否忽略初始扫描
  },

  // ====================
  // 前端轮询配置
  // ====================
  polling: {
    interval: 3000,           // 数据轮询间隔（毫秒）
  },

  // ====================
  // 窗口配置
  // ====================
  window: {
    width: 1200,              // 默认窗口宽度
    height: 800,              // 默认窗口高度
    maximizable: true,        // 是否允许窗口最大化
    minimizable: true,        // 是否允许窗口最小化
    closable: true,           // 是否允许窗口关闭
  },

  // ====================
  // 日志配置
  // ====================
  log: {
    level: 'info',            // 日志级别: info, warn, error, debug
    maxSize: 10 * 1024 * 1024, // 日志文件最大大小（字节）
  },
}
```

### 常用配置修改示例

#### 1. 修改服务器端口

```typescript
server: {
  port: 8080,  // 改为 8080 端口
},
```

#### 2. 修改数据轮询间隔

```typescript
polling: {
  interval: 5000,  // 改为 5 秒
},
```

#### 3. 修改窗口默认大小

```typescript
window: {
  width: 1400,
  height: 900,
},
```

#### 4. 修改日志级别

```typescript
log: {
  level: 'debug',  // 改为 debug 级别，可查看更多调试信息
},
```

修改配置后，重新运行 `npm run build` 即可生效。

## 界面预览

```
┌─────────────────────────────────────────────────────────────┐
│  OC 监控助手                              版本: 0.1.0       │
├─────────────────────────────────────────────────────────────┤
│  会话列表                    │  活动流                      │
│  ┌──────────────────┐       │  ┌────────────────────────┐  │
│  │ 会话 1 - 运行中  │       │  │ [10:30] 工具调用: Read │  │
│  │ 会话 2 - 已完成  │       │  │ [10:29] 工具调用: Bash │  │
│  │ 会话 3 - 已完成  │       │  │ [10:28] 消息: 用户回复  │  │
│  └──────────────────┘       │  └────────────────────────┘  │
│                              │                               │
│  计划进度                    │  活动树                      │
│  ┌──────────────────┐       │  ┌────────────────────────┐  │
│  │ ████████░░ 80%   │       │  │      [根会话]           │  │
│  │ 任务 1 ✓        │       │  │     ↙     ↘            │  │
│  │ 任务 2 ✓        │       │  │  [子1]   [子2]          │  │
│  │ 任务 3 - 进行中 │       │  └────────────────────────┘  │
│  └──────────────────┘       │                               │
├─────────────────────────────────────────────────────────────┤
│  状态: 已连接  |  OpenCode 存储路径: ~/.local/share/opencode│
└─────────────────────────────────────────────────────────────┘
```

## 注意事项

- ⚠️ 本应用仅监控 OpenCode 的活动，不会修改任何数据
- ⚠️ 不支持控制智能体行为（仅监控）
- ⚠️ 不包含系统托盘、开机自启等功能
- ⚠️ 数据为只读，不会影响 OpenCode 的正常运行

## 许可证

本项目基于 MIT 许可证开源。

## 相关链接

- [OpenCode 官网](https://opencode.com)
- [OCWatch 原项目](https://github.com/ocm-ai/ocwatch)
- [Electron 文档](https://www.electronjs.org/docs)
- [React 文档](https://react.dev)
- [Vite 文档](https://vitejs.dev)

---

如果有问题或建议，欢迎提交 Issue 或 Pull Request。