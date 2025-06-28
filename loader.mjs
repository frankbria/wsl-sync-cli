import { transformSync } from '@babel/core';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

export async function resolve(specifier, context, nextResolve) {
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith('.js') || url.endsWith('.jsx')) {
    const filePath = fileURLToPath(url);
    
    // Only transform our source files
    if (filePath.includes('/src/') || filePath.includes('/lib/') || filePath.includes('/components/')) {
      const source = readFileSync(filePath, 'utf8');
      
      try {
        const result = transformSync(source, {
          filename: filePath,
          presets: [
            ['@babel/preset-env', {
              targets: { node: 'current' },
              modules: false
            }],
            ['@babel/preset-react', {
              runtime: 'classic'
            }]
          ],
          sourceMaps: 'inline',
          configFile: false
        });
        
        return {
          format: 'module',
          source: result.code,
          shortCircuit: true
        };
      } catch (error) {
        console.error(`Error transforming ${filePath}:`, error);
        throw error;
      }
    }
  }
  
  return nextLoad(url, context);
}