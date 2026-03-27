import type { Hono } from "hono";
import { registerHealthRoutes } from "./health";
import { registerSessionRoutes } from "./sessions";
import { registerPlanRoute } from "./plan";
import { registerConfigRoutes } from "./config";
import { registerMcpServicesRoutes } from "./mcp-services";

interface RegisterRoutesOptions {
  defaultProjectId?: string;
}

export function registerRoutes(app: Hono, options?: RegisterRoutesOptions) {
  registerHealthRoutes(app, { defaultProjectId: options?.defaultProjectId });
  registerSessionRoutes(app);
  registerPlanRoute(app);
  registerConfigRoutes(app);
  registerMcpServicesRoutes(app);
}