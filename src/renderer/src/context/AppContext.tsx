import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react'
import type { Session } from '../components/SessionList'
import type { Activity } from '../components/ActivityStream'
import type { Plan } from '../components/PlanProgress'
import type { SessionNode } from '../components/ActivityTree'
import { useSessions, usePlan, useActivity, useSessionTree, type SessionTreeNode } from '../hooks/useApi'
import { usePolling } from '../hooks/usePolling'

interface AppState {
  sessions: Session[]
  activities: Activity[]
  plans: Plan[]
  selectedSessionId: string | null
  activeView: 'stream' | 'tree'
  isLoading: boolean
  error: string | null
}

interface AppContextType extends AppState {
  setSelectedSession: (id: string | null) => void
  setActiveView: (view: 'stream' | 'tree') => void
  addActivity: (activity: Activity) => void
  getSessionNodes: () => SessionNode[]
  refresh: () => void
}

const AppContext = createContext<AppContextType | null>(null)

function transformSessions(apiSessions: any[]): Session[] {
  return apiSessions.map((s: any) => ({
    id: s.id,
    name: s.title || '未命名会话',
    status: 'running' as const,
    startTime: s.createdAt ? new Date(s.createdAt).toLocaleTimeString('zh-CN', { hour12: false }) : '--:--:--',
    parentID: s.parentID,
  }))
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<'stream' | 'tree'>('stream')

  const { data: apiSessions, loading: sessionsLoading, error: sessionsError, refetch: refetchSessions } = useSessions()
  const { data: apiPlan, loading: planLoading, error: planError, refetch: refetchPlan } = usePlan()
  const { data: apiActivity, loading: activityLoading, refetch: refetchActivity } = useActivity(selectedSessionId)
  const { data: sessionTree, loading: sessionTreeLoading, refetch: refetchSessionTree } = useSessionTree(selectedSessionId)
  
  // 调试日志
  console.log('[AppContext] selectedSessionId:', selectedSessionId)
  console.log('[AppContext] sessionTree:', sessionTree)
  console.log('[AppContext] sessionTreeLoading:', sessionTreeLoading)

  useEffect(() => {
    if (apiSessions) {
      const transformed = transformSessions(apiSessions)
      setSessions(transformed)
      if (transformed.length > 0 && !selectedSessionId) {
        setSelectedSessionId(transformed[0].id)
      }
    }
  }, [apiSessions])

  useEffect(() => {
    // 新的 API 响应格式: apiActivity 包含 messages, parts, all 等字段
    if (apiActivity?.messages || apiActivity?.parts) {
      const activities: Activity[] = []
      
      // 添加消息
      if (apiActivity.messages) {
        apiActivity.messages.forEach((m: any) => {
          activities.push({
            id: m.id,
            type: 'message' as const,
            content: m.content || m.agent || m.role || '消息',
            timestamp: m.createdAt,
            sessionId: m.sessionID,
            sessionName: apiActivity.session?.title,
            role: m.role,
            agent: m.agent,
            messageId: m.id,
          })
        })
      }
      
      // 添加工具调用 (parts)
      if (apiActivity.parts) {
        apiActivity.parts.forEach((p: any) => {
          let content = p.action || p.tool || '工具调用'
          
          // 如果是 MCP 工具，添加标识
          if (p.tool && (p.tool.startsWith('context7_') || p.tool.startsWith('websearch_'))) {
            content = `[MCP] ${content}`
          }
          
          activities.push({
            id: p.id,
            type: p.type === 'tool' ? 'tool' as const : p.type === 'reasoning' ? 'message' as const : 'message' as const,
            content,
            timestamp: p.createdAt,
            sessionId: p.sessionID,
            sessionName: apiActivity.session?.title,
            // 附加信息
            toolName: p.tool,
            status: p.status,
            input: p.input,
            output: p.output,
            messageId: p.messageID,
          })
        })
      }
      
      // 按时间排序并限制数量
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
    refetchSessionTree()
  }, [refetchSessions, refetchPlan, refetchActivity, refetchSessionTree])

  usePolling({
    onPoll: refresh,
    enabled: true,
  })

  const isLoading = sessionsLoading || planLoading || activityLoading
  const error = sessionsError || planError

  const setSelectedSession = useCallback((id: string | null) => {
    setSelectedSessionId(id)
  }, [])

  const handleSetActiveView = useCallback((view: 'stream' | 'tree') => {
    setActiveView(view)
  }, [])

  const addActivity = useCallback((activity: Activity) => {
    setActivities(prev => [activity, ...prev].slice(0, 100))
  }, [])

  const getSessionNodes = useCallback((): SessionNode[] => {
    // 如果有 sessionTree 数据（活动树视图），使用会话树
    if (sessionTree) {
      const buildNodes = (node: SessionTreeNode, level: number, parentId: string | null): SessionNode[] => {
        const nodes: SessionNode[] = [{
          id: node.id,
          name: node.title,
          status: 'running' as const,
          parentId,
          level,
        }]
        if (node.children) {
          for (const child of node.children) {
            nodes.push(...buildNodes(child, level + 1, node.id))
          }
        }
        return nodes
      }
      return buildNodes(sessionTree, 0, null)
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
