import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { OpenCodeEvent, Session, Statistics, EventQueryParams, Agent, AgentActivity } from '@/types'
import { fetchEvents, fetchSessions, fetchStatistics, fetchAgents, fetchAgentEvents, WS_URL } from '@/services/api'

export const useEventStore = defineStore('events', () => {
  // ==================== 状态 ====================
  const sessions = ref<Session[]>([])
  const events = ref<OpenCodeEvent[]>([])
  const statistics = ref<Statistics | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const currentSessionId = ref<string | null>(null)
  const agents = ref<Agent[]>([])
  const agentsLoading = ref(false)
  const agentActivities = ref<AgentActivity[]>([])
  const agentActivitiesLoading = ref(false)
  const currentAgentName = ref<string | null>(null)
  
  // WebSocket状态
  const wsConnected = ref(false)
  const wsReconnecting = ref(false)
  let wsClient: WebSocket | null = null
  let wsReconnectTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectAttempts = 0
  const WS_RECONNECT_INTERVAL = 3000 // 重连间隔3秒
  
  // 轮询状态（WebSocket后备）
  let pollingTimer: ReturnType<typeof setInterval> | null = null
  const POLLING_INTERVAL = 5000 // 轮询间隔5秒
  const pollingActive = ref(false) // 轮询是否正在运行

  // ==================== 计算属性 ====================
  
  // 按会话过滤的事件
  const eventsBySession = computed(() => {
    if (!currentSessionId.value) return events.value
    return events.value.filter(e => e.session_id === currentSessionId.value)
  })

  // 今日事件
  const todayEvents = computed(() => {
    const today = new Date().toISOString().split('T')[0]
    return events.value.filter(e => e.timestamp.startsWith(today))
  })

  // 当前会话的事件（按时间倒序）
  const currentSessionEvents = computed(() => {
    if (!currentSessionId.value) return []
    return events.value
      .filter(e => e.session_id === currentSessionId.value)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  })

  // 当前会话信息
  const currentSession = computed(() => {
    if (!currentSessionId.value) return null
    return sessions.value.find(s => s.id === currentSessionId.value) || null
  })

  // ==================== Actions - 数据加载 ====================

  /**
   * 加载事件列表
   */
  async function loadEvents(params?: EventQueryParams) {
    loading.value = true
    error.value = null
    try {
      const newEvents = await fetchEvents(params)
      // 合并事件，避免重复
      const existingIds = new Set(events.value.map(e => e.id))
      const uniqueNewEvents = newEvents.filter(e => !existingIds.has(e.id))
      
      if (uniqueNewEvents.length > 0) {
        // 新事件添加到列表前面
        events.value = [...uniqueNewEvents.reverse(), ...events.value]
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载事件失败'
      console.error('加载事件失败:', e)
    } finally {
      loading.value = false
    }
  }

  /**
   * 加载统计数据
   */
  async function loadStatistics() {
    try {
      statistics.value = await fetchStatistics()
    } catch (e) {
      console.error('加载统计数据失败:', e)
    }
  }

  /**
   * 加载会话列表
   */
  async function loadSessions() {
    loading.value = true
    error.value = null
    try {
      const result = await fetchSessions()
      sessions.value = result.sessions
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载会话失败'
      console.error('加载会话失败:', e)
    } finally {
      loading.value = false
    }
  }

  /**
   * 加载会话事件
   */
  async function loadSessionEvents(sessionId: string) {
    loading.value = true
    error.value = null
    try {
      const sessionEvents = await fetchEvents({ session_id: sessionId })
      // 合并到events中，避免重复
      const existingIds = new Set(events.value.map(e => e.id))
      const newEvents = sessionEvents.filter(e => !existingIds.has(e.id))
      events.value = [...events.value, ...newEvents]
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载会话事件失败'
      console.error('加载会话事件失败:', e)
    } finally {
      loading.value = false
    }
  }

  /**
   * 加载智能体列表
   */
  async function loadAgents(sessionId: string) {
    agentsLoading.value = true
    try {
      agents.value = await fetchAgents(sessionId)
    } catch (e) {
      console.error('加载智能体列表失败:', e)
      agents.value = []
    } finally {
      agentsLoading.value = false
    }
  }

  /**
   * 加载智能体活动
   */
  async function loadAgentActivities(sessionId: string, agentName: string) {
    agentActivitiesLoading.value = true
    currentAgentName.value = agentName
    try {
      agentActivities.value = await fetchAgentEvents(sessionId, agentName)
    } catch (e) {
      console.error('加载智能体活动失败:', e)
      agentActivities.value = []
    } finally {
      agentActivitiesLoading.value = false
    }
  }

  /**
   * 初始化所有数据
   */
  async function initialize() {
    loading.value = true
    try {
      await Promise.all([
        loadEvents(),
        loadStatistics(),
        loadSessions()
      ])
    } finally {
      loading.value = false
    }
  }

  // ==================== Actions - 会话管理 ====================

  /**
   * 设置当前会话
   */
  function setCurrentSession(sessionId: string | null) {
    currentSessionId.value = sessionId
    if (sessionId) {
      // 加载该会话的事件
      loadSessionEvents(sessionId)
      // 加载该会话的智能体列表
      loadAgents(sessionId)
    } else {
      // 清除智能体列表
      agents.value = []
    }
  }

  // ==================== Actions - 事件管理 ====================

  /**
   * 添加新事件
   */
  function addEvent(event: OpenCodeEvent) {
    // 避免重复添加
    const exists = events.value.some(e => e.id === event.id)
    if (!exists) {
      events.value.unshift(event)
    }
  }

  /**
   * 清除所有事件
   */
  function clearEvents() {
    events.value = []
  }

  // ==================== Actions - WebSocket ====================

  /**
   * 处理WebSocket消息
   */
  function handleWsMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data)
      
      switch (data.type) {
        case 'new_event':
          // 新事件通知
          addEvent(data.payload as OpenCodeEvent)
          // 刷新统计数据
          loadStatistics()
          
          // 如果当前有选中的会话，刷新智能体列表
          if (currentSessionId.value) {
            loadAgents(currentSessionId.value)
            
            // 如果当前有选中的智能体，刷新智能体活动
            if (currentAgentName.value) {
              loadAgentActivities(currentSessionId.value, currentAgentName.value)
            }
          }
          break
          
        case 'session_update':
          // 会话更新通知
          loadSessions()
          break
          
        case 'statistics_update':
          // 统计数据更新
          statistics.value = data.payload as Statistics
          break
          
        case 'ping':
          // 心跳响应
          break
          
        default:
          console.log('未知的WebSocket消息类型:', data.type)
      }
    } catch (e) {
      console.error('解析WebSocket消息失败:', e)
    }
  }

  /**
   * WebSocket连接
   */
  function connectWebSocket() {
    if (wsClient?.readyState === WebSocket.OPEN) {
      return
    }
    
    try {
      wsClient = new WebSocket(`${WS_URL}/ws/events`)
      
      wsClient.onopen = () => {
        console.log('WebSocket连接已建立')
        wsConnected.value = true
        wsReconnecting.value = false
        
        // 发送心跳
        wsClient?.send(JSON.stringify({ type: 'ping' }))
      }
      
      wsClient.onmessage = (event) => {
        handleWsMessage(event)
      }
      
      wsClient.onerror = (error) => {
        console.error('WebSocket错误:', error)
        wsConnected.value = false
        // WebSocket失败时启动轮询作为后备
        startPolling()
      }
      
      wsClient.onclose = (event) => {
        console.log('WebSocket连接关闭', event.code, event.reason)
        wsConnected.value = false
        
        // 启动轮询作为后备
        startPolling()
        
        // 自动重连（仅尝试3次）
        if (!event.wasClean && reconnectAttempts < 3) {
          scheduleReconnect()
        }
      }
    } catch (e) {
      console.error('WebSocket连接失败:', e)
      wsConnected.value = false
      scheduleReconnect()
    }
  }

