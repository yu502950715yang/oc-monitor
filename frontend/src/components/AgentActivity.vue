<script setup lang="ts">
import { computed, ref } from 'vue'
import { NCard, NEmpty, NDescriptions, NDescriptionsItem, NTag, NScrollbar, NSelect } from 'naive-ui'
import type { AgentActivity } from '@/types'

const props = defineProps<{
  agentName?: string
  activities: AgentActivity[]
}>()

// 筛选状态
const currentFilter = ref<string>('all')

// 筛选选项
const filterOptions = [
  { label: '全部', value: 'all' },
  { label: 'Skill', value: 'skill' },
  { label: 'LSP', value: 'lsp' },
  { label: 'Model', value: 'model' },
  { label: 'MCP', value: 'mcp' },
  { label: 'Other', value: 'other' }
]

// 判断活动是否匹配筛选条件
function matchesFilter(activity: AgentActivity, filter: string): boolean {
  if (filter === 'all') return true

  const searchText = [
    activity.type,
    activity.tool || '',
    activity.input || '',
    activity.output || ''
  ].join(' ').toLowerCase()

  switch (filter) {
    case 'skill':
      return searchText.includes('skill')
    case 'lsp':
      return searchText.includes('lsp') || searchText.includes('typescript') || searchText.includes('vue')
    case 'model':
      return searchText.includes('model') || searchText.includes('gpt') || searchText.includes('claude')
    case 'mcp':
      return searchText.includes('mcp')
    case 'other':
      return !searchText.includes('skill') && 
             !searchText.includes('lsp') && 
             !searchText.includes('model') && 
             !searchText.includes('mcp') &&
             !searchText.includes('typescript') &&
             !searchText.includes('vue') &&
             !searchText.includes('gpt') &&
             !searchText.includes('claude')
    default:
      return true
  }
}

// 按时间倒序排列并过滤活动
const sortedActivities = computed(() => {
  return [...props.activities]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
})

// 根据筛选条件过滤活动
const filteredActivities = computed(() => {
  return sortedActivities.value.filter(activity => matchesFilter(activity, currentFilter.value))
})

// 截断输出文本
function truncateOutput(output: string, maxLength: number = 1000): string {
  if (!output) return ''
  if (output.length <= maxLength) return output
  return output.slice(0, maxLength) + '...'
}

// 格式化时间
function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch {
    return timestamp
  }
}

// 格式化输入内容
function formatInput(input: any): string {
  if (!input) return '-'
  if (typeof input === 'string') return input
  try {
    return JSON.stringify(input, null, 2)
  } catch {
    return String(input)
  }
}

// 格式化输出内容
function formatOutput(output: string): string {
  if (!output) return '-'
  try {
    const parsed = JSON.parse(output)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return truncateOutput(output, 1000)
  }
}

// 是否有截断
function isTruncated(output: string): boolean {
  return output.length > 1000
}
</script>

<template>
  <div class="agent-activity">
    <NCard class="activity-card">
      <template #header>
        <div class="header">
          <span class="title">
            {{ agentName ? `智能体活动: ${agentName}` : '智能体活动' }}
          </span>
          <NSelect
            v-model:value="currentFilter"
            :options="filterOptions"
            placeholder="筛选类型"
            style="width: 120px"
            size="small"
          />
        </div>
      </template>

      <NScrollbar style="height: 100%">
        <div v-if="!agentName" class="empty-state">
          <NEmpty description="请选择智能体">
            <template #extra>
              <span class="empty-hint">请在左侧选择一个智能体查看活动详情</span>
            </template>
          </NEmpty>
        </div>

        <div v-else-if="filteredActivities.length > 0" class="activities-container">
          <div 
            v-for="activity in filteredActivities" 
            :key="activity.id" 
            class="activity-item"
          >
            <div class="activity-header">
              <NTag :bordered="false" type="info" size="small">
                {{ activity.type }}
              </NTag>
              <NTag v-if="activity.tool" :bordered="false" type="success" size="small">
                {{ activity.tool }}
              </NTag>
              <span class="timestamp">{{ formatTimestamp(activity.timestamp) }}</span>
            </div>
            
            <NDescriptions :column="1" label-placement="top" size="small">
              <NDescriptionsItem label="输入">
                <pre class="content-block">{{ formatInput(activity.input) }}</pre>
              </NDescriptionsItem>
              <NDescriptionsItem label="输出">
                <pre 
                  class="content-block" 
                  :class="{ 'truncated': isTruncated(activity.output) }"
                >{{ formatOutput(activity.output) }}</pre>
                <span v-if="isTruncated(activity.output)" class="truncated-hint">
                  (已截断，共 {{ activity.output.length }} 字符)
                </span>
              </NDescriptionsItem>
            </NDescriptions>
          </div>
        </div>

        <div v-else class="empty-state">
          <NEmpty description="暂无活动数据">
            <template #extra>
              <span class="empty-hint">该智能体暂无活动记录</span>
            </template>
          </NEmpty>
        </div>
      </NScrollbar>
    </NCard>
  </div>
</template>

<style scoped>
.agent-activity {
  width: 100%;
  height: 100%;
}

.activity-card {
  height: 100%;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
}

.activity-card :deep(.n-card__content) {
  padding: 16px;
  flex: 1;
  overflow: hidden;
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

.activities-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.activity-item {
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e8e8e8;
}

.activity-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.timestamp {
  margin-left: auto;
  font-size: 12px;
  color: #999;
}

.content-block {
  margin: 0;
  padding: 8px;
  background: #fff;
  border-radius: 4px;
  border: 1px solid #eee;
  font-size: 12px;
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 200px;
  overflow-y: auto;
}

.content-block.truncated {
  background: #fffbe6;
}

.truncated-hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #faad14;
}

.empty-state {
  padding: 40px 0;
}

.empty-hint {
  color: #999;
  font-size: 14px;
}
</style>