# WSL-Sync CLI Implementation Plan

## Overview
Transform the wsl-sync-pc Electron application into a fully functional CLI application using Ink (React for CLI). The CLI should maintain feature parity with the desktop version while providing an intuitive terminal-based interface.

## Phase 1: Core Infrastructure Setup

### 1.1 Port Missing Libraries from wsl-sync-pc
- [ ] Copy and adapt `lib/wsl-integration.js` - WSL path conversion and detection
- [ ] Copy and adapt `lib/deletion-manager.js` - Safe deletion with recycle bin support
- [ ] Copy and adapt `lib/filters.js` - File filtering system
- [ ] Copy and adapt `lib/profiles.js` - Profile management
- [ ] Copy and adapt `lib/settings.js` - Settings persistence
- [ ] Copy and adapt `lib/utils.ts` → `lib/utils.js` - Utility functions
- [ ] Update imports to use CommonJS where needed for CLI compatibility

### 1.2 Setup State Management
- [ ] Create `src/store/` directory
- [ ] Implement global state management for:
  - [ ] Current sync operation state
  - [ ] Active profile
  - [ ] Settings
  - [ ] Error messages
  - [ ] Navigation state (which screen is active)
- [ ] Create React Context for sharing state across components

### 1.3 Install Additional Ink Dependencies
- [ ] ink-spinner - Loading indicators
- [ ] ink-text-input - Text input fields
- [ ] ink-select-input - Selection menus
- [ ] ink-tab - Tab navigation
- [ ] ink-progress-bar - Progress visualization
- [ ] ink-multi-select - Multiple selection
- [ ] ink-divider - Visual separators
- [ ] fullscreen-ink - Full screen mode support

## Phase 2: Navigation and Layout System

### 2.1 Main Navigation Structure
- [ ] Create `src/components/Layout.js` - Main app layout with header and content area
- [ ] Create `src/components/Navigation.js` - Tab-based navigation component
- [ ] Implement three main views:
  - [ ] Sync View (default)
  - [ ] Profiles View
  - [ ] Settings View
- [ ] Add keyboard shortcuts for navigation (Tab, Shift+Tab, arrow keys)

### 2.2 Common UI Components
- [ ] Create `src/components/common/` directory
- [ ] `Header.js` - App header with title and navigation hints
- [ ] `Footer.js` - Status bar with keyboard shortcuts
- [ ] `ErrorMessage.js` - Error display component
- [ ] `SuccessMessage.js` - Success notification
- [ ] `LoadingSpinner.js` - Loading indicator
- [ ] `ProgressBar.js` - Progress visualization
- [ ] `Divider.js` - Section separator

## Phase 3: Sync View Implementation

### 3.1 Main Sync Interface
- [ ] Create `src/components/sync/SyncView.js` - Main sync screen
- [ ] Implement source/destination path selection:
  - [ ] `PathInput.js` - Interactive path input with validation
  - [ ] `PathBrowser.js` - Folder navigation (if feasible in CLI)
  - [ ] Path format toggle (Windows ↔ WSL)
  - [ ] Recent paths dropdown

### 3.2 Sync Options
- [ ] Create `src/components/sync/SyncOptions.js`
- [ ] Implement options:
  - [ ] Sync direction (two-way, one-way)
  - [ ] Conflict resolution strategy
  - [ ] Dry run toggle
  - [ ] Performance mode selection
  - [ ] Filter selection

### 3.3 Sync Progress Display
- [ ] Create `src/components/sync/SyncProgress.js`
- [ ] Show:
  - [ ] Overall progress bar
  - [ ] Current file being processed
  - [ ] Statistics (files processed, size, speed)
  - [ ] Time remaining estimate
  - [ ] Pause/Resume/Stop controls
- [ ] Error summary panel

### 3.4 Sync Preview
- [ ] Create `src/components/sync/SyncPreview.js`
- [ ] Display planned operations before sync
- [ ] Show conflicts that will occur
- [ ] Allow operation filtering/exclusion

