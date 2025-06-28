#!/usr/bin/env node

// This wrapper ensures Babel is loaded before the main CLI
import { register } from '@babel/register';

register({
  presets: ['@babel/preset-react'],
  extensions: ['.js', '.jsx'],
  cache: false
});

// Now import and run the actual CLI
import('./cli.js');