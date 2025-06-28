# How to Run WSL Sync CLI

Due to the project using React/JSX syntax, you need to use babel-node to run the CLI. Here are the instructions:

## Prerequisites

1. **Install babel-node globally:**
   ```bash
   npm install -g @babel/node @babel/core @babel/preset-env @babel/preset-react
   ```

## Running the CLI

### Interactive Mode (Default)
```bash
npx babel-node --presets @babel/preset-env,@babel/preset-react src/cli.js
```

### Show Help
```bash
npx babel-node --presets @babel/preset-env,@babel/preset-react src/cli.js --help
```

### Show Version
```bash
npx babel-node --presets @babel/preset-env,@babel/preset-react src/cli.js --version
```

### Basic Sync (Non-Interactive)
```bash
npx babel-node --presets @babel/preset-env,@babel/preset-react src/cli.js /source/path /destination/path --no-interactive
```

### Dry Run
```bash
npx babel-node --presets @babel/preset-env,@babel/preset-react src/cli.js /source/path /destination/path --dry-run --no-interactive
```

### With Filter
```bash
npx babel-node --presets @babel/preset-env,@babel/preset-react src/cli.js ~/documents /mnt/c/Documents --filter documents --no-interactive
```

### One-Way Sync
```bash
npx babel-node --presets @babel/preset-env,@babel/preset-react src/cli.js ~/source /mnt/c/dest --one-way --no-interactive
```

## Creating an Alias (Recommended)

To make it easier to run, create an alias in your shell:

### For Bash/Zsh
Add to your `~/.bashrc` or `~/.zshrc`:
```bash
alias wsl-sync='npx babel-node --presets @babel/preset-env,@babel/preset-react /path/to/wsl-sync-cli/src/cli.js'
```

Then you can use:
```bash
wsl-sync --help
wsl-sync /source /dest --dry-run
```

### For Fish
Add to your `~/.config/fish/config.fish`:
```fish
alias wsl-sync 'npx babel-node --presets @babel/preset-env,@babel/preset-react /path/to/wsl-sync-cli/src/cli.js'
```

## Alternative: Create a Wrapper Script

Create a file called `wsl-sync` in your PATH:

```bash
#!/bin/bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
npx babel-node --presets @babel/preset-env,@babel/preset-react "$SCRIPT_DIR/src/cli.js" "$@"
```

Make it executable:
```bash
chmod +x wsl-sync
```

## Examples

### Create a Profile
```bash
npx babel-node --presets @babel/preset-env,@babel/preset-react src/cli.js --create-profile "documents" --source ~/Documents --destination /mnt/c/Users/Me/Documents
```

### Use a Profile
```bash
npx babel-node --presets @babel/preset-env,@babel/preset-react src/cli.js --profile documents --no-interactive
```

### List Profiles
```bash
npx babel-node --presets @babel/preset-env,@babel/preset-react src/cli.js --list-profiles
```

## Troubleshooting

If you get errors about missing presets, install them locally:
```bash
npm install
```

If babel-node is not found:
```bash
npm install -g @babel/node
```

## Performance Note

Using babel-node adds some startup overhead as it compiles the code on the fly. For production use, consider building the project properly with all dependencies resolved.