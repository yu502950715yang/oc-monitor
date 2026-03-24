# COMPONENT DIRECTORY

## OVERVIEW

7 个 React 19 UI 组件，展示会话、活动流、计划进度和活动树。

## WHERE TO LOOK

| File | Role |
|------|------|
| SessionList.tsx | 会话列表，含状态自动计算 (running/waiting/completed) |
| ActivityStream.tsx | 实时活动流，含工具类型颜色映射和展开详情 |
| ActivityTree.tsx | 活动树可视化，使用 @xyflow/react，手动刷新模式 |
| PlanProgress.tsx | 计划进度，显示任务完成百分比 |
| Layout.tsx | 布局容器 |
| EmptyState.tsx | 空状态占位 |
| ErrorBoundary.tsx | 错误边界组件 |

## CONVENTIONS

- **手动刷新**: ActivityTree 使用手动刷新，点击按钮触发 `refreshSessionTree()`
- **颜色映射**: 工具类型和状态有固定颜色方案 (read=蓝, write=绿, edit=黄等)
- **时间格式**: 相对时间 (刚刚/N分钟前/N小时前) + 超过7天显示具体日期

## ANTI-PATTERNS

1. **ActivityStream.tsx:83** — 生产环境 `console.log` 输出调试信息
   ```tsx
   console.log('[ActivityStream] 总数:', activities?.length, ...)
   ```
   应移除或改为条件性日志

2. **重复时间格式化** — `formatRelativeTime` 在 SessionList 和 ActivityStream 中重复定义
   应提取到 `src/utils/format.ts`