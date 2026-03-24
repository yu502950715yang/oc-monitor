import type { PartMeta } from "../services/storage/parser";

const MAX_PATH_LENGTH = 40;

function truncatePath(path: string): string {
  if (path.length <= MAX_PATH_LENGTH) {
    return path;
  }
  return "..." + path.slice(-MAX_PATH_LENGTH + 3);
}

// 工具显示名称映射 (英文 -> 中文)
export const TOOL_DISPLAY_NAMES: Record<string, string> = {
  read: "读取",
  write: "写入",
  edit: "编辑",
  bash: "运行",
  grep: "搜索",
  glob: "查找",
  task: "委托",
  webfetch: "获取",
  agent: "代理",
  subtask: "子任务",
  compaction: "压缩",
  file: "文件",
  // MCP 工具
  "context7_query-docs": "查询文档",
  "context7_resolve-library-id": "解析库",
  "websearch_web_search_exa": "网络搜索",
};

function getToolDisplayName(tool: string): string {
  const normalized = tool.replace(/^mcp_/, "").toLowerCase();
  return TOOL_DISPLAY_NAMES[normalized] || tool;
}

/**
 * 格式化工具调用为可读的中文描述
 * @param part PartMeta 对象
 * @returns 格式化后的描述字符串
 */
export function formatCurrentAction(part: PartMeta): string | null {
  if (!part.tool) {
    return null;
  }

  const toolName = getToolDisplayName(part.tool);
  const data = part.data as any;
  const state = part.state as any;
  // input 可能在 data.input 或 state.input 中，需要先解析
  let input = data?.input ?? state?.input;
  if (typeof input === 'string') {
    try {
      input = JSON.parse(input);
    } catch (e) {
      // 解析失败，使用原始字符串
    }
  }

  // 任务委托 (task, subtask, agent)
  if (part.tool === "task" || part.tool === "delegate_task") {
    const desc = input?.description;
    const agentType = input?.subagent_type;
    if (desc && agentType) return `${desc} (${agentType})`;
    if (desc) return desc;
    if (agentType) return `委托 ${agentType}`;
    return "委托任务";
  }

  if (part.tool === "agent" || part.tool === "subtask") {
    const desc = input?.description;
    const name = input?.name;
    const agentType = input?.subagent_type;
    if (desc) return desc;
    if (name) return `${toolName}: ${name}`;
    if (agentType) return `${toolName} (${agentType})`;
    return toolName;
  }

  // 上下文压缩
  if (part.tool === "compaction") {
    return "压缩上下文";
  }

  // TODO 任务
  if (part.tool === "todowrite") {
    const todos = input?.todos;
    if (!todos || todos.length === 0) return "清除任务";
    const preview = todos
      .slice(0, 2)
      .map((t: any) => (t.content || "").slice(0, 30))
      .filter(Boolean)
      .join(", ");
    return `更新 ${todos.length} 个任务: ${preview}${todos.length > 2 ? "..." : ""}`;
  }

  if (part.tool === "todoread") {
    return "读取任务列表";
  }

  // 根据输入参数格式化
  if (input) {
    // 文件操作
    if (input.filePath) {
      return `${toolName} ${truncatePath(input.filePath)}`;
    }
    // 命令执行
    if (input.command) {
      const cmd = input.command.length > 30
        ? input.command.slice(0, 27) + "..."
        : input.command;
      return `${toolName} ${cmd}`;
    }
    // 搜索
    if (input.pattern) {
      return `${toolName} "${input.pattern}"`;
    }
    // 网页获取
    if (input.url) {
      return `${toolName} ${truncatePath(input.url)}`;
    }
    // 网络搜索
    if (input.query) {
      return `${toolName} "${input.query}"`;
    }
  }

  // 使用标题或默认工具名
  if (data?.title) {
    return data.title;
  }

  return toolName;
}

/**
 * 检查工具调用是否为待处理状态
 */
const ACTIVE_TOOL_STATES = ["pending", "running", "in_progress"];

export function isPendingToolCall(part: PartMeta): boolean {
  if (!part.tool || part.type !== "tool") {
    return false;
  }

  const state = part.state as any;
  if (!state || !state.status) {
    return false;
  }

  return ACTIVE_TOOL_STATES.includes(state.status);
}

export interface SessionActivityState {
  hasPendingToolCall: boolean;
  pendingCount: number;
  completedCount: number;
  lastToolCompletedAt: Date | null;
  isReasoning: boolean;
  reasoningPreview: string | null;
  patchFilesCount: number;
  stepFinishReason: "stop" | "tool-calls" | null;
  activeToolNames: string[];
}

