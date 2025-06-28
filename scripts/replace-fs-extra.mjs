#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.dirname(__dirname);

async function replaceFsExtra() {
  console.log('🔧 Replacing fs-extra with native fs/promises...');
  
  async function processFile(filePath) {
    try {
      let content = await fs.readFile(filePath, 'utf-8');
      let modified = false;
      
      // Replace fs-extra import with fs/promises
      if (content.includes("from 'fs-extra'")) {
        content = content.replace(
          /import\s+\*\s+as\s+fs\s+from\s+['"]fs-extra['"]/g,
          "import fs from 'fs/promises'"
        );
        modified = true;
      }
      
      // Replace specific fs-extra methods that don't exist in fs/promises
      if (content.includes('fs.ensureDir')) {
        content = content.replace(
          /fs\.ensureDir\(/g,
          'fs.mkdir('
        );
        // Add recursive option to mkdir calls
        content = content.replace(
          /fs\.mkdir\(([^)]+)\)/g,
          'fs.mkdir($1, { recursive: true })'
        );
        modified = true;
      }
      
      if (content.includes('fs.copy')) {
        // Add helper function for copy at the top of the file after imports
        const importEnd = content.lastIndexOf('import');
        const importEndLine = content.indexOf('\n', importEnd);
        if (importEndLine > -1 && !content.includes('async function copyRecursive')) {
          const beforeImports = content.substring(0, importEndLine + 1);
          const afterImports = content.substring(importEndLine + 1);
          content = beforeImports + `
// Helper function to replace fs-extra's copy
async function copyRecursive(src, dest) {
  const stats = await fs.stat(src);
  if (stats.isDirectory()) {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });
    for (const entry of entries) {
      await copyRecursive(path.join(src, entry.name), path.join(dest, entry.name));
    }
  } else {
    await fs.copyFile(src, dest);
  }
}
` + afterImports;
          
          // Replace fs.copy with copyRecursive
          content = content.replace(/fs\.copy\(/g, 'copyRecursive(');
          modified = true;
        }
      }
      
      if (content.includes('fs.remove')) {
        content = content.replace(
          /fs\.remove\(/g,
          'fs.rm('
        );
        // Add recursive option to rm calls
        content = content.replace(
          /fs\.rm\(([^)]+)\)/g,
          'fs.rm($1, { recursive: true, force: true })'
        );
        modified = true;
      }
      
      if (content.includes('fs.emptyDir')) {
        // Replace with rm + mkdir
        content = content.replace(
          /await fs\.emptyDir\(([^)]+)\)/g,
          'await fs.rm($1, { recursive: true, force: true }).catch(() => {}); await fs.mkdir($1, { recursive: true })'
        );
        modified = true;
      }
      
      if (content.includes('fs.pathExists')) {
        content = content.replace(
          /fs\.pathExists\(/g,
          'fs.access('
        );
        // Wrap fs.access calls to return boolean
        content = content.replace(
          /await fs\.access\(([^)]+)\)/g,
          'await fs.access($1).then(() => true).catch(() => false)'
        );
        modified = true;
      }
      
      if (modified) {
        // Ensure path import exists if we added copyRecursive
        if (content.includes('copyRecursive') && !content.includes("import path from 'path'")) {
          content = "import path from 'path';\n" + content;
        }
        
        await fs.writeFile(filePath, content);
        console.log(`  ✓ Updated ${path.relative(projectRoot, filePath)}`);
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
  
  console.log('✅ fs-extra replaced with native fs/promises');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  replaceFsExtra().catch(console.error);
}

export { replaceFsExtra };