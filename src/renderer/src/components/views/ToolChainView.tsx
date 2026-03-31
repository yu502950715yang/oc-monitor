/**
 * ToolChainView - 工具链视图组件
 * 按时间正序展示所有工具调用
 * 
 * 节点显示：工具名称 + 工具类型 + 状态 + 耗时
 * 按工具类型着色（参考 ActivityStream.tsx 颜色映射）
 */

import { useMemo } from 'react'
import { Terminal, FileText, Clock, CheckCircle, XCircle, Loader2, Wrench } from 'lucide-react'

// 导入 mock 数据用于测试
import { 
  mockToolChain, 
  mockToolChainEmpty,
  type PartMeta 
} from '../__tests__/fixtures/mockActivityData'

// ============ 类型定义 ============

interface ToolChainViewProps {
  /** 工具链数据，如果不提供则使用 mock 数据 */
  toolChain?: PartMeta[] | null
  /** 是否显示刷新按钮 */
  showRefresh?: boolean
  /** 刷新回调 */
  onRefresh?: () => void
}

// ============ 工具类型颜色映射 ============
// 参考 ActivityStream.tsx 中的 defaultToolTypeColors
const toolTypeConfig: Record<string, { label: string; color: string; bg: string }> = {
  read: { label: '读取', color: '#58a6ff', bg: 'rgba(88, 166, 255, 0.1)' },
  write: { label: '写入', color: '#3fb950', bg: 'rgba(63, 185, 80, 0.1)' },
  edit: { label: '编辑', color: '#d29922', bg: 'rgba(210, 153, 34, 0.1)' },
  bash: { label: '运行', color: '#f85149', bg: 'rgba(248, 81, 73, 0.1)' },
  grep: { label: '搜索', color: '#a371f7', bg: 'rgba(163, 113, 247, 0.1)' },
  glob: { label: '查找', color: '#79c0ff', bg: 'rgba(121, 192, 255, 0.1)' },
  skill: { label: '技能', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.1)' },
  task: { label: '委托', color: '#d2a8ff', bg: 'rgba(210, 168, 255, 0.1)' },
  webfetch: { label: '获取', color: '#ffa657', bg: 'rgba(255, 166, 87, 0.1)' },
  mcp: { label: 'MCP', color: '#58a6ff', bg: 'rgba(88, 166, 255, 0.1)' },
}

// ============ 辅助函数 ============

