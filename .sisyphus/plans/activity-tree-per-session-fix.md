# 活动树按会话隔离显示修复计划

## TL;DR

> **快速摘要**: 修复活动树，使其只显示选中会话的子树，而不是显示所有会话。

> **交付物**:
> - `src/renderer/src/context/AppContext.tsx` - 添加获取会话树的 API 调用
> - `src/renderer/src/hooks/useApi.ts` - 添加 useSessionTree hook
> - `src/renderer/src/components/ActivityTree.tsx` - 接收并显示选中会话的子树

> **估计工作量**: Short (3处修改)
> **并行执行**: NO - 顺序执行

---

## 背景

### 问题描述
当前活动树显示所有会话的层级关系，而不是选中会话的子树。当用户点击不同的会话时，活动树不会相应更新。

### 问题根源
1. **数据源错误**: `AppContext.tsx` 中 `getSessionNodes()` 使用所有会话数据，而不是选中会话的子树
2. **未使用 API**: 后端已提供 `/api/sessions/:id/tree` 端点获取单个会话的子树，但前端未使用
3. **组件 Props 缺失**: ActivityTree 组件没有接收 selectedSessionId 参数

### 参考实现 (ocwatch-java)
在 ocwatch-java 项目中，活动图 (GraphView) 接收:
- `rootSessionId`: 当前选中的会话 ID
- `sessions`: 该会话的活动数据

数据流:
```
选择会话 → selectedSessionId 更新
  → useSelectedActivityGraph(selectedSessionId)
  → fetch /api/sessions/:id/activity
  → GraphView 显示该会话的活动树
```

---

## 工作目标

### 核心目标
活动树显示选中会话的子树，而非所有会话

### 具体交付物
1. 在 `useApi.ts` 中添加 `useSessionTree` hook，调用 `/api/sessions/:id/tree`
2. 在 `AppContext.tsx` 中获取选中会话的子树数据
3. 修改 `ActivityTree` 组件接收会话树数据

### 完成定义
- [ ] 选中会话时，活动树显示该会话及其子会话
- [ ] 切换会话时，活动树相应更新

### 必须有
- 不修改 API 响应格式
- 保持现有功能兼容

### 禁止有
- 不添加新依赖
- 不修改后端 API

---

## 验证策略

### 测试决策
- **基础设施存在**: NO
- **自动化测试**: NO
- **QA 方式**: 手动验证

---

## 执行策略

### 任务顺序
```
Task 1: 添加 useSessionTree hook → Task 2: 在 AppContext 中获取会话树 → Task 3: 修改 ActivityTree 显示
```

---

## TODOs

- [x] 1. 添加 useSessionTree hook

  **需要做什么**:
  - 在 `useApi.ts` 中添加 `useSessionTree(id)` hook
  - 调用 `window.electronAPI.api.getSessionTree(id)` 获取会话子树

  **禁止做什么**:
  - 不修改现有 hook 逻辑

  **参考**:
  - `src/renderer/src/hooks/useApi.ts` - 现有 hook 模式

  **提交**: YES

- [x] 2. 在 AppContext 中获取会话树

  **需要做什么**:
  - 添加 sessionTree 状态
  - 当 selectedSessionId 变化时，获取该会话的子树
  - 将树数据传递给 ActivityTree

  **禁止做什么**:
  - 不修改其他状态逻辑

  **参考**:
  - `src/renderer/src/context/AppContext.tsx`

  **提交**: YES

- [x] 3. 修改 ActivityTree 接收会话树数据

  **需要做什么**:
  - 修改 ActivityTree 接收 sessionTree 作为 prop
  - 使用 sessionTree 数据渲染节点和边

  **禁止做什么**:
  - 不修改 UI 样式

  **参考**:
  - `src/renderer/src/components/ActivityTree.tsx`

  **提交**: YES

---

## 最终验证波

- [x] F1. **手动验证** - 切换会话，观察活动树更新

---

## 成功标准

- [ ] 选中会话时，活动树显示该会话的子树
- [ ] 切换会话时，活动树正确更新
- [ ] 构建成功