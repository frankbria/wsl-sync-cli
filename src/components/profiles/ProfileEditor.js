import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import { useApp } from '../../store/index.js';
import { ProfileManager } from '../../../lib/profiles.js';
import PathInput from '../sync/PathInput.js';
import Divider from '../common/Divider.js';

const ProfileEditor = ({ 
  profile = null, 
  template = null,
  onSave, 
  onCancel,
  isActive = false 
}) => {
  const { state, addProfile, updateProfile, addNotification } = useApp();
  const isNewProfile = !profile;
  
  // Form fields
  const [formData, setFormData] = useState({
    name: profile?.name || template?.name || '',
    description: profile?.description || template?.description || '',
    sourcePath: profile?.sourcePath || template?.sourcePath || '',
    destinationPath: profile?.destinationPath || template?.destinationPath || '',
    syncDirection: profile?.syncDirection || template?.syncDirection || 'two-way',
    template: profile?.template || template?.id || 'custom',
    options: {
      deleteOrphaned: profile?.options?.deleteOrphaned || template?.options?.deleteOrphaned || false,
      preservePermissions: profile?.options?.preservePermissions || template?.options?.preservePermissions || false,
      dryRun: profile?.options?.dryRun || false,
      conflictResolution: profile?.options?.conflictResolution || template?.options?.conflictResolution || 'newer',
      filter: profile?.options?.filter || template?.options?.filter || null,
      performanceMode: profile?.options?.performanceMode || template?.options?.performanceMode || 'balanced'
    },
    autoSync: profile?.autoSync || {
      enabled: false,
      interval: 30,
      onStartup: false
    }
  });
  
  // Field navigation
  const fields = [
    'name', 'description', 'sourcePath', 'destinationPath', 
    'syncDirection', 'deleteOrphaned', 'preservePermissions', 
    'dryRun', 'conflictResolution', 'filter', 'performanceMode',
    'autoSyncEnabled', 'autoSyncInterval', 'autoSyncOnStartup'
  ];
  const [activeField, setActiveField] = useState(0);
  const [editingField, setEditingField] = useState(null);
  const [errors, setErrors] = useState({});
  
  // Input handling
  useInput((input, key) => {
    if (!isActive) return;
    
    if (editingField) {
      // Let the input component handle it
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
      if (isTextField(field)) {
        setEditingField(field);
      } else {
        toggleField(field);
      }
    } else if (key.ctrl && input === 's') {
      handleSave();
    } else if (key.escape) {
      onCancel();
    }
  });
  
  // Check if field is a text input
  const isTextField = (field) => {
    return ['name', 'description', 'sourcePath', 'destinationPath', 'autoSyncInterval'].includes(field);
  };
  
  // Toggle boolean/select fields
  const toggleField = (field) => {
    switch (field) {
      case 'syncDirection':
        const directions = ['two-way', 'source-to-dest', 'dest-to-source'];
        const currentIndex = directions.indexOf(formData.syncDirection);
        setFormData({
          ...formData,
          syncDirection: directions[(currentIndex + 1) % directions.length]
        });
        break;
        
      case 'deleteOrphaned':
      case 'preservePermissions':
      case 'dryRun':
        setFormData({
          ...formData,
          options: {
            ...formData.options,
            [field]: !formData.options[field]
          }
        });
        break;
        
      case 'autoSyncEnabled':
        setFormData({
          ...formData,
          autoSync: {
            ...formData.autoSync,
            enabled: !formData.autoSync.enabled
          }
        });
        break;
        
      case 'autoSyncOnStartup':
        setFormData({
          ...formData,
          autoSync: {
            ...formData.autoSync,
            onStartup: !formData.autoSync.onStartup
          }
        });
        break;
        
      case 'conflictResolution':
        const resolutions = ['newer', 'source', 'destination', 'manual'];
        const resIndex = resolutions.indexOf(formData.options.conflictResolution);
        setFormData({
          ...formData,
          options: {
            ...formData.options,
            conflictResolution: resolutions[(resIndex + 1) % resolutions.length]
          }
        });
        break;
        
      case 'performanceMode':
        const modes = ['safe', 'balanced', 'fast', 'max'];
        const modeIndex = modes.indexOf(formData.options.performanceMode);
        setFormData({
          ...formData,
          options: {
            ...formData.options,
            performanceMode: modes[(modeIndex + 1) % modes.length]
          }
        });
        break;
    }
  };
  
  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Profile name is required';
    }
    
    if (!formData.sourcePath.trim()) {
      newErrors.sourcePath = 'Source path is required';
    }
    
    if (!formData.destinationPath.trim()) {
      newErrors.destinationPath = 'Destination path is required';
    }
    
    if (formData.sourcePath === formData.destinationPath) {
      newErrors.paths = 'Source and destination paths must be different';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Save profile
  const handleSave = async () => {
    if (!validateForm()) {
      addNotification({
        type: 'error',
        message: 'Please fix the errors before saving'
      });
      return;
    }
    
    try {
      const profileManager = new ProfileManager();
      await profileManager.initialize();
      
      const profileData = {
        ...formData,
        id: profile?.id || profileManager.generateId(),
        created: profile?.created || new Date().toISOString(),
        updated: new Date().toISOString()
      };
      
      if (isNewProfile) {
        await profileManager.createProfile(profileData);
        addProfile(profileData);
        addNotification({
          type: 'success',
          message: `Profile "${profileData.name}" created`
        });
      } else {
        await profileManager.updateProfile(profileData.id, profileData);
        updateProfile(profileData);
        addNotification({
          type: 'success',
          message: `Profile "${profileData.name}" updated`
        });
      }
      
      onSave(profileData);
    } catch (error) {
      addNotification({
        type: 'error',
        message: `Failed to save profile: ${error.message}`
      });
    }
  };
  
  // Update field value
  const updateField = (field, value) => {
    if (field === 'autoSyncInterval') {
      const interval = parseInt(value) || 30;
      setFormData({
        ...formData,
        autoSync: {
          ...formData.autoSync,
          interval: Math.max(1, Math.min(1440, interval)) // 1 min to 24 hours
        }
      });
    } else if (['name', 'description', 'sourcePath', 'destinationPath'].includes(field)) {
      setFormData({
        ...formData,
        [field]: value
      });
    }
    setEditingField(null);
  };
  
  // Render field
  const renderField = (fieldName, index) => {
    const isActive = index === activeField;
    const isEditing = editingField === fieldName;
    const error = errors[fieldName];
    
    switch (fieldName) {
      case 'name':
        return (
          <Box key={fieldName} marginBottom={1}>
            <Box width={20}>
              <Text color={isActive ? 'cyan' : 'white'}>
                {isActive ? '▶ ' : '  '}Profile Name:
              </Text>
            </Box>
            {isEditing ? (
              <TextInput
                value={formData.name}
                onChange={(value) => setFormData({ ...formData, name: value })}
                onSubmit={() => updateField('name', formData.name)}
              />
            ) : (
              <Text color={error ? 'red' : 'yellow'}>
                {formData.name || '<Enter name>'}
              </Text>
            )}
            {error && <Text color="red"> {error}</Text>}
          </Box>
        );
        
      case 'description':
        return (
          <Box key={fieldName} marginBottom={1}>
            <Box width={20}>
              <Text color={isActive ? 'cyan' : 'white'}>
                {isActive ? '▶ ' : '  '}Description:
              </Text>
            </Box>
            {isEditing ? (
              <TextInput
                value={formData.description}
                onChange={(value) => setFormData({ ...formData, description: value })}
                onSubmit={() => updateField('description', formData.description)}
              />
            ) : (
              <Text color="gray">
                {formData.description || '<Optional description>'}
              </Text>
            )}
          </Box>
        );
        
      case 'sourcePath':
      case 'destinationPath':
        const pathField = fieldName === 'sourcePath' ? 'Source Path' : 'Destination Path';
        const pathValue = formData[fieldName];
        return (
          <Box key={fieldName} marginBottom={1}>
            <Box width={20}>
              <Text color={isActive ? 'cyan' : 'white'}>
                {isActive ? '▶ ' : '  '}{pathField}:
              </Text>
            </Box>
            {isEditing ? (
              <TextInput
                value={pathValue}
                onChange={(value) => setFormData({ ...formData, [fieldName]: value })}
                onSubmit={() => updateField(fieldName, pathValue)}
              />
            ) : (
              <Text color={errors[fieldName] ? 'red' : 'yellow'}>
                {pathValue || '<Enter path>'}
              </Text>
            )}
            {errors[fieldName] && <Text color="red"> {errors[fieldName]}</Text>}
          </Box>
        );
        
      case 'syncDirection':
        const directionLabels = {
          'two-way': '↔ Two-way sync',
          'source-to-dest': '→ Source to Destination',
          'dest-to-source': '← Destination to Source'
        };
        return (
          <Box key={fieldName} marginBottom={1}>
            <Box width={20}>
              <Text color={isActive ? 'cyan' : 'white'}>
                {isActive ? '▶ ' : '  '}Sync Direction:
              </Text>
            </Box>
            <Text color="yellow">
              {directionLabels[formData.syncDirection]}
            </Text>
          </Box>
        );
        
      case 'deleteOrphaned':
      case 'preservePermissions':
      case 'dryRun':
        const optionLabels = {
          deleteOrphaned: 'Delete Orphaned Files',
          preservePermissions: 'Preserve Permissions',
          dryRun: 'Dry Run Mode'
        };
        return (
          <Box key={fieldName} marginBottom={1}>
            <Box width={20}>
              <Text color={isActive ? 'cyan' : 'white'}>
                {isActive ? '▶ ' : '  '}{optionLabels[fieldName]}:
              </Text>
            </Box>
            <Text color={formData.options[fieldName] ? 'green' : 'gray'}>
              {formData.options[fieldName] ? '✓ Enabled' : '✗ Disabled'}
            </Text>
          </Box>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">
          {isNewProfile ? 'Create New Profile' : `Edit Profile: ${profile.name}`}
        </Text>
      </Box>
      
      <Divider />
      
      <Box flexDirection="column" marginTop={1}>
        {fields.slice(0, 11).map((field, index) => renderField(field, index))}
      </Box>
      
      {errors.paths && (
        <Box marginTop={1}>
          <Text color="red">⚠ {errors.paths}</Text>
        </Box>
      )}
      
      <Box marginTop={2} gap={3}>
        <Text color="gray">Controls: </Text>
        <Text color="green">Ctrl+S: Save</Text>
        <Text color="red">ESC: Cancel</Text>
        <Text color="gray">↑↓: Navigate • Enter: Edit/Toggle</Text>
      </Box>
    </Box>
  );
};

export default ProfileEditor;