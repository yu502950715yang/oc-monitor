import type { Hono } from "hono";
import { config } from "../config";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

interface MCPService {
  name: string;
  displayName: string;
  type: string;
  enabled: boolean;
}

/**
 * 读取用户配置文件并解析 MCP 配置
 */
function readUserMcpConfig(): { names: string[]; displayNames: Record<string, string> } {
  const configDir = path.join(os.homedir(), ".config", "opencode");
  const result = { names: [] as string[], displayNames: {} as Record<string, string> };

  // 读取 opencode.json (用户配置的 MCP)
  const opencodeConfigPath = path.join(configDir, "opencode.json");
  try {
    if (fs.existsSync(opencodeConfigPath)) {
      const content = fs.readFileSync(opencodeConfigPath, "utf-8");
      const config = JSON.parse(content);
      
      // 方式1: 尝试 mcp.servers（旧格式）
      let servers = config.mcp?.servers as Record<string, any> | undefined;
      
      // 方式2: 直接遍历 mcp 下所有 key（新格式）
      if (!servers && config.mcp) {
        servers = {};
        for (const [key, value] of Object.entries(config.mcp)) {
          if (key.startsWith('$')) continue;
          if (value && typeof value === 'object') {
            const serverConfig = value as Record<string, any>;
            if (serverConfig.command || serverConfig.type) {
              servers[key] = serverConfig;
            }
          }
        }
      }
      
      if (servers && Object.keys(servers).length > 0) {
        result.names = Object.keys(servers);
        result.names.forEach(name => {
          const server = servers[name];
          result.displayNames[name] = server?.name || name;
        });
      }
    }
  } catch (e) {
    // 配置文件解析失败，忽略
  }

  // 读取 oh-my-openagent.jsonc (插件配置的 MCP)
  const ohMyOpenagentPath = path.join(configDir, "oh-my-openagent.jsonc");
  try {
    if (fs.existsSync(ohMyOpenagentPath)) {
      const content = fs.readFileSync(ohMyOpenagentPath, "utf-8");
      // 简单移除 JSONC 注释
      const jsonContent = content.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
      const config = JSON.parse(jsonContent);
      if (config.mcp?.servers) {
        const servers = config.mcp.servers as Record<string, any>;
        const pluginNames = Object.keys(servers);
        pluginNames.forEach(name => {
          if (!result.names.includes(name)) {
            result.names.push(name);
            const server = servers[name];
            if (server?.name) {
              result.displayNames[name] = server.name;
            } else {
              result.displayNames[name] = name;
            }
          }
        });
      }
    }
  } catch (e) {
    // 配置文件解析失败，忽略
  }

  return result;
}

/**
 * 读取用户自定义 MCP 服务配置
 */
function readCustomMcpServices(): MCPService[] {
  const configDir = path.join(os.homedir(), ".local", "share", "opencode");
  const configPath = path.join(configDir, "mcp-services.json");

  try {
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, "utf-8");
      return JSON.parse(content);
    }
  } catch (e) {
    // 配置文件解析失败，返回空数组
  }

  return [];
}

