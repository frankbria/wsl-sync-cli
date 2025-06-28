#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = __dirname;
const TEMP_DIR = path.join(ROOT_DIR, '.temp-run');

async function run() {
  try {
    // Clean and create temp directory
    await fs.remove(TEMP_DIR);
    await fs.ensureDir(TEMP_DIR);

    // Transpile only the cli.js file
    console.log('Transpiling CLI...');
    execSync(
      `npx babel src/cli.js --out-file ${TEMP_DIR}/cli.js`,
      { stdio: 'pipe', cwd: ROOT_DIR }
    );

    // Get command line arguments
    const args = process.argv.slice(2).join(' ');

    // Run the transpiled CLI
    execSync(
      `node ${TEMP_DIR}/cli.js ${args}`,
      { stdio: 'inherit', cwd: ROOT_DIR }
    );

  } catch (error) {
    if (error.status) {
      process.exit(error.status);
    }
    console.error('Error:', error.message);
    process.exit(1);
  }
}

run();