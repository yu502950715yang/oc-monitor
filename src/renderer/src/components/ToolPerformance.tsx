import { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useApp } from '../context/AppContext'
import { Wrench, BarChart3 } from 'lucide-react'

const COLORS = ['#58a6ff', '#3fb950', '#d29922', '#f85149', '#a371f7', '#ff7b72', '#79c0ff']

export default function ToolPerformance() {
  const { activities, refresh } = useApp()
  const [filterTool, setFilterTool] = useState<string>('all')

  const toolStats = useMemo(() => {
    const toolActivities = activities.filter(a => a.type === 'tool' && a.toolName)
    
    // 按工具名分组统计
    const toolMap = new Map<string, { total: number; completed: number; errors: number; durations: number[] }>()
    
    toolActivities.forEach(a => {
      const tool = a.toolName!
      if (!toolMap.has(tool)) {
        toolMap.set(tool, { total: 0, completed: 0, errors: 0, durations: [] })
      }
      const stats = toolMap.get(tool)!
      stats.total++
      if (a.status === 'completed') stats.completed++
      if (a.status === 'error' || a.error) stats.errors++
      if (a.duration) stats.durations.push(a.duration)
    })

    // 转换为图表数据
    const data = Array.from(toolMap.entries()).map(([tool, stats]) => {
      const avgDuration = stats.durations.length > 0
        ? Math.round(stats.durations.reduce((a, b) => a + b, 0) / stats.durations.length)
        : 0
      const successRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
      
      return {
        tool: tool.length > 12 ? tool.slice(0, 10) + '..' : tool,
        toolFull: tool,
        total: stats.total,
        completed: stats.completed,
        errors: stats.errors,
        avgDuration,
        successRate,
      }
    })

    // 按调用次数排序
    return data.sort((a, b) => b.total - a.total).slice(0, 10)
  }, [activities])

  const filteredData = filterTool === 'all' 
    ? toolStats 
    : toolStats.filter(t => t.toolFull === filterTool)

  const toolNames = ['all', ...toolStats.map(t => t.toolFull)]

  return (
    <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-6 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[var(--color-accent-purple)]" />
          工具性能
        </h3>
        <div className="flex gap-3">
          <select
            value={filterTool}
            onChange={(e) => setFilterTool(e.target.value)}
            className="bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] text-xs px-3 py-1.5 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-accent-blue)] transition-colors cursor-pointer"
          >
            {toolNames.map(tool => (
              <option key={tool} value={tool}>
                {tool === 'all' ? '全部工具' : tool}
              </option>
            ))}
          </select>
          <button
            onClick={refresh}
            className="text-xs px-3 py-1.5 bg-gradient-to-r from-[var(--color-accent-blue)] to-[var(--color-accent-blue)] text-white rounded-lg hover:opacity-80 transition-all shadow-md hover:shadow-lg"
          >
            刷新
          </button>
        </div>
      </div>

      {toolStats.length === 0 ? (
        <div className="text-center py-12">
          <Wrench className="w-12 h-12 mx-auto mb-3 text-[var(--color-text-secondary)] opacity-50" />
          <div className="text-[var(--color-text-secondary)]">暂无工具调用数据</div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={filteredData} layout="vertical">
            <XAxis type="number" stroke="var(--color-text-muted)" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis 
              type="category" 
              dataKey="tool" 
              stroke="var(--color-text-muted)" 
              fontSize={10} 
              width={80}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: 'rgba(88, 166, 255, 0.1)' }}
              contentStyle={{
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              }}
              labelStyle={{ color: 'var(--color-text-primary)', fontWeight: 600 }}
              itemStyle={{ color: 'var(--color-text-secondary)' }}
              formatter={(value, name) => {
                const v = Number(value)
                if (name === 'total') return [`${v} 次`, '调用次数']
                if (name === 'errors') return [`${v} 次`, '错误']
                return [v, String(name)]
              }}
            />
            <Bar 
              dataKey="total" 
              name="调用次数" 
              radius={[0, 6, 6, 0]} 
              barSize={20}
              isAnimationActive={false}
            >
              {filteredData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
            <Bar 
              dataKey="errors" 
              name="错误" 
              radius={[0, 6, 6, 0]} 
              fill="#f85149" 
              barSize={20}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* 统计摘要 */}
      {toolStats.length > 0 && (
        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="relative overflow-hidden bg-[var(--color-bg-tertiary)] rounded-xl p-3 border border-[var(--color-border)] hover:border-[var(--color-accent-blue)]/40 transition-all duration-300">
            <div className="text-xs text-[var(--color-text-secondary)] mb-1">调用次数</div>
            <div className="text-lg font-bold text-[var(--color-accent-blue)]">{toolStats.reduce((a, b) => a + b.total, 0)}</div>
          </div>
          <div className="relative overflow-hidden bg-[var(--color-bg-tertiary)] rounded-xl p-3 border border-[var(--color-border)] hover:border-[var(--color-success)]/40 transition-all duration-300">
            <div className="text-xs text-[var(--color-text-secondary)] mb-1">成功率</div>
            <div className="text-lg font-bold text-[var(--color-success)]">
              {Math.round(toolStats.reduce((a, b) => a + b.completed, 0) / toolStats.reduce((a, b) => a + b.total, 0) * 100)}%
            </div>
          </div>
          <div className="relative overflow-hidden bg-[var(--color-bg-tertiary)] rounded-xl p-3 border border-[var(--color-border)] hover:border-[var(--color-error)]/40 transition-all duration-300">
            <div className="text-xs text-[var(--color-text-secondary)] mb-1">错误数</div>
            <div className="text-lg font-bold text-[var(--color-error)]">{toolStats.reduce((a, b) => a + b.errors, 0)}</div>
          </div>
        </div>
      )}
    </div>
  )
}