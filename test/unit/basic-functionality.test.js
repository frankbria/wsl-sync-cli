import { describe, it, expect } from 'vitest';
import { ErrorCategories, ErrorCodes } from '../../lib/error-handler.js';
import { FilterManager } from '../../lib/filters.js';
import path from 'path';

describe('Basic Functionality Tests', () => {
  describe('Error Handler Constants', () => {
    it('should export error categories', () => {
      expect(ErrorCategories).toBeDefined();
      expect(ErrorCategories.PERMISSION).toBe('permission');
      expect(ErrorCategories.PATH).toBe('path');
      expect(ErrorCategories.UNKNOWN).toBe('unknown');
    });

    it('should export error codes with proper structure', () => {
      expect(ErrorCodes).toBeDefined();
      expect(ErrorCodes.EACCES).toHaveProperty('category');
      expect(ErrorCodes.EACCES).toHaveProperty('code');
      expect(ErrorCodes.EACCES.code).toBe('EACCES');
      expect(ErrorCodes.EACCES.category).toBe(ErrorCategories.PERMISSION);
    });
  });

  describe('Filter Manager', () => {
    it('should create filter manager instance', () => {
      const filterManager = new FilterManager();
      expect(filterManager).toBeDefined();
      expect(filterManager.patterns).toBeDefined();
      expect(filterManager.presets).toBeDefined();
    });

    it('should have default presets', () => {
      const filterManager = new FilterManager();
      expect(Object.keys(filterManager.presets)).toContain('webDevelopment');
      expect(Object.keys(filterManager.presets)).toContain('sourceCode');
      expect(Object.keys(filterManager.presets)).toContain('mediaFiles');
    });

    it('should apply presets correctly', () => {
      const filterManager = new FilterManager();
      
      // Apply web development preset
      filterManager.applyPreset('webDevelopment');
      
      // Check that patterns were applied
      expect(filterManager.patterns.ignore).toContain('node_modules/');
      expect(filterManager.patterns.ignore).toContain('.git/');
      expect(filterManager.patterns.extensions).toContain('.js');
      expect(filterManager.patterns.extensions).toContain('.css');
    });

    it('should manage custom patterns', () => {
      const filterManager = new FilterManager();
      
      // Set ignore patterns
      filterManager.setIgnorePatterns(['*.tmp', '*.log']);
      expect(filterManager.patterns.ignore).toEqual(['*.tmp', '*.log']);
      
      // Add more patterns
      filterManager.addIgnorePatterns('node_modules/');
      expect(filterManager.patterns.ignore).toContain('node_modules/');
      
      // Set include patterns
      filterManager.setIncludePatterns(['*.js', '*.ts']);
      expect(filterManager.patterns.include).toEqual(['*.js', '*.ts']);
    });

    it('should check if files should be included', () => {
      const filterManager = new FilterManager();
      
      // Set ignore patterns
      filterManager.setIgnorePatterns(['*.tmp', 'node_modules/**']);
      
      // Create a mock file object
      const createFile = (filePath) => ({
        path: filePath,
        relPath: filePath, // relative path for ignore patterns
        name: path.basename(filePath),
        size: 1000,
        mtime: new Date(),
        isDirectory: false
      });
      
      // The FilterManager has a shouldIncludeFile method
      expect(filterManager.shouldIncludeFile(createFile('test.tmp'))).toBe(false);
      expect(filterManager.shouldIncludeFile(createFile('node_modules/lib.js'))).toBe(false);
      expect(filterManager.shouldIncludeFile(createFile('src/main.js'))).toBe(true);
    });
  });

  describe('Path Utilities', () => {
    it('should handle path operations', () => {
      const testPath = '/home/user/project/file.js';
      
      expect(path.basename(testPath)).toBe('file.js');
      expect(path.dirname(testPath)).toBe('/home/user/project');
      expect(path.extname(testPath)).toBe('.js');
      
      const joined = path.join('/home', 'user', 'project');
      expect(joined).toBe('/home/user/project');
    });
  });

  describe('Configuration Objects', () => {
    it('should create valid sync configuration', () => {
      const config = {
        sourcePath: '/home/user/source',
        destinationPath: '/mnt/c/dest',
        direction: 'two-way',
        workerThreads: 4,
        deleteOrphaned: false,
        ignorePatterns: ['*.tmp', 'node_modules/'],
        performanceMode: 'balanced'
      };
      
      // Validate configuration
      expect(config.sourcePath).toBeTruthy();
      expect(config.destinationPath).toBeTruthy();
      expect(['one-way', 'two-way', 'mirror']).toContain(config.direction);
      expect(config.workerThreads).toBeGreaterThan(0);
      expect(config.workerThreads).toBeLessThanOrEqual(16);
    });
  });
});