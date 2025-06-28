#!/usr/bin/env node

// Development runner that transforms JSX on the fly
import { transformFileSync } from '@babel/core';
import { register } from 'node:module';
import { pathToFileURL } from 'url';
import { readFileSync } from 'fs';

// Custom loader for JSX transformation
register((specifier, context, nextResolve) => {
  return nextResolve(specifier, context);
}, {
  parentURL: pathToFileURL(import.meta.url)
});

// Hook into module loading
const originalCompile = Module.prototype._compile;
Module.prototype._compile = function(content, filename) {
  if (filename.endsWith('.js') && (
    filename.includes('/src/') || 
    filename.includes('/lib/') || 
    filename.includes('/components/')
  )) {
    try {
      const result = transformFileSync(filename, {
        presets: [
          ['@babel/preset-env', {
            targets: { node: 'current' }
          }],
          '@babel/preset-react']
        ],
        configFile: false
      });
      content = result.code;
    } catch (err) {
      console.error(`Transform error in ${filename}:`, err.message);
    }
  }
  return originalCompile.call(this, content, filename);
};

// Import and run the CLI
import('./src/cli.js');