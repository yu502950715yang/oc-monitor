import type { Hono } from "hono";
import { config } from "../config";
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

// 获取 OpenCode 存储根目录
function getStorageRoot(): string {
  const rootPath = config.storage.rootPath;
  if (rootPath) return rootPath;
  // 默认路径: ~/.local/share/opencode/
  return join(homedir(), ".local", "share", "opencode");
}

const STORAGE_ROOT = getStorageRoot();

export function registerConfigRoutes(app: Hono) {
  app.get("/api/config", (c) => {
    return c.json({
      success: true,
      data: config,
    });
  });

  // 保存 MCP 映射配置
  app.post("/api/config/mcp-mapping", async (c) => {
    try {
      const body = await c.req.json();
      const { mappings } = body;

      if (!Array.isArray(mappings)) {
        return c.json({
          success: false,
          error: "mappings 必须是数组",
        }, 400);
      }

      // 确保配置目录存在
      if (!existsSync(STORAGE_ROOT)) {
        mkdirSync(STORAGE_ROOT, { recursive: true });
      }

      const configPath = join(STORAGE_ROOT, "mcp-mappings.json");
      writeFileSync(configPath, JSON.stringify({ mappings, updatedAt: new Date().toISOString() }, null, 2), "utf-8");

      return c.json({
        success: true,
        data: { path: configPath },
      });
    } catch (error) {
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : "保存失败",
      }, 500);
    }
  });
}