## Phase 4: Profile Management

### 4.1 Profile List View
- [ ] Create `src/components/profiles/ProfileList.js`
- [ ] Display existing profiles in a selectable list
- [ ] Show profile details (paths, last sync, statistics)
- [ ] Quick actions (sync, edit, delete)
- [ ] Search/filter profiles

### 4.2 Profile Editor
- [ ] Create `src/components/profiles/ProfileEditor.js`
- [ ] Form fields:
  - [ ] Profile name
  - [ ] Source path
  - [ ] Destination path
  - [ ] Sync direction
  - [ ] Auto-sync settings
  - [ ] Filter selection
  - [ ] Syncignore patterns
- [ ] Template selection for new profiles

### 4.3 Profile Templates
- [ ] Create `src/components/profiles/ProfileTemplates.js`
- [ ] Implement preset templates:
  - [ ] Web Development
  - [ ] Python Development
  - [ ] Documents
  - [ ] Custom

## Phase 5: Settings Implementation

### 5.1 Settings Categories
- [ ] Create `src/components/settings/SettingsView.js`
- [ ] Implement settings sections:
  - [ ] General settings
  - [ ] Performance settings
  - [ ] Display preferences
  - [ ] Default paths
  - [ ] Advanced options

### 5.2 Settings Forms
- [ ] Create individual setting components:
  - [ ] `GeneralSettings.js` - Basic preferences
  - [ ] `PerformanceSettings.js` - Worker threads, batch sizes
  - [ ] `DisplaySettings.js` - CLI theme, colors, animations
  - [ ] `PathSettings.js` - Default directories

### 5.3 Import/Export
- [ ] Add settings import/export functionality
- [ ] Support JSON format for settings
- [ ] Profile import/export

## Phase 6: Advanced Features

### 6.1 Syncignore Editor
- [ ] Create `src/components/sync/SyncignoreEditor.js`
- [ ] Text-based pattern editor
- [ ] Pattern validation
- [ ] Template insertion
- [ ] Live preview of ignored files

### 6.2 Filter Manager
- [ ] Create `src/components/sync/FilterManager.js`
- [ ] Preset filter selection
- [ ] Custom filter creation
- [ ] Size/date/extension filters
- [ ] Filter combination logic

### 6.3 Keyboard Shortcuts
- [ ] Implement global keyboard shortcuts:
  - [ ] Ctrl+S - Start sync
  - [ ] Ctrl+P - Pause/Resume
  - [ ] Ctrl+C - Cancel sync
  - [ ] Tab - Navigate between fields
  - [ ] Ctrl+Tab - Switch main views
  - [ ] F1 - Help screen
  - [ ] Esc - Go back/Cancel

### 6.4 Help System
- [ ] Create `src/components/Help.js`
- [ ] Context-sensitive help
- [ ] Keyboard shortcut reference
- [ ] Command-line argument help

## Phase 7: CLI Arguments and Commands

### 7.1 Enhanced CLI Arguments
- [ ] Extend yargs configuration:
  - [ ] `--profile <name>` - Use specific profile
  - [ ] `--create-profile` - Create new profile
  - [ ] `--list-profiles` - List all profiles
  - [ ] `--dry-run` - Preview sync
  - [ ] `--one-way` - Force one-way sync
  - [ ] `--filter <preset>` - Apply filter preset
  - [ ] `--ignore <pattern>` - Add ignore pattern
  - [ ] `--workers <n>` - Set worker threads
  - [ ] `--no-delete` - Skip deletion sync
  - [ ] `--config <file>` - Use config file

### 7.2 Non-Interactive Mode
- [ ] Support fully automated sync via CLI args
- [ ] JSON output mode for scripting
- [ ] Exit codes for different scenarios
- [ ] Quiet mode for cron jobs

## Phase 8: Error Handling and Recovery

### 8.1 Error Management
- [ ] Create comprehensive error handling system
- [ ] Categorize errors (permissions, network, disk space)
- [ ] Implement retry mechanisms
- [ ] Error log persistence
- [ ] Recovery suggestions

