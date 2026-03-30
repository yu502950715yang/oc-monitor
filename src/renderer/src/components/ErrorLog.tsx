import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { useErrorLog } from '../hooks/useApi'
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
  const { selectedSessionId } = useApp()
  const { data, loading } = useErrorLog(selectedSessionId)
  const [filterTool, setFilterTool] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // 从 dashboardData 获取错误列表（已按时间排序）
  const errors = data?.errors || []

  const toolNames = useMemo(() => {
    const tools = new Set(errors.map(e => e.toolName).filter(Boolean))
    return ['all', ...Array.from(tools)]
  }, [errors])

  const filteredErrors = filterTool === 'all'
    ? errors
    : errors.filter(e => e.toolName === filterTool)

  return (
    <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
          <XCircle className="w-5 h-5 text-[var(--color-error)]" />
          错误日志
          <span className="ml-2 text-xs text-[var(--color-error)]">({errors.length})</span>
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

      {loading ? (
        <div className="text-center text-[var(--color-text-secondary)] py-8 text-sm">
          <div className="w-6 h-6 border-2 border-[var(--color-text-secondary)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          加载中...
        </div>
      ) : filteredErrors.length === 0 ? (
        <div className="text-center text-[var(--color-text-secondary)] py-8 text-sm">
          <XCircle className="w-12 h-12 mx-auto mb-3 text-[var(--color-text-secondary)] opacity-50" />
          {errors.length === 0 ? '暂无错误' : '无匹配错误'}
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredErrors.map(error => (
            <div
              key={error.id}
              className="bg-[var(--color-bg-tertiary)] rounded-lg border border-[var(--color-border)] overflow-hidden"
            >
              <div 
                className="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-[var(--color-bg-hover)]/50"
                onClick={() => setExpandedId(expandedId === error.id ? null : error.id)}
              >
                <div className="flex items-center gap-2">
                  <XCircle className="w-3.5 h-3.5 text-[var(--color-error)]" />
                  <span className="text-sm text-[var(--color-text-primary)]">{error.toolName}</span>
                  <span className="text-xs text-[var(--color-text-secondary)]">{error.error?.slice(0, 30)}</span>
                </div>
                <span className="text-xs text-[var(--color-text-secondary)]">
                  {formatRelativeTime(error.timestamp)}
                </span>
              </div>
              
              {expandedId === error.id && (
                <div className="px-3 py-2 border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                  {error.error && (
                    <div className="mb-2">
                      <div className="text-xs text-[var(--color-text-secondary)] mb-1">错误信息</div>
                      <pre className="text-xs text-[var(--color-error)] bg-[var(--color-bg-tertiary)] p-2 rounded overflow-x-auto whitespace-pre-wrap">
                        {error.error}
                      </pre>
                    </div>
                  )}
                  {error.input && (
                    <div className="mb-2">
                      <div className="text-xs text-[var(--color-text-secondary)] mb-1">输入</div>
                      <pre className="text-xs text-[var(--color-text-primary)] bg-[var(--color-bg-tertiary)] p-2 rounded overflow-x-auto whitespace-pre-wrap">
                        {error.input}
                      </pre>
                    </div>
                  )}
                  {error.output && (
                    <div>
                      <div className="text-xs text-[var(--color-text-secondary)] mb-1">输出</div>
                      <pre className="text-xs text-[var(--color-text-primary)] bg-[var(--color-bg-tertiary)] p-2 rounded overflow-x-auto whitespace-pre-wrap">
                        {error.output}
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