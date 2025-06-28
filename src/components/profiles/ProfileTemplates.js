import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import Divider from '../common/Divider.js';
import { ProfileManager } from '../../lib/profiles.js';

const ProfileTemplates = ({ onSelect, onCancel, isActive = false }) => {
  const profileManager = new ProfileManager();
  const templates = profileManager.getTemplates();
  
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  
  // Convert templates to menu items
  const templateItems = templates.map(template => ({
    label: `${template.icon} ${template.name}`,
    value: template.id,
    template: template
  }));
  
  // Add custom option
  templateItems.push({
    label: '✏️ Custom Profile',
    value: 'custom',
    template: {
      id: 'custom',
      name: 'Custom Profile',
      description: 'Create a profile from scratch',
      icon: '✏️'
    }
  });
  
  // Handle keyboard input
  useInput((input, key) => {
    if (!isActive) return;
    
    if (key.escape) {
      onCancel();
    } else if (input === 'd' || input === 'D') {
      setShowDetails(!showDetails);
    }
  });
  
  // Handle template selection
  const handleSelect = (item) => {
    onSelect(item.template);
  };
  
  // Get current template
  const currentTemplate = templateItems[selectedIndex]?.template;
  
  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">Choose a Profile Template</Text>
      </Box>
      
      <Divider />
      
      <Box marginTop={1} flexDirection={showDetails ? 'row' : 'column'} gap={2}>
        {/* Template list */}
        <Box flexDirection="column" minWidth={30}>
          <SelectInput
            items={templateItems}
            onSelect={handleSelect}
            onHighlight={(item) => {
              const index = templateItems.findIndex(t => t.value === item.value);
              setSelectedIndex(index);
            }}
            indicatorComponent={({ isSelected }) => (
              <Text color="cyan">{isSelected ? '▶' : ' '}</Text>
            )}
            itemComponent={({ label, isSelected }) => (
              <Text color={isSelected ? 'cyan' : 'white'}>{label}</Text>
            )}
          />
        </Box>
        
        {/* Template details */}
        {showDetails && currentTemplate && (
          <Box 
            flexDirection="column" 
            borderStyle="round" 
            borderColor="gray"
            paddingX={1}
            flexGrow={1}
          >
            <Text bold color="yellow">
              {currentTemplate.icon} {currentTemplate.name}
            </Text>
            
            <Box marginTop={1}>
              <Text color="gray">{currentTemplate.description}</Text>
            </Box>
            
            {currentTemplate.id !== 'custom' && (
              <>
                {/* Source path */}
                {currentTemplate.sourcePath && (
                  <Box marginTop={1}>
                    <Text color="gray">Default source: </Text>
                    <Text>{currentTemplate.sourcePath}</Text>
                  </Box>
                )}
                
                {/* Destination path */}
                {currentTemplate.destinationPath && (
                  <Box>
                    <Text color="gray">Default dest: </Text>
                    <Text>{currentTemplate.destinationPath}</Text>
                  </Box>
                )}
                
                {/* Sync direction */}
                {currentTemplate.syncDirection && (
                  <Box marginTop={1}>
                    <Text color="gray">Sync direction: </Text>
                    <Text color="cyan">
                      {currentTemplate.syncDirection === 'two-way' && '↔ Two-way'}
                      {currentTemplate.syncDirection === 'source-to-dest' && '→ One-way'}
                    </Text>
                  </Box>
                )}
                
                {/* Options */}
                {currentTemplate.options && (
                  <Box marginTop={1} flexDirection="column">
                    <Text color="gray">Options:</Text>
                    <Box marginLeft={2} flexDirection="column">
                      {currentTemplate.options.filter && (
                        <Text color="blue">• {currentTemplate.options.filter} filter</Text>
                      )}
                      {currentTemplate.options.deleteOrphaned && (
                        <Text color="red">• Delete orphaned files</Text>
                      )}
                      {currentTemplate.options.preservePermissions && (
                        <Text color="green">• Preserve permissions</Text>
                      )}
                      {currentTemplate.options.performanceMode && (
                        <Text color="yellow">
                          • {currentTemplate.options.performanceMode} performance
                        </Text>
                      )}
                    </Box>
                  </Box>
                )}
                
                {/* Ignore patterns preview */}
                {currentTemplate.ignorePatterns && currentTemplate.ignorePatterns.length > 0 && (
                  <Box marginTop={1} flexDirection="column">
                    <Text color="gray">Ignores:</Text>
                    <Box marginLeft={2} flexDirection="column">
                      {currentTemplate.ignorePatterns.slice(0, 3).map((pattern, idx) => (
                        <Text key={idx} color="gray" dimColor>• {pattern}</Text>
                      ))}
                      {currentTemplate.ignorePatterns.length > 3 && (
                        <Text color="gray" dimColor>
                          • ...and {currentTemplate.ignorePatterns.length - 3} more
                        </Text>
                      )}
                    </Box>
                  </Box>
                )}
              </>
            )}
          </Box>
        )}
      </Box>
      
      <Box marginTop={2}>
        <Text color="gray" italic>
          Press D to {showDetails ? 'hide' : 'show'} details • Enter to select • ESC to cancel
        </Text>
      </Box>
    </Box>
  );
};

export default ProfileTemplates;