import { RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

/**
 * 视图模式类型
 */
export type ViewMode = 'session' | 'agent' | 'task' | 'tool'

/**
 * Tab 配置项
 */
const TAB_CONFIG: { value: ViewMode; label: string }[] = [
  { value: 'session', label: '会话树' },
  { value: 'agent', label: '智能体树' },
  { value: 'task', label: '任务树' },
  { value: 'tool', label: '工具链' },
]

/**
 * localStorage 键名
 */
const STORAGE_KEY = 'activity-tree-view-mode'

interface ActivityTreeTabsProps {
  /** 当前选中的视图模式 */
  view: ViewMode
  /** 视图模式变更回调 */
  onViewChange: (view: ViewMode) => void
  /** 刷新回调 */
  onRefresh: () => void
  /** 是否正在刷新 */
  isRefreshing?: boolean
}

/**
 * 获取存储的视图模式
 */
function getStoredViewMode(): ViewMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'session' || stored === 'agent' || stored === 'task' || stored === 'tool') {
      return stored
    }
  } catch {
    // localStorage 不可用时忽略
  }
  return 'session'
}

/**
 * 保存视图模式到 localStorage
 */
function saveViewMode(view: ViewMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, view)
  } catch {
    // localStorage 不可用时忽略
  }
}

/**
 * ActivityTreeTabs - 活动树视图切换组件
 * 
 * 提供 3 种视图模式切换：
 * - 统一树：显示统一的活动层级关系
 * - 任务树：显示任务层级
 * - 工具链：显示工具调用链
 * 
 * 支持 localStorage 持久化，刷新页面后恢复上次选择的视图
 */
export default function ActivityTreeTabs({
  view,
  onViewChange,
  onRefresh,
  isRefreshing = false,
}: ActivityTreeTabsProps) {
  // 内部状态初始化 - 先尝试从 localStorage 恢复
  const [initialized, setInitialized] = useState(false)

  // 组件挂载时从 localStorage 恢复视图模式
  useEffect(() => {
    if (!initialized) {
      const storedView = getStoredViewMode()
      if (storedView !== view) {
        onViewChange(storedView)
      }
      setInitialized(true)
    }
  }, [initialized, view, onViewChange])

  // 视图模式变更时保存到 localStorage
  const handleViewChange = useCallback(
    (newView: ViewMode) => {
      onViewChange(newView)
      saveViewMode(newView)
    },
    [onViewChange]
  )

  return (
    <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between flex-shrink-0">
      {/* 左侧 Tab 切换 */}
      <div className="flex items-center gap-1">
        <h2 className="font-medium text-[var(--color-text-primary)] mr-4">活动树</h2>
        <div className="flex items-center bg-[var(--color-bg-tertiary)] rounded-lg p-0.5">
          {TAB_CONFIG.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => handleViewChange(tab.value)}
              className={`
                px-3 py-1.5 text-sm rounded-md transition-all duration-200
                ${
                  view === tab.value
                    ? 'bg-[var(--color-primary)] text-white shadow-sm'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)]'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 右侧刷新按钮 */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="text-xs px-2 py-1 rounded bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-border)] text-[var(--color-text-primary)] disabled:opacity-50 transition-colors flex items-center gap-1"
        >
          <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? '刷新中...' : '刷新'}
        </button>
        <span className="text-xs text-[var(--color-text-secondary)]">T13</span>
      </div>
    </div>
  )
}