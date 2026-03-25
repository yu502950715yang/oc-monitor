import { useMemo, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { useApp } from '../context/AppContext'
import { useDashboard } from '../hooks/useApi'
import { Wrench, Loader2 } from 'lucide-react'

const COLORS = [
  '#58a6ff', '#3fb950', '#d29922', '#f85149', '#a371f7', 
  '#ff7b72', '#79c0ff', '#3fb950', '#d29922', '#f85149',
  '#a371f7', '#ff7b72', '#79c0ff', '#58a6ff', '#3fb950',
  '#d29922', '#f85149', '#a371f7', '#ff7b72', '#79c0ff'
]

export default function ToolPerformance() {
  const { selectedSessionId } = useApp()
  const { data: dashboardData, loading, refetch } = useDashboard(selectedSessionId)
  const [filterTool, setFilterTool] = useState<string>('all')

  // 从 dashboardData 获取 toolStats 数据
  const toolStats = useMemo(() => {
    const stats = dashboardData?.toolStats || []
    return stats.sort((a, b) => b.total - a.total)
  }, [dashboardData])

  const filteredData = filterTool === 'all' 
    ? toolStats 
    : toolStats.filter(t => t.tool === filterTool)

  const toolNames = ['all', ...toolStats.map(t => t.tool)]

// 转换为饼图数据格式
  const pieData = filteredData.map(item => ({
    name: item.tool?.length > 15 ? item.tool.slice(0, 12) + '..' : item.tool || 'unknown',
    value: item.total || 0,
    fullName: item.tool,
    errors: item.errors,
    successRate: item.successRate,
  }))

  // 计算统计数据
  const totalCalls = toolStats.reduce((a, b) => a + (b.total || 0), 0)
  const totalErrors = toolStats.reduce((a, b) => a + (b.errors || 0), 0)
  const successRate = totalCalls > 0 ? Math.round(((totalCalls - totalErrors) / totalCalls) * 100) : 0

  return (
    <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-6 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
          <Wrench className="w-5 h-5 text-[var(--color-accent-purple)]" />
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
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-12 h-12 mx-auto mb-3 text-[var(--color-accent-blue)] animate-spin" />
          <div className="text-[var(--color-text-secondary)]">加载中...</div>
        </div>
      ) : toolStats.length === 0 ? (
        <div className="text-center py-12">
          <Wrench className="w-12 h-12 mx-auto mb-3 text-[var(--color-text-secondary)] opacity-50" />
          <div className="text-[var(--color-text-secondary)]">暂无工具调用数据</div>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row items-center gap-4">
          {/* 饼图 */}
          <div className="w-full lg:w-1/2 h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  isAnimationActive={false}
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  }}
                  labelStyle={{ color: 'var(--color-text-primary)', fontWeight: 600 }}
                  formatter={(value, _name, props) => {
                    const item = props?.payload
                    const v = Number(value) || 0
                    return [
                      `${v} 次 (${Math.round(v / totalCalls * 100)}%)`,
                      item?.fullName || ''
                    ]
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* 右侧工具列表 */}
          <div className="w-full lg:w-1/2 space-y-2 max-h-[200px] overflow-y-auto">
            {filteredData.map((item, index) => (
              <div 
                key={item.tool}
                className="flex items-center justify-between p-2 rounded-lg bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-hover)] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm text-[var(--color-text-primary)]">
                    {item.tool.length > 20 ? item.tool.slice(0, 18) + '..' : item.tool}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-[var(--color-accent-blue)] font-medium">{item.total}次</span>
                  <span className={item.successRate >= 80 ? "text-[var(--color-success)]" : "text-[var(--color-error)]"}>
                    {item.successRate}%
                  </span>
                  {item.errors > 0 && (
                    <span className="text-[var(--color-error)]">{item.errors}错</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 统计摘要 */}
      {toolStats.length > 0 && (
        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="relative overflow-hidden bg-[var(--color-bg-tertiary)] rounded-xl p-3 border border-[var(--color-border)] hover:border-[var(--color-accent-blue)]/40 transition-all duration-300">
            <div className="text-xs text-[var(--color-text-secondary)] mb-1">调用次数</div>
            <div className="text-lg font-bold text-[var(--color-accent-blue)]">{totalCalls}</div>
          </div>
          <div className="relative overflow-hidden bg-[var(--color-bg-tertiary)] rounded-xl p-3 border border-[var(--color-border)] hover:border-[var(--color-success)]/40 transition-all duration-300">
            <div className="text-xs text-[var(--color-text-secondary)] mb-1">成功率</div>
            <div className="text-lg font-bold text-[var(--color-success)]">{successRate}%</div>
          </div>
          <div className="relative overflow-hidden bg-[var(--color-bg-tertiary)] rounded-xl p-3 border border-[var(--color-border)] hover:border-[var(--color-error)]/40 transition-all duration-300">
            <div className="text-xs text-[var(--color-text-secondary)] mb-1">错误数</div>
            <div className="text-lg font-bold text-[var(--color-error)]">{totalErrors}</div>
          </div>
        </div>
      )}
    </div>
  )
}