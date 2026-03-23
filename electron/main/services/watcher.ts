import { watch, type FSWatcher } from "chokidar";
import { EventEmitter } from "node:events";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { existsSync } from "node:fs";
import log from "electron-log";

export interface FileChangeEvent {
  type: "add" | "change" | "unlink";
  path: string;
  filename: string;
}

export interface WatcherOptions {
  storagePath?: string;
  projectPath?: string;
  debounceMs?: number;
}

export class StorageWatcher extends EventEmitter {
  private watcher: FSWatcher | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private readonly debounceMs: number;
  private readonly storagePath: string;
  private readonly sessionPath: string;
  private readonly messagePath: string;
  private readonly partPath: string;
  private boulderPath: string;
  private isRunning: boolean = false;
  private lastEventTime: number = 0;
  private eventCount: number = 0;
  private projectPath: string;

  constructor(options: WatcherOptions = {}) {
    super();

    const storageRoot = options.storagePath ||
      process.env.XDG_DATA_HOME ||
      join(homedir(), ".local", "share");

    this.storagePath = join(storageRoot, "opencode", "storage");
    this.sessionPath = join(this.storagePath, "session");
    this.messagePath = join(this.storagePath, "message");
    this.partPath = join(this.storagePath, "part");
    this.projectPath = options.projectPath || process.cwd();
    this.boulderPath = join(this.projectPath, ".sisyphus", "boulder.json");
    this.debounceMs = options.debounceMs ?? 100;
  }

  private get watchPaths(): string[] {
    const paths: string[] = [];

    // Watch storage directories if they exist
    if (existsSync(this.sessionPath)) {
      paths.push(this.sessionPath);
    }
    if (existsSync(this.messagePath)) {
      paths.push(this.messagePath);
    }
    if (existsSync(this.partPath)) {
      paths.push(this.partPath);
    }

    // Watch boulder.json if it exists
    if (existsSync(this.boulderPath)) {
      paths.push(this.boulderPath);
    } else if (existsSync(dirname(this.boulderPath))) {
      // Watch .sisyphus directory
      paths.push(dirname(this.boulderPath));
    }

    return paths;
  }

  start(): void {
    if (this.isRunning) {
      log.info("[watcher] Already running");
      return;
    }

    const watchPaths = this.watchPaths;

    if (watchPaths.length === 0) {
      log.warn("[watcher] No paths to watch. Storage may not exist yet.");
      this.emit("started");
      return;
    }

    log.info(`[watcher] Starting on paths: ${watchPaths.join(", ")}`);

    try {
      this.watcher = watch(watchPaths, {
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 50,
          pollInterval: 10,
        },
        ignored: [
          /(^|[\/\\])\../, // ignore dotfiles
          "**/node_modules/**",
        ],
      });

      this.watcher
        .on("add", (path) => this.handleEvent("add", path))
        .on("change", (path) => this.handleEvent("change", path))
        .on("unlink", (path) => this.handleEvent("unlink", path))
        .on("error", (error) => {
          log.error("[watcher] Error:", error);
          this.emit("error", error);
        })
        .on("ready", () => {
          log.info("[watcher] Ready");
          this.isRunning = true;
          this.emit("started");
        });
    } catch (error) {
      log.error("[watcher] Failed to start:", error);
      this.emit("error", error);
    }
  }

  private handleEvent(type: "add" | "change" | "unlink", filePath: string): void {
    // Rate limiting: ignore if we just processed an event
    const now = Date.now();
    if (now - this.lastEventTime < 20) {
      return;
    }

    this.eventCount++;
    const filename = filePath.split(/[/\\]/).pop() || filePath;

    log.debug(`[watcher] File ${type}: ${filename}`);

    // Clear existing debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Debounce events
    this.debounceTimer = setTimeout(() => {
      this.lastEventTime = Date.now();
      const event: FileChangeEvent = { type, path: filePath, filename };
      this.emit("change", event);
      this.debounceTimer = null;
    }, this.debounceMs);
  }

  stop(): void {
    if (!this.isRunning) {
      return;
    }

    log.info("[watcher] Stopping...");

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }

    this.isRunning = false;
    this.emit("stopped");
    log.info("[watcher] Stopped");
  }

  close(): void {
    this.stop();
  }

  getIsRunning(): boolean {
    return this.isRunning;
  }

  getEventCount(): number {
    return this.eventCount;
  }

  updateProjectPath(projectPath: string): void {
    // This requires restarting the watcher with new paths
    const wasRunning = this.isRunning;

    if (wasRunning) {
      this.stop();
    }

    this.projectPath = projectPath;
    this.boulderPath = join(this.projectPath, ".sisyphus", "boulder.json");

    if (wasRunning) {
      this.start();
    }
  }
}

// Singleton instance
let globalWatcher: StorageWatcher | null = null;

export function getGlobalWatcher(options?: WatcherOptions): StorageWatcher {
  if (!globalWatcher) {
    globalWatcher = new StorageWatcher(options);
  }
  return globalWatcher;
}

export function closeGlobalWatcher(): void {
  if (globalWatcher) {
    globalWatcher.close();
    globalWatcher = null;
  }
}