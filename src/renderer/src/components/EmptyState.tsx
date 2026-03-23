export type EmptyStateType = 'session' | 'activity' | 'plan'

interface EmptyStateProps {
  type: EmptyStateType
  action?: {
    label: string
    onClick: () => void
  }
}

const emptyStateConfig = {
  session: {
    icon: (
      <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: '暂无会话',
    description: '当前没有正在进行的会话，开启一个新会话开始工作吧',
  },
  activity: {
    icon: (
      <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: '暂无活动',
    description: '等待任务执行中，请稍候...',
  },
  plan: {
    icon: (
      <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    title: '暂无计划',
    description: '请先创建一个计划，然后开始执行任务',
  },
}

export default function EmptyState({ type, action }: EmptyStateProps) {
  const config = emptyStateConfig[type]

  return (
    <div className="min-h-[200px] flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[#21262d] flex items-center justify-center text-[#8b949e]">
          {config.icon}
        </div>
        <h3 className="text-lg font-medium text-[#c9d1d9] mb-2">
          {config.title}
        </h3>
        <p className="text-sm text-[#8b949e] mb-6">
          {config.description}
        </p>
        {action && (
          <button
            onClick={action.onClick}
            className="px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white rounded-md transition-colors text-sm"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  )
}