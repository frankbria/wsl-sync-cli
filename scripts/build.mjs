#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const LIB_DIR = path.join(ROOT_DIR, 'lib');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

// Helper function to copy directory recursively
async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

// Helper to check if path exists
async function pathExists(path) {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

async function build() {
  console.log('🔨 Building WSL Sync CLI...\n');

  try {
    // Clean dist directory
    console.log('📦 Cleaning dist directory...');
    await fs.rm(DIST_DIR, { recursive: true, force: true }).catch(() => {});
    await fs.mkdir(DIST_DIR, { recursive: true });

    // Copy package.json (without devDependencies)
    console.log('📄 Preparing package.json...');
    const pkg = JSON.parse(await fs.readFile(path.join(ROOT_DIR, 'package.json'), 'utf-8'));
    delete pkg.devDependencies;
    delete pkg.scripts.test;
    delete pkg.scripts['test:watch'];
    delete pkg.scripts['test:coverage'];
    pkg.main = 'src/cli.js';
    pkg.bin = {
      'wsl-sync': 'bin/wsl-sync.mjs'
    };
    await fs.writeFile(path.join(DIST_DIR, 'package.json'), JSON.stringify(pkg, null, 2));

    // Compile with Babel
    console.log('🔄 Transpiling source files...');
    execSync(
      `npx babel ${SRC_DIR} --out-dir ${DIST_DIR}/src --copy-files`,
      { stdio: 'inherit', cwd: ROOT_DIR }
    );

    console.log('🔄 Transpiling lib files...');
    execSync(
      `npx babel ${LIB_DIR} --out-dir ${DIST_DIR}/lib --copy-files`,
      { stdio: 'inherit', cwd: ROOT_DIR }
    );

    // Copy bin directory
    console.log('📁 Copying bin files...');
    await copyDir(
      path.join(ROOT_DIR, 'bin'),
      path.join(DIST_DIR, 'bin')
    );

    // Copy other necessary files
    console.log('📝 Copying additional files...');
    const filesToCopy = [
      'README.md',
      'LICENSE',
      '.npmignore',
      'man'
    ];

    for (const file of filesToCopy) {
      const src = path.join(ROOT_DIR, file);
      const dest = path.join(DIST_DIR, file);
      if (await pathExists(src)) {
        const stat = await fs.stat(src);
        if (stat.isDirectory()) {
          await copyDir(src, dest);
        } else {
          await fs.copyFile(src, dest);
        }
      }
    }

    // Create .npmignore if it doesn't exist
    if (!await pathExists(path.join(DIST_DIR, '.npmignore'))) {
      await fs.writeFile(path.join(DIST_DIR, '.npmignore'), `
src/**/*.test.js
test/
coverage/
.babelrc.js
vitest.config.js
*.log
.DS_Store
`);
    }


    console.log('\n✅ Build completed successfully!');
    console.log(`📁 Output directory: ${DIST_DIR}`);
    console.log('\nTo test the build locally:');
    console.log('  cd dist && npm link');
    console.log('  wsl-sync --help\n');

  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run build
build();