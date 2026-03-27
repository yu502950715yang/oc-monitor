import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react'
import type { Session } from '../components/SessionList'
import type { Activity } from '../components/ActivityStream'
import type { Plan } from '../components/PlanProgress'
import type { SessionNode } from '../components/ActivityTree'
import { useSessions, usePlan, useActivity, useSessionTree, useSessionStats, type SessionTreeNode } from '../hooks/useApi'
import { usePolling } from '../hooks/usePolling'

// 后端返回的会话统计信息
export interface SessionStats {
  totalMessages: number
  totalParts: number
  toolCount: number
  reasoningCount: number
  // 新增字段
  totalTools: number
  errorCount: number
  mcpCount: number
  skillCount: number
  errorRate: number
  totalTokens: number
  topSkills: { name: string; count: number }[]
  // Token 费用信息
  tokens?: {
    total: number
    input?: number
    output?: number
    cache?: number
    cost?: number
    currency?: string
  }
}

interface AppState {
  sessions: Session[]
  totalSessions: number
  runningSessions: number
  activities: Activity[]
  plans: Plan[]
  selectedSessionId: string | null
  activeView: 'stream' | 'tree' | 'dashboard'
  isLoading: boolean
  error: string | null
  sessionStats: SessionStats | null  // 后端返回的完整统计
}

interface AppContextType extends AppState {
  setSelectedSession: (id: string | null) => void
  setActiveView: (view: 'stream' | 'tree' | 'dashboard') => void
  addActivity: (activity: Activity) => void
  getSessionNodes: () => SessionNode[]
  refresh: () => void
  refreshSessionTree: () => void  // 单独刷新活动树数据
  loadMoreSessions: () => void  // 加载更多会话
  sessionStats: SessionStats | null  // 后端返回的完整统计
}

const AppContext = createContext<AppContextType | null>(null)

