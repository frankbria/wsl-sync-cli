// deletion-manager.js - Advanced deletion handling system
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

export class DeletionManager {
  constructor(options = {}) {
    this.options = {
      enableRecycleBin: options.enableRecycleBin || false,
      keepHistory: options.keepHistory || true,
      maxHistoryDays: options.maxHistoryDays || 30,
      confirmDeletions: options.confirmDeletions || true,
      deleteOrphaned: options.deleteOrphaned || false,
      safeModePatterns: options.safeModePatterns || [
        '.git/',
        'node_modules/',
        '*.exe',
        '*.dll',
        'System*',
        'Windows/'
      ],
      ...options
    };
    
    this.historyDir = path.join(os.homedir(), '.wsl-sync', 'deletion-history');
    this.operations = [];
    this.deletedFiles = new Map();
  }

  // Initialize deletion manager
  async initialize() {
    try {
      await fs.ensureDir(this.historyDir);
      await this.loadHistory();
      await this.cleanupOldHistory();
    } catch (error) {
      console.error('Failed to initialize deletion manager:', error);
    }
  }

  // Analyze what would be deleted in a sync operation
  async analyzeDeletions(sourceFiles, destPath) {
    const toDelete = [];
    const toMove = [];
    const conflicts = [];

    try {
      // Get all files in destination
      const destFiles = await this.scanDirectory(destPath);
      
      // Create map of source files for quick lookup
      const sourceMap = new Map();
      sourceFiles.forEach(file => {
        sourceMap.set(file.relPath, file);
      });

      // Find orphaned files in destination
      for (const destFile of destFiles) {
        if (!sourceMap.has(destFile.relPath)) {
          const deletion = {
            type: 'orphaned',
            file: destFile,
            fullPath: destFile.fullPath,
            relPath: destFile.relPath,
            size: destFile.size,
            mtime: destFile.mtime,
            reason: 'File no longer exists in source',
            isSafeToDelete: this.isSafeToDelete(destFile.relPath),
            canRecover: this.options.enableRecycleBin || this.options.keepHistory
          };

          if (this.options.deleteOrphaned) {
            if (deletion.isSafeToDelete) {
              toDelete.push(deletion);
            } else {
              conflicts.push({
                ...deletion,
                conflictType: 'unsafe_deletion',
                recommendation: 'manual_review'
              });
            }
          } else {
            toMove.push(deletion);
          }
        }
      }

    } catch (error) {
      console.error('Error analyzing deletions:', error);
    }

    return {
      toDelete: toDelete.sort((a, b) => a.relPath.localeCompare(b.relPath)),
      toMove: toMove.sort((a, b) => a.relPath.localeCompare(b.relPath)),
      conflicts: conflicts.sort((a, b) => a.relPath.localeCompare(b.relPath)),
      summary: {
        totalOrphaned: toDelete.length + toMove.length + conflicts.length,
        safeToDelete: toDelete.length,
        needsReview: conflicts.length,
        willBePreserved: toMove.length
      }
    };
  }

  // Execute deletion operations
  async executeDeletions(deletions, options = {}) {
    const { 
      dryRun = false, 
      moveToRecycleBin = this.options.enableRecycleBin,
      createBackup = this.options.keepHistory 
    } = options;

    const results = {
      deleted: [],
      moved: [],
      failed: [],
      backed_up: []
    };

    this.operations = []; // Reset operations log

    for (const deletion of deletions) {
      try {
        const operation = {
          id: this.generateOperationId(),
          timestamp: new Date().toISOString(),
          type: 'deletion',
          file: deletion.relPath,
          fullPath: deletion.fullPath,
          size: deletion.size,
          reason: deletion.reason,
          method: null,
          success: false,
          error: null,
          recoverable: false
        };

        if (dryRun) {
          operation.method = 'dry_run';
          operation.success = true;
          results.deleted.push(deletion);
        } else {
          // Check if file still exists
          if (!await fs.pathExists(deletion.fullPath)) {
            operation.error = 'File no longer exists';
            results.failed.push({ ...deletion, error: operation.error });
            continue;
          }

          // Create backup if enabled
          if (createBackup) {
            try {
              await this.createBackup(deletion);
              operation.recoverable = true;
              results.backed_up.push(deletion);
            } catch (backupError) {
              console.warn('Failed to create backup:', backupError);
            }
          }

          // Execute deletion
          if (moveToRecycleBin && this.canMoveToRecycleBin()) {
            try {
              await this.moveToRecycleBin(deletion.fullPath);
              operation.method = 'recycle_bin';
              operation.success = true;
              operation.recoverable = true;
              results.moved.push(deletion);
            } catch (error) {
              // Fallback to regular deletion
              await fs.remove(deletion.fullPath);
              operation.method = 'permanent';
              operation.success = true;
              results.deleted.push(deletion);
            }
          } else {
            await fs.remove(deletion.fullPath);
            operation.method = 'permanent';
            operation.success = true;
            results.deleted.push(deletion);
          }
        }

        this.operations.push(operation);

      } catch (error) {
        const operation = {
          id: this.generateOperationId(),
          timestamp: new Date().toISOString(),
          type: 'deletion',
          file: deletion.relPath,
          fullPath: deletion.fullPath,
          method: 'failed',
          success: false,
          error: error.message,
          recoverable: false
        };

        this.operations.push(operation);
        results.failed.push({ ...deletion, error: error.message });
      }
    }

    // Save operation history
    if (!dryRun && this.options.keepHistory) {
      await this.saveOperationHistory();
    }

    return results;
  }

