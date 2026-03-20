<script setup lang="ts">
import { computed } from 'vue'
import { NCard, NThing, NTag, NSpin, NEmpty } from 'naive-ui'
import type { Agent } from '@/types'

// 定义组件 emits
const emit = defineEmits<{
  'select-agent': [agent: Agent]
}>()

// 接收 props
const props = defineProps<{
  agents: Agent[]
  loading?: boolean
}>()

// 智能体状态颜色映射
const statusColors = {
  'busy': 'warning',
  'idle': 'success',
  'unknown': 'default'
} as const

// 状态文本映射
const statusText = {
  'busy': '忙碌中',
  'idle': '空闲',
  'unknown': '未知'
} as const

// 计算属性
const displayAgents = computed(() => props.agents)
const isLoading = computed(() => props.loading ?? false)

// 选择智能体
function selectAgent(agent: Agent) {
  emit('select-agent', agent)
}
</script>

<template>
  <div class="agent-list">
    <NCard class="agent-list-card">
      <template #header>
        <div class="header">
          <span class="title">🤖 智能体列表</span>
        </div>
      </template>

      <NSpin :show="isLoading && displayAgents.length === 0">
        <div v-if="displayAgents.length > 0" class="agents-container">
          <div
            v-for="agent in displayAgents"
            :key="agent.name"
            class="agent-item"
            @click="selectAgent(agent)"
          >
            <NThing>
              <template #header>
                <div class="agent-header">
                  <span class="agent-name">{{ agent.name }}</span>
                </div>
              </template>
              <template #description>
                <div class="agent-meta">
                  <NTag :type="statusColors[agent.status]" size="small">
                    {{ statusText[agent.status] }}
                  </NTag>
                </div>
              </template>
              <template #header-extra>
                <div class="agent-stats">
                  <span class="event-count">📋 {{ agent.eventCount }} 事件</span>
                </div>
              </template>
            </NThing>
          </div>
        </div>
        <NEmpty v-else description="暂无智能体数据" class="empty-state">
          <template #extra>
            <span class="empty-hint">当前会话暂无智能体</span>
          </template>
        </NEmpty>
      </NSpin>
    </NCard>
  </div>
</template>

<style scoped>
.agent-list {
  width: 100%;
  height: 100%;
}

.agent-list-card {
  height: 100%;
  border-radius: 8px;
}

.agent-list-card :deep(.n-card__content) {
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

.agents-container {
  display: flex;
  flex-direction: column;
}

.agent-item {
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: all 0.2s ease;
}

.agent-item:last-child {
  border-bottom: none;
}

.agent-item:hover {
  background: #f9fafb;
}

.agent-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.agent-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.agent-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.agent-stats {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.event-count {
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