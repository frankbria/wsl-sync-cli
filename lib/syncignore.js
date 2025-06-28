import fs from 'fs';
import path from 'path';
import { minimatch } from 'minimatch';

/**
 * SyncIgnore handles .syncignore file parsing and pattern matching
 * Similar to .gitignore but for sync operations
 */
export class SyncIgnore {
  constructor() {
    this.patterns = [];
    this.defaultPatterns = [
      // Common build/dependency directories
      'node_modules/',
      '**/node_modules/',
      
      // Python
      '__pycache__/',
      '**/__pycache__/',
      '*.pyc',
      '.venv/',
      'venv/',
      
      // IDE/Editor files
      '.vscode/',
      '.idea/',
      '*.swp',
      '*.swo',
      '*~',
      '.DS_Store',
      
      // Build outputs
      'dist/',
      'build/',
      'out/',
      '*.o',
      '*.exe',
      '*.dll',
      '*.so',
      '*.dylib',
      
      // Logs and temp files
      '*.log',
      '*.tmp',
      '*.temp',
      '.cache/',
      
      // Version control
      '.git/',
      '.svn/',
      '.hg/',
      
      // OS specific
      'Thumbs.db',
      'desktop.ini'
    ];
  }

  /**
   * Load patterns from a .syncignore file
   */
  async loadFromFile(filePath) {
    try {
      const content = await fs.promises.readFile(filePath, 'utf8');
      return this.parseContent(content);
    } catch (err) {
      if (err.code === 'ENOENT') {
        // File doesn't exist, use defaults
        return this.defaultPatterns;
      }
      throw err;
    }
  }

  /**
   * Parse .syncignore content
   */
  parseContent(content) {
    const lines = content.split(/\r?\n/);
    const patterns = [];
    
    for (const line of lines) {
      // Skip empty lines and comments
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }
      
      patterns.push(trimmed);
    }
    
    return patterns;
  }

  /**
   * Load patterns from JSON (for profile-stored patterns)
   */
  loadFromJSON(jsonPatterns) {
    if (Array.isArray(jsonPatterns)) {
      this.patterns = [...jsonPatterns];
    } else if (jsonPatterns && typeof jsonPatterns === 'object') {
      // Support for categorized patterns
      this.patterns = [];
      for (const category of Object.values(jsonPatterns)) {
        if (Array.isArray(category)) {
          this.patterns.push(...category);
        }
      }
    }
  }

  /**
   * Merge patterns from multiple sources
   */
  mergePatterns(...patternSets) {
    const merged = new Set();
    
    // Add defaults first
    for (const pattern of this.defaultPatterns) {
      merged.add(pattern);
    }
    
    // Add all other patterns
    for (const patterns of patternSets) {
      if (Array.isArray(patterns)) {
        for (const pattern of patterns) {
          merged.add(pattern);
        }
      }
    }
    
    this.patterns = Array.from(merged);
    return this.patterns;
  }

  /**
   * Check if a file/directory should be ignored
   */
  shouldIgnore(filePath, isDirectory = false) {
    // Normalize path separators
    const normalizedPath = filePath.replace(/\\/g, '/');
    
    for (const pattern of this.patterns) {
      let testPattern = pattern;
      
      // Handle directory-specific patterns
      if (pattern.endsWith('/') && !isDirectory) {
        // For directory patterns, check if the file is inside that directory
        const dirPattern = testPattern.slice(0, -1);
        if (normalizedPath.includes('/' + dirPattern + '/') || 
            normalizedPath.startsWith(dirPattern + '/')) {
          return true;
        }
        continue;
      }
      
      // Remove trailing slash for matching directories
      if (testPattern.endsWith('/')) {
        testPattern = testPattern.slice(0, -1);
      }
      
      // Check exact match or glob pattern
      if (minimatch(normalizedPath, testPattern, { 
        dot: true,
        matchBase: true 
      })) {
        return true;
      }
      
      // Check if path contains the pattern as a directory component
      if (pattern.endsWith('/') || isDirectory) {
        const parts = normalizedPath.split('/');
        if (parts.includes(testPattern)) {
          return true;
        }
      }
      
      // Also check basename for patterns without path separators
      if (!pattern.includes('/')) {
        const basename = path.basename(normalizedPath);
        if (minimatch(basename, pattern, { dot: true })) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Get current patterns as JSON for saving to profile
   */
  toJSON() {
    return {
      version: '1.0',
      patterns: this.patterns,
      categories: {
        dependencies: [
          'node_modules/',
          '**/node_modules/',
          '.venv/',
          'venv/',
          '__pycache__/',
          '**/__pycache__/'
        ],
        build: [
          'dist/',
          'build/',
          'out/',
          '*.o',
          '*.exe',
          '*.dll',
          '*.so',
          '*.dylib'
        ],
        ide: [
          '.vscode/',
          '.idea/',
          '*.swp',
          '*.swo',
          '*~'
        ],
        vcs: [
          '.git/',
          '.svn/',
          '.hg/'
        ],
        temp: [
          '*.log',
          '*.tmp',
          '*.temp',
          '.cache/'
        ],
        os: [
          '.DS_Store',
          'Thumbs.db',
          'desktop.ini'
        ]
      }
    };
  }

  /**
   * Write patterns to a .syncignore file
   */
  async writeToFile(filePath) {
    const content = this.generateFileContent();
    await fs.promises.writeFile(filePath, content, 'utf8');
  }

  /**
   * Generate .syncignore file content with comments
   */
  generateFileContent() {
    const lines = [
      '# .syncignore - Patterns for files/directories to skip during sync',
      '# Similar to .gitignore syntax',
      '# Lines starting with # are comments',
      '# Patterns ending with / match directories only',
      '',
      '# Dependencies',
      'node_modules/',
      '**/node_modules/',
      '.venv/',
      'venv/',
      '__pycache__/',
      '**/__pycache__/',
      '*.pyc',
      '',
      '# Build outputs',
      'dist/',
      'build/',
      'out/',
      '*.o',
      '*.exe',
      '*.dll',
      '*.so',
      '*.dylib',
      '',
      '# IDE/Editor files',
      '.vscode/',
      '.idea/',
      '*.swp',
      '*.swo',
      '*~',
      '',
      '# Version control',
      '.git/',
      '.svn/',
      '.hg/',
      '',
      '# Logs and temp files',
      '*.log',
      '*.tmp',
      '*.temp',
      '.cache/',
      '',
      '# OS specific',
      '.DS_Store',
      'Thumbs.db',
      'desktop.ini',
      '',
      '# Add your custom patterns below',
      ''
    ];
    
    return lines.join('\n');
  }
}

// Singleton instance
let syncIgnoreInstance = null;

export function getSyncIgnore() {
  if (!syncIgnoreInstance) {
    syncIgnoreInstance = new SyncIgnore();
  }
  return syncIgnoreInstance;
}