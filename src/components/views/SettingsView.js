import React from 'react';
import { Box, Text } from 'ink';
import Divider from '../common/Divider.js';

const SettingsView = () => {
  return (
    <Box flexDirection="column">
      <Divider title="Settings" titleColor="cyan" />
      <Box marginTop={1}>
        <Text>Settings view - Implementation coming in Phase 5</Text>
      </Box>
    </Box>
  );
};

export default SettingsView;