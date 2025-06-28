// Test setup file for vitest

// Set NODE_ENV for tests
process.env.NODE_ENV = 'test';

// Register babel for JSX transformation
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
  ignore: [/node_modules/],
  only: [
    /src/,
    /lib/,
    /components/
  ]
});