# OC 监控助手

实时监控 OpenCode 智能体活动的桌面应用

[English](./README_en.md)

## 功能

| 功能 | 说明 |
|------|------|
| 会话列表 | 显示所有会话，自动计算状态（运行中/等待中/已完成） |
| 活动流 | 实时展示工具调用、消息、推理内容 |
| 计划进度 | 显示当前计划的任务完成情况 |
| 活动树 | 可视化会话的父子层级关系 |

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建 Windows 安装包
npm run build:win

# 直接运行（Windows）
release\win-unpacked\OCMonitor.exe
```

## 技术栈

- **Electron 33** - 桌面框架
- **React 19 + Vite 7** - 前端
- **Hono** - 嵌入式 HTTP 服务
- **Tailwind CSS** - 样式
- **@xyflow/react** - 活动树可视化
- **chokidar** - 文件监控

## 数据来源

应用读取 OpenCode 本地存储：
- Windows: `%USERPROFILE%\.local\share\opencode\storage\`
- macOS: `~/.local/share/opencode/storage/`

## 配置

编辑 `electron/main/config.ts`：

```typescript
server: { port: 50234 },  // 服务器端口
polling: { interval: 3000 },  // 轮询间隔（毫秒）
window: { width: 1200, height: 800 },  // 窗口大小
```

## 注意事项

- 仅读取数据，不修改任何文件
- 不控制智能体行为（仅监控）
- 数据为只读，不影响 OpenCode 正常运行

## 许可证

MIT License