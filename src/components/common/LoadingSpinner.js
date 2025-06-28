import React from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';

const LoadingSpinner = ({ text = 'Loading...', type = 'dots' }) => {
  return (
    <Box>
      <Text color="cyan">
        <Spinner type={type} />
      </Text>
      <Text> {text}</Text>
    </Box>
  );
};

export default LoadingSpinner;