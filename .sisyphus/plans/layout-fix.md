# 布局修复计划：固定头部/底部 + 三列独立滚动

## TL;DR

> 修复 CSS 布局实现：固定头部和底部，中间三列独立滚动。

> **交付物**：
> - 修复后的布局文件
> - 验证三个列可以独立滚动而不互相影响

> **预估工作量**：小
> **并行执行**：否 - 顺序修改

---

## 上下文

### 原始需求
用户要求修复页面布局：固定头部和底部，中间三个列（会话列表、活动流/树、计划进度）独立滚动。

### 当前状态
- **语法错误**：已修复（用户手动完成）
- **布局问题**: 已完成 ✅

### 问题分析
通过代码审查发现：
1. `Layout.tsx`: 头部和底部已经是 `flex-shrink-0`（固定）
2. `App.tsx`: 中间容器缺少 `h-full`，导致高度无法传递到子元素
3. 三个列组件内部已经有 `overflow-y-auto`，但容器高度缺失导致滚动失效

---

## 工作目标

### 具体交付物
1. 修改 `src/renderer/src/App.tsx` - 给中间容器添加 `h-full`
2. 修改 `src/renderer/src/components/Layout.tsx` - 根容器使用 `h-screen` 替代 `min-h-screen`
3. 修改 `src/renderer/src/components/ActivityTree.tsx` - 添加 overflow 处理
4. 验证布局效果

### 完成定义
- [x] 头部固定在顶部，不随页面滚动
- [x] 底部固定在底部，不随页面滚动
- [x] 左侧会话列表可以独立滚动
- [x] 中间活动流/树可以独立滚动
- [x] 右侧计划进度可以独立滚动
- [x] 三个列滚动互不影响

---

## 验证策略

### QA 场景

**场景：验证三列独立滚动**
- 工具：手动测试（启动应用）
- 步骤：
  1. 启动应用 `npm run dev`
  2. 滚动左侧会话列表 - 应该独立滚动
  3. 滚动中间活动流 - 应该独立滚动
  4. 滚动右侧计划进度 - 应该独立滚动
  5. 滚动其中一个区域时，其他区域应保持不动
- 预期结果：三个区域独立滚动
- 证据：启动应用目视验证

---

## 执行策略

### 任务序列
1. 修改 App.tsx 中间容器添加 h-full（已有计划）
2. 修改 Layout.tsx 根容器高度（`min-h-screen` → `h-screen`）
3. 修改 ActivityTree.tsx 添加 overflow 处理
4. 启动应用验证

---

## TODOs

- [x] 1. 修复 App.tsx 中间容器高度

  **修改内容**：
  - 在 `App.tsx` 第 30 行，将 `<div className="flex-1 flex flex-col">` 改为 `<div className="flex-1 flex flex-col h-full">`
  - 确保中间容器高度传递到子元素
  - **状态**: 已完成（代码已有 h-full）

  **QA 场景**：
  - 启动应用 `npm run dev`
  - 验证三个列可以独立滚动

  **提交**：是
  - 信息：`fix: 修复布局 - 添加 h-full 实现独立滚动`
  - 文件：`src/renderer/src/App.tsx`

- [x] 2. 修复 Layout.tsx 根容器高度

  **修改内容**：
  - 在 `src/renderer/src/components/Layout.tsx` 第 9 行
  - 将 `min-h-screen` 改为 `h-screen`
  - 添加 `overflow-hidden` 到根容器
  - **状态**: 已完成

  **推荐 Agent**: quick

  **QA 场景**：
  - 启动应用，滚动页面
  - 确认 header 和 footer 固定不滚动

  **提交**：是
  - 信息：`fix: 固定头部和底部布局`
  - 文件：`src/renderer/src/components/Layout.tsx`

- [x] 3. 修复 ActivityTree.tsx overflow 处理

  **修改内容**：
  - 在 `src/renderer/src/components/ActivityTree.tsx` 根容器添加 `overflow-hidden`
  - 参考 SessionList 和 PlanProgress 的实现方式
  - **状态**: 已完成

  **推荐 Agent**: quick

  **QA 场景**：
  - 切换到"活动树"视图
  - 滚动查看布局是否正确

  **提交**：是
  - 信息：`fix: 添加 ActivityTree overflow 处理`
  - 文件：`src/renderer/src/components/ActivityTree.tsx`

---

## 提交策略

- **1**: `fix: 修复布局 - 添加 h-full 实现独立滚动` — src/renderer/src/App.tsx
- **2**: `fix: 固定头部和底部布局` — src/renderer/src/components/Layout.tsx
- **3**: `fix: 添加 ActivityTree overflow 处理` — src/renderer/src/components/ActivityTree.tsx

---

## 成功标准

- [x] App.tsx 已添加 h-full
- [x] Layout.tsx 已使用 h-screen
- [x] ActivityTree.tsx 已添加 overflow 处理
- [x] 三个列可以独立滚动
- [x] 头部和底部固定不动
- [x] 活动树视图正常显示
- [x] 构建通过，无错误