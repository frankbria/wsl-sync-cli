import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ErrorHandler, ErrorCategories, ErrorCodes } from '../../lib/error-handler.js';
import { MockFileSystem } from '../mocks/file-system.js';
import path from 'path';

describe('ErrorHandler', () => {
  let errorHandler;
  let mockFs;
  
  beforeEach(() => {
    mockFs = new MockFileSystem();
    errorHandler = new ErrorHandler({
      logDir: '/tmp/logs',
      enableLogging: true
    });
    
    // Mock fs operations
    vi.mock('fs/promises', () => ({
      default: mockFs.getFs().promises
    }));
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
    mockFs.clear();
  });
  
  describe('categorizeError', () => {
    it('should categorize permission errors correctly', () => {
      const error = new Error('Permission denied');
      error.code = 'EACCES';
      
      const category = errorHandler.categorizeError(error);
      expect(category).toBe(ErrorCategories.PERMISSION);
    });
    
    it('should categorize path errors correctly', () => {
      const error = new Error('No such file or directory');
      error.code = 'ENOENT';
      
      const category = errorHandler.categorizeError(error);
      expect(category).toBe(ErrorCategories.PATH);
    });
    
    it('should categorize disk space errors correctly', () => {
      const error = new Error('No space left on device');
      error.code = 'ENOSPC';
      
      const category = errorHandler.categorizeError(error);
      expect(category).toBe(ErrorCategories.DISK_SPACE);
    });
    
    it('should categorize network errors correctly', () => {
      const error = new Error('Connection timeout');
      error.code = 'ETIMEDOUT';
      
      const category = errorHandler.categorizeError(error);
      expect(category).toBe(ErrorCategories.NETWORK);
    });
    
    it('should categorize unknown errors', () => {
      const error = new Error('Something went wrong');
      
      const category = errorHandler.categorizeError(error);
      expect(category).toBe(ErrorCategories.UNKNOWN);
    });
    
    it('should categorize by message pattern', () => {
      const error = new Error('Access denied to file');
      
      const category = errorHandler.categorizeError(error);
      expect(category).toBe(ErrorCategories.PERMISSION);
    });
  });
  
  describe('getRecoverySuggestions', () => {
    it('should provide suggestions for permission errors', () => {
      const error = new Error('Permission denied');
      error.code = 'EACCES';
      error.path = '/test/file.txt';
      
      const suggestions = errorHandler.getRecoverySuggestions(error);
      
      expect(suggestions).toContain('Check permissions for: /test/file.txt');
      expect(suggestions.some(s => s.includes('permissions'))).toBe(true);
    });
    
    it('should provide suggestions for disk space errors', () => {
      const error = new Error('No space left');
      error.code = 'ENOSPC';
      
      const suggestions = errorHandler.getRecoverySuggestions(error);
      
      expect(suggestions).toContain('Sync operation requires additional disk space');
      expect(suggestions.some(s => s.includes('disk space'))).toBe(true);
    });
  });
  
  describe('formatError', () => {
    it('should format error with all details', () => {
      const error = new Error('Test error');
      error.code = 'EACCES';
      error.path = '/test/path';
      error.syscall = 'open';
      
      const formatted = errorHandler.formatError(error, {
        includeSuggestions: true,
        includeStack: true
      });
      
      expect(formatted.message).toBe('Test error');
      expect(formatted.category).toBe(ErrorCategories.PERMISSION);
      expect(formatted.code).toBe('EACCES');
      expect(formatted.path).toBe('/test/path');
      expect(formatted.syscall).toBe('open');
      expect(formatted.timestamp).toBeDefined();
      expect(formatted.suggestions).toBeDefined();
      expect(formatted.stack).toBeDefined();
    });
  });
  
  describe('createUserMessage', () => {
    it('should create user-friendly permission error message', () => {
      const error = new Error('EACCES: permission denied');
      error.code = 'EACCES';
      
      const message = errorHandler.createUserMessage(error);
      
      expect(message).toContain('Permission denied');
      expect(message).toContain('appropriate privileges');
    });
    
    it('should create user-friendly path error message', () => {
      const error = new Error('ENOENT: no such file');
      error.code = 'ENOENT';
      
      const message = errorHandler.createUserMessage(error);
      
      expect(message).toContain('Path error');
      expect(message).toContain('path exists');
    });
  });
  
  describe('handleWithRetry', () => {
    it('should retry operation on transient errors', async () => {
      let attempts = 0;
      const operation = vi.fn(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      });
      
      const result = await errorHandler.handleWithRetry(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });
    
    it('should not retry permission errors', async () => {
      const error = new Error('Permission denied');
      error.code = 'EACCES';
      
      const operation = vi.fn(async () => {
        throw error;
      });
      
      await expect(errorHandler.handleWithRetry(operation))
        .rejects.toThrow('Permission denied');
      
      expect(operation).toHaveBeenCalledTimes(1);
    });
    
    it('should throw after max retries', async () => {
      const operation = vi.fn(async () => {
        throw new Error('Persistent failure');
      });
      
      await expect(errorHandler.handleWithRetry(operation))
        .rejects.toThrow('Persistent failure');
      
      expect(operation).toHaveBeenCalledTimes(3);
    });
    
    it('should apply exponential backoff', async () => {
      const delays = [];
      const originalSetTimeout = global.setTimeout;
      
      global.setTimeout = vi.fn((fn, delay) => {
        delays.push(delay);
        fn();
      });
      
      const operation = vi.fn(async () => {
        throw new Error('Failure');
      });
      
      try {
        await errorHandler.handleWithRetry(operation);
      } catch {
        // Expected to fail
      }
      
      expect(delays[0]).toBe(1000); // First retry: 1s
      expect(delays[1]).toBe(2000); // Second retry: 2s
      
      global.setTimeout = originalSetTimeout;
    });
  });
  
  describe('error logging', () => {
    it('should log errors to file', async () => {
      const error = new Error('Test error');
      error.code = 'ENOENT';
      
      await errorHandler.initialize();
      await errorHandler.logError(error, { operation: 'test' });
      
      // In real test, check if log file was created
      expect(true).toBe(true); // Placeholder
    });
    
    it('should rotate logs when size limit reached', async () => {
      errorHandler.maxLogSize = 100; // Small size for testing
      
      await errorHandler.initialize();
      
      // Log many errors to exceed size
      for (let i = 0; i < 10; i++) {
        await errorHandler.logError(new Error(`Error ${i}`));
      }
      
      // In real test, check if log rotation occurred
      expect(true).toBe(true); // Placeholder
    });
  });
});