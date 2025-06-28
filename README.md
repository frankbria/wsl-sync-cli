# WSL Sync CLI

A powerful command-line interface for synchronizing files between Windows and WSL (Windows Subsystem for Linux) environments. Built with React and Ink for a modern terminal UI experience.

## Features

- 🔄 **Two-way synchronization** between Windows and WSL paths
- 📁 **Interactive path selection** with validation and browsing
- ⚡ **High-performance sync** with multi-threaded operations
- 🎯 **Smart filtering** with preset configurations
- 👀 **Dry run preview** to see changes before syncing
- ⏸️ **Pause/Resume** functionality during sync
- 🗑️ **Safe deletion** with recycle bin support
- 🎨 **Modern CLI interface** with keyboard navigation

## Installation

```bash
npm install -g wsl-sync-cli
```

Or clone and build locally:

```bash
git clone https://github.com/frankbria/wsl-sync-cli.git
cd wsl-sync-cli
npm install
npm run build
npm link
```

## Usage

### Basic Usage

```bash
# Interactive mode
wsl-sync-cli

# With paths
wsl-sync-cli --source /path/to/source --destination C:\path\to\dest
```

### Navigation

- **Tab** - Switch between views (Sync, Profiles, Settings)
- **↑↓** - Navigate within components
- **Enter** - Select/Confirm
- **ESC** - Cancel/Go back
- **Ctrl+C** - Exit application

### Sync View Controls

- **Ctrl+S** - Start sync
- **Ctrl+D** - Dry run preview
- **B** - Browse folders
- **P** - Pause/Resume sync
- **S** - Stop sync
- **F2** - Toggle Windows/WSL path format

## Sync Options

- **Sync Direction**: Two-way, Source to Destination, or Destination to Source
- **Conflict Resolution**: Newer wins, Source wins, Destination wins, or Manual
- **Performance Modes**: Safe (1 thread), Balanced (4 threads), Fast (8 threads), or Maximum
- **File Filters**: Web Development, Python, Documents, Source Code, or Media Files
- **Advanced Options**: Dry run, Delete orphaned files, Preserve permissions

## Development

### Tech Stack

- **React** with **Ink** for terminal UI
- **Node.js** file system operations
- **Worker threads** for performance
- **ES Modules** throughout

### Project Structure

```
wsl-sync-cli/
├── src/
│   ├── components/     # UI components
│   ├── store/         # State management
│   └── lib/           # Sync logic
├── lib/               # Core libraries
└── dist/             # Build output
```

### Building

```bash
npm run build
```

## Phase Implementation Status

- ✅ Phase 1: Core Infrastructure Setup
- ✅ Phase 2: Navigation and Layout System
- ✅ Phase 3: Sync View Implementation
- 🔲 Phase 4: Profile Management
- 🔲 Phase 5: Settings Implementation
- 🔲 Phase 6: Advanced Features
- 🔲 Phase 7: CLI Arguments and Commands
- 🔲 Phase 8: Error Handling and Recovery
- 🔲 Phase 9: Testing and Documentation
- 🔲 Phase 10: Performance and Polish

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Related

- [wsl-sync-pc](https://github.com/frankbria/wsl-sync-pc) - Desktop version with Electron