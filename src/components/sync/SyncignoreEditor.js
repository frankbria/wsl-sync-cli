import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import { useApp } from '../../store/index.js';
import fs from 'fs/promises';
import path from 'path';
import { minimatch } from 'minimatch';

const SyncignoreEditor = ({ 
  syncignorePath, 
  onSave, 
  onCancel, 
  isActive = false,
  testPath = null // Path to test patterns against
}) => {
  const { addNotification } = useApp();
  
  // State
  const [patterns, setPatterns] = useState([]);
  const [newPattern, setNewPattern] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [previewFiles, setPreviewFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Pattern templates
  const templates = [
    { name: 'Node.js', patterns: ['node_modules/', '*.log', '.npm/', '.env'] },
    { name: 'Python', patterns: ['__pycache__/', '*.pyc', '.venv/', '*.egg-info/'] },
    { name: 'Git', patterns: ['.git/', '.gitignore'] },
    { name: 'IDE', patterns: ['.vscode/', '.idea/', '*.swp', '*.swo'] },
    { name: 'OS Files', patterns: ['.DS_Store', 'Thumbs.db', 'desktop.ini'] },
    { name: 'Build', patterns: ['dist/', 'build/', 'out/', '*.o', '*.exe'] },
    { name: 'Temporary', patterns: ['*.tmp', '*.temp', '~*', '.cache/'] },
    { name: 'Logs', patterns: ['*.log', 'logs/', '*.out'] },
    { name: 'Media', patterns: ['*.mp4', '*.avi', '*.mov', '*.mp3'] },
    { name: 'Archives', patterns: ['*.zip', '*.tar', '*.gz', '*.rar'] }
  ];
  
  // Load existing patterns
  useEffect(() => {
    loadPatterns();
  }, [syncignorePath]);
  
  // Test patterns against files if testPath provided
  useEffect(() => {
    if (testPath && patterns.length > 0) {
      testPatterns();
    }
  }, [testPath, patterns]);
  
  // Load patterns from file
  const loadPatterns = async () => {
    setIsLoading(true);
    try {
      if (syncignorePath && await fileExists(syncignorePath)) {
        const content = await fs.readFile(syncignorePath, 'utf-8');
        const loadedPatterns = content
          .split('\n')
          .map(line => line.trim())
          .filter(line => line && !line.startsWith('#'));
        setPatterns(loadedPatterns);
      } else {
        setPatterns([]);
      }
    } catch (error) {
      addNotification({
        type: 'error',
        message: `Failed to load .syncignore: ${error.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Check if file exists
  const fileExists = async (filePath) => {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  };
  
  // Test patterns against files
  const testPatterns = async () => {
    if (!testPath) return;
    
    try {
      const files = await getFilesRecursively(testPath);
      const ignored = files.filter(file => {
        const relativePath = path.relative(testPath, file);
        return isIgnored(relativePath, patterns);
      });
      setPreviewFiles(ignored.slice(0, 10)); // Show first 10 matches
    } catch (error) {
      console.error('Failed to test patterns:', error);
    }
  };
  
  // Get files recursively
  const getFilesRecursively = async (dir, fileList = []) => {
    try {
      const files = await fs.readdir(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = await fs.stat(filePath);
        
        if (stat.isDirectory()) {
          await getFilesRecursively(filePath, fileList);
        } else {
          fileList.push(filePath);
        }
      }
    } catch (error) {
      // Ignore permission errors
    }
    
    return fileList;
  };
  
  // Check if file matches any pattern
  const isIgnored = (filePath, patterns) => {
    return patterns.some(pattern => {
      // Handle directory patterns (ending with /)
      if (pattern.endsWith('/')) {
        const dirPattern = pattern.slice(0, -1);
        return filePath.includes(dirPattern);
      }
      // Use minimatch for glob patterns
      return minimatch(filePath, pattern, { matchBase: true });
    });
  };
  
  // Validate pattern
  const validatePattern = (pattern) => {
    if (!pattern || pattern.trim() === '') {
      return { valid: false, error: 'Pattern cannot be empty' };
    }
    
    // Check for invalid characters
    if (pattern.includes('\\')) {
      return { valid: false, error: 'Use forward slashes (/) for paths' };
    }
    
    // Check for common mistakes
    if (pattern.startsWith('/')) {
      return { valid: false, error: 'Patterns should not start with /' };
    }
    
    return { valid: true };
  };
  
  // Handle keyboard input
  useInput((input, key) => {
    if (!isActive) return;
    
    if (newPattern.length > 0 || editingIndex !== null) {
      // Let TextInput handle input when typing
      return;
    }
    
    if (key.upArrow) {
      setSelectedIndex(Math.max(0, selectedIndex - 1));
    } else if (key.downArrow) {
      setSelectedIndex(Math.min(patterns.length - 1, selectedIndex + 1));
    } else if (input === 'a' || input === 'A') {
      // Add new pattern
      setNewPattern('');
    } else if (input === 'e' || input === 'E') {
      // Edit selected pattern
      if (patterns.length > 0) {
        setEditingIndex(selectedIndex);
        setEditingValue(patterns[selectedIndex]);
      }
    } else if (input === 'd' || input === 'D' || key.delete) {
      // Delete selected pattern
      if (patterns.length > 0) {
        const newPatterns = [...patterns];
        newPatterns.splice(selectedIndex, 1);
        setPatterns(newPatterns);
        setSelectedIndex(Math.max(0, Math.min(selectedIndex, newPatterns.length - 1)));
        setHasChanges(true);
      }
    } else if (input === 't' || input === 'T') {
      // Toggle templates
      setShowTemplates(!showTemplates);
    } else if (input === 's' || input === 'S') {
      // Save
      handleSave();
    } else if (key.escape) {
      if (showTemplates) {
        setShowTemplates(false);
      } else {
        onCancel();
      }
    }
  });
  
  // Add new pattern
  const addPattern = (pattern) => {
    const validation = validatePattern(pattern);
    if (!validation.valid) {
      addNotification({
        type: 'error',
        message: validation.error
      });
      return;
    }
    
    if (!patterns.includes(pattern.trim())) {
      setPatterns([...patterns, pattern.trim()]);
      setHasChanges(true);
    }
    setNewPattern('');
  };
  
  // Update pattern
  const updatePattern = (index, newValue) => {
    const validation = validatePattern(newValue);
    if (!validation.valid) {
      addNotification({
        type: 'error',
        message: validation.error
      });
      return;
    }
    
    const newPatterns = [...patterns];
    newPatterns[index] = newValue.trim();
    setPatterns(newPatterns);
    setEditingIndex(null);
    setEditingValue('');
    setHasChanges(true);
  };
  
  // Add template patterns
  const addTemplate = (template) => {
    const newPatterns = [...patterns];
    template.patterns.forEach(pattern => {
      if (!newPatterns.includes(pattern)) {
        newPatterns.push(pattern);
      }
    });
    setPatterns(newPatterns);
    setHasChanges(true);
    setShowTemplates(false);
  };
  
  // Save patterns to file
  const handleSave = async () => {
    try {
      const content = [
        '# Syncignore patterns',
        '# Use glob patterns to exclude files and directories',
        '# Lines starting with # are comments',
        '',
        ...patterns
      ].join('\n');
      
      if (syncignorePath) {
        await fs.writeFile(syncignorePath, content, 'utf-8');
        addNotification({
          type: 'success',
          message: 'Syncignore patterns saved'
        });
        onSave(patterns);
      }
    } catch (error) {
      addNotification({
        type: 'error',
        message: `Failed to save: ${error.message}`
      });
    }
  };
  
  // Render templates view
  if (showTemplates) {
    return (
      <Box flexDirection="column">
        <Text bold color="cyan">Select Template</Text>
        <Box marginTop={1}>
          <SelectInput
            items={templates.map(t => ({ label: t.name, value: t }))}
            onSelect={(item) => addTemplate(item.value)}
            indicatorComponent={({ isSelected }) => (
              <Text color="cyan">{isSelected ? '▶' : ' '}</Text>
            )}
            itemComponent={({ label, isSelected }) => (
              <Text color={isSelected ? 'cyan' : 'white'}>{label}</Text>
            )}
          />
        </Box>
        <Box marginTop={2}>
          <Text color="gray">Press ESC to go back</Text>
        </Box>
      </Box>
    );
  }
  
  // Main editor view
  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">Syncignore Editor</Text>
        {syncignorePath && (
          <Text color="gray"> - {path.basename(syncignorePath)}</Text>
        )}
      </Box>
      
      {/* Pattern list */}
      <Box 
        flexDirection="column" 
        borderStyle="single" 
        borderColor="gray"
        padding={1}
        minHeight={10}
      >
        {patterns.length === 0 ? (
          <Text color="gray" dimColor>No patterns defined</Text>
        ) : (
          patterns.map((pattern, index) => (
            <Box key={index}>
              <Text color={index === selectedIndex ? 'cyan' : 'white'}>
                {index === selectedIndex ? '▶ ' : '  '}
              </Text>
              {editingIndex === index ? (
                <TextInput
                  value={editingValue}
                  onChange={setEditingValue}
                  onSubmit={() => updatePattern(index, editingValue)}
                />
              ) : (
                <Text color={index === selectedIndex ? 'cyan' : 'white'}>
                  {pattern}
                </Text>
              )}
            </Box>
          ))
        )}
        
        {/* New pattern input */}
        {newPattern !== null && (
          <Box marginTop={patterns.length > 0 ? 1 : 0}>
            <Text color="green">+ </Text>
            <TextInput
              value={newPattern}
              onChange={setNewPattern}
              onSubmit={() => {
                addPattern(newPattern);
              }}
              placeholder="Enter pattern..."
            />
          </Box>
        )}
      </Box>
      
      {/* Preview */}
      {testPath && previewFiles.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text color="yellow">Files that will be ignored:</Text>
          <Box flexDirection="column" marginTop={1}>
            {previewFiles.map((file, index) => (
              <Text key={index} color="gray" dimColor>
                • {path.relative(testPath, file)}
              </Text>
            ))}
            {previewFiles.length === 10 && (
              <Text color="gray" dimColor italic>...and more</Text>
            )}
          </Box>
        </Box>
      )}
      
      {/* Help */}
      <Box marginTop={2} gap={2}>
        <Text color="gray">A: Add</Text>
        <Text color="gray">E: Edit</Text>
        <Text color="gray">D: Delete</Text>
        <Text color="gray">T: Templates</Text>
        <Text color={hasChanges ? 'yellow' : 'gray'}>S: Save</Text>
        <Text color="gray">ESC: Cancel</Text>
      </Box>
    </Box>
  );
};

export default SyncignoreEditor;