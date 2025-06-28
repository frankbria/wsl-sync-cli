# WSL Sync CLI - Command Line Usage

## Installation

```bash
npm install -g wsl-sync-cli
# or
npm link  # for development
```

## Basic Usage

### Interactive Mode (Default)
```bash
wsl-sync
```
Launches the interactive terminal UI with keyboard navigation.

### Non-Interactive Mode
```bash
wsl-sync /source/path /destination/path
# or
wsl-sync --source /source/path --destination /destination/path
```

## Command Line Options

### Profile Management

```bash
# List all profiles
wsl-sync --list-profiles
wsl-sync -l

# Use a specific profile
wsl-sync --profile myproject
wsl-sync -p myproject

# Create a new profile
wsl-sync --create-profile "work-docs" --source ~/documents --destination /mnt/c/Users/Me/Documents
```

### Sync Options

```bash
# Dry run (preview changes)
wsl-sync /src /dest --dry-run
wsl-sync /src /dest -d

# One-way sync (source to destination only)
wsl-sync /src /dest --one-way

# Two-way sync (explicit)
wsl-sync /src /dest --two-way

# Skip deletion of orphaned files
wsl-sync /src /dest --no-delete
```

### Filtering

```bash
# Use preset filter
wsl-sync /src /dest --filter documents
wsl-sync /src /dest -f code

# Available presets: documents, images, code, media, archives

# Add ignore patterns
wsl-sync /src /dest --ignore "*.tmp" --ignore "node_modules/"
wsl-sync /src /dest -i "*.log" -i "*.cache"
```

### Performance

```bash
# Set number of worker threads
wsl-sync /src /dest --workers 8
wsl-sync /src /dest -w 2

# Use config file
wsl-sync --config ./my-sync-config.json
wsl-sync -c ~/.config/wsl-sync/default.json
```

### Output Modes

```bash
# Quiet mode (minimal output)
wsl-sync /src /dest --quiet
wsl-sync /src /dest -q

# Verbose mode
wsl-sync /src /dest --verbose
wsl-sync /src /dest -v

# JSON output (for scripting)
wsl-sync /src /dest --json
wsl-sync /src /dest -j

# Pretty JSON
wsl-sync /src /dest --json --pretty
```

### Automation

```bash
# Non-interactive mode with auto-confirm
wsl-sync /src /dest --no-interactive --auto-confirm
wsl-sync /src /dest --no-interactive -y

# For cron jobs
wsl-sync /src /dest --quiet --no-interactive --auto-confirm
```

## Exit Codes

- `0` - Success
- `1` - General error
- `2` - Invalid arguments
- `3` - Profile not found
- `4` - Path not found
- `5` - Sync failed
- `6` - Permission denied
- `7` - Config error

## Configuration File

Create a `wsl-sync.config.json`:

```json
{
  "sourcePath": "/home/user/documents",
  "destinationPath": "/mnt/c/Users/User/Documents",
  "direction": "two-way",
  "deleteOrphaned": true,
  "workerThreads": 4,
  "ignorePatterns": [
    "*.tmp",
    "*.log",
    "node_modules/",
    ".git/"
  ],
  "filter": "documents"
}
```

Use with:
```bash
wsl-sync --config wsl-sync.config.json
```

## Examples

### Basic sync with progress
```bash
wsl-sync ~/projects /mnt/c/Users/Me/Projects
```

### Sync documents only, skip temp files
```bash
wsl-sync ~/docs /mnt/c/Docs --filter documents --ignore "~*" --ignore "*.tmp"
```

### Use profile with dry run
```bash
wsl-sync --profile work --dry-run
```

### Automated backup script
```bash
#!/bin/bash
wsl-sync \
  --profile backup \
  --quiet \
  --no-interactive \
  --auto-confirm \
  --json >> /var/log/wsl-sync.log
```

### Check what would be synced
```bash
wsl-sync /src /dest --dry-run --verbose
```

### One-way mirror with specific workers
```bash
wsl-sync /source /backup --one-way --no-delete --workers 8
```

## Scripting with JSON Output

```bash
# Get sync results as JSON
result=$(wsl-sync /src /dest --json --quiet)

# Parse with jq
echo "$result" | jq '.result.syncedFiles'

# Check success
if [ $(echo "$result" | jq '.success') = "true" ]; then
  echo "Sync successful"
fi
```

## Profile Management via CLI

```bash
# Create development profile
wsl-sync --create-profile "dev" \
  --source ~/code \
  --destination /mnt/c/Code \
  --ignore "node_modules/" \
  --ignore ".git/" \
  --workers 6

# List profiles in JSON
wsl-sync --list-profiles --json | jq '.profiles[].name'

# Use profile with override
wsl-sync --profile dev --workers 2 --dry-run
```