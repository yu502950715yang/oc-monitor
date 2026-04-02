# AGENTS.md - electron/main

## OVERVIEW

Electron 主进程后端，提供 HTTP API 服务和数据解析，监听 OpenCode 存储文件。

## WHERE TO LOOK

| 文件 | 职责 |
|------|------|
| `index.ts` | Electron 应用入口，窗口创建，IPC 处理器 |
| `server.ts` | Hono HTTP 服务器 (端口 50234)，路由注册，文件监控启动 |
| `config.ts` | 配置集中管理：服务器、存储路径、日志、窗口 |
| `routes/sessions.ts` | 会话 API：列表、详情、消息、工具调用、活动树 |
| `routes/plan.ts` | 计划进度 API：boulder.json 解析 |
| `routes/health.ts` | 健康检查 API |
| `logic/activityLogic.ts` | 工具调用格式化、活动状态计算、中文显示名映射 |
| `services/storage/parser.ts` | OpenCode 存储解析：SQLite 查询 + JSON 文件回退 |
| `services/watcher.ts` | chokidar 文件监控，检测存储变化 |

## CONVENTIONS

- **后端框架**: Hono (轻量 HTTP 框架)
- **数据库**: sql.js 内存 SQLite，文件变化自动重载
- **数据源优先级**: SQLite > JSON 文件
- **存储路径**: `~/.local/share/opencode/` (Windows: `%USERPROFILE%\.local\share\opencode`)
- **会话状态计算**: 基于 updatedAt (1h 内=运行中, 1-24h=等待中, >24h=完成)

## ANTI-PATTERNS

1. **空 Catch 块** - `data-loader/index.ts:321,360` 静默吞掉错误
2. **过度使用 any** - sessions.ts 大量 `(as any)` 类型断言，server.ts 4处
3. **生产环境调试** - 多处 console.log 未移除
   - `config/loader.ts:266-349` (7处)
   - `utils/error-handling/handler.ts:71,74`
   - `routes/mcp-services.ts:220,271`
4. **备份文件未清理** - `parser.ts.bak`, `sessions.ts.bak` 仍存在
5. **TODO 未完成** - 3处
   - `types/part.ts:59`
   - `services/session-analyzer/index.ts:382`
   - `logic/activityLogic.ts:100`