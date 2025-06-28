import React from 'react';
import { Box, useApp as useInkApp } from 'ink';
import Header from './common/Header.js';
import Footer from './common/Footer.js';
import Navigation from './Navigation.js';
import ErrorMessage from './common/ErrorMessage.js';
import LoadingSpinner from './common/LoadingSpinner.js';
import { useApp } from '../store/index.js';

const Layout = ({ children }) => {
  const { exit } = useInkApp();
  const { state, clearError } = useApp();
  const { error, loading } = state;
  
  // Handle ESC key to clear errors
  React.useEffect(() => {
    const handleKeyPress = (input, key) => {
      if (key.escape && error) {
        clearError();
      }
    };
    
    process.stdin.on('keypress', handleKeyPress);
    return () => {
      process.stdin.removeListener('keypress', handleKeyPress);
    };
  }, [error, clearError]);
  
  // Calculate available height for content
  const terminalHeight = process.stdout.rows || 24;
  const headerHeight = 4; // Header with divider
  const navigationHeight = 2;
  const footerHeight = 4; // Footer with shortcuts
  const errorHeight = error ? 4 : 0;
  const contentHeight = terminalHeight - headerHeight - navigationHeight - footerHeight - errorHeight;
  
  return (
    <Box flexDirection="column" height={terminalHeight}>
      <Header />
      <Navigation />
      
      {error && (
        <ErrorMessage error={error} onDismiss={clearError} />
      )}
      
      <Box 
        flexDirection="column" 
        flexGrow={1}
        height={contentHeight}
        overflow="hidden"
      >
        {loading ? (
          <Box justifyContent="center" alignItems="center" flexGrow={1}>
            <LoadingSpinner text="Initializing..." />
          </Box>
        ) : (
          children
        )}
      </Box>
      
      <Footer />
    </Box>
  );
};

export default Layout;