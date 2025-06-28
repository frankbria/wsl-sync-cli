#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.dirname(__dirname);

async function fixLibImports() {
  console.log('🔧 Fixing lib imports in src files...');
  
  const srcDir = path.join(projectRoot, 'src');
  
  async function processFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Fix imports from ../../lib/ to ../../../lib/
      const fixed = content.replace(
        /from\s+(["'])\.\.\/\.\.\/lib\//g,
        'from $1../../../lib/'
      );
      
      if (fixed !== content) {
        await fs.writeFile(filePath, fixed);
        console.log(`  ✓ Fixed imports in ${path.relative(projectRoot, filePath)}`);
      }
    } catch (error) {
      console.error(`  ✗ Error processing ${filePath}:`, error.message);
    }
  }
  
  async function walkDir(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        await walkDir(fullPath);
      } else if (entry.name.endsWith('.js') || entry.name.endsWith('.jsx')) {
        await processFile(fullPath);
      }
    }
  }
  
  await walkDir(srcDir);
  console.log('✅ Lib imports fixed');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixLibImports().catch(console.error);
}

export { fixLibImports };