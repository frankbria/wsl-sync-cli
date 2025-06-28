import React from 'react';
import { Box, Text } from 'ink';
import { useApp } from '../../store/index.js';

const Header = () => {
  const { state } = useApp();
  const { currentView } = state;
  
  // Format view name for display
  const viewNames = {
    sync: 'Sync',
    profiles: 'Profiles',
    settings: 'Settings'
  };
  
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box justifyContent="space-between">
        <Box>
          <Text bold color="cyan">WSL Sync CLI</Text>
          <Text color="gray"> v1.0.0</Text>
        </Box>
        <Box>
          <Text color="gray">Current: </Text>
          <Text bold color="yellow">{viewNames[currentView]}</Text>
        </Box>
      </Box>
      <Box marginTop={1}>
        <Text color="gray">{'─'.repeat(process.stdout.columns || 80)}</Text>
      </Box>
    </Box>
  );
};

export default Header;