# OpenCode 监控页面 UI 重设计方案

## TL;DR

> **快速摘要**：将现有4列布局重构为2列布局，合并会话列表和智能体列表到左侧，右侧专注展示实时智能体活动详情。重点关注 skill/lsp/model/mcp 调用数据的展示。

> **交付成果**：
> - 重构后的 App.vue（2列布局）
> - 优化后的 StatsPanel（紧凑型）
> - AgentActivity 组件增强（添加事件类型筛选功能）

> **预估工作量**：Short（中等）
> **并行执行**：否 - 顺序执行（布局修改依赖紧密）
> **关键路径**：App.vue 布局重构 → StatsPanel 调整 → AgentActivity 筛选功能 → 响应式适配

---

## 背景

### 原始需求
用户反馈：
1. 当前页面分为4列，数据展示区域太窄，不美观
2. 主要关心实时数据 - 智能体的活动（skill 调用、lsp 操作、model 调用、mcp 调用）

### 现状分析（4列布局）
```
┌──────────┬──────────┬──────────┬─────────────────┐
│ 统计面板  │ 会话列表  │ 智能体   │  智能体活动详情  │
│ (320px)  │ (280px)  │ (320px)  │    (flex)       │
└──────────┴──────────┴──────────┴─────────────────┘
```

### 研究发现
- 后端已有 `/sessions/{id}/agents` 和 `/sessions/{id}/agents/{name}/events` API
- 前端使用 Vue 3 + Naive UI
- 实时更新通过 WebSocket + 轮询实现
- 项目无测试框架，使用 Agent-Executed QA

### Metis 审查建议
- **保留**：现有 Naive UI 组件使用模式、中文界面、WebSocket/轮询机制
- **不修改**：后端 API、数据存储架构、现有功能组件
- **边界**：仅做布局重构，不添加新功能（筛选除外）

---

## 工作目标

### 核心目标
将4列布局改为2列布局，提升数据可视面积，聚焦实时智能体活动展示。

### 具体交付物
- App.vue 重构为2列布局
- StatsPanel 紧凑化并移入左侧面板
- 会话列表 + 智能体列表合并到左侧面板
- AgentActivity 增加事件类型筛选功能（skill/lsp/model/mcp）
- 响应式适配（768px 断点）

### 验收条件
- [ ] 页面布局从4列变为2列
- [ ] 左侧面板包含：统计信息 + 会话列表 + 智能体列表
- [ ] 右侧面板显示实时智能体活动详情
- [ ] 可按事件类型筛选（skill/lsp/model/mcp）
- [ ] 实时更新功能正常工作
- [ ] 响应式布局在 768px 断点正常切换

### 必须包含
- 实时数据展示
- WebSocket/轮询状态指示器
- 空状态处理

### 禁止包含
- 修改后端 API
- 添加新依赖
- 数据导出功能
- 用户管理功能

---

## 验证策略

### 测试决策
- **基础设施存在**：否
- **自动化测试**：无
- **Agent-Executed QA**：每次任务后执行 QA 场景验证

### QA 策略
所有验证通过 Agent-Executed QA 执行：
- **Frontend/UI**：使用 Playwright 验证布局、交互、响应式
- **每个 QA 场景必须包含**：具体步骤、断言、证据路径
- **最少**：1个正常路径 + 1个边界/错误场景

---

## 执行策略

### 任务序列

```
任务 1: App.vue 重构为 2 列布局
  ↓
任务 2: 调整 StatsPanel 位置和样式（紧凑型）
  ↓
任务 3: 合并会话列表和智能体列表到左侧面板
  ↓
任务 4: AgentActivity 增加事件类型筛选功能
  ↓
任务 5: 响应式布局适配（768px 断点）
  ↓
最终验证: 整体功能和布局验证
```

### 依赖关系
- 任务 2 依赖任务 1（布局框架）
- 任务 3 依赖任务 1（确定左侧面板结构）
- 任务 4 依赖任务 1 和任务 3（AgentActivity 在右侧）
- 任务 5 依赖任务 1-4（整体完成后适配）

---

## 待办事项

