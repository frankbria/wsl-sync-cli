#!/usr/bin/env node
import React, { useState, useEffect } from 'react';
import { render, Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import { ErrorHandler } from '../../lib/error-handler.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const ErrorViewer = () => {
  const [errors, setErrors] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('recent'); // 'recent', 'stats', 'clear'
  
  const errorHandler = new ErrorHandler();
  
  // Load error data
  useEffect(() => {
    loadErrors();
  }, []);
  
  const loadErrors = async () => {
    setLoading(true);
    try {
      await errorHandler.initialize();
      const errorStats = await errorHandler.getErrorStats();
      setStats(errorStats);
      
      if (errorStats && errorStats.recent) {
        setErrors(errorStats.recent);
      }
    } catch (error) {
      console.error('Failed to load errors:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle keyboard input
  useInput((input, key) => {
    if (key.escape || input === 'q' || input === 'Q') {
      process.exit(0);
    } else if (input === 'c' || input === 'C') {
      clearErrors();
    } else if (input === 'r' || input === 'R') {
      loadErrors();
    } else if (input === '1') {
      setView('recent');
    } else if (input === '2') {
      setView('stats');
    }
  });
  
  const clearErrors = async () => {
    try {
      await errorHandler.clearLogs();
      setErrors([]);
      setStats(null);
      console.log('Error logs cleared');
      process.exit(0);
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  };
  
  if (loading) {
    return (
      <Box>
        <Text>Loading error logs...</Text>
      </Box>
    );
  }
  
  if (!stats || stats.total === 0) {
    return (
      <Box flexDirection="column">
        <Text bold color="green">No errors logged</Text>
        <Box marginTop={1}>
          <Text color="gray">Press Q to exit</Text>
        </Box>
      </Box>
    );
  }
  
  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">WSL Sync Error Log Viewer</Text>
      </Box>
      
      <Box marginBottom={1} gap={3}>
        <Text 
          color={view === 'recent' ? 'cyan' : 'gray'}
          underline={view === 'recent'}
        >
          1:Recent Errors ({errors.length})
        </Text>
        <Text 
          color={view === 'stats' ? 'cyan' : 'gray'}
          underline={view === 'stats'}
        >
          2:Statistics
        </Text>
      </Box>
      
      {view === 'recent' && (
        <Box flexDirection="column">
          {errors.map((error, index) => (
            <Box key={index} flexDirection="column" marginBottom={1}>
              <Box>
                <Text color="yellow">{error.category}</Text>
                <Text color="gray"> - </Text>
                <Text>{error.message}</Text>
              </Box>
              <Box marginLeft={2}>
                <Text color="gray" dimColor>
                  {new Date(error.timestamp).toLocaleString()}
                </Text>
              </Box>
            </Box>
          ))}
        </Box>
      )}
      
      {view === 'stats' && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text>Total errors: </Text>
            <Text color="red">{stats.total}</Text>
          </Box>
          
          <Text bold marginBottom={1}>By Category:</Text>
          {Object.entries(stats.byCategory).map(([category, count]) => (
            <Box key={category} marginLeft={2}>
              <Box width={20}>
                <Text>{category}:</Text>
              </Box>
              <Text color="yellow">{count}</Text>
            </Box>
          ))}
          
          {Object.keys(stats.byCode).length > 0 && (
            <>
              <Text bold marginTop={1} marginBottom={1}>By Error Code:</Text>
              {Object.entries(stats.byCode).map(([code, count]) => (
                <Box key={code} marginLeft={2}>
                  <Box width={20}>
                    <Text>{code}:</Text>
                  </Box>
                  <Text color="yellow">{count}</Text>
                </Box>
              ))}
            </>
          )}
        </Box>
      )}
      
      <Box marginTop={2} gap={3}>
        <Text color="gray">R: Refresh</Text>
        <Text color="gray">C: Clear Logs</Text>
        <Text color="gray">Q: Exit</Text>
      </Box>
    </Box>
  );
};

// Add to CLI commands
export const errorViewerCommand = {
  command: 'errors',
  describe: 'View error logs',
  handler: () => {
    render(<ErrorViewer />);
  }
};

// Standalone execution
if (process.argv[1] === new URL(import.meta.url).pathname) {
  render(<ErrorViewer />);
}