import React from 'react';
import { Box, Text } from 'ink';

const SuccessMessage = ({ message, duration = 3000 }) => {
  const [visible, setVisible] = React.useState(true);
  
  React.useEffect(() => {
    if (duration && duration > 0) {
      const timer = setTimeout(() => {
        setVisible(false);
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [duration]);
  
  if (!message || !visible) return null;
  
  return (
    <Box 
      borderStyle="round" 
      borderColor="green" 
      paddingX={1}
      marginY={1}
    >
      <Text bold color="green">✓ </Text>
      <Text color="white">{message}</Text>
    </Box>
  );
};

export default SuccessMessage;