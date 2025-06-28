import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import Divider from './common/Divider.js';

const Help = ({ context = 'general', onClose, isActive = true }) => {
  const [activeSection, setActiveSection] = useState(context);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  // Help sections
  const sections = {
    general: {
      title: 'General Help',
      items: [
        { key: 'Navigation', value: 'Use Tab to switch between main views (Sync, Profiles, Settings)' },
        { key: 'Exit', value: 'Press Ctrl+C twice or use Q to quit the application' },
        { key: 'Help', value: 'Press F1 or ? at any time to show context-sensitive help' },
        { key: 'Focus', value: 'Use Tab to move focus between different UI sections' },
        { key: 'Selection', value: 'Use arrow keys to navigate lists and menus' },
        { key: 'Actions', value: 'Press Enter or Space to activate buttons and selections' }
      ]
    },
    
    sync: {
      title: 'Sync View Help',
      items: [
        { key: 'Path Selection', value: 'Press Enter on path fields to browse directories' },
        { key: 'Start Sync', value: 'Press Ctrl+S or click Start to begin synchronization' },
        { key: 'Pause/Resume', value: 'Press Ctrl+P to pause or resume an active sync' },
        { key: 'Cancel', value: 'Press Ctrl+C or ESC to cancel the current sync operation' },
        { key: 'Direction', value: 'Use arrow keys to change sync direction (↔, →, ←)' },
        { key: 'Options', value: 'Press O to open sync options and preferences' },
        { key: 'Filter', value: 'Press F to open the filter manager' },
        { key: 'Ignore', value: 'Press I to edit .syncignore patterns' },
        { key: 'Preview', value: 'Press P to preview changes before syncing' }
      ]
    },
    
    profiles: {
      title: 'Profiles View Help',
      items: [
        { key: 'New Profile', value: 'Press N to create a new sync profile' },
        { key: 'Edit', value: 'Press E to edit the selected profile' },
        { key: 'Delete', value: 'Press D or Delete to remove the selected profile' },
        { key: 'Quick Sync', value: 'Press S to start sync with the selected profile' },
        { key: 'Load', value: 'Press Enter to load profile settings into sync view' },
        { key: 'Search', value: 'Press / or Ctrl+F to search profiles' },
        { key: 'Export', value: 'Press Ctrl+E to export all profiles' },
        { key: 'Import', value: 'Press Ctrl+I to import profiles from file' }
      ]
    },
    
    settings: {
      title: 'Settings View Help',
      items: [
        { key: 'Navigation', value: 'Use number keys 1-4 or arrow keys to switch sections' },
        { key: 'Edit', value: 'Press Enter or Space to edit a setting' },
        { key: 'Toggle', value: 'Press Space to toggle boolean settings on/off' },
        { key: 'Save', value: 'Press Ctrl+S to save all changes' },
        { key: 'Cancel', value: 'Press ESC to discard changes' },
        { key: 'Reset', value: 'Press Ctrl+R to reset settings to defaults' },
        { key: 'Import', value: 'Press Ctrl+I to import settings from file' },
        { key: 'Export', value: 'Press Ctrl+E to export settings to file' }
      ]
    },
    
    keyboard: {
      title: 'Keyboard Shortcuts',
      items: [
        { key: 'Global Shortcuts', value: '' },
        { key: 'F1 / ?', value: 'Show help' },
        { key: 'Tab', value: 'Switch focus / Change view' },
        { key: 'Ctrl+C', value: 'Cancel / Quit (press twice)' },
        { key: 'Q', value: 'Quit application' },
        { key: '', value: '' },
        { key: 'Navigation', value: '' },
        { key: '↑ ↓', value: 'Move selection up/down' },
        { key: '← →', value: 'Move selection left/right' },
        { key: 'Home/End', value: 'Jump to first/last item' },
        { key: 'Page Up/Down', value: 'Scroll large lists' },
        { key: '', value: '' },
        { key: 'Sync Operations', value: '' },
        { key: 'Ctrl+S', value: 'Start sync' },
        { key: 'Ctrl+P', value: 'Pause/Resume sync' },
        { key: 'Ctrl+C', value: 'Cancel sync' },
        { key: '', value: '' },
        { key: 'File Operations', value: '' },
        { key: 'Ctrl+O', value: 'Open file/directory browser' },
        { key: 'Ctrl+E', value: 'Export data' },
        { key: 'Ctrl+I', value: 'Import data' }
      ]
    },
    
    filters: {
      title: 'Filters Help',
      items: [
        { key: 'Preset Filters', value: 'Pre-configured filters for common file types' },
        { key: 'Documents', value: 'Include only document files (doc, pdf, txt)' },
        { key: 'Images', value: 'Include only image files (jpg, png, gif)' },
        { key: 'Code', value: 'Include only source code files' },
        { key: 'Media', value: 'Include only media files (video, audio)' },
        { key: '', value: '' },
        { key: 'Custom Filters', value: 'Create your own filter rules' },
        { key: 'Extensions', value: 'Filter by file extensions (e.g., js,ts,json)' },
        { key: 'Size', value: 'Filter by file size range (min/max)' },
        { key: 'Modified', value: 'Filter by modification date' },
        { key: 'Patterns', value: 'Filter using glob patterns' }
      ]
    },
    
    syncignore: {
      title: 'Syncignore Help',
      items: [
        { key: 'Pattern Format', value: 'Use glob patterns to exclude files' },
        { key: '*.log', value: 'Exclude all .log files' },
        { key: 'node_modules/', value: 'Exclude node_modules directory' },
        { key: '**/*.tmp', value: 'Exclude .tmp files in any subdirectory' },
        { key: '!important.log', value: 'Negate pattern (include even if excluded)' },
        { key: '', value: '' },
        { key: 'Templates', value: 'Pre-configured ignore patterns' },
        { key: 'Node.js', value: 'node_modules, *.log, .env' },
        { key: 'Python', value: '__pycache__, *.pyc, .venv' },
        { key: 'Git', value: '.git, .gitignore' },
        { key: 'OS Files', value: '.DS_Store, Thumbs.db' }
      ]
    },
    
    troubleshooting: {
      title: 'Troubleshooting',
      items: [
        { key: 'Permission Errors', value: 'Run with appropriate permissions or check file ownership' },
        { key: 'Path Not Found', value: 'Ensure paths exist and are accessible' },
        { key: 'WSL Issues', value: 'Check WSL is installed and running (wsl --status)' },
        { key: 'Slow Performance', value: 'Reduce batch size in performance settings' },
        { key: 'High Memory', value: 'Lower worker thread count in settings' },
        { key: '', value: '' },
        { key: 'Common Issues', value: '' },
        { key: 'Stuck Sync', value: 'Press Ctrl+C to cancel and try again' },
        { key: 'Missing Files', value: 'Check filters and syncignore patterns' },
        { key: 'Conflicts', value: 'Review conflict resolution settings' }
      ]
    }
  };
  
  // Get section menu items
  const sectionItems = Object.entries(sections).map(([key, section]) => ({
    label: section.title,
    value: key
  }));
  
  // Handle keyboard input
  useInput((input, key) => {
    if (!isActive) return;
    
    if (key.escape || input === 'q' || input === 'Q') {
      onClose();
    } else if (key.upArrow) {
      setSelectedIndex(Math.max(0, selectedIndex - 1));
    } else if (key.downArrow) {
      const maxIndex = sections[activeSection].items.length - 1;
      setSelectedIndex(Math.min(maxIndex, selectedIndex + 1));
    } else if (key.leftArrow) {
      // Previous section
      const sectionKeys = Object.keys(sections);
      const currentIndex = sectionKeys.indexOf(activeSection);
      if (currentIndex > 0) {
        setActiveSection(sectionKeys[currentIndex - 1]);
        setSelectedIndex(0);
      }
    } else if (key.rightArrow) {
      // Next section
      const sectionKeys = Object.keys(sections);
      const currentIndex = sectionKeys.indexOf(activeSection);
      if (currentIndex < sectionKeys.length - 1) {
        setActiveSection(sectionKeys[currentIndex + 1]);
        setSelectedIndex(0);
      }
    } else if (input >= '1' && input <= '9') {
      // Quick jump to section
      const index = parseInt(input) - 1;
      const sectionKeys = Object.keys(sections);
      if (index < sectionKeys.length) {
        setActiveSection(sectionKeys[index]);
        setSelectedIndex(0);
      }
    }
  });
  
  const currentSection = sections[activeSection];
  
  return (
    <Box flexDirection="column" borderStyle="double" borderColor="cyan" padding={1}>
      {/* Header */}
      <Box marginBottom={1} justifyContent="space-between">
        <Text bold color="cyan">WSL Sync CLI Help</Text>
        <Text color="gray">Press ESC or Q to close</Text>
      </Box>
      
      <Divider />
      
      {/* Section tabs */}
      <Box marginY={1} gap={2}>
        {sectionItems.map((item, index) => (
          <Text
            key={item.value}
            color={activeSection === item.value ? 'cyan' : 'gray'}
            bold={activeSection === item.value}
            underline={activeSection === item.value}
          >
            {index + 1}:{item.label}
          </Text>
        ))}
      </Box>
      
      <Divider />
      
      {/* Section content */}
      <Box flexDirection="column" marginTop={1} minHeight={15}>
        <Text bold color="yellow" marginBottom={1}>
          {currentSection.title}
        </Text>
        
        {currentSection.items.map((item, index) => (
          <Box key={index} marginBottom={item.key === '' ? 0 : 1}>
            {item.key === '' ? (
              <Text> </Text>
            ) : item.value === '' ? (
              <Text bold color="green">{item.key}</Text>
            ) : (
              <Box>
                <Box width={20}>
                  <Text 
                    color={index === selectedIndex ? 'cyan' : 'white'}
                    bold={index === selectedIndex}
                  >
                    {index === selectedIndex ? '▶ ' : '  '}{item.key}:
                  </Text>
                </Box>
                <Text color="gray">{item.value}</Text>
              </Box>
            )}
          </Box>
        ))}
      </Box>
      
      <Divider />
      
      {/* Footer */}
      <Box marginTop={1} gap={3}>
        <Text color="gray">←→: Change Section</Text>
        <Text color="gray">↑↓: Navigate</Text>
        <Text color="gray">1-9: Quick Jump</Text>
      </Box>
    </Box>
  );
};

export default Help;