// sync/sync-enhanced.js
import fs from 'fs-extra';
import path from 'path';
import ignore from 'ignore';
import { EventEmitter } from 'events';
import { SyncIgnore } from './syncignore.js';

export class SyncManager extends EventEmitter {
  constructor() {
    super();
    this.stats = {
      totalFiles: 0,
      processedFiles: 0,
      copiedFiles: 0,
      skippedFiles: 0,
      errors: [],
      startTime: null,
      endTime: null
    };
    this.syncIgnore = new SyncIgnore();
  }

  // Path validation functions
  validateWindowsPath(pathStr) {
    if (!pathStr || typeof pathStr !== 'string') {
      throw new Error('Path must be a non-empty string');
    }

    // Check for Windows drive letter format
    const windowsPathRegex = /^[a-zA-Z]:\\|^\\\\|^[a-zA-Z]:\//;
    if (!windowsPathRegex.test(pathStr)) {
      throw new Error(`Invalid Windows path format: ${pathStr}`);
    }

    // Check if path exists - if not, try to create it
    if (!fs.existsSync(pathStr)) {
      try {
        fs.mkdirSync(pathStr, { recursive: true });
        console.log(`Created directory: ${pathStr}`);
      } catch (err) {
        throw new Error(`Windows path does not exist and cannot be created: ${pathStr} - ${err.message}`);
      }
    }

    // Check if it's a directory
    const stats = fs.statSync(pathStr);
    if (!stats.isDirectory()) {
      throw new Error(`Windows path is not a directory: ${pathStr}`);
    }

    // Check read permissions
    try {
      fs.accessSync(pathStr, fs.constants.R_OK);
    } catch (err) {
      throw new Error(`No read permission for Windows path: ${pathStr}`);
    }

    return true;
  }

  validateWSLPath(pathStr) {
    if (!pathStr || typeof pathStr !== 'string') {
      throw new Error('Path must be a non-empty string');
    }

    // Check for Unix path format
    if (!pathStr.startsWith('/')) {
      throw new Error(`Invalid WSL path format (must start with /): ${pathStr}`);
    }

    // Try to validate if it's accessible
    try {
      // Only validate mounted Windows drive paths
      if (pathStr.startsWith('/mnt/')) {
        // Convert WSL path to Windows path for validation
        const windowsPath = this.wslToWindowsPath(pathStr);
        
        if (!fs.existsSync(windowsPath)) {
          // Try to create the directory
          try {
            fs.mkdirSync(windowsPath, { recursive: true });
            console.log(`Created directory via WSL path: ${pathStr} -> ${windowsPath}`);
          } catch (createErr) {
            throw new Error(`WSL path does not exist and cannot be created: ${pathStr}`);
          }
        }

        const stats = fs.statSync(windowsPath);
        if (!stats.isDirectory()) {
          throw new Error(`WSL path is not a directory: ${pathStr}`);
        }

        // Check read permissions
        fs.accessSync(windowsPath, fs.constants.R_OK);
      }
      // For native WSL paths (like /tmp, /home), we'll assume they're valid
      // since we can't easily check them from Windows
      // Just log a warning
      else {
        console.warn(`Cannot validate native WSL path from Windows: ${pathStr}. Assuming it's valid.`);
      }
    } catch (err) {
      if (err.message.includes('WSL path')) {
        throw err; // Re-throw our custom errors
      }
      throw new Error(`Cannot access WSL path: ${pathStr} - ${err.message}`);
    }

    return true;
  }

  // Convert WSL path to Windows path
  wslToWindowsPath(wslPath) {
    // Handle different WSL path formats
    // /mnt/c/... -> C:/...
    // /home/user/... -> \\wsl$\Ubuntu\home\user\...
    
    if (wslPath.startsWith('/mnt/')) {
      const parts = wslPath.split('/');
      if (parts.length >= 3) {
        const driveLetter = parts[2].toUpperCase();
        const remainingPath = parts.slice(3).join('\\');
        return `${driveLetter}:\\${remainingPath}`;
      }
    }
    
    // For paths not in /mnt/, assume WSL filesystem
    // This assumes default WSL distro - could be enhanced to detect distro
    return `\\\\wsl$\\Ubuntu${wslPath.replace(/\//g, '\\')}`;
  }

  // Convert Windows path to WSL path
  windowsToWSLPath(windowsPath) {
    // C:\... -> /mnt/c/...
    const match = windowsPath.match(/^([a-zA-Z]):[\\\/]/);
    if (match) {
      const driveLetter = match[1].toLowerCase();
      const remainingPath = windowsPath.substring(3).replace(/\\/g, '/');
      return `/mnt/${driveLetter}/${remainingPath}`;
    }
    
    // UNC path \\wsl$\... -> extract path
    if (windowsPath.startsWith('\\\\wsl$\\')) {
      const parts = windowsPath.split('\\');
      // Remove \\wsl$ and distro name
      return '/' + parts.slice(4).join('/');
    }
    
    throw new Error(`Cannot convert Windows path to WSL format: ${windowsPath}`);
  }