export function getSessionActivityState(parts: PartMeta[]): SessionActivityState {
  let pendingCount = 0;
  let completedCount = 0;
  let lastToolCompletedAt: Date | null = null;
  let isReasoning = false;
  let reasoningPreview: string | null = null;
  let patchFilesCount = 0;
  let stepFinishReason: "stop" | "tool-calls" | null = null;
  const activeToolNames: string[] = [];

  // 按时间排序
  const sortedParts = [...parts].sort((a, b) => {
    const timeA = a.createdAt?.getTime() || 0;
    const timeB = b.createdAt?.getTime() || 0;
    return timeB - timeA;
  });

  for (const part of sortedParts) {
    const state = part.state as any;
    
    if (part.type === "tool" && part.tool) {
      if (isPendingToolCall(part)) {
        pendingCount++;
        activeToolNames.push(part.tool.replace(/^mcp_/, ""));
      } else if (state?.status === "completed") {
        completedCount++;
        if (state?.time?.end && (!lastToolCompletedAt || state.time.end > lastToolCompletedAt.getTime())) {
          lastToolCompletedAt = new Date(state.time.end);
        }
      }
    }

    if (part.type === "reasoning") {
      const data = part.data as any;
      if (data?.text && !isReasoning) {
        isReasoning = true;
        const text = data.text.trim();
        reasoningPreview = text.length > 40 ? text.slice(0, 37) + "..." : text;
      }
    }

    if (part.type === "patch") {
      const data = part.data as any;
      if (data?.patchFiles && !state?.completed) {
        patchFilesCount += data.patchFiles.length;
      }
    }

    if (part.type === "step-finish") {
      const data = part.data as any;
      if (data?.stepFinishReason && !stepFinishReason) {
        stepFinishReason = data.stepFinishReason;
      }
    }
  }

  return {
    hasPendingToolCall: pendingCount > 0,
    pendingCount,
    completedCount,
    lastToolCompletedAt,
    isReasoning,
    reasoningPreview,
    patchFilesCount,
    stepFinishReason,
    activeToolNames,
  };
}

export type SessionActivityType = 
  | "idle" 
  | "waiting-user" 
  | "tool" 
  | "reasoning" 
  | "patch" 
  | "waiting-tools";

export function deriveActivityType(
  activityState: SessionActivityState,
  lastAssistantFinished: boolean,
  isSubagent: boolean,
  status: SessionStatus,
  waitingReason?: "user" | "children"
): SessionActivityType {
  if (status === "completed") {
    return "idle";
  }
  if ((waitingReason === "user" || (!waitingReason && lastAssistantFinished)) && !isSubagent && status === "waiting") {
    return "waiting-user";
  }
  if (activityState.pendingCount > 0) {
    return "tool";
  }
  if (activityState.isReasoning) {
    return "reasoning";
  }
  if (activityState.patchFilesCount > 0) {
    return "patch";
  }
  if (activityState.stepFinishReason === "tool-calls") {
    return "waiting-tools";
  }
  return "idle";
}

export type SessionStatus = "running" | "waiting" | "completed" | "error";

export function generateActivityMessage(
  activityState: SessionActivityState,
  lastAssistantFinished: boolean,
  isSubagent: boolean,
  status: SessionStatus,
  pendingPart?: PartMeta,
  waitingReason?: "user" | "children"
): string | null {
  if (status === "completed") {
    return null;
  }
  if ((waitingReason === "user" || (!waitingReason && lastAssistantFinished)) && !isSubagent && status === "waiting") {
    return "等待用户输入";
  }

  if (activityState.pendingCount > 1) {
    const toolNames = activityState.activeToolNames.slice(0, 3).join(", ");
    const firstToolAction = pendingPart ? formatCurrentAction(pendingPart) : null;
    if (firstToolAction) {
      return `运行 ${activityState.pendingCount} 个工具 (${firstToolAction})`;
    }
    return `运行 ${activityState.pendingCount} 个工具: ${toolNames}${activityState.activeToolNames.length > 3 ? "..." : ""}`;
  }

  if (activityState.pendingCount === 1 && pendingPart) {
    return formatCurrentAction(pendingPart);
  }

  if (activityState.isReasoning && activityState.reasoningPreview) {
    return `分析中: ${activityState.reasoningPreview}`;
  }

  if (activityState.patchFilesCount > 0) {
    return `写入 ${activityState.patchFilesCount} 个文件...`;
  }

  if (activityState.stepFinishReason === "tool-calls") {
    return "等待工具结果";
  }

  return null;
}