### 8.2 Graceful Degradation
- [ ] Handle terminal resize
- [ ] Fallback for non-TTY environments
- [ ] Support for limited color terminals
- [ ] ASCII-only mode for compatibility

## Phase 9: Testing and Documentation

### 9.1 Testing
- [ ] Unit tests for core sync logic
- [ ] Integration tests for CLI commands
- [ ] Mock file system for testing
- [ ] Performance benchmarks
- [ ] User acceptance test scenarios

### 9.2 Documentation
- [ ] README with installation and usage
- [ ] Man page generation
- [ ] Built-in help system
- [ ] Example configurations
- [ ] Migration guide from GUI version

## Phase 10: Performance and Polish

### 10.1 Performance Optimization
- [ ] Minimize re-renders in Ink components
- [ ] Optimize state updates
- [ ] Lazy loading for large file lists
- [ ] Memory usage optimization
- [ ] Startup time optimization

### 10.2 User Experience Polish
- [ ] Smooth animations for transitions
- [ ] Consistent color scheme
- [ ] Loading states for all operations
- [ ] Informative empty states
- [ ] Contextual hints and tooltips

### 10.3 Distribution
- [ ] Create npm package
- [ ] Binary generation for different platforms
- [ ] Auto-update mechanism
- [ ] Installation scripts
- [ ] Uninstall cleanup

## Implementation Order Recommendation

1. **Week 1-2**: Complete Phase 1 (Infrastructure) and Phase 2 (Navigation)
2. **Week 3-4**: Implement Phase 3 (Sync View) - Core functionality
3. **Week 5**: Add Phase 4 (Profile Management)
4. **Week 6**: Implement Phase 5 (Settings)
5. **Week 7**: Add Phase 6 (Advanced Features)
6. **Week 8**: Complete Phase 7 (CLI Arguments)
7. **Week 9**: Focus on Phase 8 (Error Handling)
8. **Week 10**: Testing and Documentation (Phase 9)
9. **Week 11-12**: Performance optimization and polish (Phase 10)

## Technical Considerations

1. **State Management**: Consider using Zustand or a simple Context-based state management
2. **File System Operations**: Ensure all operations are async and don't block the UI
3. **Worker Threads**: Maintain compatibility with the existing worker thread system
4. **Configuration Storage**: Use XDG Base Directory specification for config files
5. **Cross-Platform**: Ensure the CLI works on Windows (with WSL), Linux, and macOS

## UI/UX Guidelines

1. **Keyboard-First**: All actions should be accessible via keyboard
2. **Clear Visual Hierarchy**: Use box borders, colors, and spacing effectively
3. **Responsive Layout**: Adapt to different terminal sizes
4. **Progress Feedback**: Always show progress for long operations
5. **Error Clarity**: Make errors actionable with clear next steps
6. **Consistency**: Match keyboard shortcuts and workflows from similar CLI tools

## Dependencies to Add

```json
{
  "dependencies": {
    "ink-spinner": "^5.0.0",
    "ink-text-input": "^6.0.0",
    "ink-select-input": "^6.0.0",
    "ink-tab": "^4.1.0",
    "ink-progress-bar": "^4.0.0",
    "ink-multi-select": "^3.0.0",
    "ink-divider": "^4.0.0",
    "fullscreen-ink": "^2.0.0",
    "conf": "^13.0.1",
    "xdg-basedir": "^5.1.0",
    "ora": "^8.1.1",
    "boxen": "^8.0.1",
    "cli-table3": "^0.6.5",
    "prompts": "^2.4.2",
    "zustand": "^5.0.2"
  }
}
```

## Success Criteria

- [ ] Feature parity with wsl-sync-pc
- [ ] Intuitive keyboard navigation
- [ ] Fast and responsive UI
- [ ] Clear error messages and recovery options
- [ ] Comprehensive help and documentation
- [ ] Works in all major terminals
- [ ] Can be used both interactively and in scripts
- [ ] Maintains the reliability of the original sync engine