# WSL Sync CLI

A powerful terminal-based file synchronization tool designed specifically for WSL (Windows Subsystem for Linux) environments. Seamlessly sync files between Windows and WSL with an intuitive terminal UI or command-line interface.

![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Platform](https://img.shields.io/badge/platform-WSL%20%7C%20Linux%20%7C%20macOS-lightgrey)

## Features

- 🚀 **High Performance**: Multi-threaded sync operations with worker pools
- 🎨 **Interactive Terminal UI**: Keyboard-driven interface with real-time progress
- 🔄 **Flexible Sync Modes**: One-way, two-way, and mirror sync options
- 🎯 **Smart Filtering**: Pre-configured and custom file filters
- 💾 **Profile Management**: Save and reuse sync configurations
- 🛡️ **Error Recovery**: Intelligent error handling with retry mechanisms
- 📊 **Progress Tracking**: Real-time sync progress with detailed statistics
- 🔧 **CLI & Automation**: Full command-line support for scripts and cron jobs
- 🌈 **Terminal Compatibility**: Works in all terminals with ASCII fallback mode

## Installation

### Via npm (Recommended)

```bash
npm install -g wsl-sync-cli
```

### From Source

```bash
git clone https://github.com/frankbria/wsl-sync-cli.git
cd wsl-sync-cli
npm install
npm link
```

## Quick Start

### Interactive Mode

Simply run:

```bash
wsl-sync
```

This launches the interactive terminal UI where you can:
- Navigate with keyboard shortcuts
- Configure sync paths visually
- Monitor progress in real-time
- Manage profiles and settings

### Command Line Mode

For quick syncs:

```bash
# Basic sync
wsl-sync /source/path /destination/path

# Dry run to preview changes
wsl-sync /source/path /destination/path --dry-run

# One-way sync with filter
wsl-sync ~/documents /mnt/c/Users/Me/Documents --one-way --filter documents
```

## Keyboard Shortcuts

### Global Shortcuts
- `F1` or `?` - Show context-sensitive help
- `Tab` - Switch between views/panels
- `Q` - Quit application
- `Ctrl+C` (twice) - Force quit

### Navigation
- `1`, `2`, `3` - Quick switch to Sync/Profiles/Settings view
- `↑` `↓` - Navigate lists
- `←` `→` - Navigate horizontal options
- `Enter` - Select/Confirm
- `Esc` - Cancel/Go back

### Sync View
- `Ctrl+S` - Start sync
- `Ctrl+P` - Pause/Resume sync
- `B` - Browse folders
- `F` - Open filter manager
- `I` - Edit .syncignore
- `P` - Preview changes

### Profiles View
- `N` - New profile
- `E` - Edit selected profile
- `D` - Delete selected profile
- `S` - Quick sync with profile
- `/` - Search profiles

### Settings View
- `←` `→` - Switch settings sections
- `Enter` - Edit setting
- `Space` - Toggle boolean settings
- `Ctrl+S` - Save all settings
- `Ctrl+R` - Reset to defaults

## Command Line Options

### Basic Options
```bash
wsl-sync [source] [destination] [options]
```

| Option | Alias | Description |
|--------|-------|-------------|
| `--help` | `-h` | Show help |
| `--version` | `-v` | Show version |
| `--dry-run` | `-d` | Preview changes without syncing |
| `--no-interactive` | | Run without UI |

### Sync Options
| Option | Description |
|--------|-------------|
| `--one-way` | Force one-way sync (source → destination) |
| `--two-way` | Force two-way sync |
| `--no-delete` | Don't delete orphaned files |
| `--filter <preset>` | Apply filter: documents, images, code, media, archives |
| `--ignore <pattern>` | Add ignore pattern (can use multiple times) |

### Profile Management
| Option | Description |
|--------|-------------|
| `--profile <name>` | Use saved profile |
| `--create-profile <name>` | Create new profile |
| `--list-profiles` | List all profiles |

### Performance & Output
| Option | Description |
|--------|-------------|
| `--workers <n>` | Number of worker threads (default: 4) |
| `--quiet` | Minimal output |
| `--verbose` | Detailed output |
| `--json` | JSON output for scripting |
| `--no-color` | Disable colored output |
| `--ascii` | ASCII-only mode (no Unicode) |

### Error Handling
| Option | Description |
|--------|-------------|
| `--max-errors <n>` | Stop after n errors (default: 50) |
| `--skip-errors` | Continue on errors |
| `--error-log <path>` | Custom error log location |

## Configuration

### Config File

Create a `wsl-sync.config.json`:

```json
{
  "sourcePath": "/home/user/projects",
  "destinationPath": "/mnt/c/Users/User/Projects",
  "direction": "two-way",
  "deleteOrphaned": true,
  "workerThreads": 8,
  "ignorePatterns": [
    "node_modules/",
    "*.tmp",
    ".git/",
    "*.log"
  ],
  "filter": "code",
  "performanceMode": "fast"
}
```

Use with:
```bash
wsl-sync --config wsl-sync.config.json
```

### Syncignore Files

Create `.syncignore` files to exclude patterns:

```
# Dependencies
node_modules/
vendor/
*.pyc
__pycache__/

# Build artifacts
dist/
build/
*.o
*.exe

# Temporary files
*.tmp
*.swp
.DS_Store
Thumbs.db

# Logs
*.log
logs/
```

## Profiles

Save frequently used sync configurations:

```bash
# Create a profile
wsl-sync --create-profile "work-docs" \
  --source ~/work/documents \
  --destination /mnt/c/Work/Documents \
  --filter documents \
  --workers 6

# Use the profile
wsl-sync --profile work-docs

# List all profiles
wsl-sync --list-profiles
```

## Automation Examples

### Cron Job

Add to crontab for automatic syncing:

```bash
# Sync documents every hour
0 * * * * wsl-sync --profile documents --quiet --no-interactive

# Nightly backup
0 2 * * * wsl-sync /home/user /mnt/c/Backup/WSL --one-way --quiet
```

### Shell Script

```bash
#!/bin/bash
# backup.sh - Automated backup script

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/var/log/wsl-sync-$TIMESTAMP.log"

wsl-sync \
  --profile backup \
  --no-interactive \
  --json \
  --error-log "$LOG_FILE" | tee -a "$LOG_FILE"

# Check result
if [ $? -eq 0 ]; then
  echo "Backup completed successfully"
else
  echo "Backup failed - check $LOG_FILE"
  exit 1
fi
```

### PowerShell Integration

```powershell
# Run from Windows PowerShell
wsl wsl-sync --profile dev-sync --json | ConvertFrom-Json

# Check sync status
$result = wsl wsl-sync ~/projects /mnt/c/Projects --dry-run --json | ConvertFrom-Json
if ($result.success) {
    Write-Host "Ready to sync $($result.result.totalFiles) files"
}
```

## Performance Tuning

### Performance Modes

Set in settings or via profile:

- **Safe Mode**: Single thread, careful checks
- **Balanced Mode**: Moderate performance (default)
- **Fast Mode**: High performance, parallel operations
- **Max Mode**: Maximum performance, all CPU cores

### Optimization Tips

1. **Use Worker Threads**: Increase for large syncs
   ```bash
   wsl-sync --workers 8  # Use 8 worker threads
   ```

2. **Batch Operations**: Larger batch sizes for better throughput
   ```bash
   # In settings: Batch Size = 100-200 for SSDs
   ```

3. **Filter Unnecessary Files**: Use filters and .syncignore
   ```bash
   wsl-sync --filter code --ignore "*.tmp" --ignore "node_modules/"
   ```

4. **Disable Verification**: For trusted syncs
   ```bash
   # In settings: Disable "Verify Files After Sync"
   ```

## Error Handling

### Error Categories

The tool categorizes and handles different error types:

- **Permission Errors**: Suggests privilege fixes
- **Path Errors**: Validates and suggests corrections
- **Disk Space**: Warns before syncing
- **Network Issues**: Automatic retry with backoff
- **File Conflicts**: Interactive resolution options

### Error Recovery

```bash
# View error logs
wsl-sync errors

# Continue after errors
wsl-sync --skip-errors --max-errors 100

# Custom error log
wsl-sync --error-log ~/sync-errors.log
```

## Terminal Compatibility

### Full Feature Mode
- Modern terminals with Unicode support
- 256 color or true color support
- Minimum 80x24 terminal size

### Compatibility Mode
- ASCII-only rendering for older terminals
- Basic 16-color support
- Responsive layout for small terminals

Enable ASCII mode:
```bash
wsl-sync --ascii
# or
export WSL_SYNC_ASCII=1
```

## Troubleshooting

### Common Issues

**Permission Denied**
```bash
# Check file permissions
ls -la /path/to/file

# Run with appropriate privileges
sudo wsl-sync /restricted/path /destination
```

**Path Not Found**
```bash
# Verify paths exist
test -d /source/path && echo "Source exists"

# Create destination if needed
mkdir -p /destination/path
```

**Slow Performance**
```bash
# Increase workers
wsl-sync --workers 12

# Use performance mode
# Settings → Performance → Max Mode
```

**WSL Path Issues**
```bash
# Use WSL path format
wsl-sync /mnt/c/Users/Me/Documents ~/documents

# Enable auto-conversion in settings
# Settings → Paths → Auto-detect WSL Paths
```

## Development

### Building from Source

```bash
# Clone repository
git clone https://github.com/frankbria/wsl-sync-cli.git
cd wsl-sync-cli

# Install dependencies
npm install

# Run tests
npm test

# Run in development mode
npm run dev
```

### Running Tests

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Coverage report
npm run test:coverage

# Watch mode
npm run test:watch
```

## Migration from GUI Version

If you're coming from the GUI version of WSL Sync:

1. **Export profiles from GUI**: File → Export Profiles
2. **Import to CLI**: Place in `~/.wsl-sync/profiles.json`
3. **Verify profiles**: `wsl-sync --list-profiles`
4. **Test sync**: `wsl-sync --profile <name> --dry-run`

Key differences:
- Keyboard-driven interface
- Command-line automation support
- Lower resource usage
- Works over SSH

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Ink](https://github.com/vadimdemedes/ink) for the terminal UI
- Inspired by the original [WSL Sync PC](https://github.com/frankbria/wsl-sync-pc) GUI application
- Thanks to all contributors and users for feedback and support

## Support

- 📖 [Documentation](https://github.com/frankbria/wsl-sync-cli/wiki)
- 🐛 [Issue Tracker](https://github.com/frankbria/wsl-sync-cli/issues)
- 💬 [Discussions](https://github.com/frankbria/wsl-sync-cli/discussions)
- 📧 Email: support@wsl-sync.dev

---

Made with ❤️ for the WSL community