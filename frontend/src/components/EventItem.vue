<script setup lang="ts">
import { ref, computed } from 'vue'
import { NCard, NTag, NButton, NEmpty } from 'naive-ui'
import type { OpenCodeEvent } from '@/types'

const props = defineProps<{
  event: OpenCodeEvent
}>()

const expanded = ref(false)

// 事件类型到颜色的映射
const eventTypeColors: Record<string, 'default' | 'primary' | 'info' | 'success' | 'warning' | 'error'> = {
  'message': 'info',
  'tool': 'success',
  'thinking': 'warning',
  'error': 'error',
  'system': 'default',
  'action': 'primary'
}

// 获取事件类型的颜色
const eventColor = computed(() => {
  const type = props.event.event_type?.toLowerCase() || 'default'
  for (const key of Object.keys(eventTypeColors)) {
    if (type.includes(key)) {
      return eventTypeColors[key]
    }
  }
  return 'default'
})

// 格式化时间
const formattedTime = computed(() => {
  const date = new Date(props.event.timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
})

// 获取摘要
const summary = computed(() => {
  const content = props.event.content || ''
  return content.length > 100 ? content.substring(0, 100) + '...' : content
})

// 解析 metadata 中的 input_data 和 output_data
const inputData = computed(() => {
  if (props.event.metadata?.input_data) {
    return JSON.stringify(props.event.metadata.input_data, null, 2)
  }
  return null
})

const outputData = computed(() => {
  if (props.event.metadata?.output_data) {
    return JSON.stringify(props.event.metadata.output_data, null, 2)
  }
  return null
})

function toggleExpand() {
  expanded.value = !expanded.value
}
</script>

<template>
  <NCard class="event-item" :class="{ 'expanded': expanded }" size="small">
    <!-- 摘要行 -->
    <div class="event-summary" @click="toggleExpand">
      <div class="event-info">
        <NTag :type="eventColor" size="small" class="event-type-tag">
          {{ event.event_type || '未知' }}
        </NTag>
        <span class="event-time">{{ formattedTime }}</span>
      </div>
      <div class="event-content">
        <span class="event-text">{{ summary }}</span>
        <NButton text size="small" class="expand-btn">
          {{ expanded ? '收起' : '展开' }}
          <span class="arrow">{{ expanded ? '▲' : '▼' }}</span>
        </NButton>
      </div>
    </div>

    <!-- 详情展开区域 -->
    <div v-if="expanded" class="event-details">
      <div class="detail-section">
        <div class="detail-label">会话ID</div>
        <div class="detail-value">{{ event.session_id }}</div>
      </div>
      
      <div v-if="event.agent_type" class="detail-section">
        <div class="detail-label">智能体类型</div>
        <div class="detail-value">{{ event.agent_type }}</div>
      </div>

      <div class="detail-section">
        <div class="detail-label">完整内容</div>
        <pre class="detail-content">{{ event.content }}</pre>
      </div>

      <div v-if="inputData" class="detail-section">
        <div class="detail-label">输入数据 (input_data)</div>
        <pre class="detail-content code">{{ inputData }}</pre>
      </div>

      <div v-if="outputData" class="detail-section">
        <div class="detail-label">输出数据 (output_data)</div>
        <pre class="detail-content code">{{ outputData }}</pre>
      </div>

      <div v-if="!inputData && !outputData && !event.content" class="no-data">
        <NEmpty description="暂无详细数据" />
      </div>
    </div>
  </NCard>
</template>

<style scoped>
.event-item {
  margin-bottom: 12px;
  border-radius: 8px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.event-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.event-item.expanded {
  border-color: #2080f0;
}

.event-summary {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.event-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.event-type-tag {
  font-weight: 500;
}

.event-time {
  font-size: 12px;
  color: #999;
}

.event-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.event-text {
  flex: 1;
  color: #333;
  font-size: 14px;
  line-height: 1.5;
}

.expand-btn {
  flex-shrink: 0;
  color: #2080f0;
}

.arrow {
  margin-left: 4px;
  font-size: 10px;
}

.event-details {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.detail-section {
  margin-bottom: 12px;
}

.detail-label {
  font-size: 12px;
  font-weight: 600;
  color: #666;
  margin-bottom: 4px;
}

.detail-value {
  font-size: 13px;
  color: #333;
}

.detail-content {
  background: #f5f7fa;
  padding: 12px;
  border-radius: 4px;
  font-size: 12px;
  font-family: 'Consolas', 'Monaco', monospace;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 300px;
  overflow-y: auto;
}

.detail-content.code {
  color: #333;
}

.no-data {
  padding: 20px;
}
</style>