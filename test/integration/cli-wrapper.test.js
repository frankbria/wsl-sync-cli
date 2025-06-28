import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

const execAsync = promisify(exec);

// Use the new bin script
const CLI_PATH = path.join(process.cwd(), 'bin/wsl-sync.js');

describe('CLI Wrapper Integration Tests', () => {
  let testDir;
  let sourceDir;
  let destDir;
  
  beforeEach(async () => {
    // Create temporary test directories
    testDir = path.join(os.tmpdir(), `wsl-sync-test-${Date.now()}`);
    sourceDir = path.join(testDir, 'source');
    destDir = path.join(testDir, 'dest');
    
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(sourceDir, { recursive: true });
    await fs.mkdir(destDir, { recursive: true });
    
    // Create test files
    await fs.writeFile(path.join(sourceDir, 'file1.txt'), 'Content 1');
    await fs.writeFile(path.join(sourceDir, 'file2.txt'), 'Content 2');
  });
  
  afterEach(async () => {
    // Clean up test directories
    await fs.rm(testDir, { recursive: true, force: true });
  });
  
  describe('Basic Commands', () => {
    it('should show help when --help is used', async () => {
      const { stdout } = await execAsync(`node ${CLI_PATH} --help`);
      
      expect(stdout).toContain('Usage:');
      expect(stdout).toContain('Options:');
      expect(stdout).toContain('--profile');
      expect(stdout).toContain('--dry-run');
    });
    
    it('should show version when --version is used', async () => {
      const { stdout } = await execAsync(`node ${CLI_PATH} --version`);
      
      expect(stdout).toMatch(/\d+\.\d+\.\d+/);
    });
  });
  
  describe('Non-Interactive Mode', () => {
    it('should perform dry run', async () => {
      const { stdout } = await execAsync(
        `node ${CLI_PATH} "${sourceDir}" "${destDir}" --dry-run --no-interactive`
      );
      
      expect(stdout).toContain('DRY RUN MODE');
      expect(stdout).toContain('Starting sync:');
      
      // Verify no files were actually copied
      const destFiles = await fs.readdir(destDir);
      expect(destFiles.length).toBe(0);
    });
    
    it('should sync files in non-interactive mode', async () => {
      const { stdout } = await execAsync(
        `node ${CLI_PATH} "${sourceDir}" "${destDir}" --no-interactive`
      );
      
      expect(stdout).toContain('Sync completed successfully');
      
      // Verify files were copied
      const destFiles = await fs.readdir(destDir);
      expect(destFiles).toContain('file1.txt');
      expect(destFiles).toContain('file2.txt');
      
      // Verify content
      const content1 = await fs.readFile(path.join(destDir, 'file1.txt'), 'utf8');
      expect(content1).toBe('Content 1');
    });
  });
});