import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

const execAsync = promisify(exec);
const CLI_PATH = path.join(process.cwd(), 'src/cli.js');

/**
 * User Acceptance Test Scenarios
 * These tests simulate real-world user workflows
 */
describe('User Acceptance Tests', () => {
  let testDir;
  let homeDir;
  let projectDir;
  let backupDir;
  
  beforeEach(async () => {
    // Create realistic directory structure
    testDir = path.join(os.tmpdir(), `wsl-sync-uat-${Date.now()}`);
    homeDir = path.join(testDir, 'home', 'user');
    projectDir = path.join(homeDir, 'projects');
    backupDir = path.join(testDir, 'mnt', 'c', 'Backup');
    
    await fs.mkdir(projectDir, { recursive: true });
    await fs.mkdir(backupDir, { recursive: true });
  });
  
  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });
  
  describe('Scenario 1: Developer Workflow', () => {
    it('should sync code project with proper filtering', async () => {
      // Setup: Create a typical development project
      const webProject = path.join(projectDir, 'web-app');
      await fs.mkdir(path.join(webProject, 'src'), { recursive: true });
      await fs.mkdir(path.join(webProject, 'node_modules'), { recursive: true });
      await fs.mkdir(path.join(webProject, '.git'), { recursive: true });
      
      // Create project files
      await fs.writeFile(
        path.join(webProject, 'package.json'),
        JSON.stringify({ name: 'web-app', version: '1.0.0' })
      );
      await fs.writeFile(
        path.join(webProject, 'src', 'index.js'),
        'console.log("Hello World");'
      );
      await fs.writeFile(
        path.join(webProject, 'src', 'app.js'),
        'export default function App() {}'
      );
      await fs.writeFile(
        path.join(webProject, 'README.md'),
        '# Web App\nDevelopment project'
      );
      await fs.writeFile(
        path.join(webProject, '.gitignore'),
        'node_modules/\n*.log'
      );
      
      // Create files that should be ignored
      await fs.writeFile(
        path.join(webProject, 'node_modules', 'package.json'),
        '{}'
      );
      await fs.writeFile(
        path.join(webProject, 'debug.log'),
        'Debug information'
      );
      
      // Create destination
      const destProject = path.join(backupDir, 'WebApp');
      await fs.mkdir(destProject, { recursive: true });
      
      // Action: Sync with code filter
      const { stdout, stderr } = await execAsync(
        `node ${CLI_PATH} "${webProject}" "${destProject}" --filter code --no-interactive`
      );
      
      // Verify: Check synced files
      expect(stdout).toContain('Sync completed successfully');
      
      // Source files should be synced
      expect(await fs.access(path.join(destProject, 'src', 'index.js'))).toBeUndefined();
      expect(await fs.access(path.join(destProject, 'src', 'app.js'))).toBeUndefined();
      expect(await fs.access(path.join(destProject, 'package.json'))).toBeUndefined();
      expect(await fs.access(path.join(destProject, 'README.md'))).toBeUndefined();
      
      // Ignored files should not be synced
      await expect(fs.access(path.join(destProject, 'node_modules'))).rejects.toThrow();
      await expect(fs.access(path.join(destProject, 'debug.log'))).rejects.toThrow();
      await expect(fs.access(path.join(destProject, '.git'))).rejects.toThrow();
    });
    
    it('should handle incremental updates efficiently', async () => {
      // Setup: Create initial project
      const project = path.join(projectDir, 'api');
      await fs.mkdir(path.join(project, 'src'), { recursive: true });
      
      await fs.writeFile(
        path.join(project, 'src', 'server.js'),
        'const express = require("express");'
      );
      
      const dest = path.join(backupDir, 'API');
      
      // Initial sync
      await execAsync(
        `node ${CLI_PATH} "${project}" "${dest}" --no-interactive`
      );
      
      // Verify initial sync
      const initialContent = await fs.readFile(
        path.join(dest, 'src', 'server.js'),
        'utf8'
      );
      expect(initialContent).toContain('express');
      
      // Update source file
      await fs.writeFile(
        path.join(project, 'src', 'server.js'),
        'const express = require("express");\nconst app = express();'
      );
      
      // Add new file
      await fs.writeFile(
        path.join(project, 'src', 'routes.js'),
        'module.exports = { routes };'
      );
      
      // Incremental sync
      const { stdout } = await execAsync(
        `node ${CLI_PATH} "${project}" "${dest}" --no-interactive`
      );
      
      // Verify updates
      const updatedContent = await fs.readFile(
        path.join(dest, 'src', 'server.js'),
        'utf8'
      );
      expect(updatedContent).toContain('const app = express()');
      
      expect(await fs.access(path.join(dest, 'src', 'routes.js'))).toBeUndefined();
    });
  });
  
  describe('Scenario 2: Document Management', () => {
    it('should sync documents with appropriate filtering', async () => {
      // Setup: Create document structure
      const docsDir = path.join(homeDir, 'Documents');
      await fs.mkdir(path.join(docsDir, 'Work'), { recursive: true });
      await fs.mkdir(path.join(docsDir, 'Personal'), { recursive: true });
      
      // Create various document types
      await fs.writeFile(
        path.join(docsDir, 'Work', 'report.pdf'),
        'PDF content'
      );
      await fs.writeFile(
        path.join(docsDir, 'Work', 'presentation.pptx'),
        'PowerPoint content'
      );
      await fs.writeFile(
        path.join(docsDir, 'Personal', 'notes.txt'),
        'Personal notes'
      );
      await fs.writeFile(
        path.join(docsDir, 'Personal', 'budget.xlsx'),
        'Excel content'
      );
      
      // Create non-document files
      await fs.writeFile(
        path.join(docsDir, 'backup.zip'),
        'Zip content'
      );
      await fs.writeFile(
        path.join(docsDir, 'video.mp4'),
        'Video content'
      );
      
      const destDocs = path.join(backupDir, 'Documents');
      
      // Action: Sync with documents filter
      const { stdout } = await execAsync(
        `node ${CLI_PATH} "${docsDir}" "${destDocs}" --filter documents --no-interactive`
      );
      
      // Verify: Document files synced
      expect(await fs.access(path.join(destDocs, 'Work', 'report.pdf'))).toBeUndefined();
      expect(await fs.access(path.join(destDocs, 'Work', 'presentation.pptx'))).toBeUndefined();
      expect(await fs.access(path.join(destDocs, 'Personal', 'notes.txt'))).toBeUndefined();
      expect(await fs.access(path.join(destDocs, 'Personal', 'budget.xlsx'))).toBeUndefined();
      
      // Non-documents not synced
      await expect(fs.access(path.join(destDocs, 'backup.zip'))).rejects.toThrow();
      await expect(fs.access(path.join(destDocs, 'video.mp4'))).rejects.toThrow();
    });
  });
  
  describe('Scenario 3: Profile-based Workflow', () => {
    it('should create and use profiles for repeated syncs', async () => {
      // Setup: Create test data
      const photos = path.join(homeDir, 'Pictures');
      await fs.mkdir(photos, { recursive: true });
      
      await fs.writeFile(path.join(photos, 'vacation.jpg'), 'JPEG data');
      await fs.writeFile(path.join(photos, 'family.png'), 'PNG data');
      
      const destPhotos = path.join(backupDir, 'Photos');
      const profileName = `test-photos-${Date.now()}`;
      
      // Action 1: Create profile
      const { stdout: createOutput } = await execAsync(
        `node ${CLI_PATH} --create-profile "${profileName}" ` +
        `--source "${photos}" --destination "${destPhotos}" ` +
        `--filter images --workers 2`
      );
      
      expect(createOutput).toContain(`Profile '${profileName}' created`);
      
      // Action 2: Use profile
      const { stdout: syncOutput } = await execAsync(
        `node ${CLI_PATH} --profile "${profileName}" --no-interactive`
      );
      
      expect(syncOutput).toContain('Sync completed successfully');
      
      // Verify files synced
      expect(await fs.access(path.join(destPhotos, 'vacation.jpg'))).toBeUndefined();
      expect(await fs.access(path.join(destPhotos, 'family.png'))).toBeUndefined();
      
      // Action 3: List profiles
      const { stdout: listOutput } = await execAsync(
        `node ${CLI_PATH} --list-profiles --json`
      );
      
      const profiles = JSON.parse(listOutput);
      const testProfile = profiles.profiles.find(p => p.name === profileName);
      
      expect(testProfile).toBeDefined();
      expect(testProfile.sourcePath).toBe(photos);
      expect(testProfile.destinationPath).toBe(destPhotos);
      expect(testProfile.filter).toBe('images');
    });
  });
  
  describe('Scenario 4: Conflict Resolution', () => {
    it('should handle file conflicts appropriately', async () => {
      // Setup: Create conflicting files
      const source = path.join(projectDir, 'shared');
      const dest = path.join(backupDir, 'Shared');
      
      await fs.mkdir(source, { recursive: true });
      await fs.mkdir(dest, { recursive: true });
      
      // Create initial files
      await fs.writeFile(
        path.join(source, 'document.txt'),
        'Source version - newer'
      );
      await fs.writeFile(
        path.join(dest, 'document.txt'),
        'Destination version - older'
      );
      
      // Make source file newer
      const futureTime = new Date(Date.now() + 10000);
      await fs.utimes(path.join(source, 'document.txt'), futureTime, futureTime);
      
      // Action: Two-way sync (should detect conflict)
      const { stdout } = await execAsync(
        `node ${CLI_PATH} "${source}" "${dest}" --two-way --dry-run --no-interactive`
      );
      
      // Verify conflict detection
      expect(stdout).toContain('document.txt');
      expect(stdout.toLowerCase()).toMatch(/conflict|update/);
    });
  });
  
  describe('Scenario 5: Error Recovery', () => {
    it('should continue sync with --skip-errors flag', async () => {
      // Setup: Create files with permission issues
      const source = path.join(projectDir, 'mixed');
      await fs.mkdir(source, { recursive: true });
      
      // Create accessible files
      await fs.writeFile(path.join(source, 'file1.txt'), 'Content 1');
      await fs.writeFile(path.join(source, 'file2.txt'), 'Content 2');
      await fs.writeFile(path.join(source, 'file3.txt'), 'Content 3');
      
      // Create problematic file (simulate with non-existent source)
      const dest = path.join(backupDir, 'Mixed');
      
      // Action: Sync with error handling
      const { stdout, stderr } = await execAsync(
        `node ${CLI_PATH} "${source}" "${dest}" --skip-errors --max-errors 10 --no-interactive`
      );
      
      // Should complete despite any errors
      expect(stdout).toContain('Sync completed');
      
      // Verify accessible files were synced
      expect(await fs.access(path.join(dest, 'file1.txt'))).toBeUndefined();
      expect(await fs.access(path.join(dest, 'file2.txt'))).toBeUndefined();
    });
  });
  
  describe('Scenario 6: Performance Testing', () => {
    it('should handle large directory structures efficiently', async () => {
      // Setup: Create many files
      const largeDir = path.join(projectDir, 'large');
      await fs.mkdir(largeDir, { recursive: true });
      
      // Create 100 files across 10 directories
      for (let d = 0; d < 10; d++) {
        const subDir = path.join(largeDir, `dir${d}`);
        await fs.mkdir(subDir, { recursive: true });
        
        for (let f = 0; f < 10; f++) {
          await fs.writeFile(
            path.join(subDir, `file${f}.txt`),
            `Content of file ${f} in dir ${d}`
          );
        }
      }
      
      const destLarge = path.join(backupDir, 'Large');
      
      // Action: Sync with multiple workers
      const startTime = Date.now();
      const { stdout } = await execAsync(
        `node ${CLI_PATH} "${largeDir}" "${destLarge}" --workers 4 --no-interactive`
      );
      const duration = Date.now() - startTime;
      
      // Verify completion
      expect(stdout).toContain('Sync completed successfully');
      
      // Should complete reasonably quickly
      expect(duration).toBeLessThan(10000); // 10 seconds max
      
      // Spot check some files
      expect(await fs.access(path.join(destLarge, 'dir0', 'file0.txt'))).toBeUndefined();
      expect(await fs.access(path.join(destLarge, 'dir9', 'file9.txt'))).toBeUndefined();
    });
  });
});