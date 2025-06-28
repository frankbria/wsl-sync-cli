import React from 'react';
import { Box, Text } from 'ink';

const ErrorMessage = ({ error, onDismiss }) => {
  if (!error) return null;
  
  return (
    <Box 
      borderStyle="round" 
      borderColor="red" 
      paddingX={1}
      marginY={1}
      flexDirection="column"
    >
      <Box>
        <Text bold color="red">✗ Error: </Text>
        <Text color="white">{error}</Text>
      </Box>
      {onDismiss && (
        <Box marginTop={1}>
          <Text color="gray" italic>Press ESC to dismiss</Text>
        </Box>
      )}
    </Box>
  );
};

export default ErrorMessage;