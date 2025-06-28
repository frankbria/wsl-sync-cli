import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { useApp } from '../store/index.js';

const Navigation = () => {
  const { state, setView } = useApp();
  const { currentView } = state;
  
  const tabs = [
    { id: 'sync', label: 'Sync', icon: '↔' },
    { id: 'profiles', label: 'Profiles', icon: '📁' },
    { id: 'settings', label: 'Settings', icon: '⚙' }
  ];
  
  const currentIndex = tabs.findIndex(tab => tab.id === currentView);
  const [focusedIndex, setFocusedIndex] = useState(currentIndex);
  
  useEffect(() => {
    const index = tabs.findIndex(tab => tab.id === currentView);
    setFocusedIndex(index);
  }, [currentView]);
  
  useInput((input, key) => {
    if (key.tab || (key.ctrl && input === 'n')) {
      // Next tab
      const nextIndex = (focusedIndex + 1) % tabs.length;
      setFocusedIndex(nextIndex);
      setView(tabs[nextIndex].id);
    } else if (key.shift && key.tab) {
      // Previous tab
      const prevIndex = focusedIndex === 0 ? tabs.length - 1 : focusedIndex - 1;
      setFocusedIndex(prevIndex);
      setView(tabs[prevIndex].id);
    } else if (key.leftArrow) {
      // Previous tab
      const prevIndex = focusedIndex === 0 ? tabs.length - 1 : focusedIndex - 1;
      setFocusedIndex(prevIndex);
      setView(tabs[prevIndex].id);
    } else if (key.rightArrow) {
      // Next tab
      const nextIndex = (focusedIndex + 1) % tabs.length;
      setFocusedIndex(nextIndex);
      setView(tabs[nextIndex].id);
    } else if (input >= '1' && input <= '3') {
      // Direct tab selection (1-3)
      const index = parseInt(input) - 1;
      if (index < tabs.length) {
        setFocusedIndex(index);
        setView(tabs[index].id);
      }
    }
  });
  
  return (
    <Box marginBottom={1} gap={2}>
      {tabs.map((tab, index) => {
        const isActive = tab.id === currentView;
        const isFocused = index === focusedIndex;
        
        return (
          <Box key={tab.id}>
            {isActive ? (
              <Box>
                <Text bold color="cyan">[</Text>
                <Text bold color="cyan">{tab.icon} {tab.label}</Text>
                <Text bold color="cyan">]</Text>
              </Box>
            ) : isFocused ? (
              <Box>
                <Text color="yellow"> </Text>
                <Text color="yellow">{tab.icon} {tab.label}</Text>
                <Text color="yellow"> </Text>
              </Box>
            ) : (
              <Box>
                <Text color="gray"> </Text>
                <Text color="gray">{tab.icon} {tab.label}</Text>
                <Text color="gray"> </Text>
              </Box>
            )}
          </Box>
        );
      })}
      <Box marginLeft={2}>
        <Text color="gray" italic>(Tab or ←→ to switch)</Text>
      </Box>
    </Box>
  );
};

export default Navigation;