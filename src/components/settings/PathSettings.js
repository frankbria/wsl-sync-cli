import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import { useApp } from '../../store/index.js';
import { isWSL, convertPath } from '../../lib/wsl-integration.js';
import path from 'path';
import fs from 'fs';
import os from 'os';

const PathSettings = ({ isActive = false, onSave, onCancel }) => {
  const { state, updateSetting } = useApp();
  const { settings } = state;
  
  // Local state for editing
  const [localSettings, setLocalSettings] = useState({
    defaultSourcePath: settings.defaultSourcePath || '',
    defaultDestinationPath: settings.defaultDestinationPath || '',
    recentPaths: settings.recentPaths || [],
    maxRecentPaths: settings.maxRecentPaths || 10,
    pathAliases: settings.pathAliases || {},
    quickAccessPaths: settings.quickAccessPaths || [],
    autoDetectWSLPaths: settings.autoDetectWSLPaths !== false,
    autoExpandHome: settings.autoExpandHome !== false,
    validatePaths: settings.validatePaths !== false,
    createMissingDirectories: settings.createMissingDirectories || false
  });
  
  // Field navigation
  const fields = [
    'defaultSourcePath',
    'defaultDestinationPath',
    'maxRecentPaths',
    'autoDetectWSLPaths',
    'autoExpandHome',
    'validatePaths',
    'createMissingDirectories',
    'quickAccess',
    'pathAliases',
    'clearRecent'
  ];
  
  const [activeField, setActiveField] = useState(0);
  const [editingField, setEditingField] = useState(null);
  const [editingAlias, setEditingAlias] = useState(null);
  const [showQuickAccess, setShowQuickAccess] = useState(false);
  const [showAliases, setShowAliases] = useState(false);
  
  // Handle keyboard input
  useInput((input, key) => {
    if (!isActive) return;
    
    if (editingField || editingAlias) {
      if (key.escape) {
        setEditingField(null);
        setEditingAlias(null);
      }
      return;
    }
    
    if (key.upArrow) {
      setActiveField(prev => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setActiveField(prev => Math.min(fields.length - 1, prev + 1));
    } else if (key.return || input === ' ') {
      const field = fields[activeField];
      
      if (isToggleField(field)) {
        toggleField(field);
      } else if (field === 'quickAccess') {
        setShowQuickAccess(!showQuickAccess);
      } else if (field === 'pathAliases') {
        setShowAliases(!showAliases);
      } else if (field === 'clearRecent') {
        clearRecentPaths();
      } else if (isEditableField(field)) {
        setEditingField(field);
      }
    } else if (input === 'a' || input === 'A') {
      if (fields[activeField] === 'quickAccess') {
        addQuickAccessPath();
      } else if (fields[activeField] === 'pathAliases') {
        setEditingAlias({ name: '', path: '' });
      }
    } else if (input === 'd' || input === 'D') {
      if (fields[activeField] === 'quickAccess' || fields[activeField] === 'pathAliases') {
        // Handle deletion in sub-components
      }
    } else if (key.ctrl && input === 's') {
      handleSave();
    } else if (key.escape) {
      onCancel();
    }
  });
  
  // Check field types
  const isToggleField = (field) => {
    return ['autoDetectWSLPaths', 'autoExpandHome', 'validatePaths', 'createMissingDirectories'].includes(field);
  };
  
  const isEditableField = (field) => {
    return ['defaultSourcePath', 'defaultDestinationPath', 'maxRecentPaths'].includes(field);
  };
  
  // Toggle boolean field
  const toggleField = (field) => {
    setLocalSettings({
      ...localSettings,
      [field]: !localSettings[field]
    });
  };
  
  // Clear recent paths
  const clearRecentPaths = () => {
    setLocalSettings({
      ...localSettings,
      recentPaths: []
    });
  };
  
  // Add quick access path
  const addQuickAccessPath = () => {
    const homePath = os.homedir();
    const desktopPath = path.join(homePath, 'Desktop');
    const documentsPath = path.join(homePath, 'Documents');
    const downloadsPath = path.join(homePath, 'Downloads');
    
    // Common paths to suggest
    const suggestions = [
      { name: 'Home', path: homePath },
      { name: 'Desktop', path: desktopPath },
      { name: 'Documents', path: documentsPath },
      { name: 'Downloads', path: downloadsPath }
    ];
    
    // Filter out already added paths
    const availableSuggestions = suggestions.filter(
      s => !localSettings.quickAccessPaths.some(p => p.path === s.path)
    );
    
    if (availableSuggestions.length > 0) {
      const newPath = availableSuggestions[0];
      setLocalSettings({
        ...localSettings,
        quickAccessPaths: [...localSettings.quickAccessPaths, newPath]
      });
    }
  };
  
  // Remove quick access path
  const removeQuickAccessPath = (index) => {
    const newPaths = [...localSettings.quickAccessPaths];
    newPaths.splice(index, 1);
    setLocalSettings({
      ...localSettings,
      quickAccessPaths: newPaths
    });
  };
  
  // Add or update alias
  const saveAlias = (name, aliasPath) => {
    setLocalSettings({
      ...localSettings,
      pathAliases: {
        ...localSettings.pathAliases,
        [name]: aliasPath
      }
    });
    setEditingAlias(null);
  };
  
  // Remove alias
  const removeAlias = (name) => {
    const newAliases = { ...localSettings.pathAliases };
    delete newAliases[name];
    setLocalSettings({
      ...localSettings,
      pathAliases: newAliases
    });
  };
  
  // Validate path
  const validatePath = (pathStr) => {
    if (!pathStr) return { valid: false, message: 'Path is empty' };
    
    try {
      const expandedPath = pathStr.replace(/^~/, os.homedir());
      const exists = fs.existsSync(expandedPath);
      
      if (!exists) {
        return { valid: false, message: 'Path does not exist' };
      }
      
      const stats = fs.statSync(expandedPath);
      if (!stats.isDirectory()) {
        return { valid: false, message: 'Path is not a directory' };
      }
      
      return { valid: true, message: 'Valid directory' };
    } catch (error) {
      return { valid: false, message: error.message };
    }
  };
  
  // Update field value
  const updateFieldValue = (field, value) => {
    if (field === 'maxRecentPaths') {
      const numValue = parseInt(value) || 5;
      setLocalSettings({
        ...localSettings,
        [field]: Math.max(5, Math.min(50, numValue))
      });
    } else {
      setLocalSettings({
        ...localSettings,
        [field]: value
      });
    }
    setEditingField(null);
  };
  
  // Save settings
  const handleSave = () => {
    Object.entries(localSettings).forEach(([key, value]) => {
      updateSetting(key, value);
    });
    onSave();
  };
  
  // Render field
  const renderField = (field, index) => {
    const isActiveField = index === activeField && isActive;
    const isEditing = editingField === field;
    
    const fieldLabels = {
      defaultSourcePath: 'Default Source Path',
      defaultDestinationPath: 'Default Destination Path',
      maxRecentPaths: 'Max Recent Paths',
      autoDetectWSLPaths: 'Auto-detect WSL Paths',
      autoExpandHome: 'Auto-expand ~ to Home',
      validatePaths: 'Validate Paths',
      createMissingDirectories: 'Create Missing Directories',
      quickAccess: 'Quick Access Paths',
      pathAliases: 'Path Aliases',
      clearRecent: 'Clear Recent Paths'
    };
    
    const fieldDescriptions = {
      defaultSourcePath: 'Default path for source when creating new syncs',
      defaultDestinationPath: 'Default path for destination when creating new syncs',
      maxRecentPaths: 'Number of recent paths to remember',
      autoDetectWSLPaths: 'Automatically convert between Windows and WSL paths',
      autoExpandHome: 'Replace ~ with home directory path',
      validatePaths: 'Check if paths exist before using',
      createMissingDirectories: 'Automatically create directories that don\'t exist',
      quickAccess: 'Frequently used paths for quick selection',
      pathAliases: 'Custom shortcuts for long paths',
      clearRecent: 'Remove all remembered recent paths'
    };
    
    // Special rendering for different field types
    if (field === 'quickAccess') {
      return (
        <Box key={field} flexDirection="column" marginBottom={1}>
          <Box>
            <Box width={25}>
              <Text color={isActiveField ? 'cyan' : 'white'}>
                {isActiveField ? '▶ ' : '  '}{fieldLabels[field]}:
              </Text>
            </Box>
            <Text color="yellow">
              {localSettings.quickAccessPaths.length} paths
            </Text>
          </Box>
          
          {isActiveField && fieldDescriptions[field] && (
            <Box marginLeft={4}>
              <Text color="gray" italic>{fieldDescriptions[field]}</Text>
            </Box>
          )}
          
          {showQuickAccess && isActiveField && (
            <Box marginLeft={4} marginTop={1} flexDirection="column">
              {localSettings.quickAccessPaths.map((qPath, idx) => (
                <Box key={idx}>
                  <Text color="blue">{qPath.name}: </Text>
                  <Text color="gray">{qPath.path}</Text>
                </Box>
              ))}
              {localSettings.quickAccessPaths.length === 0 && (
                <Text color="gray" dimColor>No quick access paths configured</Text>
              )}
              <Box marginTop={1}>
                <Text color="gray">Press A to add common paths</Text>
              </Box>
            </Box>
          )}
        </Box>
      );
    }
    
    if (field === 'pathAliases') {
      const aliasCount = Object.keys(localSettings.pathAliases).length;
      return (
        <Box key={field} flexDirection="column" marginBottom={1}>
          <Box>
            <Box width={25}>
              <Text color={isActiveField ? 'cyan' : 'white'}>
                {isActiveField ? '▶ ' : '  '}{fieldLabels[field]}:
              </Text>
            </Box>
            <Text color="yellow">{aliasCount} aliases</Text>
          </Box>
          
          {isActiveField && fieldDescriptions[field] && (
            <Box marginLeft={4}>
              <Text color="gray" italic>{fieldDescriptions[field]}</Text>
            </Box>
          )}
          
          {showAliases && isActiveField && (
            <Box marginLeft={4} marginTop={1} flexDirection="column">
              {Object.entries(localSettings.pathAliases).map(([name, aliasPath]) => (
                <Box key={name}>
                  <Text color="magenta">@{name}: </Text>
                  <Text color="gray">{aliasPath}</Text>
                </Box>
              ))}
              {aliasCount === 0 && (
                <Text color="gray" dimColor>No path aliases configured</Text>
              )}
              <Box marginTop={1}>
                <Text color="gray">Press A to add new alias</Text>
              </Box>
            </Box>
          )}
          
          {editingAlias && isActiveField && (
            <Box marginLeft={4} marginTop={1} flexDirection="column">
              <Box>
                <Text color="cyan">Alias name: </Text>
                <TextInput
                  value={editingAlias.name}
                  onChange={(value) => setEditingAlias({ ...editingAlias, name: value })}
                  placeholder="e.g., projects"
                />
              </Box>
              <Box>
                <Text color="cyan">Path: </Text>
                <TextInput
                  value={editingAlias.path}
                  onChange={(value) => setEditingAlias({ ...editingAlias, path: value })}
                  onSubmit={() => {
                    if (editingAlias.name && editingAlias.path) {
                      saveAlias(editingAlias.name, editingAlias.path);
                    }
                  }}
                  placeholder="/path/to/directory"
                />
              </Box>
            </Box>
          )}
        </Box>
      );
    }
    
    if (field === 'clearRecent') {
      return (
        <Box key={field} flexDirection="column" marginBottom={1}>
          <Box>
            <Box width={25}>
              <Text color={isActiveField ? 'cyan' : 'white'}>
                {isActiveField ? '▶ ' : '  '}{fieldLabels[field]}
              </Text>
            </Box>
            <Text color="red">
              {localSettings.recentPaths.length} paths stored
            </Text>
          </Box>
          
          {isActiveField && fieldDescriptions[field] && (
            <Box marginLeft={4}>
              <Text color="gray" italic>{fieldDescriptions[field]}</Text>
            </Box>
          )}
        </Box>
      );
    }
    
    // Default field rendering
    return (
      <Box key={field} flexDirection="column" marginBottom={1}>
        <Box>
          <Box width={25}>
            <Text color={isActiveField ? 'cyan' : 'white'}>
              {isActiveField ? '▶ ' : '  '}{fieldLabels[field]}:
            </Text>
          </Box>
          
          {isToggleField(field) && (
            <Text color={localSettings[field] ? 'green' : 'gray'}>
              {localSettings[field] ? '✓ Enabled' : '✗ Disabled'}
            </Text>
          )}
          
          {field === 'maxRecentPaths' && (
            isEditing ? (
              <TextInput
                value={localSettings[field].toString()}
                onChange={(value) => setLocalSettings({ ...localSettings, [field]: value })}
                onSubmit={() => updateFieldValue(field, localSettings[field])}
              />
            ) : (
              <Text color="yellow">{localSettings[field]}</Text>
            )
          )}
          
          {(field === 'defaultSourcePath' || field === 'defaultDestinationPath') && (
            isEditing ? (
              <Box flexDirection="column">
                <TextInput
                  value={localSettings[field]}
                  onChange={(value) => setLocalSettings({ ...localSettings, [field]: value })}
                  onSubmit={() => updateFieldValue(field, localSettings[field])}
                  placeholder="Enter path..."
                />
                {localSettings.validatePaths && localSettings[field] && (
                  <Box marginTop={1}>
                    {(() => {
                      const validation = validatePath(localSettings[field]);
                      return (
                        <Text color={validation.valid ? 'green' : 'red'}>
                          {validation.message}
                        </Text>
                      );
                    })()}
                  </Box>
                )}
              </Box>
            ) : (
              <Text color={localSettings[field] ? 'yellow' : 'gray'}>
                {localSettings[field] || 'Not set'}
              </Text>
            )
          )}
        </Box>
        
        {isActiveField && fieldDescriptions[field] && (
          <Box marginLeft={4}>
            <Text color="gray" italic>{fieldDescriptions[field]}</Text>
          </Box>
        )}
      </Box>
    );
  };
  
  return (
    <Box flexDirection="column">
      <Box marginBottom={1} justifyContent="space-between">
        <Text bold color="cyan">Path Settings</Text>
        {isWSL() && (
          <Text color="gray">WSL Detected</Text>
        )}
      </Box>
      
      <Box flexDirection="column">
        {fields.map((field, index) => renderField(field, index))}
      </Box>
      
      <Box marginTop={2} gap={3}>
        <Text color="gray">
          ↑↓: Navigate • Enter: Edit/Toggle • Ctrl+S: Save • ESC: Cancel
        </Text>
      </Box>
    </Box>
  );
};

export default PathSettings;