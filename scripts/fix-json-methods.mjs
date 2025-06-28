#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.dirname(__dirname);

async function fixJsonMethods() {
  console.log('🔧 Fixing readJson/writeJson calls...');
  
  async function processFile(filePath) {
    try {
      let content = await fs.readFile(filePath, 'utf-8');
      let modified = false;
      
      // Replace fs.readJson with JSON.parse(await fs.readFile(...))
      if (content.includes('fs.readJson')) {
        content = content.replace(
          /await fs\.readJson\(([^)]+)\)/g,
          'JSON.parse(await fs.readFile($1, \'utf-8\'))'
        );
        content = content.replace(
          /fs\.readJson\(([^)]+)\)/g,
          'JSON.parse(await fs.readFile($1, \'utf-8\'))'
        );
        modified = true;
      }
      
      // Replace fs.writeJson with fs.writeFile(path, JSON.stringify(...))
      if (content.includes('fs.writeJson')) {
        content = content.replace(
          /await fs\.writeJson\(([^,]+),\s*([^,)]+)\)/g,
          'await fs.writeFile($1, JSON.stringify($2, null, 2))'
        );
        content = content.replace(
          /fs\.writeJson\(([^,]+),\s*([^,)]+)\)/g,
          'fs.writeFile($1, JSON.stringify($2, null, 2))'
        );
        modified = true;
      }
      
      // Replace fs.outputJson (similar to writeJson but creates directories)
      if (content.includes('fs.outputJson')) {
        // First add the helper function if needed
        if (!content.includes('async function outputJson')) {
          const importEnd = content.lastIndexOf('import');
          const importEndLine = content.indexOf('\n', importEnd);
          if (importEndLine > -1) {
            const beforeImports = content.substring(0, importEndLine + 1);
            const afterImports = content.substring(importEndLine + 1);
            content = beforeImports + `
// Helper function to replace fs-extra's outputJson
async function outputJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}
` + afterImports;
          }
        }
        
        content = content.replace(
          /await fs\.outputJson\(/g,
          'await outputJson('
        );
        content = content.replace(
          /fs\.outputJson\(/g,
          'outputJson('
        );
        modified = true;
      }
      
      if (modified) {
        await fs.writeFile(filePath, content);
        console.log(`  ✓ Fixed ${path.relative(projectRoot, filePath)}`);
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
  
  // Process lib, src, and scripts directories
  await walkDir(path.join(projectRoot, 'lib'));
  await walkDir(path.join(projectRoot, 'src'));
  await walkDir(path.join(projectRoot, 'scripts'));
  
  console.log('✅ JSON methods fixed');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixJsonMethods().catch(console.error);
}

export { fixJsonMethods };