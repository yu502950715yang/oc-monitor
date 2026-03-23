import type { Hono } from "hono";
import { parseBoulder, checkStorageExists } from "../services/storage/parser";
import log from "electron-log";
import { cwd } from "node:process";

let currentProjectPath: string = cwd();

export function setProjectPath(path: string): void {
  currentProjectPath = path;
}

export function registerPlanRoute(app: Hono) {
  // Get plan progress
  app.get("/api/plan", (c) => {
    if (!checkStorageExists()) {
      return c.json({
        error: "STORAGE_NOT_FOUND",
        message: "OpenCode storage not found",
        progress: null,
      });
    }

    const projectPath = c.req.query("projectPath") || currentProjectPath;
    const progress = parseBoulder(projectPath);

    if (!progress) {
      return c.json({
        error: "PLAN_NOT_FOUND",
        message: "No plan found for this project",
        progress: null,
      });
    }

    return c.json({
      projectPath,
      progress: {
        total: progress.total,
        completed: progress.completed,
        percentage: progress.percentage,
        items: progress.items,
      },
    });
  });

  // Set project path (for frontend to tell us which project to watch)
  app.post("/api/plan/project", async (c) => {
    const body = await c.req.json();
    if (body.projectPath && typeof body.projectPath === "string") {
      setProjectPath(body.projectPath);
      return c.json({ success: true, projectPath: body.projectPath });
    }
    return c.json({ error: "INVALID_PROJECT_PATH" }, 400);
  });
}