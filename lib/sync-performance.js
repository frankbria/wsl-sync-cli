// sync-performance.js - Performance-optimized sync implementation
import { Worker } from 'worker_threads';
import { EventEmitter } from 'events';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import PQueue from 'p-queue';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import the base SyncManager for validation and other features
import { SyncManager as BaseSyncManager } from './sync.js';

export class PerformanceSyncManager extends BaseSyncManager {
  constructor(options = {}) {
    super();
    
    // Performance options
    this.options = {
      maxWorkers: options.maxWorkers || os.cpus().length,
      batchSize: options.batchSize || 50,
      queueConcurrency: options.queueConcurrency || 4,
      retryAttempts: options.retryAttempts || 3,
      retryDelay: options.retryDelay || 1000,
      largeFileThreshold: options.largeFileThreshold || 10 * 1024 * 1024, // 10MB
      enableVerification: options.enableVerification || false,
      ...options
    };
    
    // Operation queue to prevent UI freezing
    this.queue = new PQueue({ 
      concurrency: this.options.queueConcurrency,
      autoStart: true
    });
    
    // Worker pool
    this.workers = [];
    this.workerIndex = 0;
    
    // Performance metrics
    this.metrics = {
      startTime: null,
      endTime: null,
      filesProcessed: 0,
      bytesTransferred: 0,
      errors: [],
      workerStats: {}
    };
    
    // Pause/Resume state
    this.isPaused = false;
    this.pausePromise = null;
    this.pauseResolve = null;
    this.pauseTime = null;
    this.resumeTime = null;
    
    // Track sync state for resume
    this.syncState = {
      processedFiles: new Set(),
      pendingOperations: [],
      currentBatch: null,
      totalProgress: 0,
      totalFiles: 0,
      totalBytes: 0
    };
  }
  
  // Initialize worker pool
  async initializeWorkers() {
    for (let i = 0; i < this.options.maxWorkers; i++) {
      const worker = await this.createWorker(i);
      this.workers.push(worker);
      this.metrics.workerStats[i] = {
        filesProcessed: 0,
        bytesTransferred: 0,
        errors: 0
      };
    }
  }
  
  // Create a worker thread
  createWorker(id) {
    return new Promise((resolve, reject) => {
      const worker = new Worker(path.join(__dirname, 'file-worker.cjs'));
      
      worker.on('error', (error) => {
        this.emit('worker-error', { workerId: id, error: error.message });
        reject(error);
      });
      
      worker.on('exit', (code) => {
        if (code !== 0) {
          this.emit('worker-exit', { workerId: id, code });
        }
      });
      
      worker.id = id;
      resolve(worker);
    });
  }
  
  // Get next available worker (round-robin)
  getNextWorker() {
    const worker = this.workers[this.workerIndex];
    this.workerIndex = (this.workerIndex + 1) % this.workers.length;
    return worker;
  }
  
  // Process files with worker threads
  async processFilesWithWorkers(files, operation) {
    if (this.workers.length === 0) {
      await this.initializeWorkers();
    }
    
    // Group files by size for better load balancing
    const smallFiles = files.filter(f => f.size < this.options.largeFileThreshold);
    const largeFiles = files.filter(f => f.size >= this.options.largeFileThreshold);
    
    // Sort large files by size (descending) for better distribution
    largeFiles.sort((a, b) => b.size - a.size);
    
    // Create file batches
    const batches = [];
    
    // Add large files as individual batches
    largeFiles.forEach(file => batches.push([file]));
    
    // Batch small files
    for (let i = 0; i < smallFiles.length; i += this.options.batchSize) {
      batches.push(smallFiles.slice(i, i + this.options.batchSize));
    }
    
    // Process batches with worker pool
    const results = await Promise.all(
      batches.map(batch => this.queue.add(() => this.processBatchWithWorker(batch, operation)))
    );
    
    return results.flat();
  }
  
