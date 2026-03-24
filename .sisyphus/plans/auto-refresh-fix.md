# 会话列表和活动流自动刷新修复

## TL;DR

> **快速摘要**: 修复后端数据库刷新机制，使前端轮询能够获取最新数据；修复活动流排序使其显示最新活动在前。

> **交付物**:
> - `electron/main/services/storage/parser.ts` - 添加每次 API 请求时检测数据库变化并重新加载
> - `electron/main/routes/sessions.ts` - 修复活动流排序为倒序

> **估计工作量**: Short (2个文件，修改量小)
> **并行执行**: NO - 2个任务顺序执行
> **关键路径**: 任务1 (数据库刷新) → 任务2 (排序修复)

---

## 背景

### 用户描述
- 会话列表和活动流不会自动刷新显示新数据
- 前端有3秒轮询机制，但后端返回旧数据
- 同时需要优化活动流排序（新的在前）

### 研究发现
1. **前端轮询正常**: `AppContext.tsx` 每3秒调用 `refresh()` 刷新数据
2. **数据库刷新缺失**: `parser.ts` 有 `reloadDbIfChanged()` 函数但未被调用
3. **Watcher 未监控数据库**: 监控了存储目录但没有监控 opencode.db 文件
4. **排序方向错误**: `sessions.ts` 第165行按时间升序排列（旧的在前）

### 问题根源
```
OpenCode 运行 → 数据库文件更新
    ↓
Watcher 检测变化（❌ 没有监听数据库文件）
    ↓
forceReloadDb() 不会被调用
    ↓
前端轮询请求 API → 返回旧的缓存数据
```

---

## 工作目标

### 核心目标
1. 修复会话列表和活动流自动刷新问题
2. 修复活动流排序顺序

### 具体交付物
- 修改 `parser.ts` 中的数据获取函数，每次调用前检测数据库变化并重新加载
- 修改 `sessions.ts` 中的排序逻辑，改为降序（最新在前）

### 完成定义
- [ ] OpenCode 创建新会话后，监控应用在3-6秒内显示该会话
- [ ] OpenCode 产生新活动后，监控应用在3-6秒内显示该活动
- [ ] 活动流按时间降序排列（最新活动在最上方）
- [ ] API 响应格式保持不变（向后兼容）

### 必须有
- 数据库文件变化时自动重新加载
- 并发请求时防止重复刷新（互斥锁）
- 错误处理：数据库锁定或损坏时优雅降级

### 禁止有
- 修改前端轮询机制
- 添加新依赖
- 修改数据库结构
- 修改 API 响应格式

---

## 验证策略

### 测试决策
- **基础设施存在**: NO (项目无测试框架)
- **自动化测试**: NO（手动验证）
- **QA 方式**: Agent 执行手动验证场景

### QA 策略
每个任务包含 Agent 执行的手动验证场景：
- **场景1**: 在 OpenCode 中创建新会话，等待5秒，验证会话列表出现新项
- **场景2**: 在 OpenCode 中执行工具调用，等待5秒，验证活动流出现新项
- **场景3**: 使用 curl 调用 API，验证返回数据排序正确

---

## 执行策略

### 任务顺序
```
任务1: 数据库自动刷新 → 任务2: 活动流排序修复
```
无并行执行 - 两个任务顺序执行即可。

### 依赖关系
- 任务1 和任务2 独立：无依赖关系
- 都完成后进行最终验证

---

## TODOs

