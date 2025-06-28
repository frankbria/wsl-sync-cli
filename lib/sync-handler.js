import { PerformanceSyncManager } from './sync-performance.js';
import { DeletionManager } from './deletion-manager.js';
import { FilterManager } from './filters.js';
import { WSLIntegration } from './wsl-integration.js';
import { ErrorHandler } from './error-handler.js';
import { EventEmitter } from 'events';
import path from 'path';

export class SyncHandler extends EventEmitter {
  constructor(options = {}) {
    super();
    this.syncManager = null;
    this.deletionManager = null;
    this.filterManager = null;
    this.wslIntegration = null;
    this.errorHandler = new ErrorHandler(options.errorHandling || {});
    this.options = options;
    this.isPaused = false;
    this.isStopped = false;
    this.skipErrors = options.skipErrors || false;
    this.maxErrors = options.maxErrors || 50;
    this.errorCount = 0;
  }
  
  // Initialize handlers
  async initialize(state) {
    // Initialize error handler
    await this.errorHandler.initialize();
    
    // Initialize WSL integration
    if (state.wslIntegration) {
      this.wslIntegration = state.wslIntegration;
    }
    
    // Initialize deletion manager
    this.deletionManager = new DeletionManager({
      enableRecycleBin: state.settings.enableRecycleBin || false,
      deleteOrphaned: state.settings.deleteOrphaned || false,
      confirmDeletions: state.settings.confirmDeletions !== false
    });
    await this.deletionManager.initialize();
    
    // Initialize filter manager
    if (state.activeFilter?.manager) {
      this.filterManager = state.activeFilter.manager;
    } else {
      this.filterManager = new FilterManager();
    }
    
    // Initialize sync manager
    const performanceMode = state.settings.performanceMode || 'balanced';
    const workerThreads = this.getWorkerThreadCount(performanceMode);
    
    this.syncManager = new PerformanceSyncManager({
      enableVerification: state.settings.enableVerification || false,
      maxWorkerThreads: workerThreads,
      batchSize: state.settings.batchSize || 50,
      largeFileThreshold: 10 * 1024 * 1024, // 10MB
      queueConcurrency: 3,
      retryAttempts: state.settings.retryAttempts || 3
    });
  }
  
  // Get worker thread count based on performance mode
  getWorkerThreadCount(mode) {
    switch (mode) {
      case 'safe': return 1;
      case 'balanced': return 4;
      case 'fast': return 8;
      case 'max': return require('os').cpus().length;
      default: return 4;
    }
  }
  
  // Preview sync operation
  async preview(sourcePath, destPath, options = {}) {
    const { syncDirection, dryRun = true } = options;
    
    try {
      // Create temporary sync manager for preview
      const previewManager = new PerformanceSyncManager({
        ...this.syncManager.options,
        dryRun: true
      });
      
      // Collect file information
      const sourceFiles = await this.scanDirectory(sourcePath);
      const destFiles = await this.scanDirectory(destPath);
      
      // Apply filters
      const filteredSourceFiles = this.filterManager.filterFiles(sourceFiles);
      
      // Analyze operations needed
      const operations = await this.analyzeOperations(
        filteredSourceFiles,
        destFiles,
        sourcePath,
        destPath,
        syncDirection
      );
      
      // Analyze deletions
      const deletions = await this.deletionManager.analyzeDeletions(
        filteredSourceFiles,
        destPath
      );
      
      return {
        toCreate: operations.toCreate,
        toUpdate: operations.toUpdate,
        toDelete: deletions.toDelete,
        conflicts: operations.conflicts,
        totalSize: operations.totalSize,
        totalOperations: operations.totalOperations,
        sourceFiles: filteredSourceFiles.length,
        destFiles: destFiles.length
      };
    } catch (error) {
      throw new Error(`Preview failed: ${error.message}`);
    }
  }
  
  // Start sync operation
  async startSync(sourcePath, destPath, options = {}) {
    const { 
      syncDirection = 'two-way',
      dryRun = false,
      onProgress,
      onError,
      onComplete
    } = options;
    
    this.isPaused = false;
    this.isStopped = false;
    
    try {
      // Set up event handlers
      if (onProgress) {
        this.syncManager.on('progress', onProgress);
      }
      
      if (onError) {
        this.syncManager.on('error', onError);
      }
      
      if (onComplete) {
        this.syncManager.on('sync-complete', onComplete);
      }
      
      // Handle pause/resume
      this.syncManager.on('pause-check', () => {
        return this.isPaused;
      });
      
      // Handle stop
      this.syncManager.on('stop-check', () => {
        return this.isStopped;
      });
      
      // Start sync based on direction
      let result;
      
      switch (syncDirection) {
        case 'two-way':
          result = await this.syncManager.syncFoldersTwoWay(
            sourcePath,
            destPath,
            { dryRun }
          );
          break;
          
        case 'source-to-dest':
          result = await this.syncManager.syncFoldersOneWay(
            sourcePath,
            destPath,
            { dryRun }
          );
          break;
          
        case 'dest-to-source':
          result = await this.syncManager.syncFoldersOneWay(
            destPath,
            sourcePath,
            { dryRun }
          );
          break;
          
        default:
          throw new Error(`Invalid sync direction: ${syncDirection}`);
      }
      
      return result;
      
    } catch (error) {
      throw new Error(`Sync failed: ${error.message}`);
    } finally {
      // Clean up event handlers
      this.syncManager.removeAllListeners();
    }
  }
  
  // Pause sync operation
  async pauseSync() {
    this.isPaused = true;
    if (this.syncManager) {
      await this.syncManager.pauseSync();
    }
  }
  
