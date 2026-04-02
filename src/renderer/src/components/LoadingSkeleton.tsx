/**
 * Loading skeleton components for better UX during data fetching
 * Following frontend-design skill principles:
 * - Provide visual feedback during loading
 * - Prevent layout shift
 * - Match the shape of actual content
 */

// Session list item skeleton
export function SessionListSkeleton({ index }: { index: number }) {
  return (
    <div className="px-4 py-3 border-b border-[var(--color-border)] animate-pulse" data-skeleton-index={index}>
      <div className="flex items-center justify-between mb-2">
        <div className="h-4 w-32 bg-[var(--color-bg-tertiary)] rounded"></div>
        <div className="h-4 w-12 bg-[var(--color-bg-tertiary)] rounded"></div>
      </div>
      <div className="h-3 w-24 bg-[var(--color-bg-tertiary)] rounded"></div>
    </div>
  )
}

// Activity item skeleton
export function ActivityItemSkeleton({ index }: { index: number }) {
  return (
    <div className="p-3 rounded-lg border border-[var(--color-border)] animate-pulse" data-skeleton-index={index}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="h-3.5 w-3.5 bg-[var(--color-bg-tertiary)] rounded"></div>
          <div className="h-3 w-12 bg-[var(--color-bg-tertiary)] rounded"></div>
          <div className="h-3 w-20 bg-[var(--color-bg-tertiary)] rounded"></div>
        </div>
        <div className="h-3 w-16 bg-[var(--color-bg-tertiary)] rounded"></div>
      </div>
      <div className="h-4 w-full bg-[var(--color-bg-tertiary)] rounded mb-2"></div>
      <div className="h-4 w-3/4 bg-[var(--color-bg-tertiary)] rounded"></div>
    </div>
  )
}

// Activity stream skeleton (multiple items)
export function ActivityStreamSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <ActivityItemSkeleton key={`activity-skeleton-${i}`} index={i} />
      ))}
    </div>
  )
}

// Stats panel skeleton
export function StatsPanelSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={`stats-skeleton-${i}`} className="bg-[var(--color-bg-secondary)] rounded-lg p-4 border border-[var(--color-border)]">
          <div className="h-3 w-16 bg-[var(--color-bg-tertiary)] rounded mb-2"></div>
          <div className="h-6 w-20 bg-[var(--color-bg-tertiary)] rounded"></div>
        </div>
      ))}
    </div>
  )
}

// Plan progress skeleton
export function PlanProgressSkeleton() {
  return (
    <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 border border-[var(--color-border)] animate-pulse">
      <div className="h-4 w-24 bg-[var(--color-bg-tertiary)] rounded mb-3"></div>
      <div className="h-2 w-full bg-[var(--color-bg-tertiary)] rounded mb-4"></div>
      <div className="space-y-2">
        <div className="h-3 w-full bg-[var(--color-bg-tertiary)] rounded"></div>
        <div className="h-3 w-full bg-[var(--color-bg-tertiary)] rounded"></div>
        <div className="h-3 w-3/4 bg-[var(--color-bg-tertiary)] rounded"></div>
      </div>
    </div>
  )
}

// Full page loading overlay
export function LoadingOverlay({ message = "加载中..." }: { message?: string }) {
  return (
    <div className="absolute inset-0 bg-[var(--color-bg-primary)]/80 flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm text-[var(--color-text-secondary)]">{message}</span>
      </div>
    </div>
  )
}

// Skeleton for empty/loading state in session list
export function SessionListLoading({ count = 5 }: { count?: number }) {
  return (
    <div className="flex-1 overflow-y-auto">
      {Array.from({ length: count }).map((_, i) => (
        <SessionListSkeleton key={`session-skeleton-${i}`} index={i} />
      ))}
    </div>
  )
}