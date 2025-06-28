import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import Divider from '../common/Divider.js';

const SyncPreview = ({ 
  preview, 
  onConfirm, 
  onCancel,
  isActive = false 
}) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedOperation, setSelectedOperation] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  
  if (!preview) {
    return (
      <Box>
        <Text color="gray">No preview available</Text>
      </Box>
    );
  }
  
  const {
    toCreate = [],
    toUpdate = [],
    toDelete = [],
    conflicts = [],
    totalSize = 0,
    totalOperations = 0
  } = preview;
  
  // Define tabs
  const tabs = [
    { id: 'summary', label: 'Summary', count: null },
    { id: 'create', label: 'To Create', count: toCreate.length },
    { id: 'update', label: 'To Update', count: toUpdate.length },
    { id: 'delete', label: 'To Delete', count: toDelete.length },
    { id: 'conflicts', label: 'Conflicts', count: conflicts.length }
  ].filter(tab => tab.count === null || tab.count > 0);
  
  // Handle keyboard navigation
  useInput((input, key) => {
    if (!isActive) return;
    
    if (key.leftArrow) {
      setSelectedTab(prev => (prev - 1 + tabs.length) % tabs.length);
      setSelectedOperation(0);
    } else if (key.rightArrow) {
      setSelectedTab(prev => (prev + 1) % tabs.length);
      setSelectedOperation(0);
    } else if (key.upArrow) {
      const currentList = getCurrentList();
      if (currentList.length > 0) {
        setSelectedOperation(prev => (prev - 1 + currentList.length) % currentList.length);
      }
    } else if (key.downArrow) {
      const currentList = getCurrentList();
      if (currentList.length > 0) {
        setSelectedOperation(prev => (prev + 1) % currentList.length);
      }
    } else if (input === 'd' || input === 'D') {
      setShowDetails(!showDetails);
    } else if (key.return || input === 'y' || input === 'Y') {
      onConfirm();
    } else if (key.escape || input === 'n' || input === 'N') {
      onCancel();
    }
  });
  
  // Get current list based on selected tab
  const getCurrentList = () => {
    const currentTab = tabs[selectedTab];
    switch (currentTab.id) {
      case 'create': return toCreate;
      case 'update': return toUpdate;
      case 'delete': return toDelete;
      case 'conflicts': return conflicts;
      default: return [];
    }
  };
  
  // Format file size
  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // Render summary tab
  const renderSummary = () => (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>Sync Preview Summary</Text>
      </Box>
      
      <Box flexDirection="column" marginLeft={2}>
        <Box>
          <Text color="green">• Files to create: </Text>
          <Text bold>{toCreate.length}</Text>
        </Box>
        <Box>
          <Text color="yellow">• Files to update: </Text>
          <Text bold>{toUpdate.length}</Text>
        </Box>
        <Box>
          <Text color="red">• Files to delete: </Text>
          <Text bold>{toDelete.length}</Text>
        </Box>
        <Box>
          <Text color="magenta">• Conflicts to resolve: </Text>
          <Text bold>{conflicts.length}</Text>
        </Box>
        <Box marginTop={1}>
          <Text>Total operations: </Text>
          <Text bold>{totalOperations}</Text>
        </Box>
        <Box>
          <Text>Total size: </Text>
          <Text bold>{formatSize(totalSize)}</Text>
        </Box>
      </Box>
      
      <Box marginTop={2}>
        <Text color="gray">
          {totalOperations === 0 ? 
            'No changes needed - directories are already in sync!' :
            'Press Y to confirm, N to cancel'
          }
        </Text>
      </Box>
    </Box>
  );
  
  // Render file list
  const renderFileList = (files, color, operationType) => {
    if (files.length === 0) {
      return (
        <Box>
          <Text color="gray">No files to {operationType}</Text>
        </Box>
      );
    }
    
    const visibleFiles = showDetails ? files : files.slice(0, 10);
    
    return (
      <Box flexDirection="column">
        {visibleFiles.map((file, index) => {
          const isSelected = index === selectedOperation;
          
          return (
            <Box key={index}>
              <Text color={isSelected ? 'cyan' : color}>
                {isSelected ? '▶ ' : '  '}
                {file.path || file.relPath}
                {file.size && <Text color="gray"> ({formatSize(file.size)})</Text>}
              </Text>
            </Box>
          );
        })}
        
        {!showDetails && files.length > 10 && (
          <Box marginTop={1}>
            <Text color="gray">... and {files.length - 10} more (press D to show all)</Text>
          </Box>
        )}
      </Box>
    );
  };
  
  // Render conflicts
  const renderConflicts = () => {
    if (conflicts.length === 0) {
      return (
        <Box>
          <Text color="gray">No conflicts</Text>
        </Box>
      );
    }
    
    return (
      <Box flexDirection="column">
        {conflicts.map((conflict, index) => {
          const isSelected = index === selectedOperation;
          
          return (
            <Box key={index} flexDirection="column" marginBottom={1}>
              <Box>
                <Text color={isSelected ? 'cyan' : 'magenta'}>
                  {isSelected ? '▶ ' : '  '}
                  {conflict.path}
                </Text>
              </Box>
              {isSelected && (
                <Box marginLeft={4} flexDirection="column">
                  <Text color="gray">Type: {conflict.type}</Text>
                  <Text color="gray">Resolution: {conflict.resolution}</Text>
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
    );
  };
  
  // Render current tab content
  const renderTabContent = () => {
    const currentTab = tabs[selectedTab];
    
    switch (currentTab.id) {
      case 'summary':
        return renderSummary();
      case 'create':
        return renderFileList(toCreate, 'green', 'create');
      case 'update':
        return renderFileList(toUpdate, 'yellow', 'update');
      case 'delete':
        return renderFileList(toDelete, 'red', 'delete');
      case 'conflicts':
        return renderConflicts();
      default:
        return null;
    }
  };
  
  if (!isActive) {
    return (
      <Box>
        <Text color="gray">Sync preview (inactive)</Text>
      </Box>
    );
  }
  
  return (
    <Box flexDirection="column">
      {/* Tab navigation */}
      <Box marginBottom={1} gap={2}>
        {tabs.map((tab, index) => {
          const isSelected = index === selectedTab;
          
          return (
            <Box key={tab.id}>
              <Text 
                bold={isSelected} 
                color={isSelected ? 'cyan' : 'gray'}
              >
                {tab.label}
                {tab.count !== null && ` (${tab.count})`}
              </Text>
            </Box>
          );
        })}
      </Box>
      
      <Divider />
      
      {/* Tab content */}
      <Box marginTop={1} flexDirection="column">
        {renderTabContent()}
      </Box>
      
      {/* Controls */}
      <Box marginTop={2}>
        <Text color="gray">
          ←→: Switch tabs • ↑↓: Navigate • D: {showDetails ? 'Hide' : 'Show'} details • Y: Confirm • N: Cancel
        </Text>
      </Box>
    </Box>
  );
};

export default SyncPreview;