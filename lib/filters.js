// filters.js - Advanced file filtering system
import ignore from 'ignore';
import path from 'path';

export class FilterManager {
  constructor(options = {}) {
    this.patterns = {
      ignore: [],
      include: [],
      extensions: [],
      sizeMin: null,
      sizeMax: null,
      dateAfter: null,
      dateBefore: null,
      namePatterns: []
    };
    
    // Predefined filter sets
    this.presets = {
      webDevelopment: {
        ignore: [
          'node_modules/',
          '.git/',
          'dist/',
          'build/',
          '.cache/',
          '*.log',
          '.env*',
          'coverage/',
          '.nyc_output/',
          '*.tmp',
          '*.temp',
          '.DS_Store',
          'Thumbs.db'
        ],
        include: [],
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.vue', '.css', '.scss', '.html', '.json', '.md']
      },
      
      pythonProject: {
        ignore: [
          '__pycache__/',
          '*.pyc',
          '*.pyo',
          '*.pyd',
          '.pytest_cache/',
          '.venv/',
          'venv/',
          '.git/',
          '*.log',
          '.env*',
          'dist/',
          'build/',
          '*.egg-info/'
        ],
        include: [],
        extensions: ['.py', '.pyx', '.pyi', '.txt', '.md', '.yml', '.yaml', '.json', '.cfg', '.ini']
      },
      
      documents: {
        ignore: [
          '.git/',
          '*.tmp',
          '*.temp',
          '.DS_Store',
          'Thumbs.db',
          '~$*'
        ],
        include: [],
        extensions: [
          '.doc', '.docx', '.pdf', '.txt', '.md', '.rtf',
          '.xls', '.xlsx', '.ppt', '.pptx',
          '.jpg', '.png', '.gif', '.svg', '.bmp',
          '.mp4', '.avi', '.mov', '.mp3', '.wav'
        ]
      },
      
      sourceCode: {
        ignore: [
          '.git/',
          'node_modules/',
          '__pycache__/',
          '*.pyc',
          'dist/',
          'build/',
          '.cache/',
          '*.log',
          '*.tmp',
          '.env*'
        ],
        include: [],
        extensions: [
          '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.h',
          '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala',
          '.html', '.css', '.scss', '.less', '.vue', '.json', '.xml', '.yml'
        ]
      },
      
      mediaFiles: {
        ignore: [
          '.git/',
          '*.tmp',
          '*.temp',
          '.DS_Store',
          'Thumbs.db'
        ],
        include: [],
        extensions: [
          '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp',
          '.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm',
          '.mp3', '.wav', '.aac', '.flac', '.ogg', '.m4a',
          '.psd', '.ai', '.eps', '.pdf'
        ]
      }
    };
  }

  // Apply a preset filter configuration
  applyPreset(presetName) {
    if (!this.presets[presetName]) {
      throw new Error(`Preset '${presetName}' not found`);
    }

    const preset = this.presets[presetName];
    this.patterns.ignore = [...preset.ignore];
    this.patterns.include = [...preset.include];
    this.patterns.extensions = [...preset.extensions];
    
    return this;
  }

  // Set ignore patterns
  setIgnorePatterns(patterns) {
    this.patterns.ignore = Array.isArray(patterns) ? patterns : [patterns];
    return this;
  }

  // Add ignore patterns
  addIgnorePatterns(patterns) {
    const newPatterns = Array.isArray(patterns) ? patterns : [patterns];
    this.patterns.ignore.push(...newPatterns);
    return this;
  }

  // Set include patterns (only sync files matching these)
  setIncludePatterns(patterns) {
    this.patterns.include = Array.isArray(patterns) ? patterns : [patterns];
    return this;
  }

  // Add include patterns
  addIncludePatterns(patterns) {
    const newPatterns = Array.isArray(patterns) ? patterns : [patterns];
    this.patterns.include.push(...newPatterns);
    return this;
  }

  // Set file extensions filter
  setExtensions(extensions) {
    this.patterns.extensions = Array.isArray(extensions) ? extensions : [extensions];
    return this;
  }