- [x] 1. 修复数据库自动刷新机制

  **需要做什么**:
  - 在 `parser.ts` 中添加数据库刷新逻辑
  - 在 `getRootSessions()`, `getMessagesForSession()`, `getPartsForSession()` 等函数开头调用 `reloadDbIfChanged()`
  - 添加互斥锁防止并发请求同时刷新数据库
  - 添加错误处理：数据库锁定时优雅降级

  **禁止做什么**:
  - 不修改前端文件
  - 不添加新依赖
  - 不改变 API 响应格式

  **推荐代理类型**:
  - **分类**: `unspecified-low`
  - **原因**: 修改量小，逻辑简单

  **并行化**:
  - **可并行执行**: NO
  - **并行组**: 顺序执行
  - **阻塞**: 无
  - **被阻塞**: 任务2

  **参考**:
  - `electron/main/services/storage/parser.ts:441-477` - reloadDbIfChanged() 函数实现
  - `electron/main/services/storage/parser.ts:119-199` - querySessionsFromSqlite() 查询逻辑
  - `electron/main/services/storage/parser.ts:513-531` - getAllSessions() 调用位置

  **验收标准**:
  - [ ] OpenCode 创建新会话后，刷新机制能检测到并加载新数据
  - [ ] 并发请求不会导致数据库重复加载
  - [ ] 数据库锁定时日志有警告但不崩溃

  **QA 场景**:
  ```
  场景: 数据库自动刷新
    工具: Bash + Manual
    前置条件: OpenCode 正在运行，已有至少一个会话
    步骤:
      1. 在 OpenCode 中创建一个新会话或执行一个操作
      2. 等待约5秒
      3. 检查监控应用的会话列表是否显示新会话
    预期结果: 新会话出现在列表中
    失败表现: 列表仍显示旧数据，无新会话
    证据: .sisyphus/evidence/task-1-refresh.{png/txt}
  ```

  **提交**: YES
  - Message: `fix(storage): add per-request database reload check`
  - Files: `electron/main/services/storage/parser.ts`

- [x] 2. 修复活动流排序顺序

  **需要做什么**:
  - 修改 `sessions.ts` 第165行的排序逻辑
  - 从升序（旧的在前）改为降序（新的在前）

  **禁止做什么**:
  - 不修改其他 API 逻辑

  **推荐代理类型**:
  - **分类**: `quick`
  - **原因**: 单行修改，非常简单

  **并行化**:
  - **可并行执行**: NO
  - **并行组**: 顺序执行
  - **阻塞**: 任务1
  - **被阻塞**: 无

  **参考**:
  - `electron/main/routes/sessions.ts:161-166` - 排序逻辑位置

  **验收标准**:
  - [ ] API 返回的活动流按时间降序排列
  - [ ] 最新活动在数组第一个位置

  **QA 场景**:
  ```
  场景: 活动流排序验证
    工具: Bash (curl)
    前置条件: 已运行应用，有会话数据
    步骤:
      1. curl http://localhost:50234/api/sessions
      2. 获取第一个会话ID
      3. curl http://localhost:50234/api/sessions/{id}/activity
      4. 检查返回的 messages 和 parts 数组排序
    预期结果: messages[0].createdAt > messages[1].createdAt (降序)
    失败表现: 升序排列
    证据: .sisyphus/evidence/task-2-sort.{json/txt}
  ```

  **提交**: YES
  - Message: `fix(sessions): reverse activity stream sort order`
  - Files: `electron/main/routes/sessions.ts`

---

## 最终验证波

- [ ] F1. **会话列表刷新验证** - `unspecified-high`
  启动 OpenCode，创建新会话，等待5秒，验证监控应用显示新会话。
  输出: `刷新 [通过/失败]`

- [ ] F2. **活动流刷新验证** - `unspecified-high`
  在 OpenCode 中执行工具调用，等待5秒，验证活动流显示新活动。
  输出: `刷新 [通过/失败]`

- [ ] F3. **排序验证** - `quick`
  调用 API 检查返回数据排序顺序。
  输出: `排序 [正确/错误]`

---

## 提交策略

- **1**: `fix(storage): add per-request database reload check` — parser.ts
- **2**: `fix(sessions): reverse activity stream sort order` — sessions.ts

---

## 成功标准

### 验证命令
```bash
# 启动 OpenCode 并创建会话后
curl http://localhost:50234/api/sessions
# 预期: 返回包含最新创建的会话

curl http://localhost:50234/api/sessions/{id}/activity
# 预期: messages 和 parts 数组按时间降序排列
```

### 最终检查清单
- [ ] 数据库刷新机制正常工作
- [ ] 活动流显示最新数据在前
- [ ] 无 API 错误或崩溃
- [ ] 日志显示正常（无异常）