// settings.js - Application settings management
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Removed static paths - now using dynamic getters in class

// Default settings
const DEFAULT_SETTINGS = {
  // Default directories
  defaultPaths: {
    windows: '',
    wsl: ''
  },
  
  // Sync preferences
  sync: {
    enableVerification: false,
    maxWorkers: 4,
    defaultDryRun: false,
    showProgressDetails: true,
    autoRefreshTrees: true
  },
  
  // UI preferences
  ui: {
    theme: 'light', // 'light', 'dark', 'auto'
    compactMode: false,
    showHiddenFiles: false,
    defaultView: 'sync' // 'sync', 'profiles'
  },
  
  // Advanced settings
  advanced: {
    enableLogging: false,
    logLevel: 'info', // 'debug', 'info', 'warn', 'error'
    backupBeforeSync: false,
    preservePermissions: true,
    handleSymlinks: 'preserve' // 'preserve', 'copy', 'ignore'
  },
  
  // Window preferences
  window: {
    width: 1200,
    height: 800,
    maximized: false,
    alwaysOnTop: false
  },
  
  // Recently used paths (for quick access)
  recentPaths: {
    windows: [],
    wsl: []
  },
  
  // Metadata
  version: '1.0.0',
  firstRun: true,
  lastUpdated: null
};

export class SettingsManager {
  constructor() {
    this.settings = { ...DEFAULT_SETTINGS };
    this.initialized = false;
  }

  // Get settings directory (computed dynamically for testability)
  get settingsDir() {
    return path.join(os.homedir(), '.wsl-sync');
  }

  // Get settings file path (computed dynamically for testability)
  get settingsFile() {
    return path.join(this.settingsDir, 'settings.json');
  }

