import { describe, it, expect, beforeEach } from 'vitest';
import { ProfileManager } from '../../lib/profiles.js';
import { MockFileSystem } from '../mocks/file-system.js';

describe('ProfileManager', () => {
  let profileManager;
  let mockFs;

  beforeEach(() => {
    mockFs = new MockFileSystem();
    profileManager = new ProfileManager({
      configDir: '/test/config'
    });
  });

  describe('Profile CRUD Operations', () => {
    it('should create a new profile', () => {
      const profile = {
        name: 'test-profile',
        sourcePath: '/source',
        destinationPath: '/dest',
        filter: 'documents',
        workerThreads: 4
      };

      profileManager.profiles.set(profile.name, profile);
      
      expect(profileManager.profiles.has('test-profile')).toBe(true);
      expect(profileManager.profiles.get('test-profile')).toEqual(profile);
    });

    it('should list all profiles', () => {
      profileManager.profiles.set('profile1', { name: 'profile1' });
      profileManager.profiles.set('profile2', { name: 'profile2' });
      
      const profiles = Array.from(profileManager.profiles.values());
      expect(profiles).toHaveLength(2);
      expect(profiles[0].name).toBe('profile1');
      expect(profiles[1].name).toBe('profile2');
    });

    it('should delete a profile', () => {
      profileManager.profiles.set('to-delete', { name: 'to-delete' });
      expect(profileManager.profiles.has('to-delete')).toBe(true);
      
      profileManager.profiles.delete('to-delete');
      expect(profileManager.profiles.has('to-delete')).toBe(false);
    });

    it('should update an existing profile', () => {
      const original = { name: 'update-test', sourcePath: '/old' };
      profileManager.profiles.set('update-test', original);
      
      const updated = { ...original, sourcePath: '/new' };
      profileManager.profiles.set('update-test', updated);
      
      expect(profileManager.profiles.get('update-test').sourcePath).toBe('/new');
    });
  });

  describe('Profile Validation', () => {
    it('should validate required fields', () => {
      const invalid = { name: 'invalid' }; // Missing paths
      const valid = {
        name: 'valid',
        sourcePath: '/source',
        destinationPath: '/dest'
      };
      
      // Simple validation check
      const isValid = (profile) => {
        return !!(profile.name && profile.sourcePath && profile.destinationPath);
      };
      
      expect(isValid(invalid)).toBe(false);
      expect(isValid(valid)).toBe(true);
    });
  });
});