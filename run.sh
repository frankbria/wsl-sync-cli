#!/bin/bash
# Simple runner script for WSL Sync CLI

# Backup original package.json and use dev version
mv package.json package-prod.json 2>/dev/null || true
cp package-dev.json package.json

# Run babel-node with arguments
babel-node --presets @babel/preset-env,@babel/preset-react src/cli.js "$@"

# Restore original package.json
mv package-prod.json package.json 2>/dev/null || true