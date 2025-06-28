import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import { useApp } from '../../store/index.js';
import { FilterManager as FilterLib } from '../../lib/filters.js';

const FilterManager = ({ 
  onApply, 
  onCancel, 
  isActive = false,
  currentFilter = null 
}) => {
  const { state, addNotification } = useApp();
  const filterManager = new FilterLib();
  
  // State
  const [activeTab, setActiveTab] = useState('preset'); // 'preset', 'custom', 'combined'
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [customFilter, setCustomFilter] = useState({
    name: '',
    extensions: [],
    sizeMin: '',
    sizeMax: '',
    modifiedWithin: '',
    patterns: []
  });
  const [combinedFilters, setCombinedFilters] = useState([]);
  const [editingField, setEditingField] = useState(null);
  const [tempValue, setTempValue] = useState('');
  
  // Get preset filters
  const presetFilters = filterManager.getPresetFilters();
  const presetItems = Object.entries(presetFilters).map(([key, filter]) => ({
    label: `${filter.name} - ${filter.description}`,
    value: key,
    filter: filter
  }));
  
  // Initialize with current filter if provided
  useEffect(() => {
    if (currentFilter) {
      if (currentFilter.preset) {
        setSelectedPreset(currentFilter.preset);
        setActiveTab('preset');
      } else if (currentFilter.custom) {
        setCustomFilter(currentFilter.custom);
        setActiveTab('custom');
      }
    }
  }, [currentFilter]);
  
  // Handle keyboard input
  useInput((input, key) => {
    if (!isActive) return;
    
    if (editingField) {
      if (key.escape) {
        setEditingField(null);
        setTempValue('');
      }
      return;
    }
    
    if (key.leftArrow || input === 'h') {
      const tabs = ['preset', 'custom', 'combined'];
      const currentIndex = tabs.indexOf(activeTab);
      setActiveTab(tabs[Math.max(0, currentIndex - 1)]);
    } else if (key.rightArrow || input === 'l') {
      const tabs = ['preset', 'custom', 'combined'];
      const currentIndex = tabs.indexOf(activeTab);
      setActiveTab(tabs[Math.min(tabs.length - 1, currentIndex + 1)]);
    } else if (input === '1') {
      setActiveTab('preset');
    } else if (input === '2') {
      setActiveTab('custom');
    } else if (input === '3') {
      setActiveTab('combined');
    } else if (key.return || input === ' ') {
      handleApply();
    } else if (key.escape) {
      onCancel();
    } else if (input === 'c' || input === 'C') {
      clearFilters();
    }
  });
  
  // Parse size string (e.g., "10MB", "1GB")
  const parseSize = (sizeStr) => {
    if (!sizeStr) return null;
    
    const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB|TB)?$/i);
    if (!match) return null;
    
    const value = parseFloat(match[1]);
    const unit = (match[2] || 'B').toUpperCase();
    
    const multipliers = {
      B: 1,
      KB: 1024,
      MB: 1024 * 1024,
      GB: 1024 * 1024 * 1024,
      TB: 1024 * 1024 * 1024 * 1024
    };
    
    return value * multipliers[unit];
  };
  
  // Format size for display
  const formatSize = (bytes) => {
    if (!bytes) return '';
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(size < 10 ? 1 : 0)}${units[unitIndex]}`;
  };
  
  // Parse duration string (e.g., "7d", "2w", "1m")
  const parseDuration = (durationStr) => {
    if (!durationStr) return null;
    
    const match = durationStr.match(/^(\d+)\s*([hdwmy])?$/i);
    if (!match) return null;
    
    const value = parseInt(match[1]);
    const unit = (match[2] || 'd').toLowerCase();
    
    const multipliers = {
      h: 1 / 24,
      d: 1,
      w: 7,
      m: 30,
      y: 365
    };
    
    return value * multipliers[unit];
  };
  
  // Update custom filter field
  const updateCustomField = (field, value) => {
    if (field === 'extensions' || field === 'patterns') {
      // Convert comma-separated string to array
      const items = value.split(',').map(item => item.trim()).filter(item => item);
      setCustomFilter({ ...customFilter, [field]: items });
    } else {
      setCustomFilter({ ...customFilter, [field]: value });
    }
    setEditingField(null);
    setTempValue('');
  };
  
  // Clear all filters
  const clearFilters = () => {
    setSelectedPreset(null);
    setCustomFilter({
      name: '',
      extensions: [],
      sizeMin: '',
      sizeMax: '',
      modifiedWithin: '',
      patterns: []
    });
    setCombinedFilters([]);
  };
  
  // Apply filters
  const handleApply = () => {
    let filter = null;
    
    switch (activeTab) {
      case 'preset':
        if (selectedPreset) {
          filter = {
            type: 'preset',
            preset: selectedPreset,
            ...presetFilters[selectedPreset]
          };
        }
        break;
        
      case 'custom':
        // Validate and build custom filter
        const hasCustomRules = 
          customFilter.extensions.length > 0 ||
          customFilter.sizeMin ||
          customFilter.sizeMax ||
          customFilter.modifiedWithin ||
          customFilter.patterns.length > 0;
          
        if (hasCustomRules) {
          filter = {
            type: 'custom',
            name: customFilter.name || 'Custom Filter',
            extensions: customFilter.extensions,
            sizeMin: parseSize(customFilter.sizeMin),
            sizeMax: parseSize(customFilter.sizeMax),
            modifiedWithin: parseDuration(customFilter.modifiedWithin),
            patterns: customFilter.patterns
          };
        }
        break;
        
      case 'combined':
        if (combinedFilters.length > 0) {
          filter = {
            type: 'combined',
            filters: combinedFilters
          };
        }
        break;
    }
    
    if (filter) {
      onApply(filter);
      addNotification({
        type: 'success',
        message: `Filter applied: ${filter.name || filter.type}`
      });
    } else {
      addNotification({
        type: 'warning',
        message: 'No filter selected'
      });
    }
  };
  
  // Render preset filters tab
  const renderPresetTab = () => (
    <Box flexDirection="column">
      <Text bold color="yellow">Preset Filters</Text>
      <Box marginTop={1}>
        <SelectInput
          items={[
            { label: 'No filter', value: null },
            ...presetItems
          ]}
          onSelect={(item) => setSelectedPreset(item.value)}
          indicatorComponent={({ isSelected }) => (
            <Text color="cyan">{isSelected ? '▶' : ' '}</Text>
          )}
          itemComponent={({ label, isSelected }) => (
            <Text color={isSelected ? 'cyan' : 'white'}>{label}</Text>
          )}
        />
      </Box>
      
      {selectedPreset && presetFilters[selectedPreset] && (
        <Box marginTop={2} flexDirection="column">
          <Text color="gray">Details:</Text>
          <Box marginLeft={2} flexDirection="column">
            {presetFilters[selectedPreset].extensions?.length > 0 && (
              <Text color="blue">
                Extensions: {presetFilters[selectedPreset].extensions.join(', ')}
              </Text>
            )}
            {presetFilters[selectedPreset].patterns?.length > 0 && (
              <Text color="blue">
                Patterns: {presetFilters[selectedPreset].patterns.join(', ')}
              </Text>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
  
  // Render custom filter tab
  const renderCustomTab = () => (
    <Box flexDirection="column">
      <Text bold color="yellow">Custom Filter</Text>
      
      <Box marginTop={1} flexDirection="column">
        {/* Name */}
        <Box marginBottom={1}>
          <Box width={20}>
            <Text>Name: </Text>
          </Box>
          {editingField === 'name' ? (
            <TextInput
              value={tempValue}
              onChange={setTempValue}
              onSubmit={() => updateCustomField('name', tempValue)}
              placeholder="Filter name..."
            />
          ) : (
            <Text 
              color={customFilter.name ? 'cyan' : 'gray'}
              dimColor={!customFilter.name}
            >
              {customFilter.name || 'Click to edit'}
              <Text color="gray"> (Enter)</Text>
            </Text>
          )}
        </Box>
        
        {/* Extensions */}
        <Box marginBottom={1}>
          <Box width={20}>
            <Text>Extensions: </Text>
          </Box>
          {editingField === 'extensions' ? (
            <TextInput
              value={tempValue}
              onChange={setTempValue}
              onSubmit={() => updateCustomField('extensions', tempValue)}
              placeholder="e.g., js,ts,json"
            />
          ) : (
            <Text 
              color={customFilter.extensions.length > 0 ? 'cyan' : 'gray'}
              dimColor={customFilter.extensions.length === 0}
            >
              {customFilter.extensions.length > 0 
                ? customFilter.extensions.join(', ')
                : 'Click to edit'}
              <Text color="gray"> (E)</Text>
            </Text>
          )}
        </Box>
        
        {/* Size range */}
        <Box marginBottom={1}>
          <Box width={20}>
            <Text>Size Min: </Text>
          </Box>
          {editingField === 'sizeMin' ? (
            <TextInput
              value={tempValue}
              onChange={setTempValue}
              onSubmit={() => updateCustomField('sizeMin', tempValue)}
              placeholder="e.g., 1MB, 100KB"
            />
          ) : (
            <Text 
              color={customFilter.sizeMin ? 'cyan' : 'gray'}
              dimColor={!customFilter.sizeMin}
            >
              {customFilter.sizeMin || 'No minimum'}
              <Text color="gray"> (S)</Text>
            </Text>
          )}
        </Box>
        
        <Box marginBottom={1}>
          <Box width={20}>
            <Text>Size Max: </Text>
          </Box>
          {editingField === 'sizeMax' ? (
            <TextInput
              value={tempValue}
              onChange={setTempValue}
              onSubmit={() => updateCustomField('sizeMax', tempValue)}
              placeholder="e.g., 10MB, 1GB"
            />
          ) : (
            <Text 
              color={customFilter.sizeMax ? 'cyan' : 'gray'}
              dimColor={!customFilter.sizeMax}
            >
              {customFilter.sizeMax || 'No maximum'}
              <Text color="gray"> (X)</Text>
            </Text>
          )}
        </Box>
        
        {/* Modified within */}
        <Box marginBottom={1}>
          <Box width={20}>
            <Text>Modified Within: </Text>
          </Box>
          {editingField === 'modifiedWithin' ? (
            <TextInput
              value={tempValue}
              onChange={setTempValue}
              onSubmit={() => updateCustomField('modifiedWithin', tempValue)}
              placeholder="e.g., 7d, 2w, 1m"
            />
          ) : (
            <Text 
              color={customFilter.modifiedWithin ? 'cyan' : 'gray'}
              dimColor={!customFilter.modifiedWithin}
            >
              {customFilter.modifiedWithin || 'Any time'}
              <Text color="gray"> (M)</Text>
            </Text>
          )}
        </Box>
        
        {/* Patterns */}
        <Box marginBottom={1}>
          <Box width={20}>
            <Text>Patterns: </Text>
          </Box>
          {editingField === 'patterns' ? (
            <TextInput
              value={tempValue}
              onChange={setTempValue}
              onSubmit={() => updateCustomField('patterns', tempValue)}
              placeholder="e.g., *.test.*, *-backup"
            />
          ) : (
            <Text 
              color={customFilter.patterns.length > 0 ? 'cyan' : 'gray'}
              dimColor={customFilter.patterns.length === 0}
            >
              {customFilter.patterns.length > 0 
                ? customFilter.patterns.join(', ')
                : 'Click to edit'}
              <Text color="gray"> (P)</Text>
            </Text>
          )}
        </Box>
      </Box>
      
      <Box marginTop={1}>
        <Text color="gray" italic>
          Click on fields or use shortcuts to edit
        </Text>
      </Box>
    </Box>
  );
  
  // Render combined filters tab
  const renderCombinedTab = () => (
    <Box flexDirection="column">
      <Text bold color="yellow">Combined Filters</Text>
      <Box marginTop={1}>
        <Text color="gray" dimColor>
          Coming soon - Combine multiple filters with AND/OR logic
        </Text>
      </Box>
    </Box>
  );
  
  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">Filter Manager</Text>
      </Box>
      
      {/* Tab navigation */}
      <Box marginBottom={2} gap={3}>
        <Text 
          color={activeTab === 'preset' ? 'cyan' : 'gray'}
          bold={activeTab === 'preset'}
          underline={activeTab === 'preset'}
        >
          1:Preset
        </Text>
        <Text 
          color={activeTab === 'custom' ? 'cyan' : 'gray'}
          bold={activeTab === 'custom'}
          underline={activeTab === 'custom'}
        >
          2:Custom
        </Text>
        <Text 
          color={activeTab === 'combined' ? 'cyan' : 'gray'}
          bold={activeTab === 'combined'}
          underline={activeTab === 'combined'}
        >
          3:Combined
        </Text>
      </Box>
      
      {/* Tab content */}
      <Box 
        flexDirection="column" 
        borderStyle="single" 
        borderColor="gray"
        padding={1}
        minHeight={12}
      >
        {activeTab === 'preset' && renderPresetTab()}
        {activeTab === 'custom' && renderCustomTab()}
        {activeTab === 'combined' && renderCombinedTab()}
      </Box>
      
      {/* Actions */}
      <Box marginTop={2} gap={2}>
        <Text color="gray">←→: Switch Tabs</Text>
        <Text color="green">Enter: Apply</Text>
        <Text color="yellow">C: Clear</Text>
        <Text color="gray">ESC: Cancel</Text>
      </Box>
    </Box>
  );
};

export default FilterManager;