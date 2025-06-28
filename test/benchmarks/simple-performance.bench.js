import { bench, describe } from 'vitest';
import { FilterManager } from '../../lib/filters.js';
import path from 'path';

describe('Simple Performance Benchmarks', () => {
  describe('Filter Performance', () => {
    bench('create filter manager', () => {
      new FilterManager();
    });

    bench('apply preset filter', () => {
      const fm = new FilterManager();
      fm.applyPreset('sourceCode');
    });

    bench('pattern matching - 100 files', () => {
      const fm = new FilterManager();
      fm.setIgnorePatterns(['*.tmp', 'node_modules/**', '*.log']);
      
      const files = [];
      for (let i = 0; i < 100; i++) {
        files.push({
          path: `/test/file${i}.js`,
          relPath: `file${i}.js`,
          name: `file${i}.js`,
          size: 1000,
          mtime: new Date(),
          isDirectory: false
        });
      }
      
      files.forEach(file => fm.shouldIncludeFile(file));
    });

    bench('glob pattern conversion', () => {
      const fm = new FilterManager();
      const patterns = [
        '*.js',
        '**/*.test.js',
        'src/**/*.ts',
        'node_modules/**/*',
        '!important.js'
      ];
      
      patterns.forEach(p => fm.globToRegex(p));
    });
  });

  describe('Path Operations', () => {
    bench('path parsing - 1000 operations', () => {
      for (let i = 0; i < 1000; i++) {
        const p = `/home/user/project/src/components/file${i}.js`;
        path.basename(p);
        path.dirname(p);
        path.extname(p);
      }
    });

    bench('path joining - 1000 operations', () => {
      for (let i = 0; i < 1000; i++) {
        path.join('/home', 'user', 'project', `file${i}.js`);
      }
    });
  });

  describe('Array Operations', () => {
    bench('array filtering - 1000 items', () => {
      const items = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        value: Math.random(),
        active: i % 2 === 0
      }));
      
      items.filter(item => item.active && item.value > 0.5);
    });

    bench('map creation and lookup', () => {
      const map = new Map();
      
      // Add 100 items
      for (let i = 0; i < 100; i++) {
        map.set(`key${i}`, { id: i, data: `value${i}` });
      }
      
      // Lookup 100 items
      for (let i = 0; i < 100; i++) {
        map.get(`key${i}`);
      }
    });
  });
});