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
    <div className="bg-[#161b22] rounded-lg border border-[#30363d] p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[#c9d1d9]">工具性能</h3>
        <div className="flex gap-2">
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
          <button
            onClick={refresh}
            className="text-xs px-2 py-1 bg-[#21262d] text-[#8b949e] rounded hover:text-[#c9d1d9]"
          >
            刷新
          </button>
        </div>
      </div>

      {toolStats.length === 0 ? (
        <div className="text-center text-[#8b949e] py-8 text-sm">
          暂无工具调用数据
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={filteredData} layout="vertical">
            <XAxis type="number" stroke="#8b949e" fontSize={10} />
            <YAxis 
              type="category" 
              dataKey="tool" 
              stroke="#8b949e" 
              fontSize={10} 
              width={80}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#21262d',
                border: '1px solid #30363d',
                borderRadius: '6px',
              }}
              labelStyle={{ color: '#c9d1d9' }}
              formatter={(value: number, name: string, props: any) => {
                const item = props.payload
                if (name === 'total') return [`${value} 次`, '调用次数']
                if (name === 'errors') return [`${value} 次`, '错误']
                return [value, name]
              }}
            />
            <Bar dataKey="total" name="调用次数" radius={[0, 4, 4, 0]}>
              {filteredData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
            <Bar dataKey="errors" name="错误" radius={[0, 4, 4, 0]} fill="#f85149" />
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* 统计摘要 */}
      {toolStats.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
          <div className="bg-[#21262d] p-2 rounded">
            <div className="text-[#8b949e]">调用次数</div>
            <div className="text-[#58a6ff] font-medium">{toolStats.reduce((a, b) => a + b.total, 0)}</div>
          </div>
          <div className="bg-[#21262d] p-2 rounded">
            <div className="text-[#8b949e]">成功率</div>
            <div className="text-[#3fb950] font-medium">
              {Math.round(toolStats.reduce((a, b) => a + b.completed, 0) / toolStats.reduce((a, b) => a + b.total, 0) * 100)}%
            </div>
          </div>
          <div className="bg-[#21262d] p-2 rounded">
            <div className="text-[#8b949e]">错误数</div>
            <div className="text-[#f85149] font-medium">{toolStats.reduce((a, b) => a + b.errors, 0)}</div>
          </div>
        </div>
      )}
    </div>
  )
}