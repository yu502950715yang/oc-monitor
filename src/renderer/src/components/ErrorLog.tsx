import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'

function formatRelativeTime(isoString: string): string {
  if (!isoString) return '未知'
  const date = new Date(isoString)
  if (isNaN(date.getTime())) return '未知'
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  if (diffSec < 60) return '刚刚'
  if (diffMin <= 5) return `${diffMin}分钟前`
  // 超过5分钟显示具体时间
  return date.toLocaleString('zh-CN', { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function ErrorLog() {
  const { activities } = useApp()
  const [filterTool, setFilterTool] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const errorActivities = useMemo(() => {
    return activities.filter(a => 
      a.type === 'tool' && 
      (a.status === 'error' || a.error)
    ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [activities])

  const toolNames = useMemo(() => {
    const tools = new Set(errorActivities.map(a => a.toolName).filter(Boolean))
    return ['all', ...Array.from(tools)]
  }, [errorActivities])

  const filteredErrors = filterTool === 'all'
    ? errorActivities
    : errorActivities.filter(a => a.toolName === filterTool)

  return (
    <div className="bg-[#161b22] rounded-lg border border-[#30363d] p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[#c9d1d9]">
          错误日志
          <span className="ml-2 text-xs text-[#f85149]">({errorActivities.length})</span>
        </h3>
        <select
          value={filterTool}
          onChange={(e) => setFilterTool(e.target.value)}
          className="bg-[#21262d] text-[#c9d1d9] text-xs px-2 py-1 rounded border border-[#30363d]"
        >
          {toolNames.map(tool => (
            <option key={tool} value={tool}>
              {tool === 'all' ? '全部工具' : tool}
            </option>
          ))}
        </select>
      </div>

      {filteredErrors.length === 0 ? (
        <div className="text-center text-[#8b949e] py-8 text-sm">
          {errorActivities.length === 0 ? '暂无错误' : '无匹配错误'}
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredErrors.map(activity => (
            <div
              key={activity.id}
              className="bg-[#21262d] rounded-lg border border-[#30363d] overflow-hidden"
            >
              <div 
                className="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-[#30363d]/50"
                onClick={() => setExpandedId(expandedId === activity.id ? null : activity.id)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[#f85149] text-xs">❌</span>
                  <span className="text-sm text-[#c9d1d9]">{activity.toolName}</span>
                  <span className="text-xs text-[#8b949e]">{activity.content?.slice(0, 30)}</span>
                </div>
                <span className="text-xs text-[#8b949e]">
                  {formatRelativeTime(activity.timestamp)}
                </span>
              </div>
              
              {expandedId === activity.id && (
                <div className="px-3 py-2 border-t border-[#30363d] bg-[#161b22]">
                  {activity.error && (
                    <div className="mb-2">
                      <div className="text-xs text-[#8b949e] mb-1">错误信息</div>
                      <pre className="text-xs text-[#f85149] bg-[#21262d] p-2 rounded overflow-x-auto whitespace-pre-wrap">
                        {activity.error}
                      </pre>
                    </div>
                  )}
                  {activity.input && (
                    <div className="mb-2">
                      <div className="text-xs text-[#8b949e] mb-1">输入</div>
                      <pre className="text-xs text-[#c9d1d9] bg-[#21262d] p-2 rounded overflow-x-auto whitespace-pre-wrap">
                        {activity.input}
                      </pre>
                    </div>
                  )}
                  {activity.output && (
                    <div>
                      <div className="text-xs text-[#8b949e] mb-1">输出</div>
                      <pre className="text-xs text-[#c9d1d9] bg-[#21262d] p-2 rounded overflow-x-auto whitespace-pre-wrap">
                        {activity.output}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}