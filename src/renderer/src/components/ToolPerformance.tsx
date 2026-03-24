import { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useApp } from '../context/AppContext'

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
    <div className="bg-gradient-to-br from-[#161b22] to-[#1c2128] rounded-xl border border-[#30363d] p-6 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-[#c9d1d9] flex items-center gap-2">
          <span className="w-1 h-5 bg-[#a371f7] rounded-full"></span>
          工具性能
        </h3>
        <div className="flex gap-3">
          <select
            value={filterTool}
            onChange={(e) => setFilterTool(e.target.value)}
            className="bg-[#21262d] text-[#c9d1d9] text-xs px-3 py-1.5 rounded-lg border border-[#30363d] hover:border-[#58a6ff] transition-colors cursor-pointer"
          >
            {toolNames.map(tool => (
              <option key={tool} value={tool}>
                {tool === 'all' ? '全部工具' : tool}
              </option>
            ))}
          </select>
          <button
            onClick={refresh}
            className="text-xs px-3 py-1.5 bg-gradient-to-r from-[#58a6ff] to-[#3b82f6] text-white rounded-lg hover:from-[#4090e0] hover:to-[#2563eb] transition-all shadow-md hover:shadow-lg"
          >
            刷新
          </button>
        </div>
      </div>

      {toolStats.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3 opacity-50">🔧</div>
          <div className="text-[#8b949e]">暂无工具调用数据</div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={filteredData} layout="vertical">
            <defs>
              {COLORS.map((color, index) => (
                <linearGradient key={index} id={`barGradient${index}`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={color} stopOpacity={0.8}/>
                  <stop offset="100%" stopColor={color} stopOpacity={1}/>
                </linearGradient>
              ))}
            </defs>
            <XAxis type="number" stroke="#6e7681" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis 
              type="category" 
              dataKey="tool" 
              stroke="#6e7681" 
              fontSize={10} 
              width={80}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#161b22',
                border: '1px solid #30363d',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              }}
              labelStyle={{ color: '#c9d1d9', fontWeight: 600 }}
              formatter={(value, name) => {
                const v = Number(value)
                if (name === 'total') return [`${v} 次`, '调用次数']
                if (name === 'errors') return [`${v} 次`, '错误']
                return [v, String(name)]
              }}
            />
            <Bar dataKey="total" name="调用次数" radius={[0, 6, 6, 0]} barSize={20}>
              {filteredData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={`url(#barGradient${index % COLORS.length})`} />
              ))}
            </Bar>
            <Bar dataKey="errors" name="错误" radius={[0, 6, 6, 0]} fill="#f85149" barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* 统计摘要 */}
      {toolStats.length > 0 && (
        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="bg-gradient-to-br from-[#58a6ff]/10 to-[#58a6ff]/5 rounded-xl p-3 border border-[#58a6ff]/20">
            <div className="text-xs text-[#8b949e] mb-1">调用次数</div>
            <div className="text-lg font-bold text-[#58a6ff]">{toolStats.reduce((a, b) => a + b.total, 0)}</div>
          </div>
          <div className="bg-gradient-to-br from-[#3fb950]/10 to-[#3fb950]/5 rounded-xl p-3 border border-[#3fb950]/20">
            <div className="text-xs text-[#8b949e] mb-1">成功率</div>
            <div className="text-lg font-bold text-[#3fb950]">
              {Math.round(toolStats.reduce((a, b) => a + b.completed, 0) / toolStats.reduce((a, b) => a + b.total, 0) * 100)}%
            </div>
          </div>
          <div className="bg-gradient-to-br from-[#f85149]/10 to-[#f85149]/5 rounded-xl p-3 border border-[#f85149]/20">
            <div className="text-xs text-[#8b949e] mb-1">错误数</div>
            <div className="text-lg font-bold text-[#f85149]">{toolStats.reduce((a, b) => a + b.errors, 0)}</div>
          </div>
        </div>
      )}
    </div>
  )
}