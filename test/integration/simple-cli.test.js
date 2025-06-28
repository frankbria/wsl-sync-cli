import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProfileManager } from '../../lib/profiles.js';
import { SettingsManager } from '../../lib/settings.js';
import { FilterManager } from '../../lib/filters.js';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';

describe('CLI Components Integration', () => {
  let tempDir;
  let profileManager;
  let settingsManager;
  let filterManager;

  beforeEach(async () => {
    // Create temporary directory for test
    tempDir = path.join(os.tmpdir(), `wsl-sync-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    
    // Initialize managers
    profileManager = new ProfileManager({ configDir: tempDir });
    settingsManager = new SettingsManager({ configDir: tempDir });
    filterManager = new FilterManager();
  });

  afterEach(async () => {
    // Clean up
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('Profile Management', () => {
    it('should create and retrieve profiles', async () => {
      const testProfile = {
        name: 'test-profile',
        sourcePath: '/home/user/source',
        destinationPath: '/mnt/c/dest',
        direction: 'two-way',
        filter: 'sourceCode',
        workerThreads: 4
      };

      // Create profile
      profileManager.createProfile(testProfile);
      
      // Save profiles
      await profileManager.save();
      
      // Create new instance to test persistence
      const newProfileManager = new ProfileManager({ configDir: tempDir });
      await newProfileManager.load();
      
      // Verify profile exists
      const loaded = newProfileManager.getProfile('test-profile');
      expect(loaded).toBeDefined();
      expect(loaded.sourcePath).toBe(testProfile.sourcePath);
      expect(loaded.filter).toBe(testProfile.filter);
    });
  });

  describe('Settings Management', () => {
    it('should save and load settings', async () => {
      // Set some settings
      settingsManager.set('performanceMode', 'fast');
      settingsManager.set('workerThreads', 8);
      settingsManager.set('enableVerification', false);
      
      // Save settings
      await settingsManager.save();
      
      // Create new instance to test persistence
      const newSettingsManager = new SettingsManager({ configDir: tempDir });
      await newSettingsManager.load();
      
      // Verify settings
      expect(newSettingsManager.get('performanceMode')).toBe('fast');
      expect(newSettingsManager.get('workerThreads')).toBe(8);
      expect(newSettingsManager.get('enableVerification')).toBe(false);
    });
  });

  describe('Filter Integration', () => {
    it('should apply filters to file lists', () => {
      // Apply source code filter
      filterManager.applyPreset('sourceCode');
      
      const testFiles = [
        'index.js',
        'style.css',
        'README.md',
        'package.json',
        'node_modules/lib.js',
        'build/output.js',
        'image.png',
        'data.db'
      ];
      
      // Filter files based on extensions and ignore patterns
      const filtered = testFiles.filter(file => {
        // Check if file should be ignored
        const shouldIgnore = filterManager.patterns.ignore.some(pattern => {
          if (pattern.endsWith('/')) {
            return file.startsWith(pattern);
          }
          return file.includes(pattern.replace('*', ''));
        });
        
        if (shouldIgnore) return false;
        
        // Check if file matches allowed extensions
        if (filterManager.patterns.extensions.length > 0) {
          const ext = path.extname(file);
          return filterManager.patterns.extensions.includes(ext);
        }
        
        return true;
      });
      
      // Should include source files
      expect(filtered).toContain('index.js');
      expect(filtered).toContain('style.css');
      expect(filtered).toContain('package.json');
      
      // Should exclude ignored paths and non-source files
      expect(filtered).not.toContain('node_modules/lib.js');
      expect(filtered).not.toContain('build/output.js');
      expect(filtered).not.toContain('image.png');
      expect(filtered).not.toContain('data.db');
    });
  });

  describe('Configuration Integration', () => {
    it('should work with profile and settings together', async () => {
      // Create a profile
      profileManager.createProfile({
        name: 'integration-test',
        sourcePath: '/test/source',
        destinationPath: '/test/dest',
        filter: 'documents'
      });
      
      // Set related settings
      settingsManager.set('defaultProfile', 'integration-test');
      settingsManager.set('autoSync', true);
      settingsManager.set('syncInterval', 300);
      
      // Save both
      await Promise.all([
        profileManager.save(),
        settingsManager.save()
      ]);
      
      // Verify integration
      const defaultProfileName = settingsManager.get('defaultProfile');
      const defaultProfile = profileManager.getProfile(defaultProfileName);
      
      expect(defaultProfile).toBeDefined();
      expect(defaultProfile.filter).toBe('documents');
      expect(settingsManager.get('autoSync')).toBe(true);
    });
  });
});