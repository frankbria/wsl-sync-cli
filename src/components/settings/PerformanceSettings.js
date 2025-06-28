import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import { useApp } from '../../store/index.js';
import os from 'os';

const PerformanceSettings = ({ isActive = false, onSave, onCancel }) => {
  const { state, updateSetting } = useApp();
  const { settings } = state;
  
  // Get system info
  const cpuCount = os.cpus().length;
  const totalMemory = os.totalmem();
  
  // Local state for editing
  const [localSettings, setLocalSettings] = useState({
    performanceMode: settings.performanceMode || 'balanced',
    maxWorkerThreads: settings.maxWorkerThreads || 4,
    batchSize: settings.batchSize || 50,
    largeFileThreshold: settings.largeFileThreshold || 10485760, // 10MB
    queueConcurrency: settings.queueConcurrency || 3,
    streamingEnabled: settings.streamingEnabled !== false,
    cacheMetadata: settings.cacheMetadata !== false,
    compressionEnabled: settings.compressionEnabled || false,
    bandwidthLimit: settings.bandwidthLimit || 0, // 0 = unlimited
    memoryLimit: settings.memoryLimit || 512 // MB
  });
  
  // Field navigation
  const fields = [
    'performanceMode',
    'maxWorkerThreads',
    'batchSize',
    'largeFileThreshold',
    'queueConcurrency',
    'streamingEnabled',
    'cacheMetadata',
    'compressionEnabled',
    'bandwidthLimit',
    'memoryLimit'
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
      if (field === 'performanceMode') {
        cyclePerformanceMode();
      } else if (isToggleField(field)) {
        toggleField(field);
      } else {
        setEditingField(field);
      }
    } else if (key.ctrl && input === 's') {
      handleSave();
    } else if (key.escape) {
      onCancel();
    } else if (input === 'a' || input === 'A') {
      // Auto-optimize settings
      autoOptimizeSettings();
    }
  });
  
  // Check if field is a toggle
  const isToggleField = (field) => {
    return ['streamingEnabled', 'cacheMetadata', 'compressionEnabled'].includes(field);
  };
  
  // Toggle boolean field
  const toggleField = (field) => {
    setLocalSettings({
      ...localSettings,
      [field]: !localSettings[field]
    });
  };
  
  // Cycle performance mode
  const cyclePerformanceMode = () => {
    const modes = ['safe', 'balanced', 'fast', 'max'];
    const currentIndex = modes.indexOf(localSettings.performanceMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    
    setLocalSettings({
      ...localSettings,
      performanceMode: nextMode
    });
    
    // Auto-adjust related settings
    applyPerformanceMode(nextMode);
  };
  
  // Apply performance mode presets
  const applyPerformanceMode = (mode) => {
    const presets = {
      safe: {
        maxWorkerThreads: 1,
        batchSize: 10,
        queueConcurrency: 1,
        streamingEnabled: false,
        compressionEnabled: false
      },
      balanced: {
        maxWorkerThreads: Math.min(4, cpuCount),
        batchSize: 50,
        queueConcurrency: 3,
        streamingEnabled: true,
        compressionEnabled: false
      },
      fast: {
        maxWorkerThreads: Math.min(8, cpuCount),
        batchSize: 100,
        queueConcurrency: 5,
        streamingEnabled: true,
        compressionEnabled: false
      },
      max: {
        maxWorkerThreads: cpuCount,
        batchSize: 200,
        queueConcurrency: 10,
        streamingEnabled: true,
        compressionEnabled: true
      }
    };
    
    if (presets[mode]) {
      setLocalSettings(prev => ({
        ...prev,
        ...presets[mode]
      }));
    }
  };
  
  // Auto-optimize based on system capabilities
  const autoOptimizeSettings = () => {
    const availableMemory = os.freemem();
    const memoryGB = totalMemory / (1024 * 1024 * 1024);
    
    let optimizedSettings = { ...localSettings };
    
    // CPU optimization
    if (cpuCount >= 8) {
      optimizedSettings.maxWorkerThreads = Math.floor(cpuCount * 0.75);
      optimizedSettings.queueConcurrency = 8;
    } else if (cpuCount >= 4) {
      optimizedSettings.maxWorkerThreads = cpuCount - 1;
      optimizedSettings.queueConcurrency = 5;
    } else {
      optimizedSettings.maxWorkerThreads = Math.max(1, cpuCount - 1);
      optimizedSettings.queueConcurrency = 3;
    }
    
    // Memory optimization
    if (memoryGB >= 16) {
      optimizedSettings.batchSize = 200;
      optimizedSettings.memoryLimit = 2048;
      optimizedSettings.compressionEnabled = true;
    } else if (memoryGB >= 8) {
      optimizedSettings.batchSize = 100;
      optimizedSettings.memoryLimit = 1024;
    } else {
      optimizedSettings.batchSize = 50;
      optimizedSettings.memoryLimit = 512;
      optimizedSettings.compressionEnabled = false;
    }
    
    setLocalSettings(optimizedSettings);
  };
  
  // Update field value
  const updateFieldValue = (field, value) => {
    const numValue = parseInt(value) || 0;
    
    // Apply constraints
    switch (field) {
      case 'maxWorkerThreads':
        setLocalSettings({
          ...localSettings,
          [field]: Math.max(1, Math.min(cpuCount, numValue))
        });
        break;
      case 'batchSize':
        setLocalSettings({
          ...localSettings,
          [field]: Math.max(1, Math.min(1000, numValue))
        });
        break;
      case 'largeFileThreshold':
        setLocalSettings({
          ...localSettings,
          [field]: Math.max(1048576, numValue) // Min 1MB
        });
        break;
      case 'queueConcurrency':
        setLocalSettings({
          ...localSettings,
          [field]: Math.max(1, Math.min(20, numValue))
        });
        break;
      case 'bandwidthLimit':
        setLocalSettings({
          ...localSettings,
          [field]: Math.max(0, numValue) // 0 = unlimited
        });
        break;
      case 'memoryLimit':
        setLocalSettings({
          ...localSettings,
          [field]: Math.max(128, Math.min(4096, numValue))
        });
        break;
      default:
        setLocalSettings({
          ...localSettings,
          [field]: numValue
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
  
  // Format bytes
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // Render field
  const renderField = (field, index) => {
    const isActiveField = index === activeField && isActive;
    const isEditing = editingField === field;
    
    const fieldLabels = {
      performanceMode: 'Performance Mode',
      maxWorkerThreads: 'Worker Threads',
      batchSize: 'Batch Size',
      largeFileThreshold: 'Large File Threshold',
      queueConcurrency: 'Queue Concurrency',
      streamingEnabled: 'Enable Streaming',
      cacheMetadata: 'Cache Metadata',
      compressionEnabled: 'Enable Compression',
      bandwidthLimit: 'Bandwidth Limit (KB/s)',
      memoryLimit: 'Memory Limit (MB)'
    };
    
    const modeDescriptions = {
      safe: 'Single thread, minimal resources',
      balanced: 'Moderate performance, stable',
      fast: 'High performance, more resources',
      max: 'Maximum performance, all cores'
    };
    
    return (
      <Box key={field} flexDirection="column" marginBottom={1}>
        <Box>
          <Box width={25}>
            <Text color={isActiveField ? 'cyan' : 'white'}>
              {isActiveField ? '▶ ' : '  '}{fieldLabels[field]}:
            </Text>
          </Box>
          
          {field === 'performanceMode' && (
            <Box flexDirection="column">
              <Text color="yellow">
                {localSettings.performanceMode.charAt(0).toUpperCase() + 
                 localSettings.performanceMode.slice(1)}
              </Text>
            </Box>
          )}
          
          {field === 'maxWorkerThreads' && (
            isEditing ? (
              <TextInput
                value={localSettings[field].toString()}
                onChange={(value) => setLocalSettings({ ...localSettings, [field]: value })}
                onSubmit={() => updateFieldValue(field, localSettings[field])}
              />
            ) : (
              <Box>
                <Text color="yellow">{localSettings[field]}</Text>
                <Text color="gray"> / {cpuCount} cores</Text>
              </Box>
            )
          )}
          
          {field === 'largeFileThreshold' && (
            isEditing ? (
              <TextInput
                value={localSettings[field].toString()}
                onChange={(value) => setLocalSettings({ ...localSettings, [field]: value })}
                onSubmit={() => updateFieldValue(field, localSettings[field])}
              />
            ) : (
              <Text color="yellow">{formatBytes(localSettings[field])}</Text>
            )
          )}
          
          {['batchSize', 'queueConcurrency', 'bandwidthLimit', 'memoryLimit'].includes(field) && (
            isEditing ? (
              <TextInput
                value={localSettings[field].toString()}
                onChange={(value) => setLocalSettings({ ...localSettings, [field]: value })}
                onSubmit={() => updateFieldValue(field, localSettings[field])}
              />
            ) : (
              <Text color="yellow">
                {localSettings[field]}{field === 'bandwidthLimit' && localSettings[field] === 0 ? ' (unlimited)' : ''}
              </Text>
            )
          )}
          
          {isToggleField(field) && (
            <Text color={localSettings[field] ? 'green' : 'gray'}>
              {localSettings[field] ? '✓ Enabled' : '✗ Disabled'}
            </Text>
          )}
        </Box>
        
        {isActiveField && field === 'performanceMode' && (
          <Box marginLeft={4}>
            <Text color="gray" italic>{modeDescriptions[localSettings.performanceMode]}</Text>
          </Box>
        )}
      </Box>
    );
  };
  
  return (
    <Box flexDirection="column">
      <Box marginBottom={1} justifyContent="space-between">
        <Text bold color="cyan">Performance Settings</Text>
        <Text color="gray">System: {cpuCount} cores, {formatBytes(totalMemory)} RAM</Text>
      </Box>
      
      <Box flexDirection="column">
        {fields.map((field, index) => renderField(field, index))}
      </Box>
      
      <Box marginTop={2} gap={3}>
        <Text color="gray">
          ↑↓: Navigate • Enter: Edit • A: Auto-optimize • Ctrl+S: Save • ESC: Cancel
        </Text>
      </Box>
    </Box>
  );
};

export default PerformanceSettings;