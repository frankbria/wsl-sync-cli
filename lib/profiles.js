// profiles.js - Sync profile management
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

export class ProfileManager {
  constructor() {
    this.profiles = new Map();
    this.currentProfile = null;
  }

  // Get profiles directory (computed dynamically for testability)
  get profilesDir() {
    return path.join(os.homedir(), '.wsl-sync', 'profiles');
  }

  // Get profiles file path (computed dynamically for testability)
  get profilesFile() {
    return path.join(this.profilesDir, 'profiles.json');
  }

  // Initialize profiles directory and load existing profiles
  async initialize() {
    try {
      await fs.ensureDir(this.profilesDir);
      
      if (await fs.pathExists(this.profilesFile)) {
        const data = await fs.readJson(this.profilesFile);
        this.profiles = new Map(Object.entries(data.profiles || {}));
        this.currentProfile = data.currentProfile || null;
      }
    } catch (error) {
      console.error('Failed to initialize profiles:', error);
    }
  }

  // Create a new profile
  async createProfile(profile) {
    const { id, name, windowsPath, wslPath, options = {} } = profile;
    
    if (!id || !name || !windowsPath || !wslPath) {
      throw new Error('Profile must have id, name, windowsPath, and wslPath');
    }

    if (this.profiles.has(id)) {
      throw new Error(`Profile with id '${id}' already exists`);
    }

    const newProfile = {
      id,
      name,
      windowsPath,
      wslPath,
      options: {
        dryRun: false,
        enableVerification: false,
        maxWorkers: 4,
        ignorePatterns: [],
        includePatterns: [],
        deleteOrphaned: false,
        preservePermissions: false,
        followSymlinks: false,
        ...options
      },
      created: new Date().toISOString(),
      lastUsed: null,
      syncCount: 0
    };

    this.profiles.set(id, newProfile);
    await this.saveProfiles();
    
    return newProfile;
  }

  // Update an existing profile
  async updateProfile(id, updates) {
    if (!this.profiles.has(id)) {
      throw new Error(`Profile '${id}' not found`);
    }

    const profile = this.profiles.get(id);
    const updatedProfile = {
      ...profile,
      ...updates,
      id, // Prevent ID changes
      modified: new Date().toISOString()
    };

    this.profiles.set(id, updatedProfile);
    await this.saveProfiles();
    
    return updatedProfile;
  }

  // Delete a profile
  async deleteProfile(id) {
    if (!this.profiles.has(id)) {
      throw new Error(`Profile '${id}' not found`);
    }

    this.profiles.delete(id);
    
    // Clear current profile if it was deleted
    if (this.currentProfile === id) {
      this.currentProfile = null;
    }

    await this.saveProfiles();
  }

  // Get a profile by ID
  getProfile(id) {
    return this.profiles.get(id);
  }

