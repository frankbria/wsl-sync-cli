import React, { useState, useEffect } from 'react';
import { Box, Text, useStdout } from 'ink';
import { useApp } from '../store/index.js';

// ASCII art box characters for compatibility mode
const ASCII_CHARS = {
  topLeft: '+',
  topRight: '+',
  bottomLeft: '+',
  bottomRight: '+',
  horizontal: '-',
  vertical: '|',
  cross: '+',
  leftT: '+',
  rightT: '+',
  topT: '+',
  bottomT: '+'
};

// Check terminal capabilities
const getTerminalCapabilities = () => {
  const termType = process.env.TERM || '';
  const colorTerm = process.env.COLORTERM || '';
  const termProgram = process.env.TERM_PROGRAM || '';
  
  return {
    hasColor: process.stdout.hasColors?.() ?? true,
    hasUnicode: process.stdout.isTTY && !process.env.NO_UNICODE,
    hasFullColor: colorTerm === 'truecolor' || termType.includes('256color'),
    isMinimal: termType === 'dumb' || !process.stdout.isTTY,
    columns: process.stdout.columns || 80,
    rows: process.stdout.rows || 24
  };
};

// Terminal context for child components
export const TerminalContext = React.createContext({
  capabilities: getTerminalCapabilities(),
  dimensions: { width: 80, height: 24 },
  isCompact: false,
  asciiMode: false
});

const TerminalAdapter = ({ children }) => {
  const { stdout } = useStdout();
  const [capabilities, setCapabilities] = useState(getTerminalCapabilities());
  const [dimensions, setDimensions] = useState({
    width: stdout.columns || 80,
    height: stdout.rows || 24
  });
  const [isCompact, setIsCompact] = useState(false);
  const [asciiMode, setAsciiMode] = useState(false);
  
  // Handle terminal resize
  useEffect(() => {
    const handleResize = () => {
      const newDimensions = {
        width: stdout.columns || 80,
        height: stdout.rows || 24
      };
      
      setDimensions(newDimensions);
      setCapabilities(getTerminalCapabilities());
      
      // Switch to compact mode for small terminals
      setIsCompact(newDimensions.width < 100 || newDimensions.height < 30);
    };
    
    // Initial check
    handleResize();
    
    // Listen for resize events
    if (process.stdout.isTTY) {
      process.stdout.on('resize', handleResize);
      
      return () => {
        process.stdout.removeListener('resize', handleResize);
      };
    }
  }, [stdout]);
  
  // Check for ASCII mode requirement
  useEffect(() => {
    const needsAsciiMode = 
      process.env.WSL_SYNC_ASCII === '1' ||
      process.env.NO_UNICODE === '1' ||
      !capabilities.hasUnicode ||
      capabilities.isMinimal;
      
    setAsciiMode(needsAsciiMode);
  }, [capabilities]);
  
  // Provide fallback for non-TTY environments
  if (capabilities.isMinimal) {
    return (
      <Box flexDirection="column">
        <Text>WSL Sync CLI - Non-Interactive Mode</Text>
        <Text color="gray">Terminal does not support interactive UI</Text>
        <Text color="gray">Use --help for command line options</Text>
      </Box>
    );
  }
  
  // Context value
  const contextValue = {
    capabilities,
    dimensions,
    isCompact,
    asciiMode,
    boxChars: asciiMode ? ASCII_CHARS : undefined
  };
  
  return (
    <TerminalContext.Provider value={contextValue}>
      <Box
        width={dimensions.width}
        height={dimensions.height}
        flexDirection="column"
        overflow="hidden"
      >
        {isCompact && (
          <Box marginBottom={1}>
            <Text color="yellow" dimColor>
              ⚠ Compact mode (resize terminal for full UI)
            </Text>
          </Box>
        )}
        {children}
      </Box>
    </TerminalContext.Provider>
  );
};

// Hook to use terminal context
export const useTerminal = () => {
  const context = React.useContext(TerminalContext);
  if (!context) {
    throw new Error('useTerminal must be used within TerminalAdapter');
  }
  return context;
};

// HOC for terminal-aware components
export const withTerminalAwareness = (Component) => {
  return (props) => {
    const terminal = useTerminal();
    return <Component {...props} terminal={terminal} />;
  };
};

// Responsive box component
export const ResponsiveBox = ({ children, minWidth = 0, ...props }) => {
  const { dimensions, isCompact } = useTerminal();
  
  // Skip rendering if not enough space
  if (minWidth > 0 && dimensions.width < minWidth) {
    return null;
  }
  
  return (
    <Box 
      {...props}
      width={isCompact ? '100%' : props.width}
      flexDirection={isCompact && props.flexDirection === 'row' ? 'column' : props.flexDirection}
    >
      {children}
    </Box>
  );
};

// Color-aware text component
export const AdaptiveText = ({ 
  children, 
  color = 'white',
  fallbackColor = 'white',
  bold = false,
  dimColor = false,
  ...props 
}) => {
  const { capabilities } = useTerminal();
  
  // Use fallback colors for limited terminals
  const finalColor = capabilities.hasFullColor ? color : 
    (capabilities.hasColor ? fallbackColor : undefined);
  
  return (
    <Text 
      {...props}
      color={finalColor}
      bold={capabilities.hasColor ? bold : false}
      dimColor={capabilities.hasColor ? dimColor : false}
    >
      {children}
    </Text>
  );
};

// Progress bar that works in ASCII mode
export const AdaptiveProgressBar = ({ 
  percent = 0, 
  width = 20,
  showPercent = true 
}) => {
  const { asciiMode, dimensions, isCompact } = useTerminal();
  
  const actualWidth = isCompact ? Math.min(width, dimensions.width - 10) : width;
  const filled = Math.floor((percent / 100) * actualWidth);
  const empty = actualWidth - filled;
  
  const filledChar = asciiMode ? '#' : '█';
  const emptyChar = asciiMode ? '-' : '░';
  
  return (
    <Box>
      <Text color="gray">[</Text>
      <Text color="green">{filledChar.repeat(filled)}</Text>
      <Text color="gray">{emptyChar.repeat(empty)}</Text>
      <Text color="gray">]</Text>
      {showPercent && (
        <Text color="cyan"> {percent}%</Text>
      )}
    </Box>
  );
};

// Box drawing component for ASCII mode
export const AdaptiveBox = ({ 
  children, 
  title,
  borderStyle = 'single',
  borderColor = 'gray',
  ...props 
}) => {
  const { asciiMode } = useTerminal();
  
  if (asciiMode) {
    // Use ASCII characters for borders
    return (
      <Box flexDirection="column" {...props}>
        {title && (
          <Box>
            <Text color={borderColor}>+-- {title} --+</Text>
          </Box>
        )}
        <Box flexDirection="column" paddingX={1}>
          {React.Children.map(children, (child, index) => (
            <Box key={index}>
              <Text color={borderColor}>| </Text>
              {child}
              <Text color={borderColor}> |</Text>
            </Box>
          ))}
        </Box>
        <Box>
          <Text color={borderColor}>+{'-'.repeat(20)}+</Text>
        </Box>
      </Box>
    );
  }
  
  // Use Ink's built-in box for Unicode terminals
  return (
    <Box
      borderStyle={borderStyle}
      borderColor={borderColor}
      flexDirection="column"
      {...props}
    >
      {title && (
        <Box marginBottom={1}>
          <Text bold color={borderColor}>{title}</Text>
        </Box>
      )}
      {children}
    </Box>
  );
};

export default TerminalAdapter;