  // Resume sync operation
  async resumeSync() {
    this.isPaused = false;
    if (this.syncManager) {
      await this.syncManager.resumeSync();
    }
  }
  
  // Stop sync operation
  async stopSync() {
    this.isStopped = true;
    if (this.syncManager) {
      await this.syncManager.stopSync();
    }
  }
  
  // Scan directory for files
  async scanDirectory(dirPath) {
    const files = [];
    const fs = require('fs').promises;
    const path = require('path');
    
    async function scan(dir, baseDir) {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relPath = path.relative(baseDir, fullPath);
          
          if (entry.isDirectory()) {
            // Recursively scan subdirectories
            await scan(fullPath, baseDir);
          } else {
            const stats = await fs.stat(fullPath);
            files.push({
              fullPath,
              relPath,
              name: entry.name,
              size: stats.size,
              mtime: stats.mtimeMs,
              isDirectory: false
            });
          }
        }
      } catch (error) {
        // Skip directories we can't access
      }
    }
    
    await scan(dirPath, dirPath);
    return files;
  }
  
  // Analyze operations needed
  async analyzeOperations(sourceFiles, destFiles, sourcePath, destPath, syncDirection) {
    const operations = {
      toCreate: [],
      toUpdate: [],
      conflicts: [],
      totalSize: 0,
      totalOperations: 0
    };
    
    // Create map of destination files for quick lookup
    const destMap = new Map();
    destFiles.forEach(file => {
      destMap.set(file.relPath, file);
    });
    
    // Analyze source files
    for (const sourceFile of sourceFiles) {
      const destFile = destMap.get(sourceFile.relPath);
      
      if (!destFile) {
        // File doesn't exist in destination - create it
        operations.toCreate.push({
          path: sourceFile.relPath,
          size: sourceFile.size,
          source: sourceFile.fullPath,
          dest: path.join(destPath, sourceFile.relPath)
        });
        operations.totalSize += sourceFile.size;
      } else {
        // File exists - check if it needs updating
        if (sourceFile.mtime > destFile.mtime) {
          operations.toUpdate.push({
            path: sourceFile.relPath,
            size: sourceFile.size,
            source: sourceFile.fullPath,
            dest: destFile.fullPath,
            sourceMtime: sourceFile.mtime,
            destMtime: destFile.mtime
          });
          operations.totalSize += sourceFile.size;
        } else if (sourceFile.mtime < destFile.mtime && syncDirection === 'two-way') {
          // In two-way sync, newer destination files create conflicts
          operations.conflicts.push({
            path: sourceFile.relPath,
            type: 'newer-in-destination',
            resolution: 'manual',
            sourceFile,
            destFile
          });
        }
      }
    }
    
    operations.totalOperations = 
      operations.toCreate.length + 
      operations.toUpdate.length + 
      operations.conflicts.length;
    
    return operations;
  }
  
  // Clean up resources
  async cleanup() {
    if (this.syncManager) {
      await this.syncManager.cleanup();
    }
  }
  
  // Main sync method for CLI compatibility
  async sync(options) {
    const {
      sourcePath,
      destinationPath,
      direction = 'two-way',
      dryRun = false,
      deleteOrphaned = false,
      workerThreads = 4,
      filter = null,
      ignorePatterns = [],
      verbose = false,
      quiet = false
    } = options;
    
    // Initialize with minimal state
    const state = {
      settings: {
        performanceMode: 'balanced',
        maxWorkerThreads: workerThreads,
        deleteOrphaned,
        enableVerification: false,
        confirmDeletions: false,
        batchSize: 50,
        retryAttempts: 3
      },
      wslIntegration: new WSLIntegration()
    };
    
    // Apply filter if provided
    if (filter) {
      const filterManager = new FilterManager();
      const presetFilters = filterManager.getPresetFilters();
      if (presetFilters[filter]) {
        state.activeFilter = {
          manager: filterManager,
          filter: presetFilters[filter]
        };
      }
    }
    
    await this.initialize(state);
    
    // Apply ignore patterns
    if (ignorePatterns.length > 0) {
      // Create .syncignore content
      const syncignorePath = path.join(sourcePath, '.syncignore');
      // Note: In production, we'd merge with existing patterns
    }
    
    // Set up event forwarding with error handling
    this.syncManager.on('progress', (progress) => {
      this.emit('progress', progress);
    });
    
    this.syncManager.on('error', async (error, context) => {
      this.errorCount++;
      
      // Log error
      await this.errorHandler.logError(error, context);
      
      // Check if we should stop due to too many errors
      if (this.errorCount >= this.maxErrors) {
        this.emit('error', new Error(`Too many errors (${this.errorCount}), stopping sync`));
        this.isStopped = true;
        return;
      }
      
      // Handle with retry if enabled
      if (!this.skipErrors && this.options.enableRetry) {
        try {
          await this.errorHandler.handleWithRetry(
            async () => {
              // Retry logic would go here
              throw error; // For now, just throw
            },
            context
          );
        } catch (retryError) {
          // Retry failed, emit error
          this.emit('error', retryError, context);
        }
      } else {
        // Just emit the error
        this.emit('error', error, context);
      }
    });
    
    // Perform sync
    const result = await this.performSync({
      sourcePath,
      destinationPath,
      syncDirection: direction,
      dryRun
    });
    
    // Transform result for CLI
    return {
      totalFiles: result.totalFiles || 0,
      syncedFiles: result.filesCreated + result.filesUpdated,
      filesCreated: result.filesCreated || 0,
      filesUpdated: result.filesUpdated || 0,
      filesDeleted: result.filesDeleted || 0,
      errors: result.errors || [],
      success: !result.errors || result.errors.length === 0
    };
  }
}

export default SyncHandler;