  // Process a batch of files with a worker
  async processBatchWithWorker(files, operation) {
    const worker = this.getNextWorker();
    
    return new Promise((resolve, reject) => {
      const results = [];
      
      // Set up message handlers
      const messageHandler = (message) => {
        switch (message.type) {
          case 'progress':
            this.emit('file-progress', {
              workerId: worker.id,
              ...message.data
            });
            break;
            
          case 'file-complete':
            this.metrics.workerStats[worker.id].filesProcessed++;
            this.metrics.filesProcessed++;
            // Track processed file
            if (message.data.file) {
              this.syncState.processedFiles.add(message.data.file);
            }
            this.emit('file-complete', {
              workerId: worker.id,
              ...message.data
            });
            break;
            
          case 'file-error':
            this.metrics.workerStats[worker.id].errors++;
            this.emit('file-error', message.data);
            break;
            
          case 'batch-complete':
            this.emit('batch-complete', message.data);
            break;
            
          case 'complete':
            worker.off('message', messageHandler);
            resolve(message.data.results);
            break;
            
          case 'error':
            worker.off('message', messageHandler);
            reject(new Error(message.data.error));
            break;
        }
      };
      
      worker.on('message', messageHandler);
      
      // Send work to worker via postMessage (not workerData)
      worker.postMessage({
        files: files.map(f => ({
          source: f.source,
          destination: f.destination,
          size: f.size,
          mtime: f.mtime,
          relPath: f.relPath
        })),
        operation: {
          verify: this.options.enableVerification,
          batchSize: this.options.batchSize
        }
      });
    });
  }
  
