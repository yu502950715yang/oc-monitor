import { useEffect, useCallback, useRef } from 'react'

// 轮询间隔（毫秒），需与 electron/main/config.ts 中的 config.polling.interval 保持一致
const DEFAULT_INTERVAL = 3000 // 3 seconds

interface UsePollingOptions {
  onPoll: () => void | Promise<void>
  interval?: number
  enabled?: boolean
}

/**
 * Hook for real-time data updates with polling
 */
export function usePolling({ onPoll, interval = DEFAULT_INTERVAL, enabled = true }: UsePollingOptions) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const onPollRef = useRef(onPoll)

  // Keep the callback ref updated
  onPollRef.current = onPoll

  const poll = useCallback(() => {
    onPollRef.current()
  }, [])

  const refresh = useCallback(() => {
    onPollRef.current()
  }, [])

  useEffect(() => {
    if (!enabled) {
      return
    }

    // Initial poll
    poll()

    // Start polling
    intervalRef.current = setInterval(poll, interval)

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [poll, interval, enabled])

  return { refresh }
}