# OC Monitor

> Desktop application for real-time monitoring of OpenCode agent activity

[中文](./README.md) | English

## Introduction

OC Monitor is an Electron-based desktop application designed to monitor [OpenCode](https://opencode.com) agent activity in real-time. Through an intuitive Chinese interface, users can easily view agent sessions, activity streams, and plan progress.

This project is a desktop wrapper for [OCWatch](https://github.com/ocm-ai/ocwatch), providing easier deployment while retaining core monitoring functionality.

## Features

### Core Features

- 📋 **Session List** - Display current and historical OpenCode sessions
- 🔄 **Real-time Activity Stream** - Show agent tool calls, operations, and messages in real-time
- 📊 **Plan Progress** - Display current plan task completion status
- 🌳 **Activity Tree Visualization** - Graphical view of agent session parent-child hierarchy

### User Experience

- 🇨🇳 **Full Chinese Interface** - Designed for Chinese users
- 🌙 **Dark Theme** - Eye-friendly design focused on data display
- ⚡ **Lightweight & Fast** - High-performance Electron + Vite architecture
- 🔒 **Secure & Reliable** - Read-only mode, never modifies any files

## Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop Framework | Electron 33+ |
| Backend Service | Node.js + Hono (embedded) |
| Frontend Framework | React 19 + Vite |
| UI Styling | Tailwind CSS |
| Visualization | @xyflow/react |
| File Watching | chokidar |
| Build Tool | electron-builder |

## System Requirements

- **OS**: Windows 10/11 (x64) or macOS 10.15+
- **RAM**: At least 4GB
- **Storage**: At least 500MB free space

## Quick Start

### Option 1: Run in Development Mode

```bash
# Navigate to project directory
cd E:\code\oc-monitor

# Run development mode
npm run dev
```

### Option 2: Run Packaged Application

```bash
# Windows
release\win-unpacked\OCMonitor.exe
```

### Option 3: Build Installer

```bash
# Install dependencies
npm install

# Build Windows installer
npm run build:win

# Build macOS installer (requires macOS)
npm run build:mac
```

After building, installers are generated in the `release` directory.

## Project Structure

```
oc-monitor/
├── electron/                 # Electron main process code
│   ├── main/
│   │   ├── index.ts         # Application entry
│   │   ├── server.ts        # Hono HTTP server
│   │   ├── routes/          # API routes
│   │   └── services/        # Backend services
│   │       ├── storage/     # OpenCode storage parser
│   │       └── watcher.ts   # File watching service
│   └── preload/             # Preload script
├── src/renderer/            # React frontend code
│   └── src/
│       ├── components/      # UI components
│       ├── hooks/           # React Hooks
│       ├── context/         # State management
│       └── App.tsx          # Main application component
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

## Data Source

The application reads data from OpenCode's local storage directory:

- **Windows**: `C:\Users\<username>\.local\share\opencode\storage\`
- **macOS**: `~/.local/share/opencode/storage/`

The storage directory contains:

| Directory/File | Description |
|----------------|-------------|
| `session/*.json` | Session metadata |
| `message/*.json` | Message content |
| `part/*.json` | Tool calls and parts |
| `.sisyphus/boulder.json` | Plan progress data |

## FAQ

### Q: Why does it show "No sessions"?

Please ensure:
1. OpenCode is currently running or has been run before
2. OpenCode storage directory exists and contains data
3. The data path is correct (see "Data Source" above)

### Q: Activity stream not updating in real-time?

The application uses a 3-second polling mechanism. To make updates more real-time, modify the polling interval in `src/renderer/src/hooks/usePolling.ts`.

### Q: Where are the logs located?

Log file locations:
- **Windows**: `%APPDATA%\OCMonitor\logs\`
- **macOS**: `~/Library/Logs/OCMonitor/`

### Q: Can I customize the monitoring path?

Currently, the application automatically detects the OpenCode storage directory. Custom path configuration will be available in future versions.

## Notes

- ⚠️ This application only monitors OpenCode activity and does not modify any data
- ⚠️ Does not support controlling agent behavior (monitoring only)
- ⚠️ No system tray, auto-start, or other features
- ⚠️ Data is read-only and does not affect OpenCode's normal operation

## License

This project is open source under the MIT license.

## Related Links

- [OpenCode Official Website](https://opencode.com)
- [OCWatch Original Project](https://github.com/ocm-ai/ocwatch)
- [Electron Documentation](https://www.electronjs.org/docs)
- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)

---

For issues or suggestions, feel free to submit an Issue or Pull Request.