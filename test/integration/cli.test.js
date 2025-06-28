import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

const execAsync = promisify(exec);

// Path to CLI executable
const CLI_PATH = path.join(process.cwd(), 'src/cli.js');

describe('CLI Integration Tests', () => {
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
  
  describe('Profile Management', () => {
    it('should list profiles', async () => {
      const { stdout } = await execAsync(`node ${CLI_PATH} --list-profiles`);
      
      expect(stdout).toContain('Available profiles:');
    });
    
    it('should create a new profile', async () => {
      const profileName = 'test-profile';
      const { stdout } = await execAsync(
        `node ${CLI_PATH} --create-profile "${profileName}" --source "${sourceDir}" --destination "${destDir}"`
      );
      
      expect(stdout).toContain(`Profile '${profileName}' created successfully`);
    });
    
    it('should output profiles as JSON', async () => {
      const { stdout } = await execAsync(`node ${CLI_PATH} --list-profiles --json`);
      
      const data = JSON.parse(stdout);
      expect(data).toHaveProperty('profiles');
      expect(Array.isArray(data.profiles)).toBe(true);
    });
  });
  
  describe('Sync Operations', () => {
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
      const { stdout, stderr } = await execAsync(
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
    
    it('should respect --one-way flag', async () => {
      // Add a file to destination
      await fs.writeFile(path.join(destDir, 'dest-only.txt'), 'Dest only');
      
      const { stdout } = await execAsync(
        `node ${CLI_PATH} "${sourceDir}" "${destDir}" --one-way --no-interactive`
      );
      
      expect(stdout).toContain('Sync completed successfully');
      
      // Source should not have the destination file
      const sourceFiles = await fs.readdir(sourceDir);
      expect(sourceFiles).not.toContain('dest-only.txt');
    });
    
    it('should handle --no-delete flag', async () => {
      // Initial sync
      await execAsync(
        `node ${CLI_PATH} "${sourceDir}" "${destDir}" --no-interactive`
      );
      
      // Remove a file from source
      await fs.unlink(path.join(sourceDir, 'file1.txt'));
      
      // Sync again with --no-delete
      await execAsync(
        `node ${CLI_PATH} "${sourceDir}" "${destDir}" --no-delete --no-interactive`
      );
      
      // File should still exist in destination
      const destFiles = await fs.readdir(destDir);
      expect(destFiles).toContain('file1.txt');
    });
  });
  
  describe('Filtering', () => {
    it('should apply filter presets', async () => {
      // Create different file types
      await fs.writeFile(path.join(sourceDir, 'document.pdf'), 'PDF content');
      await fs.writeFile(path.join(sourceDir, 'image.jpg'), 'JPEG content');
      await fs.writeFile(path.join(sourceDir, 'script.js'), 'JS content');
      
      // Sync with documents filter
      const { stdout } = await execAsync(
        `node ${CLI_PATH} "${sourceDir}" "${destDir}" --filter documents --no-interactive`
      );
      
      expect(stdout).toContain('Sync completed successfully');
      
      // Only documents should be synced
      const destFiles = await fs.readdir(destDir);
      expect(destFiles).toContain('document.pdf');
      expect(destFiles).toContain('file1.txt'); // txt files are documents
      expect(destFiles).not.toContain('image.jpg');
      expect(destFiles).not.toContain('script.js');
    });
    
    it('should apply ignore patterns', async () => {
      // Create files to ignore
      await fs.writeFile(path.join(sourceDir, 'temp.tmp'), 'Temp content');
      await fs.writeFile(path.join(sourceDir, 'cache.log'), 'Log content');
      
      const { stdout } = await execAsync(
        `node ${CLI_PATH} "${sourceDir}" "${destDir}" --ignore "*.tmp" --ignore "*.log" --no-interactive`
      );
      
      expect(stdout).toContain('Sync completed successfully');
      
      // Ignored files should not be synced
      const destFiles = await fs.readdir(destDir);
      expect(destFiles).not.toContain('temp.tmp');
      expect(destFiles).not.toContain('cache.log');
      expect(destFiles).toContain('file1.txt');
    });
  });
  
  describe('Output Modes', () => {
    it('should support quiet mode', async () => {
      const { stdout } = await execAsync(
        `node ${CLI_PATH} "${sourceDir}" "${destDir}" --quiet --no-interactive`
      );
      
      // Minimal output in quiet mode
      expect(stdout.split('\n').length).toBeLessThan(5);
    });
    
    it('should support JSON output', async () => {
      const { stdout } = await execAsync(
        `node ${CLI_PATH} "${sourceDir}" "${destDir}" --json --no-interactive`
      );
      
      const data = JSON.parse(stdout);
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('result');
      expect(data.result).toHaveProperty('totalFiles');
      expect(data.result).toHaveProperty('syncedFiles');
    });
    
    it('should support verbose mode', async () => {
      const { stdout } = await execAsync(
        `node ${CLI_PATH} "${sourceDir}" "${destDir}" --verbose --no-interactive`
      );
      
      // More detailed output in verbose mode
      expect(stdout).toContain('Starting sync:');
      expect(stdout).toContain('Files processed:');
      expect(stdout.split('\n').length).toBeGreaterThan(5);
    });
  });
  
  describe('Error Handling', () => {
    it('should handle invalid paths gracefully', async () => {
      const { stderr, code } = await execAsync(
        `node ${CLI_PATH} "/non/existent/path" "${destDir}" --no-interactive`
      ).catch(e => e);
      
      expect(code).not.toBe(0);
      expect(stderr).toContain('Source path not found');
    });
    
    it('should handle missing arguments', async () => {
      const { stderr, code } = await execAsync(
        `node ${CLI_PATH} --no-interactive`
      ).catch(e => e);
      
      expect(code).not.toBe(0);
      expect(stderr).toContain('Source and destination paths are required');
    });
    
    it('should respect --max-errors flag', async () => {
      // Create files that will cause errors
      for (let i = 0; i < 10; i++) {
        await fs.writeFile(
          path.join(sourceDir, `file${i}.txt`),
          'Content',
          { mode: 0o000 } // No permissions
        );
      }
      
      const { stdout, stderr } = await execAsync(
        `node ${CLI_PATH} "${sourceDir}" "${destDir}" --max-errors 3 --skip-errors --no-interactive`
      ).catch(e => e);
      
      // Should stop after max errors
      expect(stdout || stderr).toContain('error');
    });
  });
  
  describe('Configuration', () => {
    it('should load configuration from file', async () => {
      // Create config file
      const configPath = path.join(testDir, 'config.json');
      const config = {
        sourcePath: sourceDir,
        destinationPath: destDir,
        workerThreads: 2,
        deleteOrphaned: false
      };
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));
      
      const { stdout } = await execAsync(
        `node ${CLI_PATH} --config "${configPath}" --no-interactive`
      );
      
      expect(stdout).toContain('Sync completed successfully');
    });
  });
});