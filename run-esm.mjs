#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get command line arguments
const args = process.argv.slice(2);

// Use Node's experimental loader to transform JSX
const nodeArgs = [
  '--loader', join(__dirname, 'loader.mjs'),
  join(__dirname, 'src/cli.js'),
  ...args
];

// Spawn node with the loader
const child = spawn('node', nodeArgs, {
  stdio: 'inherit',
  env: { ...process.env, NODE_NO_WARNINGS: '1' }
});

child.on('exit', (code) => {
  process.exit(code || 0);
});