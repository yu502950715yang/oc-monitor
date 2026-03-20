<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { NCard, NThing, NTag, NSpin, NEmpty, NButton, NIcon } from 'naive-ui'
import { RefreshOutline, ChatbubblesOutline } from '@vicons/ionicons5'
import { useEventStore } from '@/stores/eventStore'
import type { Session } from '@/types'

const eventStore = useEventStore()
const refreshInterval = ref<ReturnType<typeof setInterval> | null>(null)

// 获取会话列表
const sessions = computed(() => eventStore.sessions)
const currentSessionId = computed(() => eventStore.currentSessionId)
const loading = computed(() => eventStore.loading)

// 会话状态颜色映射
const statusColors = {
  'active': 'success',
  'completed': 'info',
  'error': 'error'
} as const

// 格式化时间
function formatTime(timestamp: string | undefined | null) {
  if (!timestamp) return '未知时间'
  const date = new Date(timestamp)
  if (isNaN(date.getTime())) return '无效日期'
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 选择会话
function selectSession(session: Session) {
  eventStore.setCurrentSession(session.id)
}

// 刷新会话列表
async function refreshSessions() {
  await eventStore.loadSessions()
}

// 启动自动刷新（5秒）
function startAutoRefresh() {
  if (refreshInterval.value) return
  refreshInterval.value = setInterval(() => {
    refreshSessions()
  }, 5000)
}

// 停止自动刷新
function stopAutoRefresh() {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
    refreshInterval.value = null
  }
}

onMounted(async () => {
  await refreshSessions()
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<template>
  <div class="session-list">
    <NCard class="session-list-card">
      <template #header>
        <div class="header">
          <span class="title">💬 会话列表</span>
          <NButton quaternary size="small" @click="refreshSessions" :loading="loading">
            <template #icon>
              <NIcon><RefreshOutline /></NIcon>
            </template>
            刷新
          </NButton>
        </div>
      </template>

      <NSpin :show="loading && sessions.length === 0">
        <div v-if="sessions.length > 0" class="sessions-container">
          <div
            v-for="session in sessions"
            :key="session.id"
            class="session-item"
            :class="{ 'active': currentSessionId === session.id }"
            @click="selectSession(session)"
          >
            <NThing>
              <template #header>
                <div class="session-header">
                  <NIcon class="session-icon"><ChatbubblesOutline /></NIcon>
                  <span class="session-id">{{ session.session_id }}</span>
                </div>
              </template>
              <template #description>
                <div class="session-meta">
                  <NTag :type="statusColors[session.status]" size="small">
                    {{ session.status === 'active' ? '进行中' : session.status === 'completed' ? '已完成' : '错误' }}
                  </NTag>
                  <span class="session-time">{{ formatTime(session.start_time) }}</span>
                </div>
              </template>
              <template #header-extra>
                <div class="session-stats">
                  <span class="event-count">📋 {{ session.event_count }} 事件</span>
                  <span class="agent-count">🤖 {{ session.agent_count }} 智能体</span>
                </div>
              </template>
            </NThing>
          </div>
        </div>
        <NEmpty v-else description="暂无会话数据" class="empty-state">
          <template #extra>
            <span class="empty-hint">暂无活跃的会话</span>
          </template>
        </NEmpty>
      </NSpin>
    </NCard>
  </div>
</template>

<style scoped>
.session-list {
  width: 100%;
  height: 100%;
}

.session-list-card {
  height: 100%;
  border-radius: 8px;
}

.session-list-card :deep(.n-card__content) {
  max-height: calc(100vh - 200px);
  overflow-y: auto;
  padding: 0;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.sessions-container {
  display: flex;
  flex-direction: column;
}

.session-item {
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: all 0.2s ease;
}

.session-item:last-child {
  border-bottom: none;
}

.session-item:hover {
  background: #f9fafb;
}

.session-item.active {
  background: #e6f4ff;
  border-left: 3px solid #2080f0;
}

.session-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.session-icon {
  color: #2080f0;
}

.session-id {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 150px;
}

.session-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.session-time {
  font-size: 12px;
  color: #999;
}

.session-stats {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.event-count,
.agent-count {
  font-size: 12px;
  color: #666;
}

.empty-state {
  padding: 40px 0;
}

.empty-hint {
  color: #999;
  font-size: 14px;
}
</style>