- [x] 1. App.vue 重构为 2 列布局

  **What to do**:
  - 移除外层 StatsPanel 的独立侧边栏（app-sider）
  - 创建 2 列主布局：左侧（400px）+ 右侧（flex）
  - 移除 three-column-layout，改用双列布局
  - 保留 WebSocket 状态指示器（移至左侧面板顶部）

  **Must NOT do**:
  - 不修改数据流逻辑
  - 不修改 API 调用
  - 不改变现有组件的功能

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 纯 UI 布局重构，需要精确的 CSS 和组件结构调整
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `vue-best-practices`: 现有代码已遵循 Vue 最佳实践

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: 任务 2, 3, 4, 5
  - **Blocked By**: None

  **References**:
  - `frontend/src/App.vue:66-141` - 当前 4 列布局结构
  - `frontend/src/App.vue:145-370` - 现有 CSS 样式

  **Acceptance Criteria**:
  - [ ] App.vue 布局从 4 列变为 2 列
  - [ ] 左侧列宽度约 400px
  - [ ] 右侧列为 flex，自动填充剩余空间

  **QA Scenarios**:

  ```
  Scenario: 布局从 4 列变为 2 列
    Tool: playwright_browser_navigate
    Preconditions: 前端已启动 http://localhost:5173
    Steps:
      1. 打开浏览器导航到 http://localhost:5173
      2. 等待页面加载完成
      3. 截图保存
    Expected Result: 页面显示为 2 列布局（非 4 列）
    Evidence: .sisyphus/evidence/task-1-layout.png

  Scenario: 页面无控制台错误
    Tool: playwright_browser_console_messages
    Preconditions: 页面已加载
    Steps:
      1. 获取控制台消息
      2. 检查是否有 error 级别消息
    Expected Result: 无 error 级别控制台错误
    Evidence: .sisyphus/evidence/task-1-console.txt
  ```

  **Commit**: YES
  - Message: `refactor: restructure App.vue from 4-column to 2-column layout`
  - Files: `frontend/src/App.vue`

---

