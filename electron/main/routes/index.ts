import type { Hono } from "hono";
import { registerHealthRoutes } from "./health";
import { registerSessionRoutes } from "./sessions";
import { registerPlanRoute } from "./plan";

interface RegisterRoutesOptions {
  defaultProjectId?: string;
}

export function registerRoutes(app: Hono, options?: RegisterRoutesOptions) {
  registerHealthRoutes(app, { defaultProjectId: options?.defaultProjectId });
  registerSessionRoutes(app);
  registerPlanRoute(app);
}