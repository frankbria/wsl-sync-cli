import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import { getErrorHandler } from '../../lib/error-handler.js';
import LoadingSpinner from './common/LoadingSpinner.js';

const ErrorRecovery = ({ 
  error, 
  onRetry, 
  onSkip, 
  onAbort,
  context = {}
}) => {
  const [selectedAction, setSelectedAction] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const errorHandler = getErrorHandler();
  
  // Get error details
  const errorDetails = errorHandler.formatError(error, { 
    includeSuggestions: true 
  });
  const suggestions = errorHandler.getRecoverySuggestions(error);
  
  // Recovery actions based on error type
  const getRecoveryActions = () => {
    const actions = [];
    
    // Always include retry for most errors
    if (errorDetails.category !== 'permission' && 
        errorDetails.category !== 'validation') {
      actions.push({
        label: `Retry (Attempt ${retryCount + 1})`,
        value: 'retry',
        description: 'Try the operation again'
      });
    }
    
    // Skip option for file operations
    if (context.operation === 'file' && context.path) {
      actions.push({
        label: 'Skip this file',
        value: 'skip',
        description: 'Continue without this file'
      });
    }
    
    // Fix permission option
    if (errorDetails.category === 'permission') {
      actions.push({
        label: 'Fix permissions',
        value: 'fix-permissions',
        description: 'Attempt to fix file permissions'
      });
    }
    
    // Create directory option
    if (error.code === 'ENOENT' && context.operation === 'directory') {
      actions.push({
        label: 'Create directory',
        value: 'create-directory',
        description: 'Create the missing directory'
      });
    }
    
    // Always include abort
    actions.push({
      label: 'Abort operation',
      value: 'abort',
      description: 'Stop the sync operation'
    });
    
    return actions;
  };
  
  const recoveryActions = getRecoveryActions();
  
  // Handle keyboard input
  useInput((input, key) => {
    if (isRetrying) return;
    
    if (key.return) {
      handleAction(recoveryActions[selectedAction].value);
    } else if (key.escape) {
      onAbort();
    }
  });
  
  // Handle selected action
  const handleAction = async (action) => {
    switch (action) {
      case 'retry':
        setIsRetrying(true);
        setRetryCount(retryCount + 1);
        
        // Add delay before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        onRetry();
        break;
        
      case 'skip':
        onSkip();
        break;
        
      case 'fix-permissions':
        // In a real implementation, attempt to fix permissions
        setIsRetrying(true);
        await new Promise(resolve => setTimeout(resolve, 2000));
        onRetry();
        break;
        
      case 'create-directory':
        // In a real implementation, create the directory
        setIsRetrying(true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        onRetry();
        break;
        
      case 'abort':
        onAbort();
        break;
    }
  };
  
  if (isRetrying) {
    return (
      <Box flexDirection="column" padding={1}>
        <LoadingSpinner text="Attempting recovery..." />
      </Box>
    );
  }
  
  return (
    <Box flexDirection="column">
      <Box 
        flexDirection="column" 
        borderStyle="round" 
        borderColor="red"
        padding={1}
        marginBottom={1}
      >
        <Text bold color="red">⚠️  Error Encountered</Text>
        
        <Box marginTop={1}>
          <Text color="yellow">
            {errorHandler.createUserMessage(error)}
          </Text>
        </Box>
        
        {context.path && (
          <Box marginTop={1}>
            <Text color="gray">Path: {context.path}</Text>
          </Box>
        )}
        
        {error.code && (
          <Box>
            <Text color="gray">Error code: {error.code}</Text>
          </Box>
        )}
      </Box>
      
      {suggestions.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold color="cyan">Possible solutions:</Text>
          {suggestions.slice(0, 3).map((suggestion, index) => (
            <Box key={index} marginLeft={2}>
              <Text color="gray">• {suggestion}</Text>
            </Box>
          ))}
        </Box>
      )}
      
      <Box flexDirection="column">
        <Text bold marginBottom={1}>Choose an action:</Text>
        <SelectInput
          items={recoveryActions}
          onSelect={(item) => handleAction(item.value)}
          onHighlight={(item) => {
            const index = recoveryActions.findIndex(a => a.value === item.value);
            setSelectedAction(index);
          }}
          indicatorComponent={({ isSelected }) => (
            <Text color="cyan">{isSelected ? '▶' : ' '}</Text>
          )}
          itemComponent={({ label, isSelected }) => (
            <Box flexDirection="column">
              <Text color={isSelected ? 'cyan' : 'white'}>{label}</Text>
              {isSelected && (
                <Box marginLeft={2}>
                  <Text color="gray" dimColor>
                    {recoveryActions[selectedAction].description}
                  </Text>
                </Box>
              )}
            </Box>
          )}
        />
      </Box>
      
      <Box marginTop={2}>
        <Text color="gray" italic>
          Press Enter to select • ESC to abort
        </Text>
      </Box>
    </Box>
  );
};

// Error notification component
export const ErrorNotification = ({ error, duration = 5000, onDismiss }) => {
  const [visible, setVisible] = useState(true);
  const errorHandler = getErrorHandler();
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      if (onDismiss) onDismiss();
    }, duration);
    
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);
  
  useInput((input, key) => {
    if (key.escape || input === 'x' || input === 'X') {
      setVisible(false);
      if (onDismiss) onDismiss();
    }
  });
  
  if (!visible || !error) return null;
  
  const userMessage = errorHandler.createUserMessage(error);
  
  return (
    <Box 
      borderStyle="round" 
      borderColor="red"
      padding={1}
      marginY={1}
    >
      <Box flexDirection="column">
        <Box justifyContent="space-between">
          <Text color="red" bold>Error</Text>
          <Text color="gray" dimColor>Press X to dismiss</Text>
        </Box>
        <Box marginTop={1}>
          <Text color="yellow">{userMessage}</Text>
        </Box>
      </Box>
    </Box>
  );
};

export default ErrorRecovery;