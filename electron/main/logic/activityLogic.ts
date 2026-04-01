import type { PartMeta } from "../services/storage/parser";
import type { PartData, PartStateData, ToolInput } from "../types/part";
import { config } from "../config";

const MAX_PATH_LENGTH = 40;

function truncatePath(path: string): string {
  if (path.length <= MAX_PATH_LENGTH) {
    return path;
  }
  return "..." + path.slice(-MAX_PATH_LENGTH + 3);
}

// 工具显示名称映射 (英文 -> 中文)
const DEFAULT_MCP_NAMES: Record<string, string> = {
  "context7_query-docs": "查询文档",
  "context7_resolve-library-id": "解析库",
  "websearch_web_search_exa": "网络搜索",
};

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
  // MCP 工具：从配置读取，保留硬编码作为默认值
  ...(config.mcp?.displayNames || DEFAULT_MCP_NAMES),
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
  const data = part.data as unknown as PartData;
  const state = part.state as unknown as PartStateData;
  // input 可能在 data.input 或 state.input 中，需要先解析
  // data.input 可能是字符串形式的 JSON，state.input 是字符串
  const rawInput = (data?.input as string | undefined) ?? state?.input;
  let input: ToolInput | string | undefined = rawInput;
  if (typeof input === 'string') {
    try {
      input = JSON.parse(input) as ToolInput;
    } catch (e) {
      // 解析失败，使用原始字符串
    }
  }

  // 判断 input 是否为对象类型 (非 string)
  const isInputObject = input !== undefined && typeof input !== 'string';

  // 任务委托 (task, subtask, agent)
  if (part.tool === "task" || part.tool === "delegate_task") {
    if (isInputObject) {
      const desc = (input as ToolInput).description;
      const agentType = (input as ToolInput).subagent_type;
      if (desc && agentType) return `${desc} (${agentType})`;
      if (desc) return desc;
      if (agentType) return `委托 ${agentType}`;
    }
    return "委托任务";
  }

  if (part.tool === "agent" || part.tool === "subtask") {
    if (isInputObject) {
      const desc = (input as ToolInput).description;
      const name = (input as ToolInput).name;
      const agentType = (input as ToolInput).subagent_type;
      if (desc) return desc;
      if (name) return `${toolName}: ${name}`;
      if (agentType) return `${toolName} (${agentType})`;
    }
    return toolName;
  }

  // 上下文压缩
  if (part.tool === "compaction") {
    return "压缩上下文";
  }

  // TODO 任务
  if (part.tool === "todowrite") {
    if (isInputObject) {
      const todos = (input as ToolInput).todos;
      if (!todos || todos.length === 0) return "清除任务";
      const preview = todos
        .slice(0, 2)
        .map((t: any) => (t.content || "").slice(0, 30))
        .filter(Boolean)
        .join(", ");
      return `更新 ${todos.length} 个任务: ${preview}${todos.length > 2 ? "..." : ""}`;
    }
    return "更新任务";
  }

  if (part.tool === "todoread") {
    return "读取任务列表";
  }

  // 根据输入参数格式化
  if (isInputObject) {
    const toolInput = input as ToolInput;
    // 文件操作
    if (toolInput.filePath) {
      return `${toolName} ${truncatePath(toolInput.filePath)}`;
    }
    // 命令执行
    if (toolInput.command) {
      const cmd = toolInput.command.length > 30
        ? toolInput.command.slice(0, 27) + "..."
        : toolInput.command;
      return `${toolName} ${cmd}`;
    }
    // 搜索
    if (toolInput.pattern) {
      return `${toolName} "${toolInput.pattern}"`;
    }
    // 网页获取
    if (toolInput.url) {
      return `${toolName} ${truncatePath(toolInput.url)}`;
    }
    // 网络搜索
    if (toolInput.query) {
      return `${toolName} "${toolInput.query}"`;
    }
  }

  // 使用标题或默认工具名
  const title = data?.title;
  if (title) {
    return title;
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

  const state = part.state as unknown as PartStateData;
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
    const state = part.state as unknown as PartStateData;
    
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
      const data = part.data as unknown as PartData;
      if (data?.text && !isReasoning) {
        isReasoning = true;
        const text = data.text.trim();
        reasoningPreview = text.length > 40 ? text.slice(0, 37) + "..." : text;
      }
    }

    if (part.type === "patch") {
      const data = part.data as unknown as PartData;
      if (data?.patchFiles && !state?.completed) {
        patchFilesCount += data.patchFiles.length;
      }
    }

    if (part.type === "step-finish") {
      const data = part.data as unknown as PartData;
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