import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import Divider from '../common/Divider.js';
import LoadingSpinner from '../common/LoadingSpinner.js';
import ProfileList from '../profiles/ProfileList.js';
import ProfileEditor from '../profiles/ProfileEditor.js';
import ProfileTemplates from '../profiles/ProfileTemplates.js';
import { useApp } from '../../store/index.js';
import { ProfileManager } from '../../lib/profiles.js';
import { SyncHandler } from '../../lib/sync-handler.js';

const ProfilesView = () => {
  const { state, setView, setPaths, setSyncDirection, setActiveProfile, addNotification } = useApp();
  const { profiles } = state;
  
  // View states
  const [currentView, setCurrentView] = useState('list'); // 'list', 'create', 'edit', 'templates'
  const [editingProfile, setEditingProfile] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  // Handle keyboard input
  useInput((input, key) => {
    if (currentView !== 'list' || isSearching) return;
    
    if (input === 'n' || input === 'N') {
      // New profile
      setCurrentView('templates');
    } else if (input === '/' || key.ctrl && input === 'f') {
      // Search
      setIsSearching(true);
    } else if (input === 'i' || input === 'I') {
      // Import
      handleImport();
    } else if (input === 'e' || input === 'E') {
      // Export
      handleExport();
    } else if (key.escape) {
      if (isSearching) {
        setIsSearching(false);
        setSearchQuery('');
      }
    }
  });
  
  // Handle profile selection from list
  const handleProfileSelect = (profile) => {
    // Apply profile settings
    setPaths(profile.sourcePath, profile.destinationPath);
    setSyncDirection(profile.syncDirection || 'two-way');
    setActiveProfile(profile);
    
    // Switch to sync view
    setView('sync');
    
    addNotification({
      type: 'success',
      message: `Loaded profile "${profile.name}"`
    });
  };
  
  // Handle profile edit
  const handleProfileEdit = (profile) => {
    setEditingProfile(profile);
    setCurrentView('edit');
  };
  
  // Handle profile delete
  const handleProfileDelete = async (profileId) => {
    // Deletion is handled in ProfileList component
  };
  
  // Handle quick sync
  const handleQuickSync = async (profile) => {
    try {
      // Apply profile settings
      setPaths(profile.sourcePath, profile.destinationPath);
      setSyncDirection(profile.syncDirection || 'two-way');
      setActiveProfile(profile);
      
      // Switch to sync view and start sync
      setView('sync');
      
      // Note: Actual sync will be triggered from SyncView
      addNotification({
        type: 'info',
        message: `Starting sync with profile "${profile.name}"`
      });
    } catch (error) {
      addNotification({
        type: 'error',
        message: `Failed to start sync: ${error.message}`
      });
    }
  };
  
  // Handle template selection
  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setCurrentView('create');
  };
  
  // Handle profile save
  const handleProfileSave = (profile) => {
    setCurrentView('list');
    setEditingProfile(null);
    setSelectedTemplate(null);
  };
  
  // Handle cancel
  const handleCancel = () => {
    setCurrentView('list');
    setEditingProfile(null);
    setSelectedTemplate(null);
  };
  
  // Handle export
  const handleExport = async () => {
    if (profiles.length === 0) {
      addNotification({
        type: 'warning',
        message: 'No profiles to export'
      });
      return;
    }
    
    setIsExporting(true);
    
    try {
      const profileManager = new ProfileManager();
      await profileManager.initialize();
      
      const exportPath = await profileManager.exportProfiles(profiles);
      
      addNotification({
        type: 'success',
        message: `Profiles exported to ${exportPath}`
      });
    } catch (error) {
      addNotification({
        type: 'error',
        message: `Export failed: ${error.message}`
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  // Handle import
  const handleImport = async () => {
    // In a real implementation, this would open a file dialog
    // For CLI, we'll show instructions
    addNotification({
      type: 'info',
      message: 'Place profiles.json in ~/.wsl-sync/ and restart'
    });
  };
  
  // Render based on current view
  if (currentView === 'templates') {
    return (
      <Box flexDirection="column">
        <ProfileTemplates
          onSelect={handleTemplateSelect}
          onCancel={handleCancel}
          isActive={true}
        />
      </Box>
    );
  }
  
  if (currentView === 'create') {
    return (
      <Box flexDirection="column">
        <ProfileEditor
          profile={null}
          template={selectedTemplate}
          onSave={handleProfileSave}
          onCancel={handleCancel}
          isActive={true}
        />
      </Box>
    );
  }
  
  if (currentView === 'edit' && editingProfile) {
    return (
      <Box flexDirection="column">
        <ProfileEditor
          profile={editingProfile}
          onSave={handleProfileSave}
          onCancel={handleCancel}
          isActive={true}
        />
      </Box>
    );
  }
  
  // Main list view
  return (
    <Box flexDirection="column">
      <Divider title="Sync Profiles" titleColor="cyan" />
      
      {/* Search bar */}
      {isSearching ? (
        <Box marginY={1}>
          <Text color="cyan">Search: </Text>
          <TextInput
            value={searchQuery}
            onChange={setSearchQuery}
            onSubmit={() => setIsSearching(false)}
            placeholder="Type to search profiles..."
          />
        </Box>
      ) : (
        <Box marginY={1} justifyContent="space-between">
          <Box>
            <Text color="gray">
              {profiles.length} profile{profiles.length !== 1 ? 's' : ''}
              {searchQuery && ` matching "${searchQuery}"`}
            </Text>
          </Box>
          <Box gap={2}>
            {isExporting && (
              <Box>
                <LoadingSpinner text="Exporting..." />
              </Box>
            )}
            {!isExporting && (
              <Text color="gray">
                Press / to search
              </Text>
            )}
          </Box>
        </Box>
      )}
      
      {/* Profile list */}
      <Box flexGrow={1}>
        <ProfileList
          profiles={profiles}
          searchQuery={searchQuery}
          onSelect={handleProfileSelect}
          onEdit={handleProfileEdit}
          onDelete={handleProfileDelete}
          onQuickSync={handleQuickSync}
          isActive={!isSearching}
        />
      </Box>
      
      {/* Actions */}
      <Box marginTop={1} gap={3}>
        <Text color="gray">Actions: </Text>
        <Text color="green">N: New Profile</Text>
        <Text color="cyan">/: Search</Text>
        <Text color="yellow">I: Import</Text>
        <Text color="yellow">E: Export</Text>
      </Box>
    </Box>
  );
};

export default ProfilesView;