  // Add file extensions
  addExtensions(extensions) {
    const newExtensions = Array.isArray(extensions) ? extensions : [extensions];
    this.patterns.extensions.push(...newExtensions);
    return this;
  }

  // Set size filters (in bytes)
  setSizeFilter(min = null, max = null) {
    this.patterns.sizeMin = min;
    this.patterns.sizeMax = max;
    return this;
  }

  // Set date filters
  setDateFilter(after = null, before = null) {
    this.patterns.dateAfter = after ? new Date(after) : null;
    this.patterns.dateBefore = before ? new Date(before) : null;
    return this;
  }

  // Set name patterns (regex or glob)
  setNamePatterns(patterns) {
    this.patterns.namePatterns = Array.isArray(patterns) ? patterns : [patterns];
    return this;
  }

  // Create ignore instance for use with sync
  createIgnoreFilter() {
    const ig = ignore();
    
    if (this.patterns.ignore.length > 0) {
      ig.add(this.patterns.ignore);
    }

    return ig;
  }

  // Test if a file should be included based on all filters
  shouldIncludeFile(file) {
    const { name, size, mtime, relPath, isDirectory } = file;
    
    // Skip directories for content-based filters
    if (isDirectory) {
      return this.shouldIncludeDirectory(file);
    }

    // Check ignore patterns
    if (this.patterns.ignore.length > 0) {
      const ig = this.createIgnoreFilter();
      if (ig.ignores(relPath)) {
        return false;
      }
    }

    // Check include patterns (if specified, file must match at least one)
    if (this.patterns.include.length > 0) {
      const matchesInclude = this.patterns.include.some(pattern => {
        if (pattern.startsWith('*')) {
          // Handle glob patterns
          return relPath.includes(pattern.slice(1)) || name.includes(pattern.slice(1));
        } else if (pattern.includes('*')) {
          // Handle glob patterns with wildcards
          const regex = this.globToRegex(pattern);
          return regex.test(relPath) || regex.test(name);
        } else {
          // Exact pattern match
          return relPath.includes(pattern) || name.includes(pattern);
        }
      });
      
      if (!matchesInclude) {
        return false;
      }
    }

    // Check file extensions
    if (this.patterns.extensions.length > 0) {
      const ext = path.extname(name).toLowerCase();
      if (!this.patterns.extensions.includes(ext)) {
        return false;
      }
    }

    // Check file size
    if (this.patterns.sizeMin !== null && size < this.patterns.sizeMin) {
      return false;
    }
    if (this.patterns.sizeMax !== null && size > this.patterns.sizeMax) {
      return false;
    }

    // Check modification date
    if (this.patterns.dateAfter !== null) {
      const fileDate = new Date(mtime);
      if (fileDate < this.patterns.dateAfter) {
        return false;
      }
    }
    if (this.patterns.dateBefore !== null) {
      const fileDate = new Date(mtime);
      if (fileDate > this.patterns.dateBefore) {
        return false;
      }
    }

    // Check name patterns
    if (this.patterns.namePatterns.length > 0) {
      const matchesPattern = this.patterns.namePatterns.some(pattern => {
        if (pattern instanceof RegExp) {
          return pattern.test(name);
        } else {
          // Treat as glob pattern
          const globRegex = this.globToRegex(pattern);
          return globRegex.test(name);
        }
      });
      
      if (!matchesPattern) {
        return false;
      }
    }

    return true;
  }

  // Test if a directory should be included
  shouldIncludeDirectory(directory) {
    const { relPath } = directory;
    
    // Check ignore patterns for directories
    if (this.patterns.ignore.length > 0) {
      const ig = this.createIgnoreFilter();
      if (ig.ignores(relPath)) {
        return false;
      }
    }

    return true;
  }

  // Filter an array of files
  filterFiles(files) {
    return files.filter(file => this.shouldIncludeFile(file));
  }

  // Convert glob pattern to regex
  globToRegex(glob) {
    const escapedGlob = glob
      .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars except * and ?
      .replace(/\*/g, '.*') // Convert * to .*
      .replace(/\?/g, '.'); // Convert ? to .
    
    return new RegExp(`^${escapedGlob}$`, 'i');
  }