  // Create backup of file before deletion
  async createBackup(deletion) {
    const backupDir = path.join(
      this.historyDir, 
      new Date().toISOString().split('T')[0]
    );
    
    await fs.ensureDir(backupDir);
    
    const backupPath = path.join(backupDir, `${Date.now()}-${path.basename(deletion.relPath)}`);
    const metadataPath = backupPath + '.meta.json';
    
    // Copy file to backup location
    await fs.copy(deletion.fullPath, backupPath);
    
    // Save metadata
    const metadata = {
      originalPath: deletion.fullPath,
      relPath: deletion.relPath,
      size: deletion.size,
      mtime: deletion.mtime,
      backupTime: new Date().toISOString(),
      reason: deletion.reason
    };
    
    await fs.writeJson(metadataPath, metadata, { spaces: 2 });
    
    this.deletedFiles.set(deletion.relPath, {
      backupPath,
      metadata,
      canRestore: true
    });
  }

  // Move file to recycle bin (Windows only, or simulated on other platforms)
  async moveToRecycleBin(filePath) {
    // For non-Windows platforms, we'll simulate the recycle bin with a special folder
    const recycleBinDir = path.join(os.homedir(), '.wsl-sync', 'recycle-bin');
    await fs.ensureDir(recycleBinDir);
    
    const fileName = `${Date.now()}-${path.basename(filePath)}`;
    const recycleBinPath = path.join(recycleBinDir, fileName);
    
    if (process.platform === 'win32') {
      // Note: In a full implementation, you'd use a native module like 'trash'
      // For now, we use the simulated recycle bin even on Windows
      await fs.move(filePath, recycleBinPath);
    } else {
      // Simulate recycle bin on non-Windows platforms
      await fs.move(filePath, recycleBinPath);
    }
  }

  // Check if recycle bin is available
  canMoveToRecycleBin() {
    return process.platform === 'win32';
  }

  // Check if a file is safe to delete
  isSafeToDelete(relPath) {
    // Check against safe mode patterns
    for (const pattern of this.options.safeModePatterns) {
      if (this.matchesPattern(relPath, pattern)) {
        return false;
      }
    }

    // Additional safety checks
    const lowerPath = relPath.toLowerCase();
    
    // System directories
    if (lowerPath.includes('system32') || 
        lowerPath.includes('program files') ||
        lowerPath.includes('windows') ||
        lowerPath.startsWith('c:\\windows')) {
      return false;
    }

    // Critical files
    const criticalExtensions = ['.sys', '.dll', '.exe'];
    const ext = path.extname(lowerPath);
    if (criticalExtensions.includes(ext) && lowerPath.includes('system')) {
      return false;
    }

    return true;
  }

  // Pattern matching helper
  matchesPattern(filePath, pattern) {
    if (pattern.endsWith('/')) {
      return filePath.includes(pattern) || filePath.startsWith(pattern.slice(0, -1));
    }
    
    if (pattern.includes('*')) {
      const regex = new RegExp(
        pattern.replace(/\*/g, '.*').replace(/\?/g, '.'),
        'i'
      );
      return regex.test(filePath);
    }
    
    return filePath.includes(pattern);
  }