  loadIgnorePatterns(rootPath) {
    const ignoreFile = path.join(rootPath, '.syncignore');
    if (fs.existsSync(ignoreFile)) {
      try {
        const patterns = fs.readFileSync(ignoreFile, 'utf-8')
          .split('\n')
          .filter(line => line.trim() && !line.startsWith('#'));
        return ignore().add(patterns);
      } catch (err) {
        this.emit('warning', `Failed to load .syncignore: ${err.message}`);
        return ignore();
      }
    }
    return ignore();
  }

  async walkDir(dir, base, ig, fileList = []) {
    try {
      const entries = await fs.readdir(dir);
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        
        // Normalize both paths before calculating relative path
        const normalizedBase = path.resolve(base);
        const normalizedFull = path.resolve(fullPath);
        const relPath = path.relative(normalizedBase, normalizedFull);
        
        // Skip files outside the base directory
        if (relPath.startsWith('..') || path.isAbsolute(relPath)) {
          console.warn(`Skipping file outside sync scope: ${fullPath}`);
          continue;
        }
        
        // Check both ignore patterns and syncignore patterns
        if (ig.ignores(relPath) || this.syncIgnore.shouldIgnore(relPath, false)) {
          this.stats.skippedFiles++;
          continue;
        }
        
        try {
          const stats = await fs.stat(fullPath);
          const isDirectory = stats.isDirectory();
          
          // Check directory patterns
          if (isDirectory && this.syncIgnore.shouldIgnore(relPath, true)) {
            this.stats.skippedFiles++;
            continue;
          }
          
          if (isDirectory) {
            await this.walkDir(fullPath, base, ig, fileList);
          } else {
            fileList.push({ 
              fullPath: normalizedFull, 
              relPath, 
              mtime: stats.mtimeMs,
              size: stats.size 
            });
          }
        } catch (err) {
          this.stats.errors.push({
            file: fullPath,
            error: err.message
          });
          // Only emit error if there are listeners to prevent unhandled error
          if (this.listenerCount('error') > 0) {
            this.emit('error', { file: fullPath, error: err.message });
          }
        }
      }
    } catch (err) {
      this.stats.errors.push({
        directory: dir,
        error: err.message
      });
      // Only emit error if there are listeners to prevent unhandled error
      if (this.listenerCount('error') > 0) {
        this.emit('error', { directory: dir, error: err.message });
      }
      // Don't throw the error, just log it and return empty list
      console.error(`Error reading directory ${dir}:`, err.message);
    }
    
