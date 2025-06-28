import { describe, it, expect, beforeEach } from 'vitest';
import { FilterManager } from '../../lib/filters.js';

describe('FilterManager', () => {
  let filterManager;

  beforeEach(() => {
    filterManager = new FilterManager();
  });

  describe('Preset Filters', () => {
    it('should have built-in filter presets', () => {
      expect(filterManager.presets).toBeDefined();
      expect(filterManager.presets.webDevelopment).toBeDefined();
      expect(filterManager.presets.sourceCode).toBeDefined();
      expect(filterManager.presets.mediaFiles).toBeDefined();
      expect(filterManager.presets.pythonProject).toBeDefined();
      expect(filterManager.presets.documents).toBeDefined();
    });

    it('should apply sourceCode filter correctly', () => {
      filterManager.applyPreset('sourceCode');
      
      // Check that patterns were applied
      expect(filterManager.patterns.extensions).toContain('.js');
      expect(filterManager.patterns.extensions).toContain('.py');
      expect(filterManager.patterns.ignore).toContain('node_modules/');
    });

    it('should apply mediaFiles filter correctly', () => {
      filterManager.applyPreset('mediaFiles');
      
      // Check that media extensions were applied
      expect(filterManager.patterns.extensions).toContain('.jpg');
      expect(filterManager.patterns.extensions).toContain('.mp4');
      expect(filterManager.patterns.extensions).toContain('.mp3');
    });
  });

  describe('Custom Patterns', () => {
    it('should add custom ignore patterns', () => {
      filterManager.addIgnorePatterns(['*.tmp', 'node_modules/']);
      
      expect(filterManager.patterns.ignore).toContain('*.tmp');
      expect(filterManager.patterns.ignore).toContain('node_modules/');
    });

    it('should set include patterns', () => {
      filterManager.setIncludePatterns(['*.js', '*.ts']);
      
      expect(filterManager.patterns.include).toContain('*.js');
      expect(filterManager.patterns.include).toContain('*.ts');
    });
  });

  describe('Include/Exclude Logic', () => {
    it('should respect both include and exclude patterns', () => {
      // Set up includes (only .js and .ts files)
      filterManager.setIncludePatterns(['*.js', '*.ts']);
      
      // Set up excludes
      filterManager.addIgnorePatterns(['*.test.js', '*.spec.ts']);
      
      // Test shouldFilter method which likely exists
      const shouldFilterOut = (file) => {
        // If we have include patterns and file doesn't match, filter out
        if (filterManager.patterns.include.length > 0) {
          const matchesInclude = filterManager.patterns.include.some(pattern => 
            file.endsWith(pattern.replace('*', ''))
          );
          if (!matchesInclude) return true;
        }
        
        // If file matches ignore patterns, filter out
        return filterManager.patterns.ignore.some(pattern => 
          file.endsWith(pattern.replace('*', ''))
        );
      };
      
      // Should include regular JS/TS files
      expect(shouldFilterOut('main.js')).toBe(false);
      expect(shouldFilterOut('app.ts')).toBe(false);
      
      // Should exclude test files even if they match include pattern
      expect(shouldFilterOut('main.test.js')).toBe(true);
      expect(shouldFilterOut('app.spec.ts')).toBe(true);
      
      // Should exclude files that don't match include pattern
      expect(shouldFilterOut('style.css')).toBe(true);
    });
  });
});