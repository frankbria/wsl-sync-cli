import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import { useApp } from '../../store/index.js';

const DisplaySettings = ({ isActive = false, onSave, onCancel }) => {
  const { state, updateSetting } = useApp();
  const { settings } = state;
  
  // Local state for editing
  const [localSettings, setLocalSettings] = useState({
    theme: settings.theme || 'default',
    showAnimations: settings.showAnimations !== false,
    showProgress: settings.showProgress !== false,
    showFileNames: settings.showFileNames !== false,
    compactMode: settings.compactMode || false,
    colorScheme: settings.colorScheme || 'default',
    dateFormat: settings.dateFormat || 'relative',
    sizeFormat: settings.sizeFormat || 'auto',
    pathDisplay: settings.pathDisplay || 'full',
    errorDisplay: settings.errorDisplay || 'detailed',
    clearScreenOnStart: settings.clearScreenOnStart || false,
    showEmojis: settings.showEmojis !== false,
    highlightChanges: settings.highlightChanges !== false,
    showStatistics: settings.showStatistics !== false
  });
  
  // Field navigation
  const fields = [
    'theme',
    'colorScheme',
    'showAnimations',
    'showProgress',
    'showFileNames',
    'compactMode',
    'dateFormat',
    'sizeFormat',
    'pathDisplay',
    'errorDisplay',
    'clearScreenOnStart',
    'showEmojis',
    'highlightChanges',
    'showStatistics'
  ];
  
  const [activeField, setActiveField] = useState(0);
  const [previewMode, setPreviewMode] = useState(false);
  
  // Handle keyboard input
  useInput((input, key) => {
    if (!isActive) return;
    
    if (key.upArrow) {
      setActiveField(prev => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setActiveField(prev => Math.min(fields.length - 1, prev + 1));
    } else if (key.return || input === ' ') {
      const field = fields[activeField];
      if (isToggleField(field)) {
        toggleField(field);
      } else if (isSelectField(field)) {
        cycleSelectField(field);
      }
    } else if (input === 'p' || input === 'P') {
      setPreviewMode(!previewMode);
    } else if (key.ctrl && input === 's') {
      handleSave();
    } else if (key.escape) {
      onCancel();
    }
  });
  
  // Check field types
  const isToggleField = (field) => {
    return [
      'showAnimations', 'showProgress', 'showFileNames', 'compactMode',
      'clearScreenOnStart', 'showEmojis', 'highlightChanges', 'showStatistics'
    ].includes(field);
  };
  
  const isSelectField = (field) => {
    return ['theme', 'colorScheme', 'dateFormat', 'sizeFormat', 'pathDisplay', 'errorDisplay'].includes(field);
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
      case 'theme':
        return [
          { label: 'Default', value: 'default' },
          { label: 'Minimal', value: 'minimal' },
          { label: 'Detailed', value: 'detailed' }
        ];
      case 'colorScheme':
        return [
          { label: 'Default Colors', value: 'default' },
          { label: 'High Contrast', value: 'highContrast' },
          { label: 'Monochrome', value: 'monochrome' },
          { label: 'Colorful', value: 'colorful' }
        ];
      case 'dateFormat':
        return [
          { label: 'Relative (2 hours ago)', value: 'relative' },
          { label: 'Short (Jan 1)', value: 'short' },
          { label: 'Long (January 1, 2024)', value: 'long' },
          { label: 'ISO (2024-01-01)', value: 'iso' }
        ];
      case 'sizeFormat':
        return [
          { label: 'Auto (KB, MB, GB)', value: 'auto' },
          { label: 'Bytes', value: 'bytes' },
          { label: 'Human Readable', value: 'human' }
        ];
      case 'pathDisplay':
        return [
          { label: 'Full Path', value: 'full' },
          { label: 'Relative Path', value: 'relative' },
          { label: 'Basename Only', value: 'basename' }
        ];
      case 'errorDisplay':
        return [
          { label: 'Detailed', value: 'detailed' },
          { label: 'Summary', value: 'summary' },
          { label: 'Minimal', value: 'minimal' }
        ];
      default:
        return [];
    }
  };
  
  // Save settings
  const handleSave = () => {
    Object.entries(localSettings).forEach(([key, value]) => {
      updateSetting(key, value);
    });
    onSave();
  };
  
  // Render preview
  const renderPreview = () => {
    const colors = {
      default: { primary: 'cyan', secondary: 'yellow', success: 'green', error: 'red' },
      highContrast: { primary: 'white', secondary: 'yellow', success: 'green', error: 'red' },
      monochrome: { primary: 'white', secondary: 'gray', success: 'white', error: 'white' },
      colorful: { primary: 'magenta', secondary: 'cyan', success: 'green', error: 'red' }
    };
    
    const scheme = colors[localSettings.colorScheme] || colors.default;
    
    return (
      <Box 
        flexDirection="column" 
        borderStyle="round" 
        borderColor="gray"
        padding={1}
        marginTop={1}
      >
        <Text bold color={scheme.primary}>Preview</Text>
        <Box marginTop={1} flexDirection="column">
          <Box>
            <Text color={scheme.primary}>Primary Text</Text>
            <Text> | </Text>
            <Text color={scheme.secondary}>Secondary Text</Text>
          </Box>
          <Box>
            <Text color={scheme.success}>✓ Success Message</Text>
          </Box>
          <Box>
            <Text color={scheme.error}>✗ Error Message</Text>
          </Box>
          {localSettings.showEmojis && (
            <Box>
              <Text>📁 Folder </Text>
              <Text>📄 File </Text>
              <Text>✨ Animation</Text>
            </Box>
          )}
          {localSettings.showProgress && (
            <Box>
              <Text color="gray">[</Text>
              <Text color={scheme.primary}>████████</Text>
              <Text color="gray">░░] 80%</Text>
            </Box>
          )}
        </Box>
      </Box>
    );
  };
  
  // Render field
  const renderField = (field, index) => {
    const isActiveField = index === activeField && isActive;
    
    const fieldLabels = {
      theme: 'Display Theme',
      colorScheme: 'Color Scheme',
      showAnimations: 'Show Animations',
      showProgress: 'Show Progress Bars',
      showFileNames: 'Show File Names',
      compactMode: 'Compact Mode',
      dateFormat: 'Date Format',
      sizeFormat: 'Size Format',
      pathDisplay: 'Path Display',
      errorDisplay: 'Error Display',
      clearScreenOnStart: 'Clear Screen on Start',
      showEmojis: 'Show Emojis',
      highlightChanges: 'Highlight Changes',
      showStatistics: 'Show Statistics'
    };
    
    const fieldDescriptions = {
      theme: 'Overall UI layout style',
      colorScheme: 'Color palette for the interface',
      showAnimations: 'Enable spinner and transition animations',
      showProgress: 'Display progress bars during operations',
      showFileNames: 'Show individual file names during sync',
      compactMode: 'Reduce spacing for more content',
      dateFormat: 'How to display dates and times',
      sizeFormat: 'How to display file sizes',
      pathDisplay: 'How to show file paths',
      errorDisplay: 'Level of detail for error messages',
      clearScreenOnStart: 'Clear terminal when starting',
      showEmojis: 'Use emoji icons in the interface',
      highlightChanges: 'Highlight modified items',
      showStatistics: 'Display sync statistics'
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
        <Text bold color="cyan">Display Settings</Text>
        <Text color="gray">{previewMode ? 'Preview Mode' : 'Press P for preview'}</Text>
      </Box>
      
      <Box flexDirection="column">
        {fields.map((field, index) => renderField(field, index))}
      </Box>
      
      {previewMode && renderPreview()}
      
      <Box marginTop={2} gap={3}>
        <Text color="gray">
          ↑↓: Navigate • Enter/Space: Toggle • P: Preview • Ctrl+S: Save • ESC: Cancel
        </Text>
      </Box>
    </Box>
  );
};

export default DisplaySettings;