export function registerMcpServicesRoutes(app: Hono) {
  app.get("/api/mcp-services", (c) => {
    const mcpConfig = config.mcp;

    // 读取用户配置的 MCP
    const userMcp = readUserMcpConfig();

    // 读取用户自定义 MCP 服务
    const customMcp = readCustomMcpServices();

    // 构建已存在的 MCP 名称集合（去重）
    const existingNames = new Set<string>();

    // 从 config.mcp.builtinMcpServices 读取内置 MCP
    const builtinMcpServices = mcpConfig.builtinMcpServices || [];
    const services: MCPService[] = builtinMcpServices.map((service) => {
      const name = service.name.toLowerCase();
      existingNames.add(name);

      return {
        name: name,
        displayName: service.displayName || name,
        type: service.type || "mcp",
        enabled: true,
      };
    });

    // 添加用户配置的 MCP（排除已存在的）
    userMcp.names.forEach((name) => {
      if (!existingNames.has(name.toLowerCase())) {
        existingNames.add(name.toLowerCase());
        services.push({
          name: name.toLowerCase(),
          displayName: userMcp.displayNames[name] || name,
          type: "mcp",
          enabled: true,
        });
      }
    });

    // 添加用户自定义 MCP 服务（排除已存在的）
    customMcp.forEach((service) => {
      if (!existingNames.has(service.name.toLowerCase())) {
        existingNames.add(service.name.toLowerCase());
        services.push({
          name: service.name.toLowerCase(),
          displayName: service.displayName || service.name,
          type: service.type || "mcp",
          enabled: service.enabled !== false,
        });
      }
    });

    return c.json({
      success: true,
      data: services,
    });
  });

  // POST /api/mcp-services - 添加自定义 MCP 服务
  app.post("/api/mcp-services", async (c) => {
    try {
      const body = await c.req.json();
      const { name, displayName, type } = body;

      if (!name) {
        return c.json({ success: false, error: "缺少 name 字段" }, 400);
      }

      // 存储路径: ~/.local/share/opencode/mcp-services.json
      const configDir = path.join(os.homedir(), ".local", "share", "opencode");
      const configPath = path.join(configDir, "mcp-services.json");

      // 确保目录存在
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      // 读取现有配置
      let existingServices: MCPService[] = [];
      if (fs.existsSync(configPath)) {
        try {
          const content = fs.readFileSync(configPath, "utf-8");
          existingServices = JSON.parse(content);
        } catch (e) {
          existingServices = [];
        }
      }

      // 检查是否已存在
      const nameLower = name.toLowerCase();
      const exists = existingServices.some(s => s.name.toLowerCase() === nameLower);
      if (exists) {
        return c.json({ success: false, error: `MCP 服务 "${name}" 已存在` }, 409);
      }

      // 添加新服务
      const newService: MCPService = {
        name: nameLower,
        displayName: displayName || name,
        type: type || "mcp",
        enabled: true,
      };
      existingServices.push(newService);

      // 保存到文件
      fs.writeFileSync(configPath, JSON.stringify(existingServices, null, 2), "utf-8");

      return c.json({
        success: true,
        data: newService,
      });
    } catch (e) {
      console.error("添加 MCP 服务失败:", e);
      return c.json({ success: false, error: "服务器内部错误" }, 500);
    }
  });

  // DELETE /api/mcp-services - 删除自定义 MCP 服务
  app.delete("/api/mcp-services", async (c) => {
    try {
      const name = c.req.query("name");

      if (!name) {
        return c.json({ success: false, error: "缺少 name 参数" }, 400);
      }

      // 存储路径: ~/.local/share/opencode/mcp-services.json
      const configDir = path.join(os.homedir(), ".local", "share", "opencode");
      const configPath = path.join(configDir, "mcp-services.json");

      // 读取现有配置
      let existingServices: MCPService[] = [];
      if (fs.existsSync(configPath)) {
        try {
          const content = fs.readFileSync(configPath, "utf-8");
          existingServices = JSON.parse(content);
        } catch (e) {
          existingServices = [];
        }
      }

      // 查找并删除匹配的服务（大小写不敏感）
      const nameLower = name.toLowerCase();
      const index = existingServices.findIndex(s => s.name.toLowerCase() === nameLower);

      if (index === -1) {
        return c.json({ success: false, error: `MCP 服务 "${name}" 不存在` }, 404);
      }

      // 记录被删除的服务
      const deletedService = existingServices[index];

      // 移除服务
      existingServices.splice(index, 1);

      // 保存到文件
      fs.writeFileSync(configPath, JSON.stringify(existingServices, null, 2), "utf-8");

      return c.json({
        success: true,
        data: deletedService,
      });
    } catch (e) {
      console.error("删除 MCP 服务失败:", e);
      return c.json({ success: false, error: "服务器内部错误" }, 500);
    }
  });
}