#!/usr/bin/env node

// This is the production entry point that uses babel-register
// to transform JSX on the fly

require('@babel/register')({
  presets: [
    ['@babel/preset-env', {
      targets: {
        node: 'current'
      }
    }],
    '@babel/preset-react'
  ],
  extensions: ['.js', '.jsx'],
  cache: false,
  only: [
    // Only transform our source files
    /src/,
    /lib/,
    /components/
  ]
});

// Now require the actual CLI
require('../src/cli.js');