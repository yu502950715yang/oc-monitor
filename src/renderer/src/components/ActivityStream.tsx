import { useState, useCallback } from 'react'

export interface Activity {
  id: string
  type: 'tool' | 'message' | 'plan' | 'task' | 'error'
  content: string
  timestamp: string
  sessionId?: string
  sessionName?: string
  toolName?: string
  status?: string
  // 详细信息字段
  input?: string
  output?: string
  messageId?: string
  role?: string
  agent?: string
}

// 相对时间格式化函数
function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString)
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

interface ActivityStreamProps {
  activities: Activity[]
}

// 工具类型对应的颜色
const toolTypeColors: Record<string, { label: string; color: string; bg: string }> = {
  read: { label: '读取', color: 'text-[#58a6ff]', bg: 'bg-[#58a6ff]/10' },
  write: { label: '写入', color: 'text-[#3fb950]', bg: 'bg-[#3fb950]/10' },
  edit: { label: '编辑', color: 'text-[#d29922]', bg: 'bg-[#d29922]/10' },
  bash: { label: '运行', color: 'text-[#f85149]', bg: 'bg-[#f85149]/10' },
  grep: { label: '搜索', color: 'text-[#a371f7]', bg: 'bg-[#a371f7]/10' },
  glob: { label: '查找', color: 'text-[#79c0ff]', bg: 'bg-[#79c0ff]/10' },
  task: { label: '委托', color: 'text-[#d2a8ff]', bg: 'bg-[#d2a8ff]/10' },
  webfetch: { label: '获取', color: 'text-[#ffa657]', bg: 'bg-[#ffa657]/10' },
  'context7_query-docs': { label: 'MCP', color: 'text-[#ff7b72]', bg: 'bg-[#ff7b72]/10' },
  'context7_resolve-library-id': { label: 'MCP', color: 'text-[#ff7b72]', bg: 'bg-[#ff7b72]/10' },
  'websearch_web_search_exa': { label: 'MCP', color: 'text-[#ff7b72]', bg: 'bg-[#ff7b72]/10' },
}

const typeIconMap = {
  tool: { label: '工具', color: 'text-[#a371f7]', bg: 'bg-[#a371f7]/10' },
  message: { label: '消息', color: 'text-[#58a6ff]', bg: 'bg-[#58a6ff]/10' },
  plan: { label: '计划', color: 'text-[#3fb950]', bg: 'bg-[#3fb950]/10' },
  task: { label: '任务', color: 'text-[#d29922]', bg: 'bg-[#d29922]/10' },
  error: { label: '错误', color: 'text-[#f85149]', bg: 'bg-[#f85149]/10' },
}

export default function ActivityStream({ activities }: ActivityStreamProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  return (
    <div className="flex-1 bg-[#0d1117] flex flex-col h-full">
      {/* 标题 */}
      <div className="px-4 py-3 border-b border-[#30363d] flex items-center justify-between flex-shrink-0">
        <h2 className="font-medium text-[#c9d1d9]">活动流</h2>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#3fb950] animate-pulse"></span>
          <span className="text-xs text-[#8b949e]">实时</span>
          <span className="text-xs text-[#8b949e] ml-2">T11</span>
        </div>
      </div>

      {/* 活动列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {activities.length === 0 ? (
          <div className="text-center text-[#8b949e] text-sm py-8">
            暂无活动
          </div>
        ) : (
          activities.map((activity) => {
            // 如果是工具调用，根据工具类型显示不同颜色
            let typeInfo = typeIconMap[activity.type]
            if (activity.type === 'tool' && activity.toolName) {
              const toolColor = toolTypeColors[activity.toolName]
              if (toolColor) {
                typeInfo = toolColor
              }
            }
            return (
              <div
                key={activity.id}
                className={`p-3 rounded-lg ${typeInfo.bg} border border-[#30363d] cursor-pointer hover:opacity-80 transition-opacity`}
                onClick={() => toggleExpand(activity.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${typeInfo.color}`}>
                      {typeInfo.label}
                    </span>
                    {activity.toolName && activity.type === 'tool' && (
                      <span className="text-xs text-[#8b949e]">
                        · {activity.toolName}
                      </span>
                    )}
                    {activity.status && activity.type === 'tool' && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        activity.status === 'completed' ? 'bg-[#3fb950]/20 text-[#3fb950]' :
                        activity.status === 'running' || activity.status === 'in_progress' ? 'bg-[#58a6ff]/20 text-[#58a6ff]' :
                        'bg-[#8b949e]/20 text-[#8b949e]'
                      }`}>
                        {activity.status}
                      </span>
                    )}
                    {activity.sessionName && (
                      <span className="text-xs text-[#8b949e]">
                        · {activity.sessionName}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[#8b949e] flex items-center gap-1">
                    {formatRelativeTime(activity.timestamp)}
                    {(activity.input || activity.output) && (
                      <span className="ml-1">{expandedIds.has(activity.id) ? '▼' : '▶'}</span>
                    )}
                  </span>
                </div>
                <p className="text-sm text-[#c9d1d9] break-all">{activity.content}</p>
                {expandedIds.has(activity.id) && (
                  <div className="mt-3 pt-3 border-t border-[#30363d]">
                    {activity.input && (
                      <div className="mb-2">
                        <div className="text-xs text-[#8b949e] mb-1">输入</div>
                        <pre className="text-xs text-[#c9d1d9] bg-[#161b22] p-2 rounded overflow-x-auto whitespace-pre-wrap">
                          {activity.input}
                        </pre>
                      </div>
                    )}
                    {activity.output && (
                      <div>
                        <div className="text-xs text-[#8b949e] mb-1">输出</div>
                        <pre className="text-xs text-[#c9d1d9] bg-[#161b22] p-2 rounded overflow-x-auto whitespace-pre-wrap">
                          {activity.output}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}