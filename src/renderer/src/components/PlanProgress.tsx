export interface Plan {
  id: string
  name: string
  status: 'active' | 'completed' | 'paused'
  totalTasks: number
  completedTasks: number
  sessions: number
}

interface PlanProgressProps {
  plans: Plan[]
}

export default function PlanProgress({ plans }: PlanProgressProps) {
  const getProgress = (completed: number, total: number) => {
    if (total === 0) return 0
    return Math.round((completed / total) * 100)
  }

  const statusMap = {
    active: { label: '进行中', color: 'text-[#3fb950]' },
    completed: { label: '已完成', color: 'text-[#58a6ff]' },
    paused: { label: '已暂停', color: 'text-[#d29922]' },
  }

  return (
    <div className="w-80 bg-[#161b22] border-l border-[#30363d] flex flex-col h-full">
      {/* 标题 */}
      <div className="px-4 py-3 border-b border-[#30363d] flex items-center justify-between">
        <h2 className="font-medium text-[#c9d1d9]">计划进度</h2>
        <span className="text-xs text-[#8b949e]">T12</span>
      </div>

      {/* 计划列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {plans.length === 0 ? (
          <div className="text-center text-[#8b949e] text-sm py-8">
            暂无计划
          </div>
        ) : (
          plans.map((plan) => {
            const progress = getProgress(plan.completedTasks, plan.totalTasks)
            const status = statusMap[plan.status]
            return (
              <div
                key={plan.id}
                className="p-4 bg-[#21262d] rounded-lg border border-[#30363d]"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-[#c9d1d9] truncate">
                    {plan.name}
                  </h3>
                  <span className={`text-xs ${status.color}`}>{status.label}</span>
                </div>
                
                {/* 进度条 */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-[#8b949e] mb-1">
                    <span>任务进度</span>
                    <span>{plan.completedTasks} / {plan.totalTasks}</span>
                  </div>
                  <div className="w-full h-2 bg-[#30363d] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#58a6ff] rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="text-right text-xs text-[#8b949e] mt-1">{progress}%</div>
                </div>

                {/* 统计 */}
                <div className="flex items-center justify-between text-xs text-[#8b949e]">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#58a6ff]"></span>
                    <span>会话数: {plan.sessions}</span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 汇总 */}
      <div className="px-4 py-3 border-t border-[#30363d] text-xs text-[#8b949e]">
        <div className="flex items-center justify-between">
          <span>总计划: {plans.length}</span>
          <span>进行中: {plans.filter(p => p.status === 'active').length}</span>
        </div>
      </div>
    </div>
  )
}