import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import ProgressBar from '../common/ProgressBar.js';
import { useApp } from '../../store/index.js';

const SyncProgress = ({ onPause, onResume, onStop }) => {
  const { state } = useApp();
  const { syncStatus, syncProgress } = state;
  const [showDetails, setShowDetails] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  
  // Format bytes to human readable
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // Format time remaining
  const formatTime = (seconds) => {
    if (!seconds || seconds === Infinity) return 'calculating...';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };
  
  // Calculate speed
  const formatSpeed = (bytesPerSecond) => {
    if (!bytesPerSecond || bytesPerSecond === 0) return '0 B/s';
    return formatBytes(bytesPerSecond) + '/s';
  };
  
  // Handle keyboard shortcuts
  useInput((input, key) => {
    if (syncStatus !== 'syncing' && syncStatus !== 'paused') return;
    
    if (input === 'p' || input === 'P') {
      // Toggle pause
      if (isPaused) {
        onResume();
        setIsPaused(false);
      } else {
        onPause();
        setIsPaused(true);
      }
    } else if (input === 's' || input === 'S' || key.escape) {
      // Stop sync
      onStop();
    } else if (input === 'd' || input === 'D') {
      // Toggle details
      setShowDetails(!showDetails);
    }
  });
  
  // Auto-update status
  useEffect(() => {
    setIsPaused(syncStatus === 'paused');
  }, [syncStatus]);
  
  if (syncStatus === 'idle' || syncStatus === 'preparing') {
    return null;
  }
  
  const {
    percentage = 0,
    currentFile = '',
    totalFiles = 0,
    processedFiles = 0,
    totalSize = 0,
    processedSize = 0,
    speed = 0,
    remainingTime = 0,
    errors = []
  } = syncProgress;
  
  const getStatusIcon = () => {
    switch (syncStatus) {
      case 'syncing': return <Spinner type="dots" />;
      case 'paused': return '⏸';
      case 'completed': return '✓';
      case 'error': return '✗';
      default: return '•';
    }
  };
  
  const getStatusColor = () => {
    switch (syncStatus) {
      case 'syncing': return 'cyan';
      case 'paused': return 'yellow';
      case 'completed': return 'green';
      case 'error': return 'red';
      default: return 'gray';
    }
  };
  
  return (
    <Box flexDirection="column" borderStyle="round" borderColor={getStatusColor()} padding={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text color={getStatusColor()}>
          {getStatusIcon()} Sync {syncStatus === 'syncing' ? 'in progress' : syncStatus}
        </Text>
      </Box>
      
      {/* Main progress bar */}
      <Box marginBottom={1}>
        <ProgressBar 
          percent={percentage} 
          width={40} 
          color={getStatusColor()}
          showPercentage={true}
        />
      </Box>
      
      {/* File progress */}
      <Box>
        <Text>Files: </Text>
        <Text color="cyan">{processedFiles}</Text>
        <Text> / </Text>
        <Text>{totalFiles}</Text>
        <Text color="gray"> ({formatBytes(processedSize)} / {formatBytes(totalSize)})</Text>
      </Box>
      
      {/* Speed and time */}
      <Box>
        <Text>Speed: </Text>
        <Text color="green">{formatSpeed(speed)}</Text>
        <Text color="gray"> • </Text>
        <Text>Remaining: </Text>
        <Text color="yellow">{formatTime(remainingTime)}</Text>
      </Box>
      
      {/* Current file (if showing details) */}
      {showDetails && currentFile && (
        <Box marginTop={1}>
          <Text color="gray">Current: </Text>
          <Text color="white" wrap="truncate">{currentFile}</Text>
        </Box>
      )}
      
      {/* Errors summary */}
      {errors.length > 0 && (
        <Box marginTop={1}>
          <Text color="red">⚠ {errors.length} error{errors.length > 1 ? 's' : ''}</Text>
          {showDetails && (
            <Box flexDirection="column" marginTop={1}>
              {errors.slice(-3).map((error, index) => (
                <Box key={index} marginLeft={2}>
                  <Text color="red">• {error}</Text>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}
      
      {/* Controls */}
      {(syncStatus === 'syncing' || syncStatus === 'paused') && (
        <Box marginTop={1} gap={2}>
          <Text color="gray">Controls: </Text>
          <Text color="yellow">P</Text>
          <Text color="gray">{isPaused ? 'Resume' : 'Pause'}</Text>
          <Text color="gray"> • </Text>
          <Text color="yellow">S</Text>
          <Text color="gray">Stop</Text>
          <Text color="gray"> • </Text>
          <Text color="yellow">D</Text>
          <Text color="gray">Toggle details</Text>
        </Box>
      )}
    </Box>
  );
};

export default SyncProgress;