/** 格式化耗时 */
function formatDuration(timeStart?: number, timeEnd?: number): string {
  if (!timeStart) return ''
  
  // 如果没有结束时间，说明还在运行中
  if (!timeEnd) return '运行中'
  
  const duration = timeEnd - timeStart
  
  if (duration < 1000) return `${duration}ms`
  if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`
  const minutes = Math.floor(duration / 60000)
  const seconds = Math.round((duration % 60000) / 1000)
  return `${minutes}m ${seconds}s`
}

/** 获取工具类型配置 */
function getToolTypeConfig(tool?: string) {
  if (!tool) {
    return { label: '工具', color: '#58a6ff', bg: 'rgba(88, 166, 255, 0.1)' }
  }
  return toolTypeConfig[tool] || { label: tool, color: '#58a6ff', bg: 'rgba(88, 166, 255, 0.1)' }
}

/** 获取状态图标 */
function getStatusIcon({ status }: { status?: string }) {
  if (status === 'completed') {
    return <CheckCircle className="w-3.5 h-3.5" style={{ color: '#3fb950' }} />
  }
  if (status === 'error') {
    return <XCircle className="w-3.5 h-3.5" style={{ color: '#f85149' }} />
  }
  if (status === 'running' || status === 'in_progress') {
    return <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: '#58a6ff' }} />
  }
  return <Clock className="w-3.5 h-3.5" style={{ color: '#8b949e' }} />
}

// ============ 工具项组件 ============

interface ToolItemProps {
  tool: PartMeta
  index: number
}

function ToolItem({ tool, index }: ToolItemProps) {
  const config = getToolTypeConfig(tool.tool)
  const duration = formatDuration(tool.timeStart, tool.timeEnd)
  
  return (
    <div 
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-[var(--color-border)] transition-all duration-150 hover:opacity-90"
      style={{ 
        backgroundColor: config.bg,
        borderColor: `${config.color}30`,
      }}
    >
      {/* 序号 */}
      <span 
        className="w-6 h-6 flex items-center justify-center text-xs font-medium rounded"
        style={{ 
          backgroundColor: `${config.color}20`,
          color: config.color,
        }}
      >
        {index + 1}
      </span>
      
      {/* 工具图标 */}
      <Terminal className="w-4 h-4 flex-shrink-0" style={{ color: config.color }} />
      
      {/* 工具名称 */}
      <span 
        className="text-sm font-medium min-w-[60px]"
        style={{ color: config.color }}
      >
        {tool.tool || 'unknown'}
      </span>
      
      {/* 工具类型标签 */}
      <span 
        className="text-xs px-1.5 py-0.5 rounded"
        style={{ 
          backgroundColor: `${config.color}20`,
          color: config.color,
        }}
      >
        {config.label}
      </span>
      
      {/* 动作描述 */}
      {tool.action && (
        <span className="flex-1 text-sm text-[var(--color-text-primary)] truncate" title={tool.action}>
          {tool.action}
        </span>
      )}
      
      {/* 状态和耗时 */}
      <div className="flex items-center gap-2">
        {/* 状态图标 */}
        {getStatusIcon({ status: tool.status })}
        
        {/* 状态文字 */}
        <span className="text-xs">
          {tool.status === 'completed' && (
            <span style={{ color: '#3fb950' }}>完成</span>
          )}
          {tool.status === 'error' && (
            <span style={{ color: '#f85149' }}>错误</span>
          )}
          {(tool.status === 'running' || tool.status === 'in_progress') && (
            <span style={{ color: '#58a6ff' }}>运行中</span>
          )}
          {!tool.status && (
            <span className="text-[var(--color-text-muted)]">等待</span>
          )}
        </span>
        
        {/* 耗时 */}
        {duration && (
          <span 
            className="text-xs px-1.5 py-0.5 rounded"
            style={{ 
              backgroundColor: 'var(--color-bg-tertiary)',
              color: duration === '运行中' ? '#58a6ff' : 'var(--color-text-secondary)',
            }}
          >
            {duration}
          </span>
        )}
      </div>
    </div>
  )
}

// ============ 主组件 ============

export default function ToolChainView({ 
  toolChain: propToolChain,
  showRefresh = false,
  onRefresh,
}: ToolChainViewProps) {
  // 使用 prop 数据或 mock 数据
  const toolChain = propToolChain ?? mockToolChain
  
  // 按时间正序排列（按 createdAt 排序，最早的在前）
  const sortedToolChain = useMemo(() => {
    if (!toolChain || toolChain.length === 0) return []
    
    return [...toolChain].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : (a.timeStart || 0)
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : (b.timeStart || 0)
      return timeA - timeB
    })
  }, [toolChain])
  
  const showEmpty = !toolChain || toolChain.length === 0
  
  // 刷新处理
  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh()
    }
  }
  
  // 空状态
  if (showEmpty) {
    return (
      <div className="flex-1 bg-[var(--color-bg-primary)] flex flex-col h-full overflow-hidden">
        {/* 标题栏 */}
        <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-bg-secondary)]">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-[var(--color-text-secondary)]" />
            <h2 className="text-sm font-medium text-[var(--color-text-primary)]">工具链</h2>
          </div>
          {showRefresh && onRefresh && (
            <button 
              type="button"
              onClick={handleRefresh}
              className="p-1.5 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              title="刷新"
            >
              <Wrench className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {/* 空状态显示 */}
        <div className="flex-1 flex flex-col items-center justify-center text-[var(--color-text-secondary)] text-sm gap-2">
          <Wrench className="w-8 h-8 opacity-50" />
          <span>暂无工具调用记录</span>
        </div>
      </div>
    )
  }
  
  return (
    <div className="flex-1 bg-[var(--color-bg-primary)] flex flex-col h-full overflow-hidden">
      {/* 标题栏 */}
      <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-bg-secondary)]">
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-[var(--color-text-secondary)]" />
          <h2 className="text-sm font-medium text-[var(--color-text-primary)]">工具链</h2>
          <span className="text-xs text-[var(--color-text-muted)]">
            ({sortedToolChain.length} 个工具调用)
          </span>
        </div>
        {showRefresh && onRefresh && (
          <button 
            type="button"
            onClick={handleRefresh}
            className="p-1.5 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            title="刷新"
          >
            <Wrench className="w-4 h-4" />
          </button>
        )}
      </div>
      
      {/* 工具链列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {sortedToolChain.map((tool, index) => (
          <ToolItem 
            key={tool.id || `tool-${index}`} 
            tool={tool} 
            index={index}
          />
        ))}
      </div>
      
      {/* 底部统计 */}
      <div className="px-4 py-3 border-t border-[var(--color-bg-secondary)] bg-[var(--color-bg-secondary)]">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <FileText className="w-3 h-3 text-[#58a6ff]" />
            <span className="text-[var(--color-text-secondary)]">
              读取: {toolChain.filter(t => t.tool === 'read').length}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <FileText className="w-3 h-3 text-[#3fb950]" />
            <span className="text-[var(--color-text-secondary)]">
              写入: {toolChain.filter(t => t.tool === 'write').length}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Terminal className="w-3 h-3 text-[#d29922]" />
            <span className="text-[var(--color-text-secondary)]">
              编辑: {toolChain.filter(t => t.tool === 'edit').length}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Terminal className="w-3 h-3 text-[#f85149]" />
            <span className="text-[var(--color-text-secondary)]">
              运行: {toolChain.filter(t => t.tool === 'bash').length}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============ 导出 ============

export { mockToolChain, mockToolChainEmpty }
export type { PartMeta }