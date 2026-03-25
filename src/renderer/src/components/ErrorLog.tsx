import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { XCircle } from 'lucide-react'

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
    <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
          <XCircle className="w-5 h-5 text-[var(--color-error)]" />
          错误日志
          <span className="ml-2 text-xs text-[var(--color-error)]">({errorActivities.length})</span>
        </h3>
        <select
          value={filterTool}
          onChange={(e) => setFilterTool(e.target.value)}
          className="bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] text-xs px-2 py-1 rounded border border-[var(--color-border)]"
        >
          {toolNames.map(tool => (
            <option key={tool} value={tool}>
              {tool === 'all' ? '全部工具' : tool}
            </option>
          ))}
        </select>
      </div>

      {filteredErrors.length === 0 ? (
        <div className="text-center text-[var(--color-text-secondary)] py-8 text-sm">
          <XCircle className="w-12 h-12 mx-auto mb-3 text-[var(--color-text-secondary)] opacity-50" />
          {errorActivities.length === 0 ? '暂无错误' : '无匹配错误'}
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredErrors.map(activity => (
            <div
              key={activity.id}
              className="bg-[var(--color-bg-tertiary)] rounded-lg border border-[var(--color-border)] overflow-hidden"
            >
              <div 
                className="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-[var(--color-bg-hover)]/50"
                onClick={() => setExpandedId(expandedId === activity.id ? null : activity.id)}
              >
                <div className="flex items-center gap-2">
                  <XCircle className="w-3.5 h-3.5 text-[var(--color-error)]" />
                  <span className="text-sm text-[var(--color-text-primary)]">{activity.toolName}</span>
                  <span className="text-xs text-[var(--color-text-secondary)]">{activity.content?.slice(0, 30)}</span>
                </div>
                <span className="text-xs text-[var(--color-text-secondary)]">
                  {formatRelativeTime(activity.timestamp)}
                </span>
              </div>
              
              {expandedId === activity.id && (
                <div className="px-3 py-2 border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                  {activity.error && (
                    <div className="mb-2">
                      <div className="text-xs text-[var(--color-text-secondary)] mb-1">错误信息</div>
                      <pre className="text-xs text-[var(--color-error)] bg-[var(--color-bg-tertiary)] p-2 rounded overflow-x-auto whitespace-pre-wrap">
                        {activity.error}
                      </pre>
                    </div>
                  )}
                  {activity.input && (
                    <div className="mb-2">
                      <div className="text-xs text-[var(--color-text-secondary)] mb-1">输入</div>
                      <pre className="text-xs text-[var(--color-text-primary)] bg-[var(--color-bg-tertiary)] p-2 rounded overflow-x-auto whitespace-pre-wrap">
                        {activity.input}
                      </pre>
                    </div>
                  )}
                  {activity.output && (
                    <div>
                      <div className="text-xs text-[var(--color-text-secondary)] mb-1">输出</div>
                      <pre className="text-xs text-[var(--color-text-primary)] bg-[var(--color-bg-tertiary)] p-2 rounded overflow-x-auto whitespace-pre-wrap">
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