    return fileList;
  }

  async loadSyncIgnorePatterns(dirA, dirB, profilePatterns = null) {
    const patterns = [];
    
    // Load from profile if provided
    if (profilePatterns) {
      this.syncIgnore.loadFromJSON(profilePatterns);
      console.log('Loaded syncignore patterns from profile');
    }
    
    // Check for .syncignore files in both directories
    try {
      const syncIgnoreA = path.join(dirA, '.syncignore');
      const patternsA = await this.syncIgnore.loadFromFile(syncIgnoreA);
      patterns.push(...patternsA);
      console.log(`Loaded .syncignore from ${dirA}`);
    } catch (err) {
      // File doesn't exist or error reading
    }
    
    try {
      const syncIgnoreB = path.join(dirB, '.syncignore');
      const patternsB = await this.syncIgnore.loadFromFile(syncIgnoreB);
      patterns.push(...patternsB);
      console.log(`Loaded .syncignore from ${dirB}`);
    } catch (err) {
      // File doesn't exist or error reading
    }
    
    // Merge all patterns
    this.syncIgnore.mergePatterns(patterns);
  }

  async syncOneWay(src, dest, ig, direction = 'forward', dryRun = false) {
    this.emit('scan-start', { source: src, destination: dest });
    
    const files = await this.walkDir(src, src, ig);
    this.stats.totalFiles += files.length;
    
    this.emit('scan-complete', { 
      fileCount: files.length,
      direction 
    });

    const operations = [];
    
    for (const file of files) {
      const targetPath = path.join(dest, file.relPath);
      let operation = null;
      
      try {
        if (!fs.existsSync(targetPath)) {
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
          
          if (!dryRun) {
            await fs.ensureDir(path.dirname(targetPath));
            await fs.copyFile(file.fullPath, targetPath);
            
            // Preserve modification time
            await fs.utimes(targetPath, new Date(), new Date(file.mtime));
            
            this.stats.copiedFiles++;
          }
          
          this.emit('file-synced', operation);
        }
        
        this.stats.processedFiles++;
        this.emit('progress', {
          current: this.stats.processedFiles,
          total: this.stats.totalFiles,
          percentage: Math.round((this.stats.processedFiles / this.stats.totalFiles) * 100)
        });
        
      } catch (err) {
        this.stats.errors.push({
          file: file.fullPath,
          target: targetPath,
          error: err.message
        });
        this.emit('error', { 
          file: file.fullPath, 
          target: targetPath,
          error: err.message 
        });
      }
    }
    
    return operations;
  }

  async syncFoldersTwoWay(dirA, dirB, options = {}) {
    const { dryRun = false, conflictResolution = 'newer', syncIgnorePatterns = null, writeSyncIgnore = false } = options;
    
    // Reset stats
    this.stats = {
      totalFiles: 0,
      processedFiles: 0,
      copiedFiles: 0,
      skippedFiles: 0,
      errors: [],
      startTime: Date.now(),
      endTime: null
    };

    try {
      // Load syncignore patterns
      await this.loadSyncIgnorePatterns(dirA, dirB, syncIgnorePatterns);
      
      // Validate paths based on their type
      const dirAIsWindows = /^[a-zA-Z]:\\|^\\\\/.test(dirA);
      const dirBIsWindows = /^[a-zA-Z]:\\|^\\\\/.test(dirB);
      
      if (dirAIsWindows) {
        this.validateWindowsPath(dirA);
      } else {
        this.validateWSLPath(dirA);
      }
      
      if (dirBIsWindows) {
        this.validateWindowsPath(dirB);
      } else {
        this.validateWSLPath(dirB);
      }

      this.emit('sync-start', { 
        sourceA: dirA, 
        sourceB: dirB,
        dryRun 
      });

      // Load ignore patterns
      const igA = this.loadIgnorePatterns(dirA);
      const igB = this.loadIgnorePatterns(dirB);

      // Detect conflicts if needed
      if (conflictResolution !== 'newer') {
        const conflicts = await this.detectConflicts(dirA, dirB, igA, igB);
        if (conflicts.length > 0) {
          this.emit('conflicts-detected', conflicts);
          // In a real implementation, we'd handle conflict resolution here
        }
      }

      // Perform two-way sync
      const operationsAtoB = await this.syncOneWay(dirA, dirB, igA, 'AtoB', dryRun);
      const operationsBtoA = await this.syncOneWay(dirB, dirA, igB, 'BtoA', dryRun);

      this.stats.endTime = Date.now();
      
      const summary = {
        duration: this.stats.endTime - this.stats.startTime,
        totalFiles: this.stats.totalFiles,
        processedFiles: this.stats.processedFiles,
        copiedFiles: this.stats.copiedFiles,
        skippedFiles: this.stats.skippedFiles,
        errors: this.stats.errors,
        operations: {
          AtoB: operationsAtoB,
          BtoA: operationsBtoA
        }
      };

      // Write .syncignore files if requested
      if (writeSyncIgnore && syncIgnorePatterns && !dryRun) {
        try {
          const syncIgnorePathA = path.join(dirA, '.syncignore');
          const syncIgnorePathB = path.join(dirB, '.syncignore');
          
          // Generate content from profile patterns
          const content = this.syncIgnore.generateFileContent();
          
          // Write to both directories
          await fs.writeFile(syncIgnorePathA, content, 'utf8');
          await fs.writeFile(syncIgnorePathB, content, 'utf8');
          
          console.log('Wrote .syncignore files to both directories');
          this.emit('info', { message: 'Created .syncignore files in both directories' });
        } catch (err) {
          console.error('Failed to write .syncignore files:', err);
          this.emit('warning', { message: 'Failed to write .syncignore files: ' + err.message });
        }
      }

      this.emit('sync-complete', summary);
      
      return summary;
      
    } catch (err) {
      this.emit('sync-error', err);
      throw err;
    }
  }

  async detectConflicts(dirA, dirB, igA, igB) {
    const filesA = await this.walkDir(dirA, dirA, igA);
    const filesB = await this.walkDir(dirB, dirB, igB);
    
    const conflicts = [];
    const fileMapB = new Map(filesB.map(f => [f.relPath, f]));
    
    for (const fileA of filesA) {
      const fileB = fileMapB.get(fileA.relPath);
      if (fileB) {
        // Both files exist and have been modified
        if (Math.abs(fileA.mtime - fileB.mtime) > 1000) { // 1 second tolerance
          conflicts.push({
            path: fileA.relPath,
            fileA: {
              path: fileA.fullPath,
              mtime: fileA.mtime,
              size: fileA.size
            },
            fileB: {
              path: fileB.fullPath,
              mtime: fileB.mtime,
              size: fileB.size
            }
          });
        }
      }
    }
    
    return conflicts;
  }
}

// Export individual functions for backward compatibility
export function syncFoldersTwoWay(dirA, dirB, options = {}) {
  const manager = new SyncManager();
  return manager.syncFoldersTwoWay(dirA, dirB, options);
}

export function loadIgnorePatterns(rootPath) {
  const manager = new SyncManager();
  return manager.loadIgnorePatterns(rootPath);
}

export function walkDir(dir, base, ig, fileList = []) {
  const manager = new SyncManager();
  return manager.walkDir(dir, base, ig, fileList);
}

export function syncOneWay(src, dest, ig) {
  const manager = new SyncManager();
  return manager.syncOneWay(src, dest, ig);
}