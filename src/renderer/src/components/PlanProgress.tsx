import { TrendingUp, CheckCircle, PauseCircle } from 'lucide-react'

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

const statusConfig = {
  active: {
    label: '进行中',
    color: 'text-[var(--color-success)]',
    icon: TrendingUp,
    iconBg: 'bg-[var(--color-success-bg)]',
  },
  completed: {
    label: '已完成',
    color: 'text-[var(--color-primary)]',
    icon: CheckCircle,
    iconBg: 'bg-[var(--color-info-bg)]',
  },
  paused: {
    label: '已暂停',
    color: 'text-[var(--color-warning)]',
    icon: PauseCircle,
    iconBg: 'bg-[var(--color-warning-bg)]',
  },
}

export default function PlanProgress({ plans }: PlanProgressProps) {
  const getProgress = (completed: number, total: number) => {
    if (total === 0) return 0
    return Math.round((completed / total) * 100)
  }

  return (
    <div className="w-80 bg-[var(--color-bg-secondary)] border-l border-[var(--color-border)] flex flex-col h-full">
      {/* 标题 */}
      <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
        <h2 className="font-medium text-[var(--color-text-primary)]">计划进度</h2>
        <span className="text-xs text-[var(--color-text-secondary)]">T12</span>
      </div>

      {/* 计划列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {plans.length === 0 ? (
          <div className="text-center text-[var(--color-text-secondary)] text-sm py-8">
            暂无计划
          </div>
        ) : (
          plans.map((plan) => {
            const progress = getProgress(plan.completedTasks, plan.totalTasks)
            const status = statusConfig[plan.status]
            const StatusIcon = status.icon

            return (
              <div
                key={plan.id}
                className="p-4 bg-[var(--color-bg-tertiary)] rounded-lg border border-[var(--color-border)]"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                    {plan.name}
                  </h3>
                  <div className={`flex items-center gap-1.5 ${status.color}`}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    <span className="text-xs">{status.label}</span>
                  </div>
                </div>

                {/* 进度条 */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)] mb-1">
                    <span>任务进度</span>
                    <span>{plan.completedTasks} / {plan.totalTasks}</span>
                  </div>
                  <div className="w-full h-2 bg-[var(--color-bg-elevated)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="text-right text-xs text-[var(--color-text-secondary)] mt-1">{progress}%</div>
                </div>

                {/* 统计 */}
                <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${status.iconBg}`} />
                    <span>会话数: {plan.sessions}</span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 汇总 */}
      <div className="px-4 py-3 border-t border-[var(--color-border)] text-xs text-[var(--color-text-secondary)]">
        <div className="flex items-center justify-between">
          <span>总计划: {plans.length}</span>
          <span>进行中: {plans.filter(p => p.status === 'active').length}</span>
        </div>
      </div>
    </div>
  )
}