  // Restore a deleted file from backup
  async restoreFile(relPath, targetPath = null) {
    const backup = this.deletedFiles.get(relPath);
    if (!backup || !backup.canRestore) {
      throw new Error(`No restorable backup found for ${relPath}`);
    }

    const restorePath = targetPath || backup.metadata.originalPath;
    
    // Ensure target directory exists
    await fs.ensureDir(path.dirname(restorePath));
    
    // Copy file back
    await fs.copy(backup.backupPath, restorePath);
    
    // Restore original modification time
    if (backup.metadata.mtime) {
      await fs.utimes(restorePath, new Date(), new Date(backup.metadata.mtime));
    }

    return {
      restored: true,
      originalPath: backup.metadata.originalPath,
      restorePath,
      size: backup.metadata.size
    };
  }

  // Get list of files that can be restored
  getRestorableFiles() {
    return Array.from(this.deletedFiles.entries()).map(([relPath, backup]) => ({
      relPath,
      originalPath: backup.metadata.originalPath,
      size: backup.metadata.size,
      deletedAt: backup.metadata.backupTime,
      reason: backup.metadata.reason,
      canRestore: backup.canRestore
    }));
  }

  // Undo last deletion operation
  async undoLastOperation() {
    const lastOp = this.operations[this.operations.length - 1];
    if (!lastOp || !lastOp.success || !lastOp.recoverable) {
      throw new Error('No recoverable operation to undo');
    }

    return await this.restoreFile(lastOp.file);
  }

  // Get operation history
  getOperationHistory(days = 7) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    return this.operations.filter(op => 
      new Date(op.timestamp) >= cutoff
    ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  // Scan directory for files
  async scanDirectory(dirPath) {
    const files = [];
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const relPath = path.relative(dirPath, fullPath);
        
        if (entry.isFile()) {
          const stats = await fs.stat(fullPath);
          files.push({
            fullPath,
            relPath,
            name: entry.name,
            size: stats.size,
            mtime: stats.mtimeMs,
            isDirectory: false
          });
        } else if (entry.isDirectory()) {
          const subFiles = await this.scanDirectory(fullPath);
          files.push(...subFiles);
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dirPath}:`, error);
    }
    
    return files;
  }

  // Load deletion history from disk
  async loadHistory() {
    try {
      const historyFile = path.join(this.historyDir, 'operations.json');
      if (await fs.pathExists(historyFile)) {
        const data = await fs.readJson(historyFile);
        this.operations = data.operations || [];
        
        // Load backup metadata
        for (const op of this.operations) {
          if (op.recoverable && op.success) {
            const metadataPath = path.join(
              this.historyDir,
              op.timestamp.split('T')[0],
              `${op.timestamp}-${path.basename(op.file)}.meta.json`
            );
            
            if (await fs.pathExists(metadataPath)) {
              const metadata = await fs.readJson(metadataPath);
              const backupPath = metadataPath.replace('.meta.json', '');
              
              this.deletedFiles.set(op.file, {
                backupPath,
                metadata,
                canRestore: await fs.pathExists(backupPath)
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to load deletion history:', error);
    }
  }

  // Save operation history to disk
  async saveOperationHistory() {
    try {
      const historyFile = path.join(this.historyDir, 'operations.json');
      const data = {
        version: '1.0',
        lastUpdated: new Date().toISOString(),
        operations: this.operations
      };
      
      await fs.writeJson(historyFile, data, { spaces: 2 });
    } catch (error) {
      console.error('Failed to save operation history:', error);
    }
  }

  // Clean up old history files
  async cleanupOldHistory() {
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - this.options.maxHistoryDays);
      
      const entries = await fs.readdir(this.historyDir);
      
      for (const entry of entries) {
        if (entry.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const entryDate = new Date(entry);
          if (entryDate < cutoff) {
            const entryPath = path.join(this.historyDir, entry);
            await fs.remove(entryPath);
          }
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old history:', error);
    }
  }

  // Generate unique operation ID
  generateOperationId() {
    return `del_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get statistics
  getStats() {
    const totalOps = this.operations.length;
    const successful = this.operations.filter(op => op.success).length;
    const recoverable = this.operations.filter(op => op.recoverable).length;
    
    return {
      totalOperations: totalOps,
      successfulDeletions: successful,
      recoverableFiles: recoverable,
      availableBackups: this.deletedFiles.size,
      successRate: totalOps > 0 ? (successful / totalOps * 100).toFixed(1) : '0'
    };
  }
}

export default DeletionManager;