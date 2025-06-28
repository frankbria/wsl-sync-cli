import React from 'react';
import { Box, Text } from 'ink';
import { getErrorHandler } from '../../lib/error-handler.js';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      suggestions: []
    };
    this.errorHandler = getErrorHandler();
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  
  componentDidCatch(error, errorInfo) {
    // Log error details
    this.errorHandler.logError(error, {
      component: errorInfo.componentStack,
      props: this.props
    });
    
    // Get recovery suggestions
    const suggestions = this.errorHandler.getRecoverySuggestions(error);
    
    this.setState({
      error,
      errorInfo,
      suggestions
    });
  }
  
  render() {
    if (this.state.hasError) {
      const { error, suggestions } = this.state;
      const formattedError = this.errorHandler.formatError(error, { 
        includeSuggestions: true 
      });
      
      return (
        <Box flexDirection="column" padding={2}>
          <Box 
            flexDirection="column" 
            borderStyle="double" 
            borderColor="red"
            padding={1}
          >
            <Text bold color="red">⚠️  Application Error</Text>
            
            <Box marginTop={1}>
              <Text color="yellow">
                {this.errorHandler.createUserMessage(error)}
              </Text>
            </Box>
            
            {suggestions.length > 0 && (
              <Box marginTop={1} flexDirection="column">
                <Text bold color="cyan">Suggestions:</Text>
                {suggestions.map((suggestion, index) => (
                  <Box key={index} marginLeft={2}>
                    <Text color="gray">• {suggestion}</Text>
                  </Box>
                ))}
              </Box>
            )}
            
            <Box marginTop={2} flexDirection="column">
              <Text color="gray">Error Details:</Text>
              <Box marginLeft={2}>
                <Text color="gray" dimColor>
                  Category: {formattedError.category}
                </Text>
              </Box>
              {error.code && (
                <Box marginLeft={2}>
                  <Text color="gray" dimColor>
                    Code: {error.code}
                  </Text>
                </Box>
              )}
              {error.path && (
                <Box marginLeft={2}>
                  <Text color="gray" dimColor>
                    Path: {error.path}
                  </Text>
                </Box>
              )}
            </Box>
            
            <Box marginTop={2}>
              <Text color="gray" italic>
                Press Ctrl+C to exit or check the error log for more details
              </Text>
            </Box>
          </Box>
        </Box>
      );
    }
    
    return this.props.children;
  }
}

export default ErrorBoundary;