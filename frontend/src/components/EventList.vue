<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { NCard, NSpin, NEmpty, NButton, NIcon } from 'naive-ui'
import { RefreshOutline } from '@vicons/ionicons5'
import { useEventStore } from '@/stores/eventStore'
import EventItem from './EventItem.vue'

const eventStore = useEventStore()
const refreshInterval = ref<ReturnType<typeof setInterval> | null>(null)

// 获取当前会话的事件
const events = computed(() => eventStore.currentSessionEvents)
const currentSession = computed(() => eventStore.currentSession)
const loading = computed(() => eventStore.loading)

// 刷新事件列表
async function refreshEvents() {
  if (currentSession.value?.id) {
    await eventStore.loadSessionEvents(currentSession.value.id)
  }
}

// 启动自动刷新（5秒）
function startAutoRefresh() {
  if (refreshInterval.value) return
  refreshInterval.value = setInterval(() => {
    refreshEvents()
  }, 5000)
}

// 停止自动刷新
function stopAutoRefresh() {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
    refreshInterval.value = null
  }
}

// 监听会话变化，重新加载事件
watch(
  () => currentSession.value?.id,
  (newId) => {
    if (newId) {
      refreshEvents()
    }
  }
)

onMounted(() => {
  if (currentSession.value?.id) {
    refreshEvents()
  }
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<template>
  <div class="event-list">
    <NCard class="event-list-card">
      <template #header>
        <div class="header">
          <span class="title">
            {{ currentSession ? `会话事件: ${currentSession.session_id}` : '请选择会话' }}
          </span>
          <NButton quaternary size="small" @click="refreshEvents" :loading="loading">
            <template #icon>
              <NIcon><RefreshOutline /></NIcon>
            </template>
            刷新
          </NButton>
        </div>
      </template>

      <NSpin :show="loading && events.length === 0">
        <div v-if="events.length > 0" class="events-container">
          <EventItem 
            v-for="event in events" 
            :key="event.id" 
            :event="event" 
          />
        </div>
        <NEmpty v-else description="暂无事件数据" class="empty-state">
          <template #extra>
            <span class="empty-hint">请在左侧选择一个会话</span>
          </template>
        </NEmpty>
      </NSpin>
    </NCard>
  </div>
</template>

<style scoped>
.event-list {
  width: 100%;
  height: 100%;
}

.event-list-card {
  height: 100%;
  border-radius: 8px;
}

.event-list-card :deep(.n-card__content) {
  max-height: calc(100vh - 200px);
  overflow-y: auto;
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

.events-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.empty-state {
  padding: 40px 0;
}

.empty-hint {
  color: #999;
  font-size: 14px;
}
</style>