import { bench, describe } from 'vitest';
import { SyncManager } from '../../src/lib/sync-manager.js';
import { FilterManager } from '../../src/lib/filter-manager.js';
import { MockFileSystem, createTestStructure } from '../mocks/file-system.js';
import path from 'path';

describe('Sync Performance Benchmarks', () => {
  let syncManager;
  let filterManager;
  let mockFs;
  
  // Create file structures of different sizes
  const createLargeStructure = (fileCount, avgSize = 1024) => {
    const fs = new MockFileSystem();
    const files = {};
    
    for (let i = 0; i < fileCount; i++) {
      const dir = Math.floor(i / 100);
      const filename = `file${i}.txt`;
      const content = 'x'.repeat(avgSize);
      
      if (!files[`dir${dir}`]) {
        files[`dir${dir}`] = {};
      }
      files[`dir${dir}`][filename] = content;
    }
    
    fs.createStructure({ source: files, destination: {} });
    return fs;
  };
  
  describe('File Scanning Performance', () => {
    bench('scan 100 files', async () => {
      const fs = createLargeStructure(100);
      const syncManager = new SyncManager({ workerThreads: 1 });
      
      await syncManager.initialize();
      await syncManager.scanDirectory('/source');
    });
    
    bench('scan 1,000 files', async () => {
      const fs = createLargeStructure(1000);
      const syncManager = new SyncManager({ workerThreads: 1 });
      
      await syncManager.initialize();
      await syncManager.scanDirectory('/source');
    });
    
    bench('scan 10,000 files', async () => {
      const fs = createLargeStructure(10000);
      const syncManager = new SyncManager({ workerThreads: 1 });
      
      await syncManager.initialize();
      await syncManager.scanDirectory('/source');
    }, { timeout: 30000 });
  });
  
  describe('Filter Performance', () => {
    beforeEach(() => {
      filterManager = new FilterManager();
    });
    
    bench('filter matching - 1,000 paths', () => {
      const patterns = ['*.tmp', 'node_modules/', '*.log', '.git/'];
      filterManager.setIgnorePatterns(patterns);
      
      for (let i = 0; i < 1000; i++) {
        filterManager.shouldIgnore(`/path/to/file${i}.txt`);
      }
    });
    
    bench('complex patterns - 1,000 paths', () => {
      const patterns = [
        '**/*.tmp',
        '**/node_modules/**',
        '**/.git/**',
        '**/build/**/*.js',
        '!**/build/important.js'
      ];
      filterManager.setIgnorePatterns(patterns);
      
      for (let i = 0; i < 1000; i++) {
        filterManager.shouldIgnore(`/deep/nested/path/to/file${i}.js`);
      }
    });
    
    bench('preset filters - documents', () => {
      filterManager.applyPreset('documents');
      
      const testPaths = [
        '/doc.pdf',
        '/image.jpg',
        '/script.js',
        '/data.json',
        '/video.mp4'
      ];
      
      for (let i = 0; i < 200; i++) {
        testPaths.forEach(p => filterManager.shouldInclude(p));
      }
    });
  });
  
  describe('Parallel Processing Performance', () => {
    const runWithWorkers = async (workerCount, fileCount) => {
      const fs = createLargeStructure(fileCount);
      const syncManager = new SyncManager({ 
        workerThreads: workerCount,
        batchSize: 50
      });
      
      await syncManager.initialize();
      const files = fs.getAllFiles('/source');
      
      // Simulate processing files
      const batches = [];
      for (let i = 0; i < files.length; i += 50) {
        batches.push(files.slice(i, i + 50));
      }
      
      await Promise.all(
        batches.map(batch => 
          syncManager.processBatch(batch, '/source', '/destination')
        )
      );
    };
    
    bench('1 worker - 1,000 files', async () => {
      await runWithWorkers(1, 1000);
    });
    
    bench('4 workers - 1,000 files', async () => {
      await runWithWorkers(4, 1000);
    });
    
    bench('8 workers - 1,000 files', async () => {
      await runWithWorkers(8, 1000);
    });
  });
  
  describe('Memory Usage Patterns', () => {
    bench('memory - small files', async () => {
      const fs = createLargeStructure(500, 1024); // 500 files, 1KB each
      const syncManager = new SyncManager({ workerThreads: 4 });
      
      await syncManager.initialize();
      const preview = await syncManager.generatePreview('/source', '/destination');
      
      // Force garbage collection if available
      if (global.gc) global.gc();
    });
    
    bench('memory - large files', async () => {
      const fs = createLargeStructure(50, 1024 * 100); // 50 files, 100KB each
      const syncManager = new SyncManager({ workerThreads: 4 });
      
      await syncManager.initialize();
      const preview = await syncManager.generatePreview('/source', '/destination');
      
      if (global.gc) global.gc();
    });
  });
  
  describe('Conflict Detection Performance', () => {
    bench('detect conflicts - 100 files', async () => {
      const fs = new MockFileSystem();
      
      // Create files with conflicts
      for (let i = 0; i < 100; i++) {
        const filePath = `/file${i}.txt`;
        fs.createFile(`/source${filePath}`, `Source content ${i}`, {
          mtime: new Date(Date.now() - 1000)
        });
        fs.createFile(`/destination${filePath}`, `Dest content ${i}`, {
          mtime: new Date()
        });
      }
      
      const syncManager = new SyncManager({ workerThreads: 1 });
      await syncManager.initialize();
      
      const preview = await syncManager.generatePreview(
        '/source',
        '/destination',
        'two-way'
      );
    });
  });
  
  describe('Batch Size Optimization', () => {
    const testBatchSize = async (batchSize) => {
      const fs = createLargeStructure(1000);
      const syncManager = new SyncManager({ 
        workerThreads: 4,
        batchSize
      });
      
      await syncManager.initialize();
      await syncManager.sync('/source', '/destination');
    };
    
    bench('batch size 10', async () => {
      await testBatchSize(10);
    });
    
    bench('batch size 50', async () => {
      await testBatchSize(50);
    });
    
    bench('batch size 100', async () => {
      await testBatchSize(100);
    });
    
    bench('batch size 200', async () => {
      await testBatchSize(200);
    });
  });
});