function transformSessions(apiSessions: any[]): Session[] {
  return apiSessions.map((s: any) => ({
    id: s.id,
    name: s.title || '未命名会话',
    // 后端已计算好 status，直接使用
    status: s.status || 'running',
    startTime: s.createdAt || s.startTime || '',
    parentID: s.parentID,
  }))
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [totalSessions, setTotalSessions] = useState(0)
  const [runningSessions, setRunningSessions] = useState(0)
  const [activities, setActivities] = useState<Activity[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<'stream' | 'tree' | 'dashboard'>('stream')
  const [cachedSessionTree, setCachedSessionTree] = useState<SessionTreeNode | null>(null)
  const [sessionLimit, setSessionLimit] = useState(20)
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null)

  const { data: apiSessions, loading: sessionsLoading, error: sessionsError, refetch: refetchSessions } = useSessions(sessionLimit)
  const { data: apiPlan, loading: planLoading, error: planError, refetch: refetchPlan } = usePlan()
  const { data: apiActivity, loading: activityLoading, refetch: refetchActivity } = useActivity(selectedSessionId)
  const { data: sessionTree, loading: sessionTreeLoading, refetch: refetchSessionTree } = useSessionTree(selectedSessionId)
  const { data: sessionStatsData, refetch: refetchSessionStats } = useSessionStats(selectedSessionId)
  
  
  // 缓存 sessionTree，防止轮询时短暂为空导致节点消失
  useEffect(() => {
    if (sessionTree) {
      setCachedSessionTree(sessionTree)
    }
  }, [sessionTree])

  useEffect(() => {
    if (apiSessions && apiSessions.sessions) {
      const transformed = transformSessions(apiSessions.sessions)
      setSessions(transformed)
      setTotalSessions(apiSessions.total || 0)
      setRunningSessions(apiSessions.running || 0)
      if (transformed.length > 0 && !selectedSessionId) {
        setSelectedSessionId(transformed[0].id)
      }
    }
  }, [apiSessions])

  // 加载更多会话
  const loadMoreSessions = useCallback(() => {
    setSessionLimit(prev => prev + 20)
  }, [])

  useEffect(() => {
    // 新的 API 响应格式: apiActivity 包含 messages, parts, all 等字段
    if (apiActivity?.messages || apiActivity?.parts) {
      const activities: Activity[] = []
      
      // 添加消息
      if (apiActivity.messages) {
        apiActivity.messages.forEach((m: any) => {
          const msgContent = m.content || ''
          
          // 生成消息简介
          let summary = ''
          if (m.role === 'user') {
            summary = msgContent ? '用户：' + msgContent.slice(0, 100) : '用户消息'
          } else if (m.role === 'assistant') {
            summary = msgContent ? '助手：' + msgContent.slice(0, 100) : (m.agent || '助手回复')
          } else {
            summary = m.agent || m.role || '消息'
          }
          
          activities.push({
            id: m.id,
            type: 'message' as const,
            content: m.content || m.agent || m.role || '消息',
            summary,
            timestamp: m.createdAt,
            sessionId: m.sessionID,
            sessionName: apiActivity.session?.title,
            role: m.role,
            agent: m.agent,
            messageId: m.id,
            // 增强字段：Token和费用信息
            tokens: m.tokens,
            cost: m.cost,
            modelID: m.modelID,
            providerID: m.providerID,
            finish: m.finish,
          })
        })
      }
      
      // 添加工具调用 (parts)
      if (apiActivity.parts) {
        apiActivity.parts.filter((p: any) => p.type === 'tool').slice(0, 3).forEach((p: any) => {
          // 调试工具类型
        })
        
        apiActivity.parts.forEach((p: any) => {
          // 调试每个 part 的 type
          if (p.type === 'tool') {
          }
          
          let content = p.action || p.tool || '工具调用'
          let summary = p.action || p.tool || '工具调用'
          
          // 正确的 type 设置
          const activityType = p.type === 'tool' ? 'tool' as const : p.type === 'reasoning' ? 'reasoning' as const : 'message' as const
          
          // 调试
          if (p.type === 'tool') {
          }
          
          // 计算耗时
          let duration: number | undefined
          if (p.state?.time?.start && p.state?.time?.end) {
            duration = p.state.time.end - p.state.time.start
          }
          
          // 获取推理内容
          const reasoningContent = p.type === 'reasoning' ? (p.data?.text || p.action || '') : undefined
          
          // 如果是 MCP 工具，添加标识
          if (p.tool && (p.tool.startsWith('context7_') || p.tool.startsWith('websearch_'))) {
            content = `[MCP] ${content}`
            summary = `[MCP] ${summary}`
          }
          
          // 如果是 skill 工具，提取 skill 名称和参数
          let skillName: string | undefined
          let userMessage: string | undefined
          if (p.tool === 'skill' && p.data?.state?.input) {
            skillName = p.data.state.input.name
            userMessage = p.data.state.input.user_message
            // 优先显示 skill 名称
            if (skillName) {
              content = `[Skill] ${skillName}`
              summary = `[Skill] ${skillName}${userMessage ? ': ' + userMessage.slice(0, 50) : ''}`
            }
          }
          
          activities.push({
            id: p.id,
            type: activityType,
            content,
            summary: p.type === 'reasoning' ? (p.data?.text || '推理中...').slice(0, 100) : summary,
            timestamp: p.createdAt,
            sessionId: p.sessionID,
            sessionName: apiActivity.session?.title,
            // 附加信息
            toolName: p.tool,
            agent: p.agent,  // 关联的 agent（来自父 message）
            subagentType: p.subagentType,  // 子 agent 类型（task/agent/subtask 调用时）
            status: p.status,
            input: p.input,
            output: p.output,
            messageId: p.messageID,
            // 增强字段
            reasoningContent,
            duration,
            // Skill 额外信息
            skillName,
            userMessage,
          })
        })
      }
      
      // 按时间排序并限制数量（用于展示）
      const sorted = activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 100)
      
      setActivities(sorted)
    } else if (apiActivity?.activity?.messages) {
      // 兼容旧格式
      const messages = apiActivity.activity.messages
      const transformed: Activity[] = messages.map((m: any) => ({
        id: m.id,
        type: 'message' as const,
        content: m.agent || m.role || '消息',
        timestamp: m.createdAt,
        sessionId: m.sessionID,
        sessionName: apiActivity.session?.title,
      }))
      setActivities(transformed.reverse())
    } else {
      setActivities([])
    }
  }, [apiActivity])

  // 使用 useSessionStats hook 获取会话统计
  useEffect(() => {
    if (sessionStatsData) {
      setSessionStats({
        totalMessages: sessionStatsData.counts.totalMessages,
        totalParts: sessionStatsData.counts.totalParts,
        toolCount: sessionStatsData.counts.toolCount,
        reasoningCount: sessionStatsData.counts.reasoningCount,
        totalTools: sessionStatsData.tools.totalTools,
        errorCount: sessionStatsData.tools.errorCount,
        mcpCount: sessionStatsData.tools.mcpCount,
        skillCount: sessionStatsData.tools.skillCount,
        errorRate: sessionStatsData.tools.errorRate,
        totalTokens: sessionStatsData.tokens.total,
        topSkills: sessionStatsData.topSkills,
        // 传递 tokens 信息（包含 cost 和 currency）
        tokens: sessionStatsData.tokens,
      })
    }
  }, [sessionStatsData])

  useEffect(() => {
    if (apiPlan && apiPlan.total > 0) {
      setPlans([{
        id: 'current',
        name: '当前计划',
        status: apiPlan.completed === apiPlan.total ? 'completed' : 'active',
        totalTasks: apiPlan.total,
        completedTasks: apiPlan.completed,
        sessions: 1,
      }])
    } else {
      setPlans([])
    }
  }, [apiPlan])

  const refresh = useCallback(() => {
    refetchSessions()
    refetchPlan()
    refetchActivity()
    refetchSessionStats()
    // 活动树视图时不自动刷新 sessionTree（避免数据竞态导致节点闪烁）
    // 活动树用户需手动点击刷新按钮
    if (activeView !== 'tree') {
      refetchSessionTree()
    }
  }, [refetchSessions, refetchPlan, refetchActivity, refetchSessionStats, refetchSessionTree, activeView])

  // 单独刷新活动树数据（手动刷新时使用）
  const refreshSessionTree = useCallback(() => {
    refetchSessionTree()
  }, [refetchSessionTree])

  usePolling({
    onPoll: refresh,
    enabled: true,
  })

  const isLoading = sessionsLoading || planLoading || activityLoading
  const error = (sessionsError || planError)?.message || null

  const setSelectedSession = useCallback((id: string | null) => {
    setSelectedSessionId(id)
  }, [])

  const handleSetActiveView = useCallback((view: 'stream' | 'tree' | 'dashboard') => {
    setActiveView(view)
  }, [])

  const addActivity = useCallback((activity: Activity) => {
    setActivities(prev => [activity, ...prev].slice(0, 100))
  }, [])

  const getSessionNodes = useCallback((): SessionNode[] => {
    // 使用缓存的 sessionTree，防止轮询时短暂为空
    const tree = sessionTree || cachedSessionTree
    
    // 如果有 sessionTree 数据（活动树视图），使用会话树
    if (tree) {
      const buildNodes = (node: SessionTreeNode, level: number, parentId: string | null): SessionNode[] => {
        // 根据 updatedAt 判断状态（1小时内更新算 running，否则算 completed）
        let status: 'running' | 'waiting' | 'completed' | 'error' = 'running'
        if (node.updatedAt) {
          const updatedTime = new Date(node.updatedAt).getTime()
          const now = Date.now()
          const hoursSinceUpdate = (now - updatedTime) / (1000 * 60 * 60)
          if (hoursSinceUpdate > 24) {
            status = 'completed'
          } else if (hoursSinceUpdate > 1) {
            status = 'waiting'
          }
        }
        
        const nodes: SessionNode[] = [{
          id: node.id,
          name: node.title,
          status,
          parentId,
          level,
          createdAt: node.createdAt,
          updatedAt: node.updatedAt,
          projectID: node.projectID,
        }]
        if (node.children) {
          for (const child of node.children) {
            nodes.push(...buildNodes(child, level + 1, node.id))
          }
        }
        return nodes
      }
      return buildNodes(tree, 0, null)
    }
    
    // 否则使用所有会话（用于没有选中会话或数据未加载时）
    const sessionMap = new Map(sessions.map(s => [s.id, s]))
    
    const getLevel = (session: Session, visited: Set<string> = new Set()): number => {
      if (!session.parentID || visited.has(session.id)) {
        return 0
      }
      visited.add(session.id)
      const parent = sessionMap.get(session.parentID)
      if (!parent) {
        return 0
      }
      return 1 + getLevel(parent, visited)
    }
    
    return sessions.map((session) => ({
      id: session.id,
      name: session.name,
      status: session.status,
      parentId: session.parentID || null,
      level: getLevel(session),
    }))
  }, [sessions, sessionTree])

  return (
    <AppContext.Provider
      value={{
        sessions,
        totalSessions,
        runningSessions,
        activities,
        plans,
        selectedSessionId,
        activeView,
        isLoading,
        error,
        setSelectedSession,
        setActiveView: handleSetActiveView,
        addActivity,
        getSessionNodes,
        refresh,
        refreshSessionTree,
        loadMoreSessions,
        sessionStats,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within AppProvider')
  }
  return context
}
