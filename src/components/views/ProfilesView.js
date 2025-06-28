import React from 'react';
import { Box, Text } from 'ink';
import Divider from '../common/Divider.js';

const ProfilesView = () => {
  return (
    <Box flexDirection="column">
      <Divider title="Sync Profiles" titleColor="cyan" />
      <Box marginTop={1}>
        <Text>Profiles view - Implementation coming in Phase 4</Text>
      </Box>
    </Box>
  );
};

export default ProfilesView;