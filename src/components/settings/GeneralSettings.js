import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import { useApp } from '../../store/index.js';

const GeneralSettings = ({ isActive = false, onSave, onCancel }) => {
  const { state, updateSetting } = useApp();
  const { settings } = state;
  
  // Local state for editing
  const [localSettings, setLocalSettings] = useState({
    conflictResolution: settings.conflictResolution || 'newer',
    deleteOrphaned: settings.deleteOrphaned || false,
    confirmDeletions: settings.confirmDeletions !== false,
    preservePermissions: settings.preservePermissions || false,
    enableVerification: settings.enableVerification || false,
    autoSaveProfiles: settings.autoSaveProfiles !== false,
    notificationLevel: settings.notificationLevel || 'all',
    logLevel: settings.logLevel || 'info',
    retryAttempts: settings.retryAttempts || 3,
    retryDelay: settings.retryDelay || 1000
  });
  
  // Field navigation
  const fields = [
    'conflictResolution',
    'deleteOrphaned',
    'confirmDeletions',
    'preservePermissions',
    'enableVerification',
    'autoSaveProfiles',
    'notificationLevel',
    'logLevel',
    'retryAttempts',
    'retryDelay'
  ];
  
  const [activeField, setActiveField] = useState(0);
  const [editingField, setEditingField] = useState(null);
  
  // Handle keyboard input
  useInput((input, key) => {
    if (!isActive) return;
    
    if (editingField) {
      if (key.escape) {
        setEditingField(null);
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
      } else if (isSelectField(field)) {
        // For select fields, cycle through options
        cycleSelectField(field);
      } else {
        setEditingField(field);
      }
    } else if (key.ctrl && input === 's') {
      handleSave();
    } else if (key.escape) {
      onCancel();
    }
  });
  
  // Check field types
  const isToggleField = (field) => {
    return ['deleteOrphaned', 'confirmDeletions', 'preservePermissions', 
            'enableVerification', 'autoSaveProfiles'].includes(field);
  };
  
  const isSelectField = (field) => {
    return ['conflictResolution', 'notificationLevel', 'logLevel'].includes(field);
  };
  
  const isNumberField = (field) => {
    return ['retryAttempts', 'retryDelay'].includes(field);
  };
  
  // Toggle boolean field
  const toggleField = (field) => {
    setLocalSettings({
      ...localSettings,
      [field]: !localSettings[field]
    });
  };
  
  // Cycle through select field options
  const cycleSelectField = (field) => {
    const options = getFieldOptions(field);
    const currentIndex = options.findIndex(opt => opt.value === localSettings[field]);
    const nextIndex = (currentIndex + 1) % options.length;
    
    setLocalSettings({
      ...localSettings,
      [field]: options[nextIndex].value
    });
  };
  
  // Get options for select fields
  const getFieldOptions = (field) => {
    switch (field) {
      case 'conflictResolution':
        return [
          { label: 'Newer file wins', value: 'newer' },
          { label: 'Source wins', value: 'source' },
          { label: 'Destination wins', value: 'destination' },
          { label: 'Ask each time', value: 'manual' }
        ];
      case 'notificationLevel':
        return [
          { label: 'All notifications', value: 'all' },
          { label: 'Errors only', value: 'errors' },
          { label: 'None', value: 'none' }
        ];
      case 'logLevel':
        return [
          { label: 'Debug', value: 'debug' },
          { label: 'Info', value: 'info' },
          { label: 'Warning', value: 'warn' },
          { label: 'Error', value: 'error' }
        ];
      default:
        return [];
    }
  };
  
  // Update field value
  const updateFieldValue = (field, value) => {
    if (isNumberField(field)) {
      const numValue = parseInt(value) || 0;
      setLocalSettings({
        ...localSettings,
        [field]: Math.max(0, numValue)
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
    // Update each setting
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
      conflictResolution: 'Conflict Resolution',
      deleteOrphaned: 'Delete Orphaned Files',
      confirmDeletions: 'Confirm Before Deletions',
      preservePermissions: 'Preserve File Permissions',
      enableVerification: 'Verify Files After Sync',
      autoSaveProfiles: 'Auto-save Profile Changes',
      notificationLevel: 'Notification Level',
      logLevel: 'Log Level',
      retryAttempts: 'Retry Attempts',
      retryDelay: 'Retry Delay (ms)'
    };
    
    const fieldDescriptions = {
      conflictResolution: 'How to handle files that changed in both locations',
      deleteOrphaned: 'Remove files from destination that no longer exist in source',
      confirmDeletions: 'Ask for confirmation before deleting files',
      preservePermissions: 'Maintain Linux file permissions (WSL only)',
      enableVerification: 'Check file integrity after sync using checksums',
      autoSaveProfiles: 'Automatically save profile statistics and settings',
      notificationLevel: 'Control which notifications are displayed',
      logLevel: 'Set logging verbosity for debugging',
      retryAttempts: 'Number of times to retry failed operations',
      retryDelay: 'Time to wait between retry attempts'
    };
    
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
          
          {isSelectField(field) && (
            <Text color="yellow">
              {getFieldOptions(field).find(opt => opt.value === localSettings[field])?.label}
            </Text>
          )}
          
          {isNumberField(field) && (
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
      <Box marginBottom={1}>
        <Text bold color="cyan">General Settings</Text>
      </Box>
      
      <Box flexDirection="column">
        {fields.map((field, index) => renderField(field, index))}
      </Box>
      
      <Box marginTop={2} gap={3}>
        <Text color="gray">
          ↑↓: Navigate • Enter/Space: Toggle/Edit • Ctrl+S: Save • ESC: Cancel
        </Text>
      </Box>
    </Box>
  );
};

export default GeneralSettings;