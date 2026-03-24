export interface Session {
  id: string
  name: string
  status: 'running' | 'waiting' | 'completed' | 'error'
  startTime: string
  progress?: number
  parentID?: string
}

// 相对时间格式化函数
function formatRelativeTime(isoString: string): string {
  if (!isoString) return '未知'
  
  const date = new Date(isoString)
  if (isNaN(date.getTime())) return '未知'
  
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return '刚刚'
  if (diffMin < 60) return `${diffMin}分钟前`
  if (diffHour < 24) return `${diffHour}小时前`
  if (diffDay < 7) return `${diffDay}天前`
  
  // 超过7天显示具体日期
  return date.toLocaleDateString('zh-CN', { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

interface SessionListProps {
  sessions: Session[]
  selectedId?: string
  onSelect?: (id: string) => void
}

const statusMap = {
  running: { label: '运行中', color: 'text-[#3fb950]', bg: 'bg-[#3fb950]' },
  waiting: { label: '等待中', color: 'text-[#d29922]', bg: 'bg-[#d29922]' },
  completed: { label: '已完成', color: 'text-[#58a6ff]', bg: 'bg-[#58a6ff]' },
  error: { label: '错误', color: 'text-[#f85149]', bg: 'bg-[#f85149]' },
}

export default function SessionList({ sessions, selectedId, onSelect }: SessionListProps) {
  return (
    <div className="w-72 bg-[#161b22] border-r border-[#30363d] flex flex-col h-full">
      {/* 标题 */}
      <div className="px-4 py-3 border-b border-[#30363d] flex items-center justify-between">
        <h2 className="font-medium text-[#c9d1d9]">会话列表</h2>
        <span className="text-xs text-[#8b949e]">T10</span>
      </div>

      {/* 会话列表 */}
      <div className="flex-1 overflow-y-auto">
        {sessions.length === 0 ? (
          <div className="p-4 text-center text-[#8b949e] text-sm">
            暂无会话
          </div>
        ) : (
          <ul className="divide-y divide-[#30363d]">
            {sessions.map((session) => {
              const status = statusMap[session.status]
              return (
                <li
                  key={session.id}
                  onClick={() => onSelect?.(session.id)}
                  className={`px-4 py-3 cursor-pointer transition-colors hover:bg-[#21262d] ${
                    selectedId === session.id ? 'bg-[#21262d]' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-[#c9d1d9] truncate">
                      {session.name}
                    </span>
                    <span className={`text-xs ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#8b949e]">
                      {formatRelativeTime(session.startTime)}
                    </span>
                    {session.progress !== undefined && (
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-[#30363d] rounded-full overflow-hidden">
                          <div
                            className={`h-full ${status.bg} rounded-full transition-all`}
                            style={{ width: `${session.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-[#8b949e]">{session.progress}%</span>
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* 统计信息 */}
      <div className="px-4 py-3 border-t border-[#30363d] text-xs text-[#8b949e]">
        <div className="flex items-center justify-between">
          <span>总会话数: {sessions.length}</span>
          <span>运行中: {sessions.filter(s => s.status === 'running').length}</span>
        </div>
      </div>
    </div>
  )
}