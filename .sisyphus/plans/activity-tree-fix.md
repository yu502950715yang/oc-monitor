# 活动树修复计划

## TL;DR

> **快速摘要**: 修复活动树的父子关系显示问题，使用真实的会话父子关系数据。

> **交付物**:
> - `src/renderer/src/components/SessionList.tsx` - 添加 parentID 字段
> - `src/renderer/src/context/AppContext.tsx` - 修复数据转换和节点生成逻辑

> **估计工作量**: Short (3处修改，很简单)
> **并行执行**: NO - 顺序执行
> **关键路径**: Session接口 → transformSessions → getSessionNodes

---

## 背景

### 问题描述
活动树组件（ActivityTree）显示的会话父子关系是错误的。目前的逻辑硬编码将所有会话（除第一个外）都设为第一个会话的子节点，这不符合真实的会话层级关系。

### 问题根源
1. **Session 接口缺少 parentID**: `SessionList.tsx` 中的 Session 接口没有定义 parentID 字段
2. **数据转换未映射 parentID**: `AppContext.tsx` 中的 transformSessions 函数没有提取 API 返回的 parentID
3. **节点生成使用错误逻辑**: `getSessionNodes` 函数硬编码 parentId，忽略真实数据

### API 已返回正确数据
API (`/api/sessions`) 已经正确返回了 parentID：
```typescript
// sessions.ts:37-44
const sessionList = sessions.map((s) => ({
  id: s.id,
  title: s.title,
  parentID: s.parentID,  // ✅ 已返回
  ...
}))
```

---

## 工作目标

### 核心目标
修复活动树显示真实的会话父子关系

### 具体交付物
- 在 `SessionList.tsx` 的 Session 接口中添加 `parentID` 字段
- 在 `AppContext.tsx` 的 transformSessions 中映射 `parentID`
- 在 `AppContext.tsx` 的 getSessionNodes 中使用真实的 `parentID`

### 完成定义
- [ ] 会话的 parentID 从 API 正确传递到前端
- [ ] 活动树显示真实的父子关系，非硬编码

### 必须有
- 不修改 API 响应格式
- 保持向后兼容

### 禁止有
- 不添加新依赖
- 不修改数据库结构

---

## 验证策略

### 测试决策
- **基础设施存在**: NO
- **自动化测试**: NO（手动验证）
- **QA 方式**: 代码审查 + 编译验证

---

## 执行策略

### 任务顺序
```
Task 1: 添加 parentID 到 Session 接口 → Task 2: 修复 transformSessions → Task 3: 修复 getSessionNodes
```

---

## TODOs

- [x] 1. 添加 parentID 到 Session 接口

  **需要做什么**:
  - 在 `SessionList.tsx` 的 Session 接口中添加 `parentID?: string` 字段

  **禁止做什么**:
  - 不修改其他字段

  **推荐代理类型**:
  - **分类**: `quick`
  - **原因**: 单行修改

  **并行化**:
  - **可并行执行**: NO
  - **并行组**: 顺序执行

  **参考**:
  - `src/renderer/src/components/SessionList.tsx:1-7` - Session 接口位置

  **验收标准**:
  - [ ] Session 接口包含 parentID 字段

  **提交**: YES
  - Message: `fix(types): add parentID to Session interface`
  - Files: `src/renderer/src/components/SessionList.tsx`

- [x] 2. 修复 transformSessions 映射 parentID

  **需要做什么**:
  - 在 `AppContext.tsx` 的 transformSessions 函数中添加 `parentID: s.parentID`

  **禁止做什么**:
  - 不修改其他逻辑

  **推荐代理类型**:
  - **分类**: `quick`
  - **原因**: 单行修改

  **并行化**:
  - **可并行执行**: NO
  - **并行组**: 顺序执行
  - **阻塞**: Task 1
  - **被阻塞**: 无

  **参考**:
  - `src/renderer/src/context/AppContext.tsx:29-36` - transformSessions 位置

  **验收标准**:
  - [ ] transformSessions 返回的数据包含 parentID

  **提交**: YES
  - Message: `fix(context): map parentID in transformSessions`
  - Files: `src/renderer/src/context/AppContext.tsx`

- [x] 3. 修复 getSessionNodes 使用真实 parentID

  **需要做什么**:
  - 修改 getSessionNodes 函数，使用 session.parentID 而非硬编码逻辑
  - 需要计算每个会话的 level（层级）

  **禁止做什么**:
  - 不修改其他逻辑

  **推荐代理类型**:
  - **分类**: `quick`
  - **原因**: 逻辑简单

  **并行化**:
  - **可并行执行**: NO
  - **并行组**: 顺序执行
  - **阻塞**: Task 2
  - **被阻塞**: 无

  **参考**:
  - `src/renderer/src/context/AppContext.tsx:172-180` - getSessionNodes 位置

  **算法说明**:
  ```
  1. 遍历所有会话
  2. 对于每个会话：
     - parentId = session.parentID (从数据中获取)
     - level = 计算层级深度（根会话为0，子会话为1，以此类推）
  3. 使用 Map 缓存已计算的节点，以便查找父节点
  ```

  **验收标准**:
  - [ ] getSessionNodes 返回的节点使用真实的 parentID

  **提交**: YES
  - Message: `fix(context): use real parentID in getSessionNodes`
  - Files: `src/renderer/src/context/AppContext.tsx`

---

## 最终验证波

- [x] F1. **TypeScript 编译验证** - `quick`
  运行 `npx tsc --noEmit` 验证无编译错误。
  输出: `编译 [通过]`

- [x] F2. **Vite 构建验证** - `quick`
  运行 `npx vite build` 验证构建成功。
  输出: `构建 [通过]`

---

## 提交策略

- **1**: `fix(types): add parentID to Session interface` — SessionList.tsx
- **2**: `fix(context): map parentID in transformSessions` — AppContext.tsx
- **3**: `fix(context): use real parentID in getSessionNodes` — AppContext.tsx

---

## 成功标准

### 验证命令
```bash
npx tsc --noEmit
# 预期: 无错误

npx vite build
# 预期: 构建成功
```

### 最终检查清单
- [ ] Session 接口包含 parentID
- [ ] 数据转换正确映射 parentID
- [ ] 活动树使用真实父子关系
- [ ] TypeScript 编译通过
- [ ] Vite 构建成功