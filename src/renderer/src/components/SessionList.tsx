import { useRef, useCallback, useEffect } from 'react'
import { formatRelativeTime } from '@/utils/format'
import { Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

export interface Session {
  id: string
  name: string
  status: 'running' | 'waiting' | 'completed' | 'error'
  startTime: string
  progress?: number
  parentID?: string
  directory?: string
}

interface SessionListProps {
  sessions: Session[]
  totalSessions?: number
  runningSessions?: number
  selectedId?: string
  onSelect?: (id: string) => void
  onLoadMore?: () => void
}

const statusMap = {
  running: { 
    label: '运行中', 
    Icon: Loader2, 
    color: 'text-[var(--color-success)]', 
    bg: 'bg-[var(--color-success)]' 
  },
  waiting: { 
    label: '等待中', 
    Icon: Clock, 
    color: 'text-[var(--color-warning)]', 
    bg: 'bg-[var(--color-warning)]' 
  },
  completed: { 
    label: '已完成', 
    Icon: CheckCircle, 
    color: 'text-[var(--color-info)]', 
    bg: 'bg-[var(--color-info)]' 
  },
  error: { 
    label: '错误', 
    Icon: AlertCircle, 
    color: 'text-[var(--color-error)]', 
    bg: 'bg-[var(--color-error)]' 
  },
}

export default function SessionList({ 
  sessions, 
  totalSessions = 0, 
  runningSessions = 0,
  selectedId, 
  onSelect,
  onLoadMore 
}: SessionListProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const isLoadingRef = useRef(false)
  const hasMore = sessions.length < totalSessions

  // 滚动加载更多
  const handleScroll = useCallback(() => {
    if (!listRef.current || !onLoadMore || !hasMore || isLoadingRef.current) return
    
    const { scrollTop, scrollHeight, clientHeight } = listRef.current
    // 距离底部 100px 时触发加载
    if (scrollHeight - scrollTop - clientHeight < 100) {
      isLoadingRef.current = true
      onLoadMore()
      // 防抖：500ms 后重置
      setTimeout(() => {
        isLoadingRef.current = false
      }, 500)
    }
  }, [onLoadMore, hasMore])

  // 监听滚动事件
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    
    list.addEventListener('scroll', handleScroll)
    return () => list.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  return (
    <div className="w-72 bg-[var(--color-bg-secondary)] border-r border-[var(--color-border)] flex flex-col h-full">
      {/* 标题 */}
      <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
        <h2 className="font-medium text-[var(--color-text-primary)]">会话列表</h2>
      </div>

      {/* 会话列表 - 支持滚动加载 */}
      <div ref={listRef} className="flex-1 overflow-y-auto">
        {sessions.length === 0 ? (
          <div className="p-4 text-center text-[var(--color-text-secondary)] text-sm">
            暂无会话
          </div>
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {sessions.map((session) => {
              const status = statusMap[session.status]
              const StatusIcon = status.Icon
              const isRunning = session.status === 'running'
              return (
                <li
                  key={session.id}
                  onClick={() => onSelect?.(session.id)}
                  className={`px-4 py-3 cursor-pointer transition-colors hover:bg-[var(--color-bg-tertiary)] ${
                    selectedId === session.id ? 'bg-[var(--color-bg-tertiary)]' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                      {session.name}
                    </span>
                    <span className={`text-xs ${status.color} flex items-center gap-1 flex-shrink-0`}>
                      <StatusIcon className={`w-3 h-3 ${isRunning ? 'animate-spin' : ''}`} />
                      {status.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--color-text-secondary)]">
                      {formatRelativeTime(session.startTime)}
                    </span>
                    {session.progress !== undefined && (
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-[var(--color-bg-elevated)] rounded-full overflow-hidden">
                          <div
                            className={`h-full ${status.bg} rounded-full transition-all`}
                            style={{ width: `${session.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-[var(--color-text-secondary)]">{session.progress}%</span>
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* 统计信息 - 固定在底部 */}
      <div className="px-4 py-2 border-t border-[var(--color-border)] text-xs text-[var(--color-text-secondary)]">
        <div className="flex items-center justify-between">
          <span>总会话数: {totalSessions || sessions.length}</span>
          <span className="text-[var(--color-success)]">运行中: {runningSessions}</span>
        </div>
      </div>
    </div>
  )
}