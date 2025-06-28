import { describe, it, expect } from 'vitest';
import { ErrorCategories, ErrorCodes } from '../../lib/error-handler.js';

describe('ErrorHandler - Simple Tests', () => {
  describe('Error Categories', () => {
    it('should have all required categories', () => {
      expect(ErrorCategories.PERMISSION).toBe('permission');
      expect(ErrorCategories.PATH).toBe('path');
      expect(ErrorCategories.DISK_SPACE).toBe('disk_space');
      expect(ErrorCategories.NETWORK).toBe('network');
      expect(ErrorCategories.CONFLICT).toBe('conflict');
      expect(ErrorCategories.SYSTEM).toBe('system');
      expect(ErrorCategories.CONFIG).toBe('config');
      expect(ErrorCategories.VALIDATION).toBe('validation');
      expect(ErrorCategories.UNKNOWN).toBe('unknown');
    });
  });

  describe('Error Codes', () => {
    it('should have error code mappings', () => {
      expect(ErrorCodes.EACCES.category).toBe(ErrorCategories.PERMISSION);
      expect(ErrorCodes.EPERM.category).toBe(ErrorCategories.PERMISSION);
      expect(ErrorCodes.ENOENT.category).toBe(ErrorCategories.PATH);
      expect(ErrorCodes.ENOTDIR.category).toBe(ErrorCategories.PATH);
      expect(ErrorCodes.ENOSPC.category).toBe(ErrorCategories.DISK_SPACE);
      expect(ErrorCodes.ETIMEDOUT.category).toBe(ErrorCategories.NETWORK);
      expect(ErrorCodes.ECONNREFUSED.category).toBe(ErrorCategories.NETWORK);
    });
    
    it('should have proper code values', () => {
      expect(ErrorCodes.EACCES.code).toBe('EACCES');
      expect(ErrorCodes.EPERM.code).toBe('EPERM');
      expect(ErrorCodes.ENOENT.code).toBe('ENOENT');
    });
  });
});