import React from 'react';
import { Box, Text } from 'ink';
import { useApp } from '../../store/index.js';

const Footer = () => {
  const { state } = useApp();
  const { currentView } = state;
  
  // Define shortcuts based on current view
  const getShortcuts = () => {
    const common = [
      { key: 'F1/?', action: 'Help' },
      { key: 'Tab', action: 'Switch View' },
      { key: 'Q', action: 'Quit' }
    ];
    
    switch (currentView) {
      case 'sync':
        return [
          ...common,
          { key: 'Ctrl+S', action: 'Start' },
          { key: 'Ctrl+P', action: 'Pause' },
          { key: 'Ctrl+C', action: 'Cancel' },
          { key: 'F', action: 'Filter' },
          { key: 'I', action: 'Ignore' }
        ];
      case 'profiles':
        return [
          ...common,
          { key: '↑↓', action: 'Navigate' },
          { key: 'Enter', action: 'Load' },
          { key: 'N', action: 'New' },
          { key: 'E', action: 'Edit' },
          { key: 'D', action: 'Delete' },
          { key: 'S', action: 'Quick Sync' }
        ];
      case 'settings':
        return [
          ...common,
          { key: '←→', action: 'Section' },
          { key: 'Enter', action: 'Edit' },
          { key: 'Ctrl+S', action: 'Save' },
          { key: 'Ctrl+R', action: 'Reset' },
          { key: 'Ctrl+E', action: 'Export' }
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