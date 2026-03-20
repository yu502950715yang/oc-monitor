<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { NCard, NStatistic, NGrid, NGi } from 'naive-ui'
import { useEventStore } from '@/stores/eventStore'

const eventStore = useEventStore()
const refreshInterval = ref<ReturnType<typeof setInterval> | null>(null)

// 从store获取统计数据
const statistics = computed(() => eventStore.statistics)

// 刷新统计数据
async function refreshStats() {
  await eventStore.loadStatistics()
}

// 启动自动刷新（5秒）
function startAutoRefresh() {
  if (refreshInterval.value) return
  refreshInterval.value = setInterval(() => {
    refreshStats()
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
  await refreshStats()
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<template>
  <div class="stats-panel">
    <!-- 核心统计指标 -->
    <NCard title="📊 核心指标" class="stat-card">
      <NGrid :cols="2" :x-gap="8" :y-gap="8" responsive="screen" item-responsive>
        <NGi span="2:1">
          <NStatistic label="总事件数" :value="statistics?.total_events ?? 0">
            <template #prefix>📋</template>
          </NStatistic>
        </NGi>
        <NGi span="2:1">
          <NStatistic label="会话数" :value="statistics?.total_sessions ?? 0">
            <template #prefix>💬</template>
          </NStatistic>
        </NGi>
        <NGi span="2:1">
          <NStatistic label="活跃会话" :value="statistics?.active_sessions ?? 0">
            <template #prefix>🟢</template>
          </NStatistic>
        </NGi>
        <NGi span="2:1">
          <NStatistic label="今日事件" :value="statistics?.events_today ?? 0">
            <template #prefix>📅</template>
          </NStatistic>
        </NGi>
      </NGrid>
    </NCard>

    </div>
</template>

<style scoped>
.stats-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.stat-card {
  border-radius: 8px;
  background: #fff;
}

.chart-card .n-card__content {
  min-height: 120px;
}

.chart-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chart-bar-wrapper {
  width: 100%;
}

.chart-bar-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  font-size: 13px;
}

.type-name {
  color: #333;
  font-weight: 500;
}

.type-count {
  color: #666;
  font-size: 12px;
}

.chart-bar-track {
  width: 100%;
  height: 24px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
}

.chart-bar {
  height: 100%;
  background: linear-gradient(90deg, #18a058 0%, #36ad6a 100%);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 8px;
  min-width: 40px;
  animation: barGrow 0.6s ease-out forwards;
  transform-origin: left;
}

.chart-bar.agent-bar {
  background: linear-gradient(90deg, #2080f0 0%, #4098fc 100%);
}

.bar-value {
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

@keyframes barGrow {
  from {
    transform: scaleX(0);
    opacity: 0;
  }
  to {
    transform: scaleX(1);
    opacity: 1;
  }
}

/* 响应式调整 */
@media (max-width: 640px) {
  .chart-bar-label {
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }
  
  .type-count {
    font-size: 11px;
  }
}
</style>