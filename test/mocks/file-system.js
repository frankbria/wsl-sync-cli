import { Volume, createFsFromVolume } from 'memfs';
import path from 'path';

export class MockFileSystem {
  constructor() {
    this.vol = new Volume();
    this.fs = createFsFromVolume(this.vol);
    this.files = new Map();
  }
  
  // Create a file with content
  createFile(filePath, content = '', options = {}) {
    const { mtime = new Date(), mode = 0o644 } = options;
    
    // Ensure parent directory exists
    const dir = path.dirname(filePath);
    this.fs.mkdirSync(dir, { recursive: true });
    
    // Write file
    this.fs.writeFileSync(filePath, content);
    
    // Set metadata
    this.fs.utimesSync(filePath, mtime, mtime);
    if (mode) {
      this.fs.chmodSync(filePath, mode);
    }
    
    // Track file
    this.files.set(filePath, {
      content,
      mtime,
      mode,
      size: Buffer.byteLength(content)
    });
    
    return filePath;
  }
  
  // Create a directory
  createDirectory(dirPath, options = {}) {
    const { mode = 0o755 } = options;
    
    this.fs.mkdirSync(dirPath, { recursive: true });
    
    if (mode) {
      this.fs.chmodSync(dirPath, mode);
    }
    
    return dirPath;
  }
  
  // Create a file structure
  createStructure(structure, basePath = '/') {
    Object.entries(structure).forEach(([name, value]) => {
      const fullPath = path.join(basePath, name);
      
      if (typeof value === 'string') {
        // It's a file
        this.createFile(fullPath, value);
      } else if (typeof value === 'object' && value !== null) {
        if (value._content !== undefined) {
          // File with metadata
          this.createFile(fullPath, value._content, {
            mtime: value._mtime,
            mode: value._mode
          });
        } else {
          // It's a directory
          this.createDirectory(fullPath);
          this.createStructure(value, fullPath);
        }
      }
    });
  }
  
  // Get file stats
  getStats(filePath) {
    try {
      return this.fs.statSync(filePath);
    } catch {
      return null;
    }
  }
  
  // Read file content
  readFile(filePath, encoding = 'utf8') {
    try {
      return this.fs.readFileSync(filePath, encoding);
    } catch {
      return null;
    }
  }
  
  // List directory contents
  listDirectory(dirPath) {
    try {
      return this.fs.readdirSync(dirPath);
    } catch {
      return [];
    }
  }
  
  // Check if path exists
  exists(filePath) {
    try {
      this.fs.accessSync(filePath);
      return true;
    } catch {
      return false;
    }
  }
  
  // Delete file or directory
  remove(filePath) {
    try {
      const stats = this.fs.statSync(filePath);
      if (stats.isDirectory()) {
        this.fs.rmSync(filePath, { recursive: true });
      } else {
        this.fs.unlinkSync(filePath);
      }
      this.files.delete(filePath);
      return true;
    } catch {
      return false;
    }
  }
  
  // Get all files recursively
  getAllFiles(dirPath = '/', files = []) {
    try {
      const items = this.fs.readdirSync(dirPath);
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stats = this.fs.statSync(fullPath);
        
        if (stats.isDirectory()) {
          this.getAllFiles(fullPath, files);
        } else {
          files.push({
            path: fullPath,
            size: stats.size,
            mtime: stats.mtime,
            mode: stats.mode
          });
        }
      }
    } catch {
      // Ignore errors
    }
    
    return files;
  }
  
  // Clear all files
  clear() {
    this.vol = new Volume();
    this.fs = createFsFromVolume(this.vol);
    this.files.clear();
  }
  
  // Get file system for mocking
  getFs() {
    return this.fs;
  }
}

// Create test file structures
export const createTestStructure = () => {
  const fs = new MockFileSystem();
  
  // Source directory structure
  fs.createStructure({
    'source': {
      'documents': {
        'file1.txt': 'Content of file 1',
        'file2.txt': 'Content of file 2',
        'report.pdf': 'PDF content'
      },
      'images': {
        'photo1.jpg': 'JPEG data',
        'photo2.png': 'PNG data'
      },
      'code': {
        'index.js': 'console.log("Hello");',
        'utils.js': 'export function test() {}',
        'node_modules': {
          'package1': {
            'index.js': 'module content'
          }
        }
      },
      '.hidden': 'Hidden file content',
      '.syncignore': '*.tmp\nnode_modules/\n.git/'
    }
  });
  
  // Destination directory structure (partial)
  fs.createStructure({
    'destination': {
      'documents': {
        'file1.txt': 'Old content of file 1',
        'file3.txt': 'File only in destination'
      },
      'backup': {
        'old.txt': 'Old backup'
      }
    }
  });
  
  return fs;
};

// Create conflict test structure
export const createConflictStructure = () => {
  const fs = new MockFileSystem();
  const now = new Date();
  const past = new Date(now.getTime() - 86400000); // 1 day ago
  const future = new Date(now.getTime() + 86400000); // 1 day future
  
  fs.createFile('/source/conflict.txt', 'Source version', { mtime: now });
  fs.createFile('/destination/conflict.txt', 'Destination version', { mtime: future });
  
  fs.createFile('/source/older.txt', 'Source older', { mtime: past });
  fs.createFile('/destination/older.txt', 'Destination newer', { mtime: now });
  
  return fs;
};

// Create permission test structure
export const createPermissionStructure = () => {
  const fs = new MockFileSystem();
  
  fs.createFile('/source/readable.txt', 'Can read', { mode: 0o644 });
  fs.createFile('/source/readonly.txt', 'Read only', { mode: 0o444 });
  fs.createFile('/source/noread.txt', 'Cannot read', { mode: 0o000 });
  
  fs.createDirectory('/source/restricted', { mode: 0o700 });
  fs.createFile('/source/restricted/secret.txt', 'Secret content');
  
  return fs;
};

export default MockFileSystem;