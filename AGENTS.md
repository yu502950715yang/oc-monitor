# PROJECT KNOWLEDGE BASE

**Generated:** 2026-04-02
**Commit:** d8474e3f
**Branch:** main

## OVERVIEW

OC 监控助手 — 基于 Electron + React 19 的桌面应用，实时监控 OpenCode 智能体活动。后端用 Hono 嵌入式服务，前端用 React + Tailwind CSS。

## STRUCTURE

```
./
├── electron/              # Electron 主进程
│   ├── main/              # 主进程入口 + 服务
│   │   ├── index.ts       # 应用入口
│   │   ├── server.ts      # Hono HTTP 服务器
│   │   ├── config.ts      # 配置集中管理
│   │   ├── routes/        # API 路由
│   │   ├── logic/         # 业务逻辑
│   │   └── services/      # 后端服务 (storage, watcher)
│   └── preload/           # 预加载脚本
├── src/renderer/          # React 前端
│   └── src/
│       ├── main.tsx       # 前端入口
│       ├── App.tsx        # 根组件
│       ├── components/    # UI 组件
│       ├── hooks/         # React Hooks
│       ├── context/       # 状态管理
│       └── styles/        # 样式
├── dist/                  # Vite 构建输出
├── dist-electron/         # Electron 编译输出
├── release/               # 打包输出
└── package.json
```

## WHERE TO LOOK

| 任务 | 位置 | 备注 |
|------|------|------|
| 会话 API | `electron/main/routes/sessions.ts` | 获取会话列表、消息、部件 |
| 计划进度 API | `electron/main/routes/plan.ts` | boulder.json 解析 |
| 存储解析 | `electron/main/services/storage/parser.ts` | OpenCode 存储结构解析 |
| 文件监控 | `electron/main/services/watcher.ts` | chokidar 监控 |
| 活动流处理 | `electron/main/logic/activityLogic.ts` | 消息转活动流 |
| UI 组件 | `src/renderer/src/components/` | 7 个 React 组件 |
| 轮询逻辑 | `src/renderer/src/hooks/usePolling.ts` | 3 秒轮询间隔 |

## CODE MAP

| Symbol | Type | Location | Role |
|--------|------|----------|------|
| createWindow | Func | electron/main/index.ts:27 | 创建主窗口 |
| server | Obj | electron/main/server.ts | Hono 应用实例 |
| App | Comp | src/renderer/src/App.tsx | 根组件 |
| SessionList | Comp | components/SessionList.tsx | 会话列表 |
| ActivityStream | Comp | components/ActivityStream.tsx | 实时活动流 |
| ActivityTree | Comp | components/ActivityTree.tsx | 活动树可视化 |
| PlanProgress | Comp | components/PlanProgress.tsx | 计划进度 |

## CONVENTIONS

- **TypeScript**: 严格模式开启，禁止未使用变量
- **路径别名**: `@/*` → `src/renderer/src/*`
- **Electron 输出**: CommonJS → `dist-electron/`
- **前端输出**: ESM → `dist/`
- **双 tsconfig**: 根目录(前端) + electron/(后端)
- **配置集中**: 全部在 `electron/main/config.ts`
- **测试框架**: Vitest (`vitest.config.ts`)
- **测试命令**: `npm run test` / `npm run test:watch`
- **测试目录**: `tests/` (后端) + `components/__tests__/` (前端)

## ANTI-PATTERNS (THIS PROJECT)

1. **空 Catch 块** — `data-loader/index.ts:321,360` 静默吞掉错误
2. **生产环境 console.log** — 多处调试语句未移除
   - `config/loader.ts:266-349` (7处)
   - `utils/error-handling/handler.ts:71,74`
   - `routes/mcp-services.ts:220,271`
3. **过度使用 `any`** — preload/index.ts 多处, server.ts 4处
4. **`as any` 类型断言** — sessions.ts 9处, session-analyzer 1处
5. **备份文件未清理** — `sessions.ts.bak`, `parser.ts.bak` 应删除
6. **类型推断不严格** — `useApi.ts` 多处 `any[]` 参数
7. **lint 脚本失效** — package.json 有 lint 命令但无 ESLint 配置
8. **TODO 未完成** — 5处 TODO 注释
   - `types/part.ts:59`
   - `services/session-analyzer/index.ts:382`
   - `logic/activityLogic.ts:100`
   - `components/MCPConfigPage.tsx:116,127`

## UNIQUE STYLES

- **深色主题**: 背景 `#0d1117`, 文字 `#c9d1d9`, 强调 `#58a6ff`
- **状态计算**: 会话状态基于 updatedAt 自动计算 (1h内=运行中, 1-24h=等待中, >24h=完成)
- **活动树手动刷新**: 避免自动轮询导致的数据竞态

## COMMANDS

```bash
npm run dev           # 前端开发 (Vite)
npm run dev:electron  # Electron 开发模式
npm run build         # 编译 + 构建前端
npm run build:win     # Windows 安装包
npm run typecheck     # TypeScript 类型检查
```

## NOTES

- 服务器端口: 50234 (config.ts)
- 前端轮询: 3 秒间隔
- 无 CI/CD
- 无 ESLint/Prettier 配置
- 前端源码嵌套: `src/renderer/src/` (非标准 src/)
- 构建: electron-builder (NSIS/DMG)
- 根目录杂项: `fix.js` (用途不明), `.sisyphus/` (任务规划)
- 开发效率: electron:dev 每次全量编译 TypeScript
- 测试: Vitest 已配置，13个测试文件