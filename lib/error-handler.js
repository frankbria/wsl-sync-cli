import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { format } from 'util';

// Error categories
export const ErrorCategories = {
  PERMISSION: 'permission',
  PATH: 'path',
  DISK_SPACE: 'disk_space',
  NETWORK: 'network',
  CONFLICT: 'conflict',
  SYSTEM: 'system',
  CONFIG: 'config',
  VALIDATION: 'validation',
  UNKNOWN: 'unknown'
};

// Error codes
export const ErrorCodes = {
  // Permission errors
  EACCES: { category: ErrorCategories.PERMISSION, code: 'EACCES' },
  EPERM: { category: ErrorCategories.PERMISSION, code: 'EPERM' },
  
  // Path errors
  ENOENT: { category: ErrorCategories.PATH, code: 'ENOENT' },
  ENOTDIR: { category: ErrorCategories.PATH, code: 'ENOTDIR' },
  EISDIR: { category: ErrorCategories.PATH, code: 'EISDIR' },
  
  // Disk space errors
  ENOSPC: { category: ErrorCategories.DISK_SPACE, code: 'ENOSPC' },
  EDQUOT: { category: ErrorCategories.DISK_SPACE, code: 'EDQUOT' },
  
  // Network errors
  ETIMEDOUT: { category: ErrorCategories.NETWORK, code: 'ETIMEDOUT' },
  ECONNREFUSED: { category: ErrorCategories.NETWORK, code: 'ECONNREFUSED' },
  ENOTFOUND: { category: ErrorCategories.NETWORK, code: 'ENOTFOUND' },
  
  // System errors
  EMFILE: { category: ErrorCategories.SYSTEM, code: 'EMFILE' },
  ENFILE: { category: ErrorCategories.SYSTEM, code: 'ENFILE' },
  ENOMEM: { category: ErrorCategories.SYSTEM, code: 'ENOMEM' }
};

// Error recovery suggestions
const RecoverySuggestions = {
  [ErrorCategories.PERMISSION]: [
    'Check file and directory permissions',
    'Run with appropriate user privileges',
    'Ensure the target is not read-only',
    'Check if the file is locked by another process'
  ],
  [ErrorCategories.PATH]: [
    'Verify the path exists',
    'Check for typos in the path',
    'Ensure parent directories exist',
    'Use absolute paths instead of relative paths'
  ],
  [ErrorCategories.DISK_SPACE]: [
    'Free up disk space on the target drive',
    'Check disk quota limits',
    'Use a different destination with more space',
    'Clean temporary files'
  ],
  [ErrorCategories.NETWORK]: [
    'Check network connection',
    'Verify remote path accessibility',
    'Check firewall settings',
    'Try again after network stabilizes'
  ],
  [ErrorCategories.CONFLICT]: [
    'Review conflict resolution settings',
    'Manually resolve conflicts',
    'Use --force to override',
    'Check file modification times'
  ],
  [ErrorCategories.SYSTEM]: [
    'Close unnecessary applications',
    'Increase system limits (ulimit)',
    'Restart the application',
    'Check system resources'
  ],
  [ErrorCategories.CONFIG]: [
    'Verify configuration file syntax',
    'Check configuration file permissions',
    'Use default configuration',
    'Validate configuration values'
  ]
};

export class ErrorHandler {
  constructor(options = {}) {
    this.logDir = options.logDir || path.join(os.homedir(), '.wsl-sync', 'logs');
    this.maxLogSize = options.maxLogSize || 10 * 1024 * 1024; // 10MB
    this.maxLogFiles = options.maxLogFiles || 5;
    this.enableLogging = options.enableLogging !== false;
    this.retryConfig = {
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
      backoffMultiplier: options.backoffMultiplier || 2
    };
  }
  
  // Initialize error handler
  async initialize() {
    if (this.enableLogging) {
      await this.ensureLogDirectory();
      await this.rotateLogsIfNeeded();
    }
  }
  
  // Ensure log directory exists
  async ensureLogDirectory() {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }
  
  // Rotate logs if needed
  async rotateLogsIfNeeded() {
    try {
      const logFile = path.join(this.logDir, 'error.log');
      const stats = await fs.stat(logFile).catch(() => null);
      
      if (stats && stats.size > this.maxLogSize) {
        // Rotate logs
        for (let i = this.maxLogFiles - 1; i > 0; i--) {
          const oldFile = path.join(this.logDir, `error.log.${i}`);
          const newFile = path.join(this.logDir, `error.log.${i + 1}`);
          
          try {
            await fs.rename(oldFile, newFile);
          } catch {
            // Ignore if file doesn't exist
          }
        }
        
        // Move current log to .1
        await fs.rename(logFile, path.join(this.logDir, 'error.log.1'));
      }
    } catch (error) {
      console.error('Failed to rotate logs:', error);
    }
  }
  
  // Categorize error
  categorizeError(error) {
    if (error.code && ErrorCodes[error.code]) {
      return ErrorCodes[error.code].category;
    }
    
    // Check error message patterns
    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('permission') || message.includes('access denied')) {
      return ErrorCategories.PERMISSION;
    }
    if (message.includes('no such file') || message.includes('path not found')) {
      return ErrorCategories.PATH;
    }
    if (message.includes('disk full') || message.includes('no space')) {
      return ErrorCategories.DISK_SPACE;
    }
    if (message.includes('network') || message.includes('timeout')) {
      return ErrorCategories.NETWORK;
    }
    if (message.includes('conflict')) {
      return ErrorCategories.CONFLICT;
    }
    if (message.includes('config')) {
      return ErrorCategories.CONFIG;
    }
    