/**
    * 启动轮询（WebSocket后备方案）
    */
  function startPolling() {
    if (pollingTimer) return // 已经在轮询
    
    console.log('启动轮询作为WebSocket后备...')
    pollingActive.value = true // 标记轮询正在运行
    
    pollingTimer = setInterval(async () => {
      try {
        await loadStatistics()
        await loadSessions()
        if (currentSessionId.value) {
          await loadSessionEvents(currentSessionId.value)
        }
      } catch (e) {
        console.error('轮询更新失败:', e)
      }
    }, POLLING_INTERVAL)
  }



  /**
   * 安排重连
   */
  function scheduleReconnect() {
    if (wsReconnecting.value) return
    
    reconnectAttempts++
    wsReconnecting.value = true
    console.log(`${WS_RECONNECT_INTERVAL / 1000}秒后尝试重连... (${reconnectAttempts}/3)`)
    
    if (wsReconnectTimer) {
      clearTimeout(wsReconnectTimer)
    }
    
    wsReconnectTimer = setTimeout(() => {
      wsReconnecting.value = false
      connectWebSocket()
    }, WS_RECONNECT_INTERVAL)
  }

  /**
   * 断开WebSocket连接
   */
  function disconnectWebSocket() {
    if (wsReconnectTimer) {
      clearTimeout(wsReconnectTimer)
      wsReconnectTimer = null
    }
    
    if (wsClient) {
      wsClient.close(1000, '客户端主动断开')
      wsClient = null
    }
    
    wsConnected.value = false
    wsReconnecting.value = false
  }

  /**
   * 启动WebSocket连接
   */
  function startWebSocket() {
    connectWebSocket()
    
    // 设置心跳保活
    const heartbeat = setInterval(() => {
      if (wsClient?.readyState === WebSocket.OPEN) {
        wsClient.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000)
    
    // 保存心跳interval引用以便清理
    return () => clearInterval(heartbeat)
  }

  // ==================== 清理 ====================
  
/**
    * 重置状态
    */
  function reset() {
    disconnectWebSocket()
    sessions.value = []
    events.value = []
    statistics.value = null
    currentSessionId.value = null
    agents.value = []
    error.value = null
  }

  return {
    // ==================== 状态 ====================
    sessions,
    events,
    statistics,
    loading,
    error,
    currentSessionId,
    agents,
    agentsLoading,
    agentActivities,
    agentActivitiesLoading,
    currentAgentName,
    wsConnected,
    wsReconnecting,
    pollingActive,
    
    // ==================== 计算属性 ====================
    eventsBySession,
    todayEvents,
    currentSessionEvents,
    currentSession,
    
    // ==================== Actions - 数据加载 ====================
    loadEvents,
    loadStatistics,
    loadSessions,
    loadSessionEvents,
    loadAgents,
    loadAgentActivities,
    initialize,
    
    // ==================== Actions - 会话管理 ====================
    setCurrentSession,
    
    // ==================== Actions - 事件管理 ====================
    addEvent,
    clearEvents,
    
    // ==================== Actions - WebSocket ====================
    connectWebSocket,
    disconnectWebSocket,
    startWebSocket,
    
    // ==================== 清理 ====================
    reset
  }
})