  // Get filter summary
  getSummary() {
    return {
      ignorePatterns: this.patterns.ignore.length,
      includePatterns: this.patterns.include.length,
      extensions: this.patterns.extensions.length,
      hasSizeFilter: this.patterns.sizeMin !== null || this.patterns.sizeMax !== null,
      hasDateFilter: this.patterns.dateAfter !== null || this.patterns.dateBefore !== null,
      namePatterns: this.patterns.namePatterns.length,
      totalFilters: this.patterns.ignore.length + 
                   this.patterns.include.length + 
                   this.patterns.extensions.length + 
                   this.patterns.namePatterns.length +
                   (this.patterns.sizeMin !== null ? 1 : 0) +
                   (this.patterns.sizeMax !== null ? 1 : 0) +
                   (this.patterns.dateAfter !== null ? 1 : 0) +
                   (this.patterns.dateBefore !== null ? 1 : 0)
    };
  }

  // Export filter configuration
  export() {
    return {
      patterns: { ...this.patterns },
      summary: this.getSummary()
    };
  }

  // Import filter configuration
  import(config) {
    if (config.patterns) {
      this.patterns = { ...this.patterns, ...config.patterns };
    }
    return this;
  }

  // Get available presets
  getPresets() {
    return Object.keys(this.presets).map(key => ({
      id: key,
      name: this.formatPresetName(key),
      description: this.getPresetDescription(key),
      filters: this.presets[key]
    }));
  }

  // Format preset name for display
  formatPresetName(key) {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
  }

  // Get preset description
  getPresetDescription(key) {
    const descriptions = {
      webDevelopment: 'JavaScript, TypeScript, React, Vue projects',
      pythonProject: 'Python applications with virtual environments',
      documents: 'Office documents, PDFs, and media files',
      sourceCode: 'All programming languages and config files',
      mediaFiles: 'Images, videos, audio, and design files'
    };
    
    return descriptions[key] || 'Custom filter preset';
  }

  // Reset all filters
  reset() {
    this.patterns = {
      ignore: [],
      include: [],
      extensions: [],
      sizeMin: null,
      sizeMax: null,
      dateAfter: null,
      dateBefore: null,
      namePatterns: []
    };
    return this;
  }

  // Clone filter manager
  clone() {
    const cloned = new FilterManager();
    cloned.patterns = JSON.parse(JSON.stringify(this.patterns));
    return cloned;
  }
}

// Utility functions for common filter operations
export const FilterUtils = {
  // Convert file size to human readable format
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // Parse human readable file size to bytes
  parseFileSize(sizeStr) {
    if (!sizeStr) return null;
    
    const units = {
      'B': 1,
      'KB': 1024,
      'MB': 1024 * 1024,
      'GB': 1024 * 1024 * 1024,
      'TB': 1024 * 1024 * 1024 * 1024
    };
    
    const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*([KMGT]?B)$/i);
    if (!match) return null;
    
    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    
    return Math.round(value * (units[unit] || 1));
  },

  // Common ignore patterns
  commonIgnorePatterns: {
    versionControl: ['.git/', '.svn/', '.hg/', '.bzr/'],
    nodeJS: ['node_modules/', 'npm-debug.log*', 'yarn-error.log*'],
    python: ['__pycache__/', '*.pyc', '*.pyo', '.pytest_cache/', '.venv/', 'venv/'],
    build: ['dist/', 'build/', 'out/', '.cache/', 'coverage/'],
    logs: ['*.log', 'logs/', '*.tmp', '*.temp'],
    os: ['.DS_Store', 'Thumbs.db', 'desktop.ini'],
    editors: ['.vscode/', '.idea/', '*.swp', '*.swo', '*~'],
    environment: ['.env*', '.envrc']
  },

  // Get all common patterns as a flat array
  getAllCommonPatterns() {
    return Object.values(this.commonIgnorePatterns).flat();
  }
};

export default FilterManager;