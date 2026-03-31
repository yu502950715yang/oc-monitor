/**
 * TaskFlowView - 任务流视图组件
 * 平铺展示所有任务，按完成状态分组
 * 
 * 节点显示：任务内容 + 完成状态 + 所在行号
 * 分组显示：已完成（绿色）/ 未完成（灰色）
 */

import { useMemo } from 'react'
import { CheckCircle, Circle, ClipboardList } from 'lucide-react'

// 导入 mock 数据用于测试
import { 
  mockTaskFlow, 
  mockTaskFlowEmpty,
  mockTaskFlowPartial,
  type PlanProgress 
} from '../__tests__/fixtures/mockActivityData'

// ============ 类型定义 ============

interface TaskFlowViewProps {
  /** 任务流数据，如果不提供则使用 mock 数据 */
  taskFlow?: PlanProgress | null
  /** 是否显示刷新按钮 */
  showRefresh?: boolean
  /** 刷新回调 */
  onRefresh?: () => void
}

// ============ 主组件 ============

export default function TaskFlowView({ 
  taskFlow: propTaskFlow,
  showRefresh = false,
  onRefresh,
}: TaskFlowViewProps) {
  // 使用 prop 数据或 mock 数据
  const taskFlow = propTaskFlow ?? mockTaskFlow
  
  // 按完成状态分组
  const { completedTasks, pendingTasks } = useMemo(() => {
    if (!taskFlow || !taskFlow.items) {
      return { completedTasks: [], pendingTasks: [] }
    }
    
    return {
      completedTasks: taskFlow.items.filter(item => item.completed),
      pendingTasks: taskFlow.items.filter(item => !item.completed),
    }
  }, [taskFlow])
  
  const showEmpty = !taskFlow || taskFlow.total === 0
  
  // 刷新处理
  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh()
    }
  }
  
  // 空状态
  if (showEmpty) {
    return (
      <div className="flex-1 bg-[var(--color-bg-primary)] flex flex-col h-full overflow-hidden">
        {/* 标题栏 */}
        <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-bg-secondary)]">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-[var(--color-text-secondary)]" />
            <h2 className="text-sm font-medium text-[var(--color-text-primary)]">任务流</h2>
          </div>
          {showRefresh && onRefresh && (
            <button 
              type="button"
              onClick={handleRefresh}
              className="p-1.5 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              title="刷新"
            >
              <ClipboardList className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {/* 空状态显示 */}
        <div className="flex-1 flex items-center justify-center text-[var(--color-text-secondary)] text-sm">
          暂无任务数据
        </div>
      </div>
    )
  }
  
  return (
    <div className="flex-1 bg-[var(--color-bg-primary)] flex flex-col h-full overflow-hidden">
      {/* 标题栏 */}
      <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-bg-secondary)]">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-[var(--color-text-secondary)]" />
          <h2 className="text-sm font-medium text-[var(--color-text-primary)]">任务流</h2>
          <span className="text-xs text-[var(--color-text-muted)]">
            ({taskFlow.completed}/{taskFlow.total})
          </span>
        </div>
        {showRefresh && onRefresh && (
          <button 
            type="button"
            onClick={handleRefresh}
            className="p-1.5 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            title="刷新"
          >
            <ClipboardList className="w-4 h-4" />
          </button>
        )}
      </div>
      
      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* 已完成任务组 */}
        {completedTasks.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-success)]">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>已完成 ({completedTasks.length})</span>
            </div>
            <div className="space-y-1.5">
              {completedTasks.map((item) => (
                <TaskItem
                  key={`completed-${item.line}`}
                  content={item.content}
                  completed={item.completed}
                  line={item.line}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* 未完成任务组 */}
        {pendingTasks.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-secondary)]">
              <Circle className="w-3.5 h-3.5" />
              <span>未完成 ({pendingTasks.length})</span>
            </div>
            <div className="space-y-1.5">
              {pendingTasks.map((item) => (
                <TaskItem
                  key={`pending-${item.line}`}
                  content={item.content}
                  completed={item.completed}
                  line={item.line}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* 底部汇总 */}
      <div className="px-4 py-3 border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--color-text-secondary)]">
            总计: {taskFlow.total} 任务
          </span>
          <span className="text-[var(--color-success)]">
            {taskFlow.percentage}% 完成
          </span>
        </div>
        {/* 进度条 */}
        <div className="mt-2 w-full h-1.5 bg-[var(--color-bg-tertiary)] rounded-full overflow-hidden">
          <div 
            className="h-full bg-[var(--color-success)] rounded-full transition-all duration-300 ease-out"
            style={{ width: `${taskFlow.percentage}%` }}
          />
        </div>
      </div>
    </div>
  )
}

// ============ 任务项组件 ============

interface TaskItemProps {
  content: string
  completed: boolean
  line: number
}

function TaskItem({ content, completed, line }: TaskItemProps) {
  return (
    <div 
      className="flex items-center gap-3 px-3 py-2 rounded-md bg-[var(--color-bg-secondary)] border border-[var(--color-border)]"
    >
      {/* 状态图标 */}
      {completed ? (
        <CheckCircle 
          className="w-4 h-4 flex-shrink-0" 
          style={{ color: 'var(--color-success)' }} 
        />
      ) : (
        <Circle 
          className="w-4 h-4 flex-shrink-0" 
          style={{ color: 'var(--color-text-secondary)' }} 
        />
      )}
      
      {/* 任务内容 */}
      <span 
        className="flex-1 text-sm truncate"
        style={{ 
          color: completed ? 'var(--color-text-secondary)' : 'var(--color-text-primary)',
          textDecoration: completed ? 'line-through' : 'none',
        }}
        title={content}
      >
        {content}
      </span>
      
      {/* 行号 */}
      <span 
        className="text-xs flex-shrink-0 px-1.5 py-0.5 rounded"
        style={{ 
          backgroundColor: 'var(--color-bg-tertiary)',
          color: 'var(--color-text-muted)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        L{line}
      </span>
    </div>
  )
}

// ============ 导出 ============

export { mockTaskFlow, mockTaskFlowEmpty, mockTaskFlowPartial }
export type { PlanProgress }