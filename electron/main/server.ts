import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { registerRoutes } from "./routes";
import { getGlobalWatcher, closeGlobalWatcher } from "./services/watcher";
import { closeDb } from "./services/storage/parser";
import log from "electron-log";
import { cwd } from "node:process";
import { config } from "./config";

const PORT = config.server.port;
const HOST = config.server.host;

let serverInstance: ReturnType<typeof serve> | null = null;

export function startServer(): void {
  if (serverInstance) {
    log.warn("[server] Server already running");
    return;
  }

  log.info(`[server] Starting on http://${HOST}:${PORT}`);

  const app = new Hono();

  // Global error handling
  app.onError((err, c) => {
    log.error("[server] Error:", err);
    return c.json(
      {
        error: "INTERNAL_ERROR",
        message: err.message,
      },
      500
    );
  });

  // 404 handler
  app.notFound((c) => {
    return c.json(
      {
        error: "NOT_FOUND",
        message: `Route ${c.req.path} not found`,
      },
      404
    );
  });

  // CORS middleware - allow localhost for dev
  app.use(
    "*",
    cors({
      origin: [
        "http://localhost:3000",
        "http://localhost:5173",
        `http://${HOST}:${PORT}`,
      ],
      credentials: true,
    })
  );

  // Register API routes
  registerRoutes(app, { defaultProjectId: undefined });

  // Start the file watcher
  const watcher = getGlobalWatcher({
    projectPath: cwd(),
    debounceMs: config.watcher.debounceDelay,
  });

  watcher.on("change", (event) => {
    log.debug(`[server] File change detected: ${event.type} - ${event.filename}`);
    // Could emit SSE event here if needed
  });

  watcher.on("error", (error) => {
    log.error("[server] Watcher error:", error);
  });

  watcher.start();

  // Start HTTP server
  try {
    setAppInstance(app);
    serverInstance = serve({
      fetch: app.fetch,
      port: PORT,
      hostname: HOST,
    });

    log.info(`[server] Server running on http://${HOST}:${PORT}`);
  } catch (error) {
    log.error("[server] Failed to start server:", error);
    throw error;
  }
}

export function stopServer(): void {
  log.info("[server] Stopping...");

  if (serverInstance) {
    serverInstance.close();
    serverInstance = null;
    log.info("[server] HTTP server closed");
  }

  try {
    closeGlobalWatcher();
    log.info("[server] Watcher closed");
  } catch (error) {
    log.warn("[server] Failed to close watcher:", error);
  }

  log.info("[server] Stopped");
}

export function getServerPort(): number {
  return PORT;
}

export function getServerHost(): string {
  return HOST;
}
// 导出一个请求处理函数供 IPC 调用
let appInstance: any = null;

export function setAppInstance(app: any) {
  appInstance = app;
}

export async function handleApiRequest(path: string, method: string = 'GET'): Promise<{ status: number; data: any }> {
  if (!appInstance) {
    return { status: 500, data: { error: 'SERVER_NOT_READY', message: 'Server not initialized' } };
  }

  try {
    const req = new Request(`http://localhost${path}`, { method });
    const res = await appInstance.fetch(req);
    const data = await res.json();
    return { status: res.status, data };
  } catch (error: any) {
    log.error('[server] IPC request error:', error);
    return { status: 500, data: { error: 'REQUEST_FAILED', message: String(error) } };
  }
}
