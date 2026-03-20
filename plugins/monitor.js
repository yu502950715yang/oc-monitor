// OpenCode Monitor Plugin
// 监控所有 OpenCode 事件并发送到后端

// 全部 25+ 事件类型
const TARGET_EVENTS = [
  // Command (1)
  "command.executed",
  
  // File (2)
  "file.edited",
  "file.watcher.updated",
  
  // Installation (1)
  "installation.updated",
  
  // LSP (2)
  "lsp.client.diagnostics",
  "lsp.updated",
  
  // Message (4)
  "message.part.removed",
  "message.part.updated",
  "message.removed",
  "message.updated",
  
  // Permission (2)
  "permission.asked",
  "permission.replied",
  
  // Server (1)
  "server.connected",
  
  // Session (8)
  "session.created",
  "session.compacted",
  "session.deleted",
  "session.diff",
  "session.error",
  "session.idle",
  "session.status",
  "session.updated",
  
  // Todo (1)
  "todo.updated",
  
  // Shell (1)
  "shell.env",
  
  // Tool (2)
  "tool.execute.after",
  "tool.execute.before",
  
  // TUI (3)
  "tui.prompt.append",
  "tui.command.execute",
  "tui.toast.show",
];

let config = {
  endpoint: "http://192.168.1.80:7000/api/v1/events",
  verbose: true, // 开启详细日志方便调试
};

let eventQueue = [];
const MAX_QUEUE = 10;
const FLUSH_INTERVAL = 3000;

function getEndpoint() {
  return process.env.MONITOR_ENDPOINT || config.endpoint;
}

function isTargetEvent(eventType) {
  return TARGET_EVENTS.includes(eventType);
}

async function flushQueue() {
  if (eventQueue.length === 0) return;

  const events = [...eventQueue];
  eventQueue = [];

  // 逐个发送事件，避免批量格式问题
  for (const event of events) {
    try {
      const response = await fetch(getEndpoint(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: event.sessionId || "",
          event_type: event.type,
          data: { ...event },
        }),
      });

      if (!response.ok) {
        console.log("[Monitor] HTTP", response.status);
      }
    } catch (error) {
      console.log("[Monitor] Error:", error.message);
    }
  }
}

// 定时刷新
setInterval(flushQueue, FLUSH_INTERVAL);

export const MonitorPlugin = async (ctx) => {
  if (config.verbose) {
    console.log("[Monitor] Plugin initialized, endpoint:", getEndpoint());
  }

  return {
    event: async ({ event }) => {
      if (!isTargetEvent(event.type)) return;

      // 兼容不同字段名
      // 尝试从多个位置获取sessionId
      let sessionId = event.sessionId || event.sessionID || "";
      
      // 如果sessionId为空，尝试从嵌套结构获取
      // event.data.data.properties.info.sessionID
      if (!sessionId && event.data?.properties?.info?.sessionID) {
        sessionId = event.data.properties.info.sessionID;
      }
      if (!sessionId && event.data?.data?.properties?.info?.sessionID) {
        sessionId = event.data.data.properties.info.sessionID;
      }
      if (!sessionId && event.data?.sessionID) {
        sessionId = event.data.sessionID;
      }

      eventQueue.push({
        type: event.type,
        sessionId: sessionId,
        timestamp: Date.now(),
        data: event,
      });

      if (eventQueue.length >= MAX_QUEUE) {
        flushQueue();
      }

      if (config.verbose) {
        console.log(
          "[Monitor] Event:",
          event.type,
          "session:",
          event.sessionID,
        );
      }
    },

    "tool.execute.after": async (input, output) => {
      const sessionId = input.sessionId || input.sessionID || "";
      const event = {
        type: "tool.execute.after",
        sessionId: sessionId,
        tool: input.tool,
        timestamp: Date.now(),
      };

      eventQueue.push(event);

      if (eventQueue.length >= MAX_QUEUE) {
        flushQueue();
      }
    },
  };
};

export default MonitorPlugin;
