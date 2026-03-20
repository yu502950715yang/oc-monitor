<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue'
import { NConfigProvider, NLayout, NLayoutSider, NLayoutContent, NSpin, NResult, NBadge } from 'naive-ui'
import { zhCN } from 'naive-ui'
import { useEventStore } from '@/stores/eventStore'
import StatsPanel from '@/components/StatsPanel.vue'
import SessionList from '@/components/SessionList.vue'
import AgentList from '@/components/AgentList.vue'
import AgentActivity from '@/components/AgentActivity.vue'

const eventStore = useEventStore()

// 选择智能体时加载其活动
function handleSelectAgent(agent: { name: string }) {
  if (eventStore.currentSessionId && agent.name) {
    eventStore.loadAgentActivities(eventStore.currentSessionId, agent.name)
  }
}

// 连接状态
const wsStatus = computed(() => {
  if (eventStore.wsConnected || eventStore.pollingActive) return 'connected'
  if (eventStore.wsReconnecting) return 'reconnecting'
  return 'disconnected'
})

const wsStatusText = computed(() => {
  switch (wsStatus.value) {
    case 'connected': return eventStore.pollingActive ? '轮询中' : '已连接'
    case 'reconnecting': return '重连中...'
    default: return '未连接'
  }
})

const wsStatusType = computed(() => {
  switch (wsStatus.value) {
    case 'connected': return 'success'
    case 'reconnecting': return 'warning'
    default: return 'error'
  }
})

// 初始化数据
onMounted(async () => {
  // 初始化数据
  await eventStore.initialize()
  
  // 启动WebSocket连接
  const cleanupHeartbeat = eventStore.startWebSocket()
  
  // 保存清理函数
  if (cleanupHeartbeat) {
    onUnmounted(() => {
      cleanupHeartbeat()
      eventStore.disconnectWebSocket()
    })
  }
})

onUnmounted(() => {
  eventStore.disconnectWebSocket()
})
</script>

<template>
  <NConfigProvider :locale="zhCN">
    <NLayout class="app-layout" has-sider>
      <!-- 左侧面板：400px -->
      <NLayoutSider class="left-panel" :width="400" bordered show-trigger>
        <div class="panel-header">
          <h1 class="app-title">🔍 OpenCode 监控</h1>
          <NBadge :type="wsStatusType" :dot="true" :status="wsStatusType">
            <span class="ws-status">{{ wsStatusText }}</span>
          </NBadge>
        </div>
        
        <!-- 统计面板 -->
        <div class="panel-stats">
          <StatsPanel />
        </div>

        <!-- 会话列表 -->
        <div class="panel-section">
          <div class="section-header">
            <h3>💬 会话列表</h3>
          </div>
          <div class="section-content">
            <SessionList />
          </div>
        </div>

        <!-- 智能体列表 -->
        <div class="panel-section">
          <div class="section-header">
            <h3>🤖 智能体</h3>
          </div>
          <div class="section-content">
            <AgentList 
              :agents="eventStore.agents" 
              :loading="eventStore.agentsLoading"
              @select-agent="handleSelectAgent"
            />
          </div>
        </div>
      </NLayoutSider>

      <!-- 右侧面板：flex -->
      <NLayoutContent class="right-panel" :native-scrollbar="false">
        <div class="content-header">
          <h2>📊 智能体活动详情</h2>
          <div class="header-stats">
            <span class="stat-item">
              总会话: <strong>{{ eventStore.statistics?.total_sessions || eventStore.sessions.length }}</strong>
            </span>
            <span class="stat-item">
              总事件: <strong>{{ eventStore.statistics?.total_events || eventStore.events.length }}</strong>
            </span>
          </div>
        </div>
        
        <NSpin :show="eventStore.loading && eventStore.events.length === 0">
          <div v-if="eventStore.error" class="error-container">
            <NResult 
              status="error" 
              title="加载失败" 
              :description="eventStore.error"
            />
          </div>
          
          <div v-else class="main-content">
            <AgentActivity 
              :agent-name="eventStore.currentAgentName || undefined"
              :activities="eventStore.agentActivities"
            />
          </div>
        </NSpin>
      </NLayoutContent>
    </NLayout>
  </NConfigProvider>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  height: 100%;
  width: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.app-layout {
  height: 100vh;
  background: linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%);
}

/* 左侧面板 */
.left-panel {
  background: #ffffff;
  display: flex;
  flex-direction: column;
  box-shadow: 2px 0 12px rgba(0, 0, 0, 0.06);
}

.panel-header {
  padding: 24px 20px;
  border-bottom: 1px solid #e8ecf0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.app-title {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.5px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
}

.ws-status {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 10px;
  border-radius: 12px;
  backdrop-filter: blur(4px);
}

.panel-stats {
  padding: 16px 20px;
  border-bottom: 1px solid #e8ecf0;
  background: #fafbfc;
}

.panel-section {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.section-header {
  padding: 16px 20px;
  border-bottom: 1px solid #e8ecf0;
  background: linear-gradient(180deg, #fafbfc 0%, #ffffff 100%);
}

.section-header h3 {
  font-size: 13px;
  font-weight: 700;
  color: #64748b;
  margin: 0;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.section-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

/* 右侧面板 */
.right-panel {
  background: transparent;
  padding: 16px;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  box-sizing: border-box;
}

/* 内容区标题 */
.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 0 4px;
}

.content-header h2 {
  font-size: 22px;
  font-weight: 700;
  color: #1e293b;
  letter-spacing: -0.5px;
  position: relative;
}

.content-header h2::after {
  content: '';
  position: absolute;
  bottom: -6px;
  left: 0;
  width: 40px;
  height: 3px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 2px;
}

.header-stats {
  display: flex;
  gap: 24px;
}

.stat-item {
  font-size: 14px;
  color: #64748b;
  background: #ffffff;
  padding: 8px 16px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  transition: all 0.2s ease;
}

.stat-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-item strong {
  color: #1e293b;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.error-container {
  padding: 40px;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-radius: 16px;
  overflow: hidden;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.3s ease;
  min-height: 0;
}

.main-content:hover {
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
}

/* 响应式调整 */
@media (max-width: 768px) {
  .left-panel {
    width: 100% !important;
    position: absolute;
    z-index: 100;
    left: 0;
    top: 0;
    height: 100%;
  }
  
  .header-stats {
    display: none;
  }
}
</style>