    return ErrorCategories.UNKNOWN;
  }
  
  // Format error for display
  formatError(error, options = {}) {
    const category = this.categorizeError(error);
    const suggestions = this.getRecoverySuggestions(error);
    
    const formatted = {
      message: error.message,
      category,
      code: error.code,
      path: error.path,
      syscall: error.syscall,
      timestamp: new Date().toISOString()
    };
    
    if (options.includeSuggestions && suggestions.length > 0) {
      formatted.suggestions = suggestions;
    }
    
    if (options.includeStack && error.stack) {
      formatted.stack = error.stack;
    }
    
    return formatted;
  }
  
  // Get recovery suggestions
  getRecoverySuggestions(error) {
    const category = this.categorizeError(error);
    const suggestions = RecoverySuggestions[category] || [];
    
    // Add specific suggestions based on error details
    if (error.code === 'EACCES' && error.path) {
      suggestions.unshift(`Check permissions for: ${error.path}`);
    }
    
    if (error.code === 'ENOSPC') {
      suggestions.unshift('Sync operation requires additional disk space');
    }
    
    return suggestions;
  }
  
  // Log error
  async logError(error, context = {}) {
    if (!this.enableLogging) return;
    
    try {
      const logEntry = {
        ...this.formatError(error, { includeStack: true }),
        context,
        pid: process.pid,
        platform: process.platform,
        nodeVersion: process.version
      };
      
      const logFile = path.join(this.logDir, 'error.log');
      const logLine = JSON.stringify(logEntry) + '\n';
      
      await fs.appendFile(logFile, logLine, 'utf8');
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
  }
  
  // Handle error with retry
  async handleWithRetry(operation, context = {}) {
    let lastError;
    let attempt = 0;
    
    while (attempt < this.retryConfig.maxRetries) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        attempt++;
        
        const category = this.categorizeError(error);
        
        // Don't retry certain errors
        if (category === ErrorCategories.PERMISSION || 
            category === ErrorCategories.VALIDATION ||
            category === ErrorCategories.CONFIG) {
          throw error;
        }
        
        // Log retry attempt
        await this.logError(error, {
          ...context,
          attempt,
          maxRetries: this.retryConfig.maxRetries
        });
        
        if (attempt < this.retryConfig.maxRetries) {
          // Calculate delay with exponential backoff
          const delay = this.retryConfig.retryDelay * 
            Math.pow(this.retryConfig.backoffMultiplier, attempt - 1);
          
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // All retries failed
    lastError.retriesExhausted = true;
    throw lastError;
  }
  
  // Create user-friendly error message
  createUserMessage(error) {
    const category = this.categorizeError(error);
    const baseMessage = error.message;
    
    switch (category) {
      case ErrorCategories.PERMISSION:
        return `Permission denied: ${baseMessage}\nTry running with appropriate privileges`;
        
      case ErrorCategories.PATH:
        return `Path error: ${baseMessage}\nPlease check that the path exists`;
        
      case ErrorCategories.DISK_SPACE:
        return `Insufficient disk space: ${baseMessage}\nFree up space and try again`;
        
      case ErrorCategories.NETWORK:
        return `Network error: ${baseMessage}\nCheck your connection and try again`;
        
      case ErrorCategories.CONFLICT:
        return `File conflict: ${baseMessage}\nReview your sync settings`;
        
      case ErrorCategories.CONFIG:
        return `Configuration error: ${baseMessage}\nCheck your configuration file`;
        
      default:
        return `Error: ${baseMessage}`;
    }
  }
  
  // Get error statistics
  async getErrorStats() {
    if (!this.enableLogging) return null;
    
    try {
      const logFile = path.join(this.logDir, 'error.log');
      const content = await fs.readFile(logFile, 'utf8');
      const lines = content.trim().split('\n').filter(Boolean);
      
      const stats = {
        total: lines.length,
        byCategory: {},
        byCode: {},
        recent: []
      };
      
      // Parse last 100 errors
      const recentLines = lines.slice(-100);
      
      for (const line of recentLines) {
        try {
          const entry = JSON.parse(line);
          
          // Count by category
          stats.byCategory[entry.category] = (stats.byCategory[entry.category] || 0) + 1;
          
          // Count by code
          if (entry.code) {
            stats.byCode[entry.code] = (stats.byCode[entry.code] || 0) + 1;
          }
          
          // Add to recent
          if (stats.recent.length < 10) {
            stats.recent.push({
              message: entry.message,
              category: entry.category,
              timestamp: entry.timestamp
            });
          }
        } catch {
          // Ignore parsing errors
        }
      }
      
      return stats;
    } catch {
      return null;
    }
  }
  
  // Clear error logs
  async clearLogs() {
    try {
      const files = await fs.readdir(this.logDir);
      const errorLogs = files.filter(file => file.startsWith('error.log'));
      
      for (const file of errorLogs) {
        await fs.unlink(path.join(this.logDir, file));
      }
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  }
}

// Singleton instance
let errorHandler = null;

export const getErrorHandler = (options) => {
  if (!errorHandler) {
    errorHandler = new ErrorHandler(options);
  }
  return errorHandler;
};

export default ErrorHandler;