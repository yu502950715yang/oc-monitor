import { useCallback, useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import ActivityTreeTabs, { type ViewMode } from './ActivityTreeTabs'
import ErrorBoundary from './ErrorBoundary'

// 导入 4 个视图组件
import SessionTreeView from './views/SessionTreeView'
import AgentTreeView from './views/AgentTreeView'
import TaskFlowView from './views/TaskFlowView'
import ToolChainView from './views/ToolChainView'

// 导入类型定义和 hooks
import { useSessionTree } from '../hooks/useApi'
import type { Activity } from './ActivityStream'
import type { PartMeta, PlanProgress } from './__tests__/fixtures/mockActivityData'

export interface SessionNode {
  id: string
  name: string
  status: 'running' | 'waiting' | 'completed' | 'error'
  parentId?: string | null
  level: number
  createdAt?: string
  updatedAt?: string
  projectID?: string
}

interface ActivityTreeProps {
  sessions: SessionNode[]
}

export default function ActivityTree({ sessions }: ActivityTreeProps) {
  const [view, setView] = useState<ViewMode>('session')
  const { refreshSessionTree, activities, plans, selectedSessionId } = useApp()
  const [isRefreshing, setIsRefreshing] = useState(false)

  // 使用 useSessionTree hook 获取会话树数据
  const { data: sessionTree } = useSessionTree(selectedSessionId)

  // 手动刷新活动树
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true)
    refreshSessionTree()
    // 短暂延迟后恢复按钮状态（让用户知道点击生效了）
    setTimeout(() => setIsRefreshing(false), 500)
  }, [refreshSessionTree])

  // 从 activities 中提取工具调用数据
  // 用于智能体树（type='tool' 且 subagentType 存在）和工具链（type='tool'）
  const toolParts = useMemo((): PartMeta[] => {
    return activities
      .filter((activity): activity is Activity => 
        activity.type === 'tool' && 'toolName' in activity
      )
      .map(activity => ({
        id: activity.id,
        messageID: activity.messageId || '',
        sessionID: activity.sessionId || '',
        type: 'tool',
        tool: activity.toolName,
        subagentType: activity.subagentType,
        action: activity.content,
        status: activity.status,
        timeStart: activity.duration ? Date.now() - activity.duration * 1000 : undefined,
        timeEnd: activity.duration ? Date.now() : undefined,
        error: activity.error,
        data: activity.data,
        input: activity.input,
        output: activity.output,
        createdAt: activity.timestamp,
      }))
  }, [activities])

  // 提取智能体调用数据（有 subagentType 的工具调用）
  const agentParts = useMemo((): PartMeta[] => {
    return toolParts.filter(part => part.subagentType)
  }, [toolParts])

  // 将 plans 转换为 PlanProgress 格式
  const planProgress = useMemo((): PlanProgress | null => {
    if (!plans || plans.length === 0) return null
    const plan = plans[0]
    return {
      total: plan.totalTasks,
      completed: plan.completedTasks,
      percentage: Math.round((plan.completedTasks / plan.totalTasks) * 100),
      items: plan.items || [],
    }
  }, [plans])

  // 根据 view 状态渲染对应的视图组件
  const renderView = () => {
    switch (view) {
      case 'session':
        return (
          <SessionTreeView
            sessionTree={sessionTree}
            showRefresh
            onRefresh={handleRefresh}
          />
        )
      case 'agent':
        return (
          <AgentTreeView
            data={agentParts}
            emptyText="暂无智能体调用记录"
          />
        )
      case 'task':
        return (
          <TaskFlowView
            taskFlow={planProgress}
            showRefresh
            onRefresh={handleRefresh}
          />
        )
      case 'tool':
        return (
          <ToolChainView
            toolChain={toolParts}
            showRefresh
            onRefresh={handleRefresh}
          />
        )
      default:
        return null
    }
  }

  // 检查是否有会话数据
  const showEmpty = !sessionTree || sessions.length === 0

  if (showEmpty) {
    return (
      <div className="flex-1 bg-[var(--color-bg-primary)] flex flex-col h-full overflow-hidden">
        <ActivityTreeTabs
          view={view}
          onViewChange={setView}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />
        <div className="flex-1 flex items-center justify-center text-[var(--color-text-secondary)] text-sm">
          暂无会话数据
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-[var(--color-bg-primary)] flex flex-col h-full overflow-hidden">
      {/* Tab 切换标题栏 */}
      <ActivityTreeTabs
        view={view}
        onViewChange={setView}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      {/* 内容区域：根据 view 状态渲染不同视图 */}
      <div className="flex-1 flex overflow-hidden h-full">
        <ErrorBoundary>
          {renderView()}
        </ErrorBoundary>
      </div>
    </div>
  )
}