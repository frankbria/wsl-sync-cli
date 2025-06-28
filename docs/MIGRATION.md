# Migration Guide: WSL Sync GUI to CLI

This guide helps users transition from the GUI version of WSL Sync to the new CLI version, explaining differences, benefits, and providing step-by-step migration instructions.

## Table of Contents

1. [Overview](#overview)
2. [Key Differences](#key-differences)
3. [Benefits of CLI Version](#benefits-of-cli-version)
4. [Migration Steps](#migration-steps)
5. [Feature Comparison](#feature-comparison)
6. [Common Scenarios](#common-scenarios)
7. [Troubleshooting](#troubleshooting)

## Overview

WSL Sync CLI is the terminal-based successor to WSL Sync GUI, designed to provide the same powerful synchronization capabilities with improved performance, better automation support, and lower resource usage.

### Why Migrate?

- **Performance**: CLI version uses less memory and CPU
- **Automation**: Easy integration with scripts and cron jobs
- **Remote Access**: Works over SSH connections
- **Resource Efficiency**: No GUI overhead
- **Better Integration**: Native terminal workflow

## Key Differences

### Interface

| GUI Version | CLI Version |
|-------------|-------------|
| Graphical windows and dialogs | Terminal-based UI with keyboard navigation |
| Mouse-driven interaction | Keyboard shortcuts and commands |
| System tray integration | Background process with terminal output |
| Visual file browser | Command-line path selection or interactive browser |

### Configuration

| GUI Version | CLI Version |
|-------------|-------------|
| Settings stored in registry/GUI config | JSON configuration files |
| GUI preferences dialog | Settings view or config files |
| Profile management in GUI | Command-line profile management |
| Visual filter editor | Filter presets and .syncignore files |

### Automation

| GUI Version | CLI Version |
|-------------|-------------|
| Limited scheduling options | Full cron/script integration |
| GUI-based scheduled tasks | Command-line automation |
| No scripting API | JSON output for scripting |
| Manual operation focused | Automation-first design |

## Benefits of CLI Version

### 1. **Performance**
- 50-70% less memory usage
- Faster startup time
- No GUI rendering overhead
- Efficient batch processing

### 2. **Automation**
```bash
# Easy cron integration
0 * * * * wsl-sync --profile documents --quiet

# Scripting with JSON output
result=$(wsl-sync --dry-run --json | jq '.result.totalFiles')
```

### 3. **Remote Access**
```bash
# Works over SSH
ssh user@host wsl-sync --profile backup

# No X11 forwarding needed
ssh -t user@host wsl-sync  # Interactive mode
```

### 4. **Integration**
- Pipeline friendly
- Git hooks compatible
- CI/CD integration
- Shell script automation

## Migration Steps

### Step 1: Export GUI Profiles

1. Open WSL Sync GUI
2. Go to File → Export Profiles
3. Save as `wsl-sync-profiles.json`
4. Note your current settings and preferences

### Step 2: Install CLI Version

```bash
# Via npm (recommended)
npm install -g wsl-sync-cli

# Or from source
git clone https://github.com/frankbria/wsl-sync-cli.git
cd wsl-sync-cli
npm install
npm link
```

### Step 3: Import Profiles

```bash
# Create CLI config directory
mkdir -p ~/.wsl-sync

# Copy exported profiles
cp /path/to/wsl-sync-profiles.json ~/.wsl-sync/profiles.json

# Verify profiles
wsl-sync --list-profiles
```

### Step 4: Update Profile Format

GUI profiles may need minor adjustments. Edit `~/.wsl-sync/profiles.json`:

```json
{
  "profiles": [
    {
      "name": "documents",
      "sourcePath": "/home/user/Documents",
      "destinationPath": "/mnt/c/Users/User/Documents",
      "direction": "two-way",  // was: "bidirectional"
      "deleteOrphaned": true,   // was: "cleanOrphans"
      "filter": "documents",    // new: use filter presets
      "workerThreads": 4        // new: performance option
    }
  ]
}
```

### Step 5: Test Migration

```bash
# Test each profile with dry run
wsl-sync --profile documents --dry-run

# Verify settings in interactive mode
wsl-sync
# Press '3' for Settings view
```

### Step 6: Update Automation

Replace GUI scheduled tasks with cron jobs:

```bash
# Edit crontab
crontab -e

# Add sync jobs
0 * * * * wsl-sync --profile documents --quiet --no-interactive
0 2 * * * wsl-sync --profile backup --quiet --no-interactive
```

## Feature Comparison

### Equivalent Features

| GUI Feature | CLI Equivalent |
|-------------|----------------|
| Sync Profiles | `--profile` option |
| Dry Run | `--dry-run` flag |
| File Filters | Filter presets + .syncignore |
| Progress Bar | Terminal progress indicators |
| Conflict Resolution | Interactive prompts |
| Error Logs | `--error-log` option |
| Scheduled Sync | Cron jobs |
| Path Browser | Interactive browser (press 'B') |

### New CLI Features

- **Performance Modes**: Safe, Balanced, Fast, Max
- **Worker Threads**: Configurable parallelism
- **JSON Output**: Scripting integration
- **ASCII Mode**: Universal terminal support
- **Batch Operations**: Efficient file handling
- **Error Recovery**: Automatic retry mechanisms

### GUI Features Not in CLI

- System tray icon → Use terminal multiplexer or background processes
- Desktop notifications → Use system notification commands in scripts
- Graphical charts → Use `--json` output with visualization tools

## Common Scenarios

### Scenario 1: Daily Backup

**GUI Version**: 
- Create scheduled task in GUI
- Set time and frequency
- Enable system tray notifications

**CLI Version**:
```bash
# Create backup script
cat > ~/bin/daily-backup.sh << 'EOF'
#!/bin/bash
wsl-sync --profile backup --quiet --no-interactive
if [ $? -eq 0 ]; then
    notify-send "WSL Sync" "Backup completed successfully"
else
    notify-send "WSL Sync" "Backup failed!" -u critical
fi
EOF

chmod +x ~/bin/daily-backup.sh

# Add to crontab
(crontab -l 2>/dev/null; echo "0 2 * * * ~/bin/daily-backup.sh") | crontab -
```

### Scenario 2: Real-time Sync

**GUI Version**:
- Enable "Watch for changes" in settings
- Keep GUI running in background

**CLI Version**:
```bash
# Use file watcher script (see examples/scripts/sync-monitor.ps1)
# Or use inotify-based solution:

#!/bin/bash
inotifywait -m -r -e modify,create,delete /source/path |
while read path action file; do
    wsl-sync --profile realtime --quiet --no-interactive
done
```

### Scenario 3: Project Sync

**GUI Version**:
- Create multiple profiles in GUI
- Manually select and sync each

**CLI Version**:
```bash
# Create project-specific profiles
wsl-sync --create-profile web-app \
    --source ~/projects/web-app \
    --destination /mnt/c/Projects/WebApp \
    --filter code

# Sync specific project
wsl-sync --profile web-app

# Or sync all projects
for profile in web-app mobile-app backend-api; do
    wsl-sync --profile $profile --quiet
done
```

## Troubleshooting

### Issue: Profiles Not Importing

**Solution**: Convert profile format manually:

```javascript
// convert-profiles.js
const oldProfiles = require('./wsl-sync-profiles.json');
const newProfiles = {
  profiles: oldProfiles.map(p => ({
    name: p.profileName,
    sourcePath: p.source,
    destinationPath: p.destination,
    direction: p.bidirectional ? 'two-way' : 'one-way',
    deleteOrphaned: p.cleanOrphans || false,
    ignorePatterns: p.excludePatterns || []
  }))
};
console.log(JSON.stringify(newProfiles, null, 2));
```

### Issue: Different Path Formats

**GUI**: Used Windows paths
**CLI**: Prefers WSL paths

```bash
# Convert Windows path to WSL
wslpath /mnt/c/Users/User/Documents
# Output: /mnt/c/Users/User/Documents

# CLI auto-converts, but you can update profiles:
sed -i 's|C:\\\\|/mnt/c/|g' ~/.wsl-sync/profiles.json
sed -i 's|\\\\|/|g' ~/.wsl-sync/profiles.json
```

### Issue: Performance Differences

**GUI**: Default conservative settings
**CLI**: Configurable performance

```bash
# Increase performance for large syncs
wsl-sync --profile large-data --workers 12

# Or update profile:
{
  "name": "large-data",
  "workerThreads": 12,
  "performanceMode": "fast",
  "batchSize": 200
}
```

### Issue: Missing GUI Features

**System Tray**: Use tmux/screen
```bash
# Run in background with tmux
tmux new-session -d -s sync 'wsl-sync --profile monitor'
tmux attach -t sync  # View output
```

**Visual Diff**: Use CLI tools
```bash
# Preview changes with diff output
wsl-sync --dry-run --verbose | grep -E "CREATE|UPDATE|DELETE"
```

## Getting Help

### Resources

- **Documentation**: `wsl-sync --help`
- **Man Page**: `man wsl-sync`
- **Interactive Help**: Press `F1` in interactive mode
- **GitHub Issues**: [Report problems](https://github.com/frankbria/wsl-sync-cli/issues)

### Community

- Discussions: [GitHub Discussions](https://github.com/frankbria/wsl-sync-cli/discussions)
- Wiki: [Additional guides](https://github.com/frankbria/wsl-sync-cli/wiki)

### Support

For migration-specific issues:
1. Check this guide's troubleshooting section
2. Search existing GitHub issues
3. Create new issue with `migration` label

---

## Quick Reference Card

```bash
# GUI → CLI Command Mapping
# GUI: Click "Sync" button
wsl-sync --profile myprofile

# GUI: File → New Profile
wsl-sync --create-profile newprofile --source /path --destination /path

# GUI: View → Profiles
wsl-sync --list-profiles

# GUI: Tools → Dry Run
wsl-sync --profile myprofile --dry-run

# GUI: Edit → Preferences
wsl-sync  # Press '3' for settings

# GUI: Help → About
wsl-sync --version
```

Remember: The CLI version is designed to be more efficient and scriptable while maintaining all the core functionality of the GUI version. The terminal interface may take some adjustment, but offers greater flexibility and control.