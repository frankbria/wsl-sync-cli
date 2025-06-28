import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { useApp } from '../../store/index.js';
import Divider from '../common/Divider.js';
import LoadingSpinner from '../common/LoadingSpinner.js';
import SuccessMessage from '../common/SuccessMessage.js';
import ErrorMessage from '../common/ErrorMessage.js';
import GeneralSettings from '../settings/GeneralSettings.js';
import PerformanceSettings from '../settings/PerformanceSettings.js';
import DisplaySettings from '../settings/DisplaySettings.js';
import PathSettings from '../settings/PathSettings.js';
import { SettingsTabNavigation } from '../settings/SettingsNavigation.js';
import { SettingsManager } from '../../lib/settings.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const SettingsView = () => {
  const { state, addNotification, settings: settingsManager } = useApp();
  const { settings } = state;
  
  // State management
  const [activeSection, setActiveSection] = useState('general');
  const [isNavigationActive, setIsNavigationActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importPath, setImportPath] = useState('');
  
  // Settings sections
  const sections = [
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'performance', label: 'Performance', icon: '🚀' },
    { id: 'display', label: 'Display', icon: '🎨' },
    { id: 'paths', label: 'Paths', icon: '📁' }
  ];
  
  // Update section modified status
  useEffect(() => {
    sections.forEach(section => {
      section.modified = hasUnsavedChanges;
    });
  }, [hasUnsavedChanges]);
  
  // Handle keyboard input
  useInput((input, key) => {
    if (key.tab) {
      setIsNavigationActive(!isNavigationActive);
    } else if (key.ctrl && input === 's' && hasUnsavedChanges) {
      handleSaveAll();
    } else if (key.ctrl && input === 'e') {
      handleExport();
    } else if (key.ctrl && input === 'i') {
      handleImport();
    } else if (key.ctrl && input === 'r') {
      handleReset();
    } else if (key.escape) {
      if (showError) {
        setShowError(null);
      }
    }
  });
  
  // Handle section change
  const handleSectionChange = (sectionId) => {
    if (hasUnsavedChanges) {
      // In a real app, we might want to prompt the user
      // For now, we'll just switch
    }
    setActiveSection(sectionId);
    setIsNavigationActive(false);
  };
  
  // Handle settings save
  const handleSave = async () => {
    setIsSaving(true);
    setShowError(null);
    
    try {
      // Save settings using the settings manager
      if (settingsManager && settingsManager.save) {
        await settingsManager.save();
      }
      
      setHasUnsavedChanges(false);
      setShowSuccess(true);
      
      addNotification({
        type: 'success',
        message: 'Settings saved successfully'
      });
      
      // Hide success message after 2 seconds
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      setShowError(error.message);
      addNotification({
        type: 'error',
        message: `Failed to save settings: ${error.message}`
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Handle save all sections
  const handleSaveAll = () => {
    handleSave();
  };
  
  // Handle cancel
  const handleCancel = () => {
    setHasUnsavedChanges(false);
    setIsNavigationActive(true);
  };
  
  // Handle settings export
  const handleExport = async () => {
    setIsExporting(true);
    setShowError(null);
    
    try {
      const exportData = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        settings: settings
      };
      
      const exportPath = path.join(os.homedir(), '.wsl-sync', 'settings-export.json');
      await fs.mkdir(path.dirname(exportPath), { recursive: true });
      await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2));
      
      addNotification({
        type: 'success',
        message: `Settings exported to ${exportPath}`
      });
    } catch (error) {
      setShowError(error.message);
      addNotification({
        type: 'error',
        message: `Export failed: ${error.message}`
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  // Handle settings import
  const handleImport = async () => {
    // In a real implementation, this would open a file dialog
    // For CLI, we'll look for a specific file
    setIsImporting(true);
    setShowError(null);
    
    try {
      const importPath = path.join(os.homedir(), '.wsl-sync', 'settings-import.json');
      const data = await fs.readFile(importPath, 'utf-8');
      const importedData = JSON.parse(data);
      
      if (!importedData.settings) {
        throw new Error('Invalid import file format');
      }
      
      // Apply imported settings
      Object.entries(importedData.settings).forEach(([key, value]) => {
        if (settingsManager && settingsManager.updateSetting) {
          settingsManager.updateSetting(key, value);
        }
      });
      
      addNotification({
        type: 'success',
        message: 'Settings imported successfully'
      });
      
      setHasUnsavedChanges(true);
    } catch (error) {
      if (error.code === 'ENOENT') {
        setShowError('No import file found. Place settings-import.json in ~/.wsl-sync/');
      } else {
        setShowError(error.message);
      }
      addNotification({
        type: 'error',
        message: `Import failed: ${error.message}`
      });
    } finally {
      setIsImporting(false);
    }
  };
  
  // Handle settings reset
  const handleReset = async () => {
    try {
      // Reset all settings to defaults
      if (settingsManager && settingsManager.reset) {
        await settingsManager.reset();
      }
      
      addNotification({
        type: 'success',
        message: 'Settings reset to defaults'
      });
      
      setHasUnsavedChanges(false);
    } catch (error) {
      setShowError(error.message);
      addNotification({
        type: 'error',
        message: `Reset failed: ${error.message}`
      });
    }
  };
  
  // Mark as having unsaved changes
  const markAsModified = () => {
    setHasUnsavedChanges(true);
  };
  
  // Render active settings component
  const renderActiveSettings = () => {
    const componentProps = {
      isActive: !isNavigationActive,
      onSave: handleSave,
      onCancel: handleCancel
    };
    
    switch (activeSection) {
      case 'general':
        return <GeneralSettings {...componentProps} />;
      case 'performance':
        return <PerformanceSettings {...componentProps} />;
      case 'display':
        return <DisplaySettings {...componentProps} />;
      case 'paths':
        return <PathSettings {...componentProps} />;
      default:
        return <Text>Unknown settings section</Text>;
    }
  };
  
  return (
    <Box flexDirection="column">
      <Divider title="Settings" titleColor="cyan" />
      
      {/* Success/Error messages */}
      {showSuccess && (
        <Box marginY={1}>
          <SuccessMessage message="Settings saved successfully" />
        </Box>
      )}
      
      {showError && (
        <Box marginY={1}>
          <ErrorMessage 
            message={showError} 
            onDismiss={() => setShowError(null)}
          />
        </Box>
      )}
      
      {/* Tab navigation */}
      <Box marginTop={1}>
        <SettingsTabNavigation
          sections={sections}
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
          isActive={isNavigationActive}
        />
      </Box>
      
      <Divider />
      
      {/* Active settings section */}
      <Box marginTop={1} flexGrow={1}>
        {isSaving ? (
          <LoadingSpinner text="Saving settings..." />
        ) : isExporting ? (
          <LoadingSpinner text="Exporting settings..." />
        ) : isImporting ? (
          <LoadingSpinner text="Importing settings..." />
        ) : (
          renderActiveSettings()
        )}
      </Box>
      
      {/* Global actions */}
      <Box marginTop={2} gap={3}>
        <Text color="gray">Global: </Text>
        <Text color={hasUnsavedChanges ? 'yellow' : 'gray'}>
          {hasUnsavedChanges ? '• ' : ''}Ctrl+S: Save All
        </Text>
        <Text color="gray">Ctrl+E: Export</Text>
        <Text color="gray">Ctrl+I: Import</Text>
        <Text color="gray">Ctrl+R: Reset</Text>
        <Text color="cyan">Tab: Switch Focus</Text>
      </Box>
    </Box>
  );
};

export default SettingsView;