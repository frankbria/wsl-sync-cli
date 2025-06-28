import React from 'react';
import { Box, Text } from 'ink';

const ProgressBar = ({ 
  percent = 0, 
  width = 30, 
  showPercentage = true,
  color = 'cyan',
  bgColor = 'gray'
}) => {
  const clampedPercent = Math.min(100, Math.max(0, percent));
  const filled = Math.floor((clampedPercent / 100) * width);
  const empty = width - filled;
  
  return (
    <Box>
      <Text color={bgColor}>[</Text>
      <Text color={color}>{'█'.repeat(filled)}</Text>
      <Text color={bgColor}>{'░'.repeat(empty)}</Text>
      <Text color={bgColor}>]</Text>
      {showPercentage && (
        <Text color={color}> {clampedPercent.toFixed(1)}%</Text>
      )}
    </Box>
  );
};

export default ProgressBar;