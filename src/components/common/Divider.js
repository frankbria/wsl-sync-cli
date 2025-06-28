import React from 'react';
import { Box, Text } from 'ink';

const Divider = ({ 
  title = '', 
  width, 
  padding = 1,
  dividerChar = '─',
  dividerColor = 'gray',
  titleColor = 'white'
}) => {
  const terminalWidth = width || process.stdout.columns || 80;
  
  if (title) {
    // Custom divider with title
    const titleLength = title.length + (padding * 2) + 2; // +2 for spaces around title
    const dividerLength = Math.max(0, terminalWidth - titleLength);
    const leftDivider = Math.floor(dividerLength / 2);
    const rightDivider = Math.ceil(dividerLength / 2);
    
    return (
      <Box>
        <Text color={dividerColor}>{dividerChar.repeat(leftDivider)}</Text>
        <Text color={titleColor}> {title} </Text>
        <Text color={dividerColor}>{dividerChar.repeat(rightDivider)}</Text>
      </Box>
    );
  }
  
  // Simple divider without title
  return (
    <Box>
      <Text color={dividerColor}>{dividerChar.repeat(terminalWidth)}</Text>
    </Box>
  );
};

export default Divider;