/**
 * 智能体注册表
 * 
 * 扫描 ~/.config/opencode/agent/ 目录，识别主智能体和子智能体
 * 参考 ocmonitor-share 的 agentRegistry 实现
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";
import { homedir } from "node:os";
import log from "electron-log";

export interface AgentInfo {
  name: string;
  mode: 'primary' | 'subagent' | 'unknown';
}

class AgentRegistryImpl {
  private subAgents: Set<string> = new Set();
  private mainAgents: Set<string> = new Set();
  private initialized: boolean = false;

  // 内置子智能体（备用值）
  private static readonly BUILTIN_SUB_AGENTS = new Set([
    'explore',
    'librarian',
    'oracle',
    'metis',
    'hephaestus',
    'momus',
  ]);

  // 内置主智能体
  private static readonly BUILTIN_MAIN_AGENTS = new Set([
    'plan',
    'build',
    'prometheus',
    'sisyphus',
  ]);

  constructor() {
    this.loadAgents();
  }

  private loadAgents(): void {
    // 从内置值开始
    this.subAgents = new Set(AgentRegistryImpl.BUILTIN_SUB_AGENTS);
    this.mainAgents = new Set(AgentRegistryImpl.BUILTIN_MAIN_AGENTS);

    // 扫描配置目录
    const agentDir = join(homedir(), '.config', 'opencode', 'agent');

    if (!existsSync(agentDir)) {
      log.debug('[agent-registry] Agent config directory does not exist, using built-in values');
      this.initialized = true;
      return;
    }

    try {
      const files = readdirSync(agentDir);
      for (const file of files) {
        if (!file.endsWith('.md')) continue;

        const agentName = basename(file, '.md').toLowerCase();
        const filePath = join(agentDir, file);

        // 解析 YAML frontmatter
        const mode = this.parseAgentMode(filePath);
        
        if (mode === 'subagent') {
          this.subAgents.add(agentName);
          log.debug(`[agent-registry] Loaded subagent: ${agentName}`);
        } else if (mode === 'primary') {
          this.mainAgents.add(agentName);
          log.debug(`[agent-registry] Loaded main agent: ${agentName}`);
        }
        // 如果没有 mode 或 mode 为 unknown，默认当作主智能体（不添加到 subAgents）
      }

      log.info(`[agent-registry] Loaded ${this.subAgents.size} subagents, ${this.mainAgents.size} main agents`);
    } catch (e) {
      log.warn('[agent-registry] Failed to scan agent directory:', e);
    }

    this.initialized = true;
  }

  private parseAgentMode(filePath: string): 'primary' | 'subagent' | 'unknown' {
    try {
      const content = readFileSync(filePath, 'utf-8');
      
      // 提取 YAML frontmatter
      if (!content.startsWith('---')) {
        return 'unknown';
      }

      const parts = content.split('---', 2);
      if (parts.length < 2) {
        return 'unknown';
      }

      const yamlContent = parts[1].trim();
      
      // 简单的 YAML 解析 - 查找 mode 字段
      const modeMatch = yamlContent.match(/^mode:\s*(\S+)/m);
      if (!modeMatch) {
        return 'unknown';
      }

      const mode = modeMatch[1].toLowerCase().replace(/['"]/g, '');
      
      if (mode === 'subagent') {
        return 'subagent';
      } else if (mode === 'primary' || mode === 'main') {
        return 'primary';
      }

      return 'unknown';
    } catch (e) {
      log.debug(`[agent-registry] Failed to parse agent file ${filePath}:`, e);
      return 'unknown';
    }
  }

  /**
   * 检查是否为子智能体
   */
  isSubAgent(name: string | undefined): boolean {
    if (!name) return false;
    return this.subAgents.has(name.toLowerCase());
  }

  /**
   * 检查是否为主智能体
   * 未知名称默认当作主智能体
   */
  isMainAgent(name: string | undefined): boolean {
    if (!name) return true;
    const lower = name.toLowerCase();
    return this.mainAgents.has(lower) || !this.subAgents.has(lower);
  }

  /**
   * 获取所有已注册的子智能体名称
   */
  getAllSubAgents(): string[] {
    return Array.from(this.subAgents);
  }

  /**
   * 获取所有已注册的主智能体名称
   */
  getAllMainAgents(): string[] {
    return Array.from(this.mainAgents);
  }

  /**
   * 重新加载智能体配置
   */
  reload(): void {
    this.subAgents.clear();
    this.mainAgents.clear();
    this.initialized = false;
    this.loadAgents();
  }

  /**
   * 判断是否已初始化
   */
  isReady(): boolean {
    return this.initialized;
  }
}

// 导出单例
export const agentRegistry = new AgentRegistryImpl();

// 导出类型
export type { AgentRegistryImpl };