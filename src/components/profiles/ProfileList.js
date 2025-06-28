import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import ProfileCard from './ProfileCard.js';
import { useApp } from '../../store/index.js';
import { ProfileManager } from '../../lib/profiles.js';

const ProfileList = ({ 
  onSelect, 
  onEdit, 
  onDelete,
  onQuickSync,
  searchQuery = '',
  isActive = false 
}) => {
  const { state, setActiveProfile, deleteProfile, addNotification } = useApp();
  const { profiles, activeProfile } = state;
  
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
  
  // Filter profiles based on search query
  const filteredProfiles = profiles.filter(profile => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      profile.name.toLowerCase().includes(query) ||
      profile.sourcePath.toLowerCase().includes(query) ||
      profile.destinationPath.toLowerCase().includes(query) ||
      profile.description?.toLowerCase().includes(query)
    );
  });
  
  // Sort profiles
  const sortedProfiles = [...filteredProfiles].sort((a, b) => {
    // Active profile first
    if (a.id === activeProfile?.id) return -1;
    if (b.id === activeProfile?.id) return 1;
    
    // Then by last used
    if (a.lastUsed && b.lastUsed) {
      return new Date(b.lastUsed) - new Date(a.lastUsed);
    }
    
    // Then alphabetically
    return a.name.localeCompare(b.name);
  });
  
  // Ensure selected index is valid
  useEffect(() => {
    if (selectedIndex >= sortedProfiles.length) {
      setSelectedIndex(Math.max(0, sortedProfiles.length - 1));
    }
  }, [sortedProfiles.length, selectedIndex]);
  
  // Handle keyboard input
  useInput((input, key) => {
    if (!isActive) return;
    
    if (key.upArrow) {
      setSelectedIndex(prev => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setSelectedIndex(prev => Math.min(sortedProfiles.length - 1, prev + 1));
    } else if (key.return) {
      if (confirmDelete) {
        handleDeleteConfirm();
      } else if (sortedProfiles[selectedIndex]) {
        handleSelect(sortedProfiles[selectedIndex]);
      }
    } else if (key.escape) {
      if (confirmDelete) {
        setConfirmDelete(null);
      }
    } else if (input === 'e' || input === 'E') {
      if (sortedProfiles[selectedIndex] && !confirmDelete) {
        onEdit(sortedProfiles[selectedIndex]);
      }
    } else if (key.delete || input === 'd' || input === 'D') {
      if (sortedProfiles[selectedIndex] && !confirmDelete) {
        setConfirmDelete(sortedProfiles[selectedIndex]);
      }
    } else if (input === 's' || input === 'S') {
      if (sortedProfiles[selectedIndex] && !confirmDelete) {
        handleQuickSync(sortedProfiles[selectedIndex]);
      }
    } else if (input === 'a' || input === 'A') {
      if (sortedProfiles[selectedIndex] && !confirmDelete) {
        handleActivate(sortedProfiles[selectedIndex]);
      }
    } else if (input === 'v' || input === 'V') {
      setViewMode(prev => prev === 'list' ? 'grid' : 'list');
    } else if (input === 'y' || input === 'Y') {
      if (confirmDelete) {
        handleDeleteConfirm();
      }
    } else if (input === 'n' || input === 'N') {
      if (confirmDelete) {
        setConfirmDelete(null);
      }
    }
  });
  
  // Handle profile selection
  const handleSelect = (profile) => {
    onSelect(profile);
  };
  
  // Handle profile activation
  const handleActivate = (profile) => {
    setActiveProfile(profile);
    addNotification({
      type: 'success',
      message: `Profile "${profile.name}" activated`
    });
  };
  
  // Handle quick sync
  const handleQuickSync = async (profile) => {
    setIsLoading(true);
    try {
      await onQuickSync(profile);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;
    
    try {
      const profileManager = new ProfileManager();
      await profileManager.initialize();
      await profileManager.deleteProfile(confirmDelete.id);
      
      deleteProfile(confirmDelete.id);
      
      addNotification({
        type: 'success',
        message: `Profile "${confirmDelete.name}" deleted`
      });
      
      setConfirmDelete(null);
    } catch (error) {
      addNotification({
        type: 'error',
        message: `Failed to delete profile: ${error.message}`
      });
    }
  };
  
  // Render empty state
  if (sortedProfiles.length === 0) {
    return (
      <Box flexDirection="column" alignItems="center" justifyContent="center">
        <Text color="gray">
          {searchQuery ? 'No profiles match your search' : 'No profiles yet'}
        </Text>
        <Box marginTop={1}>
          <Text color="gray" italic>Press N to create a new profile</Text>
        </Box>
      </Box>
    );
  }
  
  // Render delete confirmation
  if (confirmDelete) {
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text color="yellow">⚠ Delete Profile</Text>
        </Box>
        <Box marginBottom={1}>
          <Text>Are you sure you want to delete "{confirmDelete.name}"?</Text>
        </Box>
        <Box gap={2}>
          <Text color="red">Y: Yes, delete</Text>
          <Text color="green">N: No, cancel</Text>
        </Box>
      </Box>
    );
  }
  
  // Render loading state
  if (isLoading) {
    return (
      <Box>
        <Text color="cyan">
          <Spinner type="dots" />
        </Text>
        <Text> Processing...</Text>
      </Box>
    );
  }
  
  // Render profile list
  return (
    <Box flexDirection="column">
      {/* View mode indicator */}
      <Box marginBottom={1} justifyContent="space-between">
        <Text color="gray">
          {sortedProfiles.length} profile{sortedProfiles.length !== 1 ? 's' : ''}
        </Text>
        <Text color="gray">
          View: {viewMode} (V to toggle)
        </Text>
      </Box>
      
      {/* Profile list */}
      {viewMode === 'list' ? (
        <Box flexDirection="column">
          {sortedProfiles.map((profile, index) => {
            const isSelected = index === selectedIndex && isActive;
            const isCurrentActive = profile.id === activeProfile?.id;
            
            return (
              <Box key={profile.id} marginBottom={1}>
                <ProfileCard
                  profile={profile}
                  isSelected={isSelected}
                  isActive={isCurrentActive}
                  compact={true}
                />
              </Box>
            );
          })}
        </Box>
      ) : (
        // Grid view (simplified for terminal)
        <Box flexDirection="column">
          {sortedProfiles.map((profile, index) => {
            const isSelected = index === selectedIndex && isActive;
            const isCurrentActive = profile.id === activeProfile?.id;
            
            return (
              <Box key={profile.id} marginBottom={2}>
                <ProfileCard
                  profile={profile}
                  isSelected={isSelected}
                  isActive={isCurrentActive}
                  compact={false}
                />
              </Box>
            );
          })}
        </Box>
      )}
      
      {/* Controls hint */}
      {isActive && (
        <Box marginTop={1}>
          <Text color="gray" italic>
            ↑↓: Navigate • Enter: Select • E: Edit • D: Delete • S: Quick Sync • A: Activate
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default ProfileList;