  // Get all profiles
  getAllProfiles() {
    return Array.from(this.profiles.values()).sort((a, b) => {
      // Sort by last used (most recent first), then by name
      if (a.lastUsed && b.lastUsed) {
        return new Date(b.lastUsed) - new Date(a.lastUsed);
      }
      if (a.lastUsed) return -1;
      if (b.lastUsed) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  // Set current active profile
  async setCurrentProfile(id) {
    if (id && !this.profiles.has(id)) {
      throw new Error(`Profile '${id}' not found`);
    }

    this.currentProfile = id;
    
    if (id) {
      // Update last used timestamp
      const profile = this.profiles.get(id);
      profile.lastUsed = new Date().toISOString();
      this.profiles.set(id, profile);
    }

    await this.saveProfiles();
  }

  // Get current active profile
  getCurrentProfile() {
    return this.currentProfile ? this.profiles.get(this.currentProfile) : null;
  }

  // Update sync statistics for a profile
  async updateSyncStats(id, stats = {}) {
    if (!this.profiles.has(id)) {
      return;
    }

    const profile = this.profiles.get(id);
    profile.syncCount = (profile.syncCount || 0) + 1;
    profile.lastUsed = new Date().toISOString();
    
    if (stats.filesProcessed) {
      profile.totalFilesProcessed = (profile.totalFilesProcessed || 0) + stats.filesProcessed;
    }
    
    if (stats.bytesTransferred) {
      profile.totalBytesTransferred = (profile.totalBytesTransferred || 0) + stats.bytesTransferred;
    }

    this.profiles.set(id, profile);
    await this.saveProfiles();
  }

  // Export profiles to file
  async exportProfiles(filePath) {
    const exportData = {
      version: '1.0',
      exported: new Date().toISOString(),
      profiles: Object.fromEntries(this.profiles)
    };

    await fs.writeJson(filePath, exportData, { spaces: 2 });
    return exportData;
  }

  // Import profiles from file
  async importProfilesFromData(importData, options = {}) {
    const { overwrite = false, prefix = '' } = options;
    
    if (!importData.profiles) {
      throw new Error('Invalid profile data format');
    }

    return this._importProfileData(importData, { overwrite, prefix });
  }

  async importProfiles(filePath, options = {}) {
    const { overwrite = false, prefix = '' } = options;
    
    if (!await fs.pathExists(filePath)) {
      throw new Error('Import file does not exist');
    }

    const importData = await fs.readJson(filePath);
    
    if (!importData.profiles) {
      throw new Error('Invalid profile file format');
    }

    return this._importProfileData(importData, { overwrite, prefix });
  }

  async _importProfileData(importData, options = {}) {
    const { overwrite = false, prefix = '' } = options;

    const imported = [];
    const conflicts = [];

    for (const [originalId, profile] of Object.entries(importData.profiles)) {
      let id = prefix ? `${prefix}_${originalId}` : originalId;
      
      // Handle ID conflicts
      if (this.profiles.has(id)) {
        if (!overwrite) {
          // Generate unique ID
          let counter = 1;
          while (this.profiles.has(`${id}_${counter}`)) {
            counter++;
          }
          id = `${id}_${counter}`;
          conflicts.push({ original: originalId, renamed: id });
        } else {
          conflicts.push({ original: originalId, overwritten: id });
        }
      }

      const importedProfile = {
        ...profile,
        id,
        imported: new Date().toISOString(),
        lastUsed: null // Reset last used
      };

      this.profiles.set(id, importedProfile);
      imported.push(importedProfile);
    }

    await this.saveProfiles();

    return {
      imported: imported.length,
      conflicts,
      profiles: imported
    };
  }

  // Create profile templates
  getTemplates() {
    return [
      {
        id: 'web_development',
        name: 'Web Development Project',
        description: 'Template for web development with Node.js projects',
        options: {
          ignorePatterns: [
            'node_modules/',
            '.git/',
            'dist/',
            'build/',
            '.cache/',
            '*.log',
            '.env*'
          ],
          includePatterns: [
            '*.js',
            '*.jsx',
            '*.ts',
            '*.tsx',
            '*.vue',
            '*.css',
            '*.scss',
            '*.html',
            '*.json',
            '*.md'
          ],
          enableVerification: false,
          maxWorkers: 4
        }
      },
      {
        id: 'python_project',
        name: 'Python Project',
        description: 'Template for Python development projects',
        options: {
          ignorePatterns: [
            '__pycache__/',
            '*.pyc',
            '.pytest_cache/',
            '.venv/',
            'venv/',
            '.git/',
            '*.log',
            '.env*'
          ],
          includePatterns: [
            '*.py',
            '*.pyx',
            '*.pyi',
            '*.txt',
            '*.md',
            '*.yml',
            '*.yaml',
            '*.json'
          ],
          enableVerification: true,
          maxWorkers: 2
        }
      },
      {
        id: 'documents',
        name: 'Document Sync',
        description: 'Template for syncing documents and media files',
        options: {
          ignorePatterns: [
            '.git/',
            '*.tmp',
            '*.temp',
            '.DS_Store',
            'Thumbs.db'
          ],
          includePatterns: [
            '*.doc*',
            '*.pdf',
            '*.txt',
            '*.md',
            '*.jpg',
            '*.png',
            '*.gif'
          ],
          enableVerification: true,
          maxWorkers: 3
        }
      },
      {
        id: 'full_sync',
        name: 'Full Directory Sync',
        description: 'Sync everything except common system files',
        options: {
          ignorePatterns: [
            '.git/',
            '.DS_Store',
            'Thumbs.db',
            '*.tmp',
            '*.temp'
          ],
          includePatterns: [],
          enableVerification: false,
          maxWorkers: 4,
          deleteOrphaned: true
        }
      }
    ];
  }

  // Create profile from template
  async createFromTemplate(templateId, profileData) {
    const templates = this.getTemplates();
    const template = templates.find(t => t.id === templateId);
    
    if (!template) {
      throw new Error(`Template '${templateId}' not found`);
    }

    const profile = {
      ...profileData,
      options: {
        ...template.options,
        ...profileData.options
      }
    };

    return this.createProfile(profile);
  }

  // Save profiles to file
  async saveProfiles() {
    try {
      const data = {
        version: '1.0',
        currentProfile: this.currentProfile,
        profiles: Object.fromEntries(this.profiles),
        updated: new Date().toISOString()
      };

      await fs.writeJson(this.profilesFile, data, { spaces: 2 });
    } catch (error) {
      console.error('Failed to save profiles:', error);
      throw error;
    }
  }

  // Search profiles
  searchProfiles(query) {
    const lowerQuery = query.toLowerCase();
    return this.getAllProfiles().filter(profile => 
      profile.name.toLowerCase().includes(lowerQuery) ||
      profile.windowsPath.toLowerCase().includes(lowerQuery) ||
      profile.wslPath.toLowerCase().includes(lowerQuery)
    );
  }

  // Get profile statistics
  getStats() {
    const profiles = this.getAllProfiles();
    return {
      total: profiles.length,
      withSync: profiles.filter(p => p.syncCount > 0).length,
      totalSyncs: profiles.reduce((sum, p) => sum + (p.syncCount || 0), 0),
      mostUsed: profiles.reduce((max, p) => 
        (p.syncCount || 0) > (max.syncCount || 0) ? p : max, profiles[0]
      ),
      recentlyUsed: profiles.filter(p => p.lastUsed).slice(0, 5)
    };
  }
}

// Export singleton instance
export const profileManager = new ProfileManager();