import { useMcpServices } from '@/hooks/useMcpServices'
import { 
  Server, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Plug,
  RefreshCw
} from 'lucide-react'

// MCP 服务类型定义（与后端 API 对应）
export interface McpService {
  name: string
  displayName: string
  status: 'active' | 'inactive'
  type: string
  enabled: boolean
}

// 状态配置映射
const statusConfig = {
  active: {
    label: '运行中',
    Icon: CheckCircle,
    color: 'text-[var(--color-success)]',
    bg: 'bg-[var(--color-success)]',
    iconBg: 'bg-[var(--color-success-bg)]',
  },
  inactive: {
    label: '未连接',
    Icon: XCircle,
    color: 'text-[var(--color-text-secondary)]',
    bg: 'bg-[var(--color-text-secondary)]',
    iconBg: 'bg-[var(--color-bg-elevated)]',
  },
}

export default function MCPServicesPage() {
  const { data: services, loading, error, refetch } = useMcpServices()

  const mcpServices = services as McpService[] | null

  if (loading) {
    return (
      <div className="w-80 bg-[var(--color-bg-secondary)] border-l border-[var(--color-border)] flex flex-col h-full">
        <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
          <h2 className="font-medium text-[var(--color-text-primary)]">MCP 服务</h2>
          <span className="text-xs text-[var(--color-text-secondary)]">T10</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <RefreshCw className="w-6 h-6 text-[var(--color-text-secondary)] animate-spin" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-80 bg-[var(--color-bg-secondary)] border-l border-[var(--color-border)] flex flex-col h-full">
        <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
          <h2 className="font-medium text-[var(--color-text-primary)]">MCP 服务</h2>
          <span className="text-xs text-[var(--color-text-secondary)]">T10</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <AlertCircle className="w-8 h-8 text-[var(--color-error)] mb-2" />
          <p className="text-sm text-[var(--color-text-secondary)] text-center">
            加载失败: {error.message}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-3 px-3 py-1.5 text-xs bg-[var(--color-primary)] text-white rounded hover:opacity-90 transition-opacity"
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-80 bg-[var(--color-bg-secondary)] border-l border-[var(--color-border)] flex flex-col h-full">
      {/* 标题 */}
      <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
        <h2 className="font-medium text-[var(--color-text-primary)]">MCP 服务</h2>
        <span className="text-xs text-[var(--color-text-secondary)]">T10</span>
      </div>

      {/* 服务列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {!mcpServices || mcpServices.length === 0 ? (
          <div className="text-center text-[var(--color-text-secondary)] text-sm py-8">
            暂无 MCP 服务
          </div>
        ) : (
          mcpServices.map((service) => {
            const status = statusConfig[service.status]
            const StatusIcon = status.Icon

            return (
              <div
                key={service.name}
                className="p-4 bg-[var(--color-bg-tertiary)] rounded-lg border border-[var(--color-border)]"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`p-1.5 rounded-md ${status.iconBg}`}>
                      <Server className={`w-4 h-4 ${status.color}`} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                        {service.displayName || service.name}
                      </h3>
                      <p className="text-xs text-[var(--color-text-secondary)] truncate">
                        {service.name}
                      </p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1.5 flex-shrink-0 ${status.color}`}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    <span className="text-xs">{status.label}</span>
                  </div>
                </div>

                {/* 类型和启用状态 */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <Plug className="w-3 h-3 text-[var(--color-text-secondary)]" />
                    <span className="text-[var(--color-text-secondary)]">{service.type}</span>
                  </div>
                  <span className={service.enabled ? 'text-[var(--color-success)]' : 'text-[var(--color-text-secondary)]'}>
                    {service.enabled ? '已启用' : '已禁用'}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 统计信息 */}
      <div className="px-4 py-3 border-t border-[var(--color-border)] text-xs text-[var(--color-text-secondary)]">
        <div className="flex items-center justify-between">
          <span>总服务: {mcpServices?.length || 0}</span>
          <span className="text-[var(--color-success)]">
            运行中: {mcpServices?.filter(s => s.status === 'active').length || 0}
          </span>
        </div>
      </div>
    </div>
  )
}