  // Initialize settings (load from file or create defaults)
  async initialize() {
    try {
      await fs.mkdir(this.settingsDir, { recursive: true });
      
      if (await fs.access(this.settingsFile).then(() => true).catch(() => false)) {
        await this.load();
      } else {
        // First run - create default settings
        await this.save();
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize settings:', error);
      // Use defaults if initialization fails
      this.settings = { ...DEFAULT_SETTINGS };
      this.initialized = true;
    }
  }

  // Load settings from file
  async load() {
    try {
      const data = JSON.parse(await fs.readFile(this.settingsFile, 'utf-8'));
      
      // Merge with defaults to ensure all settings exist
      this.settings = this.mergeWithDefaults(data);
      
      // Migration logic for future versions
      await this.migrate();
      
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.settings = { ...DEFAULT_SETTINGS };
    }
  }

  // Save settings to file
  async save() {
    try {
      this.settings.lastUpdated = new Date().toISOString();
      await fs.writeJson(this.settingsFile, this.settings, { spaces: 2 });
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  }

  // Merge loaded settings with defaults (for backward compatibility)
  mergeWithDefaults(loadedSettings) {
    const merged = { ...DEFAULT_SETTINGS };
    
    // Deep merge each section
    Object.keys(loadedSettings).forEach(key => {
      if (typeof loadedSettings[key] === 'object' && !Array.isArray(loadedSettings[key])) {
        merged[key] = { ...merged[key], ...loadedSettings[key] };
      } else {
        merged[key] = loadedSettings[key];
      }
    });
    
    return merged;
  }

  // Handle settings migration for future versions
  async migrate() {
    // Example migration logic
    if (!this.settings.version || this.settings.version !== DEFAULT_SETTINGS.version) {
      console.log('Migrating settings to version', DEFAULT_SETTINGS.version);
      this.settings.version = DEFAULT_SETTINGS.version;
      await this.save();
    }
  }

  // Get all settings
  getAll() {
    return { ...this.settings };
  }

  // Get specific setting by path (e.g., 'ui.theme' or 'sync.maxWorkers')
  get(path) {
    const keys = path.split('.');
    let value = this.settings;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  // Set specific setting by path
  async set(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let target = this.settings;
    
    // Navigate to the parent object
    for (const key of keys) {
      if (!target[key] || typeof target[key] !== 'object') {
        target[key] = {};
      }
      target = target[key];
    }
    
    // Set the value
    target[lastKey] = value;
    
    // Save to file
    await this.save();
    
    return true;
  }

  // Update multiple settings at once
  async update(updates) {
    Object.keys(updates).forEach(path => {
      const keys = path.split('.');
      const lastKey = keys.pop();
      let target = this.settings;
      
      for (const key of keys) {
        if (!target[key] || typeof target[key] !== 'object') {
          target[key] = {};
        }
        target = target[key];
      }
      
      target[lastKey] = updates[path];
    });
    
    await this.save();
    return true;
  }

  // Reset all settings to defaults
  async reset() {
    this.settings = { ...DEFAULT_SETTINGS };
    this.settings.firstRun = false; // Don't show first run again
    await this.save();
  }

  // Reset specific section to defaults
  async resetSection(section) {
    if (DEFAULT_SETTINGS[section]) {
      this.settings[section] = { ...DEFAULT_SETTINGS[section] };
      await this.save();
    }
  }

  // Add path to recent paths (with deduplication and limit)
  async addRecentPath(type, path, maxRecent = 10) {
    if (!path || typeof path !== 'string') return;
    
    const recentPaths = this.settings.recentPaths[type] || [];
    
    // Remove if already exists
    const filtered = recentPaths.filter(p => p !== path);
    
    // Add to beginning
    filtered.unshift(path);
    
    // Limit to maxRecent items
    this.settings.recentPaths[type] = filtered.slice(0, maxRecent);
    
    await this.save();
  }

  // Get recent paths
  getRecentPaths(type) {
    return this.settings.recentPaths[type] || [];
  }

  // Clear recent paths
  async clearRecentPaths(type = null) {
    if (type) {
      this.settings.recentPaths[type] = [];
    } else {
      this.settings.recentPaths = { windows: [], wsl: [] };
    }
    await this.save();
  }

  // Get default paths
  getDefaultPaths() {
    return { ...this.settings.defaultPaths };
  }

  // Set default paths
  async setDefaultPaths(windows = null, wsl = null) {
    if (windows !== null) {
      this.settings.defaultPaths.windows = windows;
    }
    if (wsl !== null) {
      this.settings.defaultPaths.wsl = wsl;
    }
    await this.save();
  }

  // Get UI theme
  getTheme() {
    return this.settings.ui.theme;
  }

  // Set UI theme
  async setTheme(theme) {
    this.settings.ui.theme = theme;
    await this.save();
  }

  // Get sync preferences
  getSyncPreferences() {
    return { ...this.settings.sync };
  }

  // Update sync preferences
  async updateSyncPreferences(preferences) {
    this.settings.sync = { ...this.settings.sync, ...preferences };
    await this.save();
  }

  // Export settings to file
  async exportSettings(filePath) {
    try {
      const exportData = {
        settings: this.settings,
        exportedAt: new Date().toISOString(),
        version: this.settings.version
      };
      
      await fs.writeJson(filePath, exportData, { spaces: 2 });
      return true;
    } catch (error) {
      console.error('Failed to export settings:', error);
      throw error;
    }
  }

  // Import settings from file
  async importSettings(filePath, options = {}) {
    try {
      const data = JSON.parse(await fs.readFile(filePath, 'utf-8'));
      
      if (!data.settings) {
        throw new Error('Invalid settings file format');
      }
      
      const { preserveWindow = true, preserveRecent = true } = options;
      
      // Create backup of current settings
      const backup = { ...this.settings };
      
      // Import new settings
      this.settings = this.mergeWithDefaults(data.settings);
      
      // Preserve certain settings if requested
      if (preserveWindow) {
        this.settings.window = backup.window;
      }
      
      if (preserveRecent) {
        this.settings.recentPaths = backup.recentPaths;
      }
      
      // Update metadata
      this.settings.lastUpdated = new Date().toISOString();
      
      await this.save();
      
      return {
        success: true,
        imported: Object.keys(data.settings).length,
        backup
      };
      
    } catch (error) {
      console.error('Failed to import settings:', error);
      throw error;
    }
  }

  // Get settings summary for display
  getSummary() {
    return {
      hasDefaultPaths: !!(this.settings.defaultPaths.windows || this.settings.defaultPaths.wsl),
      recentPathsCount: {
        windows: this.settings.recentPaths.windows.length,
        wsl: this.settings.recentPaths.wsl.length
      },
      theme: this.settings.ui.theme,
      syncWorkers: this.settings.sync.maxWorkers,
      verificationEnabled: this.settings.sync.enableVerification,
      lastUpdated: this.settings.lastUpdated,
      isFirstRun: this.settings.firstRun
    };
  }

  // Mark first run as complete
  async completeFirstRun() {
    this.settings.firstRun = false;
    await this.save();
  }
}

// Singleton instance
let settingsManager = null;

export const getSettingsManager = () => {
  if (!settingsManager) {
    settingsManager = new SettingsManager();
  }
  return settingsManager;
};

export default SettingsManager;