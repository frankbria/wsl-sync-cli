import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';

const SettingsNavigation = ({ 
  sections = [], 
  activeSection, 
  onSectionChange, 
  isActive = false 
}) => {
  const [expanded, setExpanded] = useState(true);
  
  // Convert sections to menu items
  const menuItems = sections.map(section => ({
    label: section.label,
    value: section.id,
    icon: section.icon,
    modified: section.modified || false
  }));
  
  // Handle keyboard input
  useInput((input, key) => {
    if (!isActive) return;
    
    if (input === 'h' || input === 'H') {
      setExpanded(!expanded);
    }
  });
  
  // Handle section selection
  const handleSelect = (item) => {
    onSectionChange(item.value);
  };
  
  // Render compact view
  if (!expanded) {
    return (
      <Box flexDirection="column" marginRight={1}>
        <Text color="gray" dimColor>│</Text>
        <Text color="gray" dimColor>│</Text>
        <Text color="gray" dimColor>├─</Text>
        <Text color="gray" dimColor>│</Text>
        <Box marginTop={1}>
          <Text color="gray" italic>H</Text>
        </Box>
      </Box>
    );
  }
  
  return (
    <Box 
      flexDirection="column" 
      marginRight={2}
      minWidth={20}
      borderStyle="single"
      borderColor="gray"
      paddingX={1}
    >
      <Box marginBottom={1} justifyContent="center">
        <Text bold color="cyan">Settings</Text>
      </Box>
      
      <Box flexDirection="column">
        {menuItems.map((item, index) => {
          const isSelected = item.value === activeSection;
          const showIndicator = isActive && isSelected;
          
          return (
            <Box key={item.value} marginBottom={index < menuItems.length - 1 ? 1 : 0}>
              <Box>
                <Text color={showIndicator ? 'cyan' : 'white'}>
                  {showIndicator ? '▶ ' : '  '}
                </Text>
                {item.icon && (
                  <Text>{item.icon} </Text>
                )}
                <Text 
                  color={isSelected ? 'cyan' : 'white'}
                  bold={isSelected}
                >
                  {item.label}
                </Text>
                {item.modified && (
                  <Text color="yellow"> *</Text>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>
      
      <Box marginTop={2} flexDirection="column">
        <Text color="gray" dimColor>──────────</Text>
        <Box marginTop={1}>
          <Text color="gray" italic>H: Hide</Text>
        </Box>
      </Box>
    </Box>
  );
};

// Alternative tab-based navigation for horizontal layout
export const SettingsTabNavigation = ({ 
  sections = [], 
  activeSection, 
  onSectionChange, 
  isActive = false 
}) => {
  const [selectedIndex, setSelectedIndex] = useState(
    sections.findIndex(s => s.id === activeSection) || 0
  );
  
  // Handle keyboard input
  useInput((input, key) => {
    if (!isActive) return;
    
    if (key.leftArrow || input === 'h') {
      const newIndex = Math.max(0, selectedIndex - 1);
      setSelectedIndex(newIndex);
      onSectionChange(sections[newIndex].id);
    } else if (key.rightArrow || input === 'l') {
      const newIndex = Math.min(sections.length - 1, selectedIndex + 1);
      setSelectedIndex(newIndex);
      onSectionChange(sections[newIndex].id);
    } else if (input >= '1' && input <= '9') {
      const index = parseInt(input) - 1;
      if (index < sections.length) {
        setSelectedIndex(index);
        onSectionChange(sections[index].id);
      }
    }
  });
  
  return (
    <Box flexDirection="column">
      <Box gap={2} marginBottom={1}>
        {sections.map((section, index) => {
          const isSelected = section.id === activeSection;
          const showNumber = index < 9;
          
          return (
            <Box key={section.id}>
              <Text 
                color={isSelected ? 'cyan' : 'gray'}
                bold={isSelected}
                underline={isSelected && isActive}
              >
                {showNumber && `${index + 1}:`}
                {section.icon && ` ${section.icon}`} {section.label}
                {section.modified && ' *'}
              </Text>
            </Box>
          );
        })}
      </Box>
      
      <Box>
        <Text color="gray">
          {isActive ? '←→ or H/L to navigate • 1-9 for quick jump' : 'Tab to activate'}
        </Text>
      </Box>
    </Box>
  );
};

export default SettingsNavigation;