  // Retry failed operations
  async retryFailedOperations(failedFiles, operation) {
    const retryResults = [];
    
    for (const file of failedFiles) {
      let retryCount = 0;
      let success = false;
      let lastError = null;
      
      while (retryCount < this.options.retryAttempts && !success) {
        try {
          // Wait before retry (exponential backoff)
          if (retryCount > 0) {
            const delay = this.options.retryDelay * Math.pow(2, retryCount - 1);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          
          // Retry the operation
          const result = await this.processBatchWithWorker([file], operation);
          if (result[0].success) {
            success = true;
            retryResults.push(result[0]);
            this.emit('retry-success', {
              file: file.relPath,
              attempts: retryCount + 1
            });
          } else {
            lastError = result[0].error;
          }
        } catch (error) {
          lastError = error.message;
        }
        
        retryCount++;
      }
      
      if (!success) {
        retryResults.push({
          success: false,
          file: file.relPath,
          error: lastError,
          attempts: retryCount
        });
        this.emit('retry-failed', {
          file: file.relPath,
          error: lastError,
          attempts: retryCount
        });
      }
    }
    
    return retryResults;
  }
  
  // Override syncOneWay to use performance optimizations
  async syncOneWay(src, dest, ig, direction = 'forward', dryRun = false) {
    this.emit('scan-start', { source: src, destination: dest });
    
    const files = await this.walkDir(src, src, ig);
    this.stats.totalFiles += files.length;
    
    // Update sync state with total files
    this.syncState.totalFiles = files.length;
    
    this.emit('scan-complete', { 
      fileCount: files.length,
      direction 
    });
    
    if (dryRun) {
      // In dry run, just return the operations without executing
      return this.generateOperations(files, dest);
    }
    
    // Prepare file operations
    const operations = [];
    for (const file of files) {
      const targetPath = path.join(dest, file.relPath);
      
      try {
        let shouldCopy = false;
        
        if (!await fs.pathExists(targetPath)) {
          shouldCopy = true;
        } else {
          const destStat = await fs.stat(targetPath);
          if (file.mtime > destStat.mtimeMs) {
            shouldCopy = true;
          }
        }
        
        if (shouldCopy) {
          operations.push({
            source: file.fullPath,
            destination: targetPath,
            size: file.size,
            mtime: file.mtime,
            relPath: file.relPath
          });
        }
      } catch (error) {
        this.stats.errors.push({
          file: file.fullPath,
          error: error.message
        });
      }
    }
    
    if (operations.length === 0) {
      return [];
    }
    
    // Process files with workers
    this.emit('sync-start', { 
      operationCount: operations.length,
      totalSize: operations.reduce((sum, op) => sum + op.size, 0)
    });
    
    const results = await this.processFilesWithWorkers(operations, { direction });
    
    // Retry failed operations
    const failedOperations = operations.filter((op, index) => !results[index].success);
    if (failedOperations.length > 0) {
      this.emit('retry-start', { count: failedOperations.length });
      const retryResults = await this.retryFailedOperations(failedOperations, { direction });
      
      // Update results with retry outcomes
      let retryIndex = 0;
      results.forEach((result, index) => {
        if (!result.success) {
          results[index] = retryResults[retryIndex++];
        }
      });
    }
    
    // Update stats
    const successCount = results.filter(r => r.success).length;
    this.stats.copiedFiles += successCount;
    this.stats.processedFiles += operations.length;
    
    return results;
  }
  
  // Generate operations for dry run
  async generateOperations(files, dest) {
    const operations = [];
    
    for (const file of files) {
      const targetPath = path.join(dest, file.relPath);
      
      try {
        let operation = null;
        
        if (!await fs.pathExists(targetPath)) {
          operation = {
            type: 'create',
            source: file.fullPath,
            destination: targetPath,
            size: file.size,
            relPath: file.relPath
          };
        } else {
          const destStat = await fs.stat(targetPath);
          if (file.mtime > destStat.mtimeMs) {
            operation = {
              type: 'update',
              source: file.fullPath,
              destination: targetPath,
              size: file.size,
              relPath: file.relPath,
              oldMtime: destStat.mtimeMs,
              newMtime: file.mtime
            };
          }
        }
        
        if (operation) {
          operations.push(operation);
          this.emit('operation-found', operation);
        }
      } catch (error) {
        this.emit('operation-error', {
          file: file.fullPath,
          error: error.message
        });
      }
    }
    
    return operations;
  }
  
  // Pause sync operation
  async pause() {
    if (this.isPaused) return { success: true, message: 'Already paused' };
    
    this.isPaused = true;
    this.pauseTime = Date.now();
    
    // Pause the queue
    this.queue.pause();
    
    // Create pause promise that workers will await
    this.pausePromise = new Promise(resolve => {
      this.pauseResolve = resolve;
    });
    
    // Send pause signal to all workers
    this.workers.forEach(worker => {
      worker.postMessage({ type: 'pause' });
    });
    
    // Get current progress
    const progress = this.getCurrentProgress();
    
    this.emit('sync-paused', { 
      timestamp: this.pauseTime,
      progress,
      processedFiles: this.syncState.processedFiles.size,
      totalFiles: this.syncState.totalFiles
    });
    
    return { success: true, message: 'Sync paused' };
  }
  
  // Resume sync operation
  async resume() {
    if (!this.isPaused) return { success: false, message: 'Not paused' };
    
    this.isPaused = false;
    this.resumeTime = Date.now();
    
    // Resume the queue
    this.queue.start();
    
    // Signal workers to resume
    this.workers.forEach(worker => {
      worker.postMessage({ type: 'resume' });
    });
    
    // Resolve pause promise
    if (this.pauseResolve) {
      this.pauseResolve();
      this.pausePromise = null;
      this.pauseResolve = null;
    }
    
    const progress = this.getCurrentProgress();
    const pauseDuration = this.resumeTime - this.pauseTime;
    
    this.emit('sync-resumed', { 
      timestamp: this.resumeTime,
      progress,
      pauseDuration,
      processedFiles: this.syncState.processedFiles.size,
      totalFiles: this.syncState.totalFiles
    });
    
    return { success: true, message: 'Sync resumed' };
  }
  
  // Get current progress
  getCurrentProgress() {
    if (this.syncState.totalFiles === 0) return 0;
    return Math.round((this.syncState.processedFiles.size / this.syncState.totalFiles) * 100);
  }
  
  // Override abort to handle paused state
  async abort() {
    // If paused, resume first to allow proper cleanup
    if (this.isPaused) {
      await this.resume();
    }
    
    const abortState = {
      timestamp: Date.now(),
      progress: this.getCurrentProgress(),
      processedFiles: Array.from(this.syncState.processedFiles),
      pendingOperations: this.syncState.pendingOperations,
      totalFiles: this.syncState.totalFiles,
      totalBytes: this.syncState.totalBytes
    };
    
    // Save abort state for potential recovery
    this.emit('sync-aborted', abortState);
    
    // Clean up
    await this.cleanup();
  }
  
  // Clean up workers
  async cleanup() {
    // Wait for queue to finish
    await this.queue.onIdle();
    
    // Terminate all workers
    await Promise.all(this.workers.map(worker => worker.terminate()));
    this.workers = [];
    this.workerIndex = 0;
    
    this.emit('cleanup-complete');
  }
  
  // Get performance metrics
  getMetrics() {
    return {
      ...this.metrics,
      duration: this.metrics.endTime - this.metrics.startTime,
      averageSpeed: this.metrics.bytesTransferred / ((this.metrics.endTime - this.metrics.startTime) / 1000),
      workerEfficiency: Object.values(this.metrics.workerStats).map(stats => ({
        filesProcessed: stats.filesProcessed,
        errorRate: stats.errors / (stats.filesProcessed || 1)
      }))
    };
  }
}

// Export for backward compatibility
export function syncFoldersTwoWay(dirA, dirB, options = {}) {
  const manager = new PerformanceSyncManager(options);
  return manager.syncFoldersTwoWay(dirA, dirB, options);
}