import { Inbox, Activity, ClipboardCheck } from 'lucide-react'

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
    icon: Inbox,
    title: '暂无会话',
    description: '当前没有正在进行的会话，开启一个新会话开始工作吧',
  },
  activity: {
    icon: Activity,
    title: '暂无活动',
    description: '等待任务执行中，请稍候...',
  },
  plan: {
    icon: ClipboardCheck,
    title: '暂无计划',
    description: '请先创建一个计划，然后开始执行任务',
  },
}

export default function EmptyState({ type, action }: EmptyStateProps) {
  const config = emptyStateConfig[type]
  const IconComponent = config.icon

  return (
    <div 
      className="min-h-[200px] flex items-center justify-center p-[var(--space-lg)]"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      <div className="text-center max-w-md">
        <div 
          className="w-20 h-20 mx-auto mb-[var(--space-md)] rounded-full flex items-center justify-center"
          style={{ 
            backgroundColor: 'var(--color-bg-tertiary)',
            color: 'var(--color-text-secondary)'
          }}
        >
          <IconComponent className="w-12 h-12" strokeWidth={1.5} />
        </div>
        <h3 
          className="text-lg font-medium mb-[var(--space-sm)]"
          style={{ 
            color: 'var(--color-text-primary)',
            fontSize: 'var(--text-lg)',
            fontWeight: 'var(--font-medium)'
          }}
        >
          {config.title}
        </h3>
        <p 
          className="text-sm mb-[var(--space-lg)]"
          style={{ 
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--text-sm)',
            lineHeight: 'var(--leading-normal)'
          }}
        >
          {config.description}
        </p>
        {action && (
          <button
            onClick={action.onClick}
            className="px-[var(--space-md)] py-[var(--space-sm)] rounded-[var(--radius-md)] transition-colors text-sm font-medium"
            style={{ 
              backgroundColor: 'var(--color-success)',
              color: '#ffffff',
              transition: 'var(--transition-property-colors)',
              fontSize: 'var(--text-sm)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-success)'
              e.currentTarget.style.filter = 'brightness(1.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-success)'
              e.currentTarget.style.filter = 'brightness(1)'
            }}
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  )
}