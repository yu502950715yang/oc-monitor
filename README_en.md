# OC Monitor

Desktop application for real-time monitoring of OpenCode agent activity

[中文](./README.md)

## Features

| Feature | Description |
|---------|-------------|
| Session List | Display all sessions with auto-calculated status (running/waiting/completed) |
| Activity Stream | Real-time display of tool calls, messages, and reasoning content |
| Plan Progress | Show task completion status of current plan |
| Activity Tree | Visualize parent-child hierarchy of sessions |

## Quick Start

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build Windows installer
npm run build:win

# Run directly (Windows)
release\win-unpacked\OCMonitor.exe
```

## Tech Stack

- **Electron 33** - Desktop framework
- **React 19 + Vite 7** - Frontend
- **Hono** - Embedded HTTP server
- **Tailwind CSS** - Styling
- **@xyflow/react** - Activity tree visualization
- **chokidar** - File watching

## Data Source

The app reads from OpenCode local storage:
- Windows: `%USERPROFILE%\.local\share\opencode\storage\`
- macOS: `~/.local/share/opencode/storage/`

## Configuration

Edit `electron/main/config.ts`:

```typescript
server: { port: 50234 },  // Server port
polling: { interval: 3000 },  // Polling interval (ms)
window: { width: 1200, height: 800 },  // Window size
```

## Notes

- Read-only mode, never modifies any files
- Does not control agent behavior (monitoring only)
- Data is read-only, does not affect OpenCode's operation

## License

MIT License