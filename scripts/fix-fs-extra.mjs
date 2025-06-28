#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.dirname(__dirname);

async function fixFsExtraImports() {
  console.log('🔧 Fixing fs-extra imports...');
  
  async function processFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Fix default import from fs-extra to named import
      let fixed = content.replace(
        /import\s+fs\s+from\s+['"]fs-extra['"]/g,
        "import * as fs from 'fs-extra'"
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
      
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        await walkDir(fullPath);
      } else if (entry.name.endsWith('.js') || entry.name.endsWith('.mjs')) {
        await processFile(fullPath);
      }
    }
  }
  
  // Process lib and src directories
  await walkDir(path.join(projectRoot, 'lib'));
  await walkDir(path.join(projectRoot, 'src'));
  await walkDir(path.join(projectRoot, 'scripts'));
  
  console.log('✅ fs-extra imports fixed');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixFsExtraImports().catch(console.error);
}

export { fixFsExtraImports };