import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import { useApp } from '../../store/index.js';
import { FilterManager } from '../../../lib/filters.js';

const SyncOptions = ({ isActive = false }) => {
  const { state, setSyncDirection, updateSetting, setActiveFilter } = useApp();
  const { syncDirection, settings, activeFilter } = state;
  
  const [selectedOption, setSelectedOption] = useState(0);
  const [expandedSection, setExpandedSection] = useState(null);
  
  // Define options structure
  const options = [
    {
      id: 'direction',
      label: 'Sync Direction',
      value: syncDirection,
      type: 'select',
      choices: [
        { label: '↔ Two-way sync', value: 'two-way' },
        { label: '→ Source to Destination only', value: 'source-to-dest' },
        { label: '← Destination to Source only', value: 'dest-to-source' }
      ]
    },
    {
      id: 'conflictResolution',
      label: 'Conflict Resolution',
      value: settings.conflictResolution || 'newer',
      type: 'select',
      choices: [
        { label: '🕐 Newer file wins', value: 'newer' },
        { label: '📁 Source wins', value: 'source' },
        { label: '📂 Destination wins', value: 'destination' },
        { label: '❓ Ask each time', value: 'manual' }
      ]
    },
    {
      id: 'dryRun',
      label: 'Dry Run Mode',
      value: settings.dryRun || false,
      type: 'toggle',
      description: 'Preview changes without syncing'
    },
    {
      id: 'deleteOrphaned',
      label: 'Delete Orphaned Files',
      value: settings.deleteOrphaned || false,
      type: 'toggle',
      description: 'Remove files that no longer exist in source'
    },
    {
      id: 'preservePermissions',
      label: 'Preserve Permissions',
      value: settings.preservePermissions || false,
      type: 'toggle',
      description: 'Maintain file permissions (WSL only)'
    },
    {
      id: 'filter',
      label: 'File Filter',
      value: activeFilter ? activeFilter.name : 'None',
      type: 'select',
      choices: [
        { label: 'None - Sync all files', value: null },
        { label: '🌐 Web Development', value: 'webDevelopment' },
        { label: '🐍 Python Project', value: 'pythonProject' },
        { label: '📄 Documents', value: 'documents' },
        { label: '💻 Source Code', value: 'sourceCode' },
        { label: '🎨 Media Files', value: 'mediaFiles' }
      ]
    },
    {
      id: 'performance',
      label: 'Performance Mode',
      value: settings.performanceMode || 'balanced',
      type: 'select',
      choices: [
        { label: '🐌 Safe (Single thread)', value: 'safe' },
        { label: '⚖️ Balanced (4 threads)', value: 'balanced' },
        { label: '🚀 Fast (8 threads)', value: 'fast' },
        { label: '⚡ Maximum (Auto)', value: 'max' }
      ]
    }
  ];
  
  // Handle keyboard input
  useInput((input, key) => {
    if (!isActive) return;
    
    if (key.upArrow) {
      setSelectedOption(prev => (prev - 1 + options.length) % options.length);
    } else if (key.downArrow) {
      setSelectedOption(prev => (prev + 1) % options.length);
    } else if (key.return || input === ' ') {
      const option = options[selectedOption];
      
      if (option.type === 'toggle') {
        // Toggle boolean value
        updateSetting(option.id, !option.value);
      } else if (option.type === 'select') {
        // Expand/collapse selection
        setExpandedSection(expandedSection === option.id ? null : option.id);
      }
    } else if (key.escape) {
      setExpandedSection(null);
    }
  });
  
  // Handle choice selection
  const handleChoiceSelect = (choice, optionId) => {
    const option = options.find(o => o.id === optionId);
    
    switch (optionId) {
      case 'direction':
        setSyncDirection(choice.value);
        break;
      case 'filter':
        if (choice.value) {
          // Apply preset filter
          const filterManager = new FilterManager();
          filterManager.applyPreset(choice.value);
          setActiveFilter({
            name: choice.label,
            preset: choice.value,
            manager: filterManager
          });
        } else {
          setActiveFilter(null);
        }
        break;
      default:
        updateSetting(optionId, choice.value);
    }
    
    setExpandedSection(null);
  };
  
  const renderOption = (option, index) => {
    const isSelected = index === selectedOption && isActive;
    const isExpanded = expandedSection === option.id;
    
    return (
      <Box key={option.id} flexDirection="column" marginBottom={1}>
        <Box>
          <Text color={isSelected ? 'cyan' : 'white'}>
            {isSelected ? '▶ ' : '  '}
            <Text bold>{option.label}: </Text>
            {option.type === 'toggle' ? (
              <Text color={option.value ? 'green' : 'gray'}>
                {option.value ? '✓ Enabled' : '✗ Disabled'}
              </Text>
            ) : (
              <Text color="yellow">
                {typeof option.value === 'string' ? option.value : 'Select...'}
              </Text>
            )}
          </Text>
        </Box>
        
        {option.description && isSelected && (
          <Box marginLeft={4}>
            <Text color="gray" italic>{option.description}</Text>
          </Box>
        )}
        
        {isExpanded && option.choices && (
          <Box marginLeft={4} marginTop={1}>
            <SelectInput
              items={option.choices}
              onSelect={(choice) => handleChoiceSelect(choice, option.id)}
              indicatorComponent={({ isSelected }) => (
                <Text color="cyan">{isSelected ? '→' : ' '}</Text>
              )}
              itemComponent={({ label, isSelected }) => (
                <Text color={isSelected ? 'cyan' : 'gray'}>{label}</Text>
              )}
            />
          </Box>
        )}
      </Box>
    );
  };
  
  if (!isActive) {
    return (
      <Box flexDirection="column">
        <Text color="gray">Sync options (inactive)</Text>
      </Box>
    );
  }
  
  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">Sync Options</Text>
      </Box>
      
      {options.map((option, index) => renderOption(option, index))}
      
      <Box marginTop={1}>
        <Text color="gray" italic>
          Use ↑↓ to navigate, Enter/Space to toggle, ESC to close
        </Text>
      </Box>
    </Box>
  );
};

export default SyncOptions;