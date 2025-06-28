#!/usr/bin/env node

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Register Babel for JSX transformation
const register = require('@babel/register');

register({
  presets: [
    ['@babel/preset-env', {
      targets: {
        node: 'current'
      },
      modules: 'auto'
    }],
    '@babel/preset-react'
  ],
  extensions: ['.js', '.jsx'],
  cache: false,
  only: [
    // Only transform our source files
    function(filepath) {
      return filepath.includes('/src/') || 
             filepath.includes('/lib/') ||
             filepath.includes('/components/');
    }
  ]
});

// Import the CLI
await import('../src/cli.js');