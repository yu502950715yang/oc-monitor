/**
 * 相对时间格式化函数
 * 将 ISO 时间字符串转换为相对时间显示
 * - < 60秒: "刚刚"
 * - <= 5分钟: "N分钟前"
 * - > 5分钟: 显示具体时间 (月日 时:分)
 */
export function formatRelativeTime(isoString: string): string {
  if (!isoString) return '未知'

  const date = new Date(isoString)
  if (isNaN(date.getTime())) return '未知'

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)

  if (diffSec < 60) return '刚刚'
  if (diffMin <= 5) return `${diffMin}分钟前`
  // 超过5分钟显示具体时间
  return date.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}