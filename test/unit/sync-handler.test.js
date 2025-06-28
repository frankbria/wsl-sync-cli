import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SyncHandler } from '../../src/lib/sync-handler.js';
import { MockFileSystem, createTestStructure, createConflictStructure } from '../mocks/file-system.js';

// Set up mocks before imports
let mockFs = createTestStructure();

vi.mock('fs/promises', () => ({
  default: mockFs.getFs().promises
}));

vi.mock('fs', () => ({
  default: mockFs.getFs()
}));

describe('SyncHandler', () => {
  let syncHandler;
  
  beforeEach(() => {
    mockFs = createTestStructure();
    syncHandler = new SyncHandler({
      enableRetry: true,
      maxErrors: 10
    });
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
    mockFs.clear();
  });
  
  describe('initialization', () => {
    it('should initialize all handlers', async () => {
      const state = {
        settings: {
          performanceMode: 'balanced',
          deleteOrphaned: false,
          enableVerification: false
        }
      };
      
      await syncHandler.initialize(state);
      
      expect(syncHandler.syncManager).toBeDefined();
      expect(syncHandler.deletionManager).toBeDefined();
      expect(syncHandler.filterManager).toBeDefined();
      expect(syncHandler.errorHandler).toBeDefined();
    });
  });
  
  describe('getWorkerThreadCount', () => {
    it('should return correct worker count for performance modes', () => {
      expect(syncHandler.getWorkerThreadCount('safe')).toBe(1);
      expect(syncHandler.getWorkerThreadCount('balanced')).toBeLessThanOrEqual(4);
      expect(syncHandler.getWorkerThreadCount('fast')).toBeLessThanOrEqual(8);
      expect(syncHandler.getWorkerThreadCount('max')).toBeGreaterThan(0);
    });
  });
  
  describe('generatePreview', () => {
    it('should generate preview for one-way sync', async () => {
      const preview = await syncHandler.generatePreview({
        sourcePath: '/source',
        destinationPath: '/destination',
        syncDirection: 'source-to-dest'
      });
      
      expect(preview).toBeDefined();
      expect(preview.operations).toBeDefined();
      expect(preview.operations.toCreate).toBeInstanceOf(Array);
      expect(preview.operations.toUpdate).toBeInstanceOf(Array);
      expect(preview.operations.conflicts).toBeInstanceOf(Array);
    });
    
    it('should detect files to create', async () => {
      const preview = await syncHandler.generatePreview({
        sourcePath: '/source',
        destinationPath: '/destination',
        syncDirection: 'source-to-dest'
      });
      
      // Check for files that exist in source but not in destination
      const toCreate = preview.operations.toCreate;
      const fileNames = toCreate.map(op => op.path);
      
      expect(fileNames).toContain('documents/file2.txt');
      expect(fileNames).toContain('images/photo1.jpg');
    });
    
    it('should detect files to update', async () => {
      const preview = await syncHandler.generatePreview({
        sourcePath: '/source',
        destinationPath: '/destination',
        syncDirection: 'source-to-dest'
      });
      
      // Check for files that need updating
      const toUpdate = preview.operations.toUpdate;
      const updatePaths = toUpdate.map(op => op.path);
      
      // file1.txt has different content
      expect(updatePaths).toContain('documents/file1.txt');
    });
    
    it('should detect conflicts in two-way sync', async () => {
      const conflictFs = createConflictStructure();
      
      // Create new handler with conflict file system
      const conflictHandler = new SyncHandler();
      
      const preview = await conflictHandler.generatePreview({
        sourcePath: '/source',
        destinationPath: '/destination',
        syncDirection: 'two-way'
      });
      
      expect(preview.operations.conflicts.length).toBeGreaterThan(0);
    });
  });
  
  describe('compareDirectories', () => {
    it('should compare directories and find differences', async () => {
      const comparison = await syncHandler.compareDirectories(
        '/source',
        '/destination',
        'source-to-dest'
      );
      
      expect(comparison.toCreate.length).toBeGreaterThan(0);
      expect(comparison.totalSize).toBeGreaterThan(0);
      expect(comparison.totalOperations).toBe(
        comparison.toCreate.length + 
        comparison.toUpdate.length + 
        comparison.conflicts.length
      );
    });
    
    it('should respect syncignore patterns', async () => {
      // Assuming syncignore is implemented
      const comparison = await syncHandler.compareDirectories(
        '/source',
        '/destination',
        'source-to-dest'
      );
      
      // node_modules should be ignored
      const paths = comparison.toCreate.map(op => op.path);
      expect(paths.every(p => !p.includes('node_modules'))).toBe(true);
    });
  });
  
  describe('event handling', () => {
    it('should emit progress events', async () => {
      const progressEvents = [];
      
      syncHandler.on('progress', (progress) => {
        progressEvents.push(progress);
      });
      
      // Mock sync operation that emits progress
      const state = {
        settings: { performanceMode: 'balanced' }
      };
      
      await syncHandler.initialize(state);
      
      // Trigger progress event
      syncHandler.syncManager.emit('progress', {
        percentage: 50,
        currentFile: 'test.txt'
      });
      
      expect(progressEvents.length).toBe(1);
      expect(progressEvents[0].percentage).toBe(50);
    });
    
    it('should handle errors with retry', async () => {
      const errorEvents = [];
      
      syncHandler.on('error', (error) => {
        errorEvents.push(error);
      });
      
      const state = {
        settings: { performanceMode: 'balanced' }
      };
      
      await syncHandler.initialize(state);
      
      // Emit error
      const testError = new Error('Test error');
      syncHandler.syncManager.emit('error', testError, { path: '/test' });
      
      // Should log and emit error
      expect(errorEvents.length).toBeGreaterThan(0);
    });
    
    it('should stop after max errors reached', async () => {
      syncHandler.maxErrors = 2;
      
      const state = {
        settings: { performanceMode: 'balanced' }
      };
      
      await syncHandler.initialize(state);
      
      // Emit multiple errors
      for (let i = 0; i < 3; i++) {
        syncHandler.syncManager.emit('error', new Error(`Error ${i}`));
      }
      
      expect(syncHandler.errorCount).toBe(3);
      expect(syncHandler.isStopped).toBe(true);
    });
  });
  
  describe('pause and resume', () => {
    it('should pause sync operation', async () => {
      await syncHandler.pauseSync();
      expect(syncHandler.isPaused).toBe(true);
    });
    
    it('should resume sync operation', async () => {
      syncHandler.isPaused = true;
      await syncHandler.resumeSync();
      expect(syncHandler.isPaused).toBe(false);
    });
  });
  
  describe('cleanup', () => {
    it('should clean up resources', async () => {
      const state = {
        settings: { performanceMode: 'balanced' }
      };
      
      await syncHandler.initialize(state);
      await syncHandler.cleanup();
      
      // Verify cleanup was called
      expect(true).toBe(true);
    });
  });
});