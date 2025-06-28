import React from 'react';
import { Box, Text } from 'ink';
import { useApp } from '../../store/index.js';

const Footer = () => {
  const { state } = useApp();
  const { currentView } = state;
  
  // Define shortcuts based on current view
  const getShortcuts = () => {
    const common = [
      { key: 'Tab', action: 'Switch View' },
      { key: 'Ctrl+C', action: 'Exit' }
    ];
    
    switch (currentView) {
      case 'sync':
        return [
          ...common,
          { key: 'Enter', action: 'Start Sync' },
          { key: 'P', action: 'Pause/Resume' },
          { key: 'S', action: 'Stop' },
          { key: 'D', action: 'Dry Run' }
        ];
      case 'profiles':
        return [
          ...common,
          { key: '↑↓', action: 'Navigate' },
          { key: 'Enter', action: 'Select' },
          { key: 'N', action: 'New Profile' },
          { key: 'E', action: 'Edit' },
          { key: 'Del', action: 'Delete' }
        ];
      case 'settings':
        return [
          ...common,
          { key: '↑↓', action: 'Navigate' },
          { key: 'Enter', action: 'Edit' },
          { key: 'S', action: 'Save' },
          { key: 'R', action: 'Reset' }
        ];
      default:
        return common;
    }
  };
  
  const shortcuts = getShortcuts();
  
  return (
    <Box flexDirection="column" marginTop={1}>
      <Box>
        <Text color="gray">{'─'.repeat(process.stdout.columns || 80)}</Text>
      </Box>
      <Box marginTop={1} gap={2}>
        {shortcuts.map((shortcut, index) => (
          <Box key={index}>
            <Text bold color="yellow">{shortcut.key}</Text>
            <Text color="gray">: {shortcut.action}</Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default Footer;