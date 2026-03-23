import type { Hono } from "hono";
import { checkStorageExists } from "../services/storage/parser";

interface RegisterHealthRoutesOptions {
  defaultProjectId?: string;
}

export function registerHealthRoutes(app: Hono, options?: RegisterHealthRoutesOptions) {
  app.get("/api/health", (c) => {
    const storageExists = checkStorageExists();

    if (!storageExists) {
      return c.json({
        status: "error",
        message: "OpenCode storage not found",
        storageExists: false,
      });
    }

    const response: {
      status: string;
      storageExists: boolean;
      defaultProjectId?: string;
    } = {
      status: "ok",
      storageExists: true,
    };

    if (options?.defaultProjectId) {
      response.defaultProjectId = options.defaultProjectId;
    }

    return c.json(response);
  });
}