- [x] 2. 调整 StatsPanel 位置和样式（紧凑型）

  **What to do**:
  - 将 StatsPanel 移入左侧面板顶部
  - 调整 StatsPanel 为紧凑型（减少内边距、简化展示）
  - 保持统计功能完整：总会话数、总事件数、活跃会话数

  **Must NOT do**:
  - 不修改 StatsPanel 的数据逻辑
  - 不删除任何统计数据

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 需要调整组件样式和布局位置
  - **Skills**: [`vue-best-practices`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: None
  - **Blocked By**: 任务 1

  **References**:
  - `frontend/src/components/StatsPanel.vue` - 现有 StatsPanel 组件

  **Acceptance Criteria**:
  - [ ] StatsPanel 显示在左侧面板顶部
  - [ ] 样式为紧凑型
  - [ ] 数据展示完整

  **QA Scenarios**:

  ```
  Scenario: StatsPanel 在左侧面板顶部显示
    Tool: playwright_browser_snapshot
    Preconditions: 页面已加载
    Steps:
      1. 截取页面快照
      2. 检查 StatsPanel 位置
    Expected Result: StatsPanel 在页面左侧区域顶部
    Evidence: .sisyphus/evidence/task-2-stats-position.png
  ```

  **Commit**: YES
  - Message: `refactor: move StatsPanel to left panel in compact style`
  - Files: `frontend/src/components/StatsPanel.vue`, `frontend/src/App.vue`

---

- [x] 3. 合并会话列表和智能体列表到左侧面板

  **What to do**:
  - 在左侧面板中，会话列表和智能体列表上下排列
  - 会话列表占左侧面板约 50% 高度
  - 智能体列表占左侧面板约 50% 高度
  - 添加分隔线和标题区分

  **Must NOT do**:
  - 不修改 SessionList 组件功能
  - 不修改 AgentList 组件功能
  - 不改变数据加载逻辑

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 需要调整组件布局和比例
  - **Skills**: [`vue-best-practices`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: None
  - **Blocked By**: 任务 1

  **References**:
  - `frontend/src/components/SessionList.vue` - 会话列表组件
  - `frontend/src/components/AgentList.vue` - 智能体列表组件
  - `frontend/src/stores/eventStore.ts` - 状态管理

  **Acceptance Criteria**:
  - [ ] 会话列表显示在 StatsPanel 下方
  - [ ] 智能体列表显示在会话列表下方
  - [ ] 两者都有滚动条，不会溢出

  **QA Scenarios**:

  ```
  Scenario: 会话列表和智能体列表上下排列在左侧
    Tool: playwright_browser_snapshot
    Preconditions: 页面已加载，有会话数据
    Steps:
      1. 截取页面左侧快照
      2. 确认两个列表的位置关系
    Expected Result: 会话列表在上，智能体列表在下
    Evidence: .sisyphus/evidence/task-3-lists-position.png
  ```

  **Commit**: YES
  - Message: `refactor: combine session list and agent list in left panel`
  - Files: `frontend/src/App.vue`

---

- [x] 4. AgentActivity 增加事件类型筛选功能

  **What to do**:
  - 在 AgentActivity 组件顶部添加工具栏
  - 添加事件类型筛选下拉框（全部/skill/lsp/model/mcp/other）
  - 根据筛选条件过滤显示的活动事件
  - 高亮显示重要的活动类型（skill/lsp/model/mcp）

  **Must NOT do**:
  - 不修改后端 API
  - 不改变现有事件显示逻辑（只添加过滤）

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 需要添加 UI 控件和过滤逻辑
  - **Skills**: [`vue-best-practices`, `vue-pinia-best-practices`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: None
  - **Blocked By**: 任务 1, 3

  **References**:
  - `frontend/src/components/AgentActivity.vue` - 活动详情组件
  - `frontend/src/types/index.ts:70-77` - AgentActivity 类型定义

  **Acceptance Criteria**:
  - [ ] 筛选下拉框显示在 AgentActivity 顶部
  - [ ] 可选择筛选：全部/skill/lsp/model/mcp/other
  - [ ] 选择筛选后，活动列表相应过滤

  **QA Scenarios**:

  ```
  Scenario: 筛选下拉框可用
    Tool: playwright_browser_snapshot
    Preconditions: 选择了会话和智能体
    Steps:
      1. 检查 AgentActivity 顶部是否有筛选控件
      2. 点击筛选下拉框
    Expected Result: 显示筛选选项（全部/skill/lsp/model/mcp/other）
    Evidence: .sisyphus/evidence/task-4-filter-dropdown.png

  Scenario: 选择筛选后活动列表过滤
    Tool: playwright_browser_select_option
    Preconditions: 筛选下拉框已展开
    Steps:
      1. 选择 "skill" 选项
      2. 检查活动列表变化
    Expected Result: 列表只显示 skill 相关活动
    Evidence: .sisyphus/evidence/task-4-filter-result.png
  ```

  **Commit**: YES
  - Message: `feat: add event type filter to AgentActivity`
  - Files: `frontend/src/components/AgentActivity.vue`

---

- [x] 5. 响应式布局适配（768px 断点）

  **What to do**:
  - 更新 @media (max-width: 768px) 断点样式
  - 在小屏幕上改为单列布局
  - 保留基本的响应式切换逻辑

  **Must NOT do**:
  - 不改变桌面端的 2 列布局
  - 不添加额外的断点

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 响应式 CSS 调整
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: None
  - **Blocked By**: 任务 1-4

  **References**:
  - `frontend/src/App.vue:352-369` - 现有响应式样式

  **Acceptance Criteria**:
  - [ ] 768px 以下屏幕显示为单列
  - [ ] 布局切换流畅

  **QA Scenarios**:

  ```
  Scenario: 小屏幕下单列布局
    Tool: playwright_browser_resize
    Preconditions: 桌面宽度打开页面
    Steps:
      1. 调整浏览器窗口宽度为 480px
      2. 截取快照
    Expected Result: 页面显示为单列布局
    Evidence: .sisyphus/evidence/task-5-responsive.png
  ```

  **Commit**: YES
  - Message: `style: add responsive support for 2-column layout`
  - Files: `frontend/src/App.vue`

---

## 最终验证

### F1. 计划合规性审查
- 读取计划文件，验证每个 "Must Have" 都有对应实现
- 验证没有包含 "Must NOT Have" 中的内容
- 验证所有任务都有验收标准

### F2. 代码质量审查
- 运行 `npm run build` 验证无构建错误
- 检查 CSS 样式是否有明显问题

### F3. 手动验证（Agent-Executed QA）
- 启动前后端服务
- 访问 http://localhost:5173
- 验证 2 列布局正确显示
- 验证筛选功能可用
- 验证实时更新正常
- 验证响应式布局正常

### F4. 范围忠诚度检查
- 验证所有改动都在计划范围内
- 验证没有功能蔓延

---

## 提交策略

| 提交 | 描述 | 文件 |
|------|------|------|
| 1 | refactor: restructure App.vue from 4-column to 2-column layout | App.vue |
| 2 | refactor: move StatsPanel to left panel in compact style | StatsPanel.vue, App.vue |
| 3 | refactor: combine session list and agent list in left panel | App.vue |
| 4 | feat: add event type filter to AgentActivity | AgentActivity.vue |
| 5 | style: add responsive support for 2-column layout | App.vue |

---

## 成功标准

### 功能验证
- [ ] 4列 → 2列布局转换完成
- [ ] 左侧面板功能完整（统计+会话+智能体）
- [ ] 右侧面板显示实时活动
- [ ] 筛选功能可用
- [ ] 实时更新正常

### 质量验证
- [ ] 页面布局美观、数据展示充分
- [ ] 响应式适配正常
- [ ] 无控制台错误