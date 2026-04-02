# 前端代码知识库

**生成时间**: 2026-03-24

## OVERVIEW

React 19 前端应用，实时展示 OpenCode 智能体会话、活动流和计划进度。

## STRUCTURE

```
src/renderer/src/
├── components/           # 7 个 UI 组件
│   ├── ActivityTree.tsx  # 活动树可视化（手动刷新）
│   ├── ActivityStream.tsx # 实时活动流
│   ├── SessionList.tsx   # 会话列表
│   ├── PlanProgress.tsx  # 计划进度
│   ├── Layout.tsx        # 布局容器
│   ├── EmptyState.tsx    # 空状态占位
│   └── ErrorBoundary.tsx # 错误边界
├── context/
│   └── AppContext.tsx    # 全局状态管理（usePolling 集成点）
├── hooks/
│   ├── useApi.ts         # API 调用 hooks（5个）
│   └── usePolling.ts     # 轮询管理（3秒间隔）
├── styles/
│   └── index.css         # Tailwind 入口
└── App.tsx               # 根组件
```

## WHERE TO LOOK

| 任务 | 位置 | 备注 |
|------|------|------|
| 轮询逻辑 | `hooks/usePolling.ts:39` | setInterval 驱动，间隔 3000ms |
| 状态管理 | `context/AppContext.tsx:41` | AppProvider 包装所有组件 |
| 活动流渲染 | `components/ActivityStream.tsx:80` | 按类型着色，可展开详情 |
| 活动树手动刷新 | `components/ActivityTree.tsx` | 点击刷新按钮触发，避免竞态 |

## CONVENTIONS

- **组件风格**: 函数式组件 + React Hooks
- **样式**: Tailwind CSS（深色主题 #0d1117 背景）
- **路径别名**: `@/*` → `src/renderer/src/*`（配置在 vite.config.ts）
- **视图切换**: activeView 状态控制 stream/tree 切换

## ANTI-PATTERNS

1. **生产环境 console.log** — 调试日志未移除
   - `AppContext.tsx:55-57,120,126,137,172-178`
   - `ActivityStream.tsx:105`

2. **类型 any** — useApi.ts 部分位置类型推断不严格

3. **TODO 未完成** — 2处
   - `components/MCPConfigPage.tsx:116,127`