import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const PathBrowser = ({ 
  onSelect, 
  onCancel,
  initialPath = '',
  isActive = false 
}) => {
  const [currentPath, setCurrentPath] = useState(initialPath || os.homedir());
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  // Load directory contents
  const loadDirectory = async (dirPath) => {
    setLoading(true);
    setError('');
    
    try {
      // Ensure path exists
      const exists = await fs.access(dirPath).then(() => true).catch(() => false);
      if (!exists) {
        throw new Error('Directory does not exist');
      }
      
      // Read directory
      const files = await fs.readdir(dirPath);
      const items = [];
      
      // Add parent directory option
      if (dirPath !== '/') {
        items.push({
          label: '📁 ..',
          value: path.dirname(dirPath),
          isDirectory: true,
          isParent: true
        });
      }
      
      // Add subdirectories first, then files
      const dirs = [];
      const regularFiles = [];
      
      for (const file of files) {
        // Skip hidden files unless explicitly showing them
        if (file.startsWith('.')) continue;
        
        try {
          const fullPath = path.join(dirPath, file);
          const stats = await fs.stat(fullPath);
          
          const item = {
            label: stats.isDirectory() ? `📁 ${file}` : `📄 ${file}`,
            value: fullPath,
            isDirectory: stats.isDirectory(),
            size: stats.size,
            modified: stats.mtime
          };
          
          if (stats.isDirectory()) {
            dirs.push(item);
          } else {
            regularFiles.push(item);
          }
        } catch (err) {
          // Skip files we can't access
        }
      }
      
      // Sort and combine
      dirs.sort((a, b) => a.label.localeCompare(b.label));
      regularFiles.sort((a, b) => a.label.localeCompare(b.label));
      
      setEntries([...items, ...dirs]);
      setCurrentPath(dirPath);
      setSelectedIndex(0);
      
    } catch (err) {
      setError(err.message);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Load initial directory
  useEffect(() => {
    loadDirectory(currentPath);
  }, []);
  
  // Handle selection
  const handleSelect = (item) => {
    if (item.isDirectory) {
      loadDirectory(item.value);
    }
  };
  
  // Keyboard navigation
  useInput((input, key) => {
    if (!isActive) return;
    
    if (key.return) {
      // Enter - select current directory
      onSelect(currentPath);
    } else if (key.escape) {
      // ESC - cancel
      onCancel();
    } else if (key.backspace || (key.ctrl && input === 'h')) {
      // Backspace - go to parent directory
      if (currentPath !== '/') {
        loadDirectory(path.dirname(currentPath));
      }
    } else if (input === '~') {
      // ~ - go to home directory
      loadDirectory(os.homedir());
    } else if (input === '/') {
      // / - go to root
      loadDirectory('/');
    }
  });
  
  if (!isActive) {
    return (
      <Box>
        <Text color="gray">Path browser (inactive)</Text>
      </Box>
    );
  }
  
  return (
    <Box flexDirection="column">
      {/* Current path */}
      <Box marginBottom={1}>
        <Text bold color="cyan">Current: </Text>
        <Text>{currentPath}</Text>
      </Box>
      
      {/* Error message */}
      {error && (
        <Box marginBottom={1}>
          <Text color="red">Error: {error}</Text>
        </Box>
      )}
      
      {/* Loading indicator */}
      {loading && (
        <Box>
          <Text color="gray">Loading...</Text>
        </Box>
      )}
      
      {/* Directory listing */}
      {!loading && entries.length > 0 && (
        <Box flexDirection="column">
          <Text color="gray" italic>
            Use ↑↓ to navigate, Enter to open folder, Space to select current
          </Text>
          <Box marginTop={1}>
            <SelectInput
              items={entries}
              onSelect={handleSelect}
              indicatorComponent={({ isSelected }) => (
                <Text color="cyan">{isSelected ? '▶' : ' '}</Text>
              )}
              itemComponent={({ label, isSelected }) => (
                <Text color={isSelected ? 'cyan' : 'white'}>{label}</Text>
              )}
            />
          </Box>
        </Box>
      )}
      
      {/* Shortcuts */}
      <Box marginTop={1} flexDirection="column">
        <Text color="gray">Shortcuts:</Text>
        <Box marginLeft={2}>
          <Text color="gray">Enter: Select • ESC: Cancel • Backspace: Parent • ~: Home • /: Root</Text>
        </Box>
      </Box>
    </Box>
  );
};

export default PathBrowser;