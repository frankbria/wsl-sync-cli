import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { useApp } from '../../store/index.js';
import { WSLIntegration } from '../../lib/wsl-integration.js';
import fs from 'fs-extra';
import path from 'path';

const PathInput = ({ 
  label, 
  value, 
  onChange, 
  onSubmit,
  placeholder = 'Enter path...',
  isActive = false,
  pathType = 'any' // 'any', 'windows', 'wsl'
}) => {
  const [inputValue, setInputValue] = useState(value || '');
  const [isValid, setIsValid] = useState(true);
  const [validationError, setValidationError] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const { state } = useApp();
  const wslIntegration = state.wslIntegration;
  
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);
  
  // Validate path as user types
  const validatePath = async (pathStr) => {
    if (!pathStr) {
      setIsValid(true);
      setValidationError('');
      return true;
    }
    
    try {
      // Check if it's a WSL path
      const isWSLPath = pathStr.startsWith('/') || pathStr.startsWith('\\\\wsl$');
      const isWindowsPath = /^[A-Za-z]:[\\\/]/.test(pathStr);
      
      // Validate path type
      if (pathType === 'wsl' && !isWSLPath) {
        setIsValid(false);
        setValidationError('Please enter a WSL path (e.g., /home/user/folder)');
        return false;
      }
      
      if (pathType === 'windows' && !isWindowsPath) {
        setIsValid(false);
        setValidationError('Please enter a Windows path (e.g., C:\\Users\\folder)');
        return false;
      }
      
      // Check if path exists
      let pathToCheck = pathStr;
      
      // Convert WSL path for checking if needed
      if (isWSLPath && wslIntegration) {
        const windowsPath = wslIntegration.wslToWindowsPath(pathStr);
        if (windowsPath) {
          pathToCheck = windowsPath;
        }
      }
      
      const exists = await fs.pathExists(pathToCheck);
      if (!exists) {
        setIsValid(false);
        setValidationError('Path does not exist');
        return false;
      }
      
      // Check if it's a directory
      const stats = await fs.stat(pathToCheck);
      if (!stats.isDirectory()) {
        setIsValid(false);
        setValidationError('Path must be a directory');
        return false;
      }
      
      setIsValid(true);
      setValidationError('');
      return true;
      
    } catch (error) {
      setIsValid(false);
      setValidationError('Invalid path');
      return false;
    }
  };
  
  // Generate path suggestions
  const generateSuggestions = async (currentPath) => {
    try {
      if (!currentPath) {
        // Show recent paths from settings
        const recentPaths = state.settings.recentPaths || [];
        setSuggestions(recentPaths.slice(0, 3));
        return;
      }
      
      const dir = path.dirname(currentPath);
      const basename = path.basename(currentPath);
      
      if (await fs.pathExists(dir)) {
        const entries = await fs.readdir(dir);
        const dirs = [];
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry);
          try {
            const stats = await fs.stat(fullPath);
            if (stats.isDirectory() && entry.toLowerCase().startsWith(basename.toLowerCase())) {
              dirs.push(fullPath);
            }
          } catch (e) {
            // Skip inaccessible directories
          }
        }
        
        setSuggestions(dirs.slice(0, 3));
      }
    } catch (error) {
      setSuggestions([]);
    }
  };
  
  const handleChange = async (newValue) => {
    setInputValue(newValue);
    onChange(newValue);
    
    // Debounced validation
    if (newValue) {
      setTimeout(() => validatePath(newValue), 300);
      setTimeout(() => generateSuggestions(newValue), 500);
    }
  };
  
  const handleSubmit = async () => {
    const valid = await validatePath(inputValue);
    if (valid && onSubmit) {
      onSubmit(inputValue);
    }
  };
  
  // Convert path between Windows and WSL formats
  const togglePathFormat = () => {
    if (!wslIntegration || !inputValue) return;
    
    if (inputValue.startsWith('/') || inputValue.startsWith('\\\\wsl$')) {
      // Convert WSL to Windows
      const windowsPath = wslIntegration.wslToWindowsPath(inputValue);
      if (windowsPath) {
        setInputValue(windowsPath);
        onChange(windowsPath);
      }
    } else if (/^[A-Za-z]:[\\\/]/.test(inputValue)) {
      // Convert Windows to WSL
      const wslPath = wslIntegration.windowsToWSLPath(inputValue);
      if (wslPath) {
        setInputValue(wslPath);
        onChange(wslPath);
      }
    }
  };
  
  const getPathIcon = () => {
    if (!inputValue) return '📁';
    if (inputValue.startsWith('/') || inputValue.startsWith('\\\\wsl$')) return '🐧';
    if (/^[A-Za-z]:[\\\/]/.test(inputValue)) return '🪟';
    return '📁';
  };
  
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box marginBottom={1}>
        <Text bold color={isActive ? 'cyan' : 'white'}>
          {getPathIcon()} {label}:
        </Text>
      </Box>
      
      <Box marginLeft={2}>
        {isActive ? (
          <Box flexDirection="column">
            <TextInput
              value={inputValue}
              onChange={handleChange}
              onSubmit={handleSubmit}
              placeholder={placeholder}
            />
            
            {/* Validation feedback */}
            {!isValid && validationError && (
              <Box marginTop={1}>
                <Text color="red">⚠ {validationError}</Text>
              </Box>
            )}
            
            {/* Path format toggle hint */}
            {wslIntegration && inputValue && (
              <Box marginTop={1}>
                <Text color="gray" italic>
                  Press F2 to toggle between Windows/WSL path format
                </Text>
              </Box>
            )}
            
            {/* Suggestions */}
            {suggestions.length > 0 && (
              <Box flexDirection="column" marginTop={1}>
                <Text color="gray">Suggestions:</Text>
                {suggestions.map((suggestion, index) => (
                  <Box key={index} marginLeft={2}>
                    <Text color="gray">• {suggestion}</Text>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        ) : (
          <Box>
            <Text color={isValid ? 'green' : 'yellow'}>
              {inputValue || <Text color="gray">{placeholder}</Text>}
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default PathInput;