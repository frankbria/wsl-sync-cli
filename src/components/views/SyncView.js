import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import Divider from '../common/Divider.js';
import PathInput from '../sync/PathInput.js';
import PathBrowser from '../sync/PathBrowser.js';
import SyncOptions from '../sync/SyncOptions.js';
import SyncProgress from '../sync/SyncProgress.js';
import SyncPreview from '../sync/SyncPreview.js';
import SyncignoreEditor from '../sync/SyncignoreEditor.js';
import FilterManager from '../sync/FilterManager.js';
import LoadingSpinner from '../common/LoadingSpinner.js';
import ErrorMessage from '../common/ErrorMessage.js';
import SuccessMessage from '../common/SuccessMessage.js';
import { useApp } from '../../store/index.js';
import { SyncHandler } from '../../../lib/sync-handler.js';
import path from 'path';

const SyncView = () => {
  const { 
    state, 
    setPaths, 
    setSyncStatus, 
    updateSyncProgress,
    setError,
    clearError,
    addNotification
  } = useApp();
  
  const { 
    sourcePath, 
    destinationPath, 
    syncDirection, 
    syncStatus, 
    settings 
  } = state;
  
  // Component states
  const [activeComponent, setActiveComponent] = useState('source'); // source, dest, options, preview
  const [showBrowser, setShowBrowser] = useState(false);
  const [browserTarget, setBrowserTarget] = useState(null);
  const [preview, setPreview] = useState(null);
  const [syncHandler, setSyncHandler] = useState(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showSyncignore, setShowSyncignore] = useState(false);
  const [showFilterManager, setShowFilterManager] = useState(false);
  const [activeFilter, setActiveFilter] = useState(null);
  
  // Initialize sync handler
  useEffect(() => {
    const handler = new SyncHandler();
    setSyncHandler(handler);
    
    return () => {
      handler.cleanup();
    };
  }, []);
  
  // Keyboard navigation
  useInput((input, key) => {
    // Handle modal dialogs first
    if (showSyncignore || showFilterManager) {
      return; // Let the modal components handle input
    }
    
    // Don't process shortcuts when typing in path inputs
    if (activeComponent === 'source' || activeComponent === 'dest') {
      // Allow navigation keys and special keys
      if (!key.tab && !key.return && !key.escape && !key.ctrl && 
          !key.upArrow && !key.downArrow && !key.leftArrow && !key.rightArrow) {
        // Only block letter/number inputs that might be shortcuts
        if (input && input.length === 1) {
          return;
        }
      }
    }
    
    // Global shortcuts
    if (key.ctrl && input === 's' && canStartSync()) {
      startSync();
      return;
    }
    
    if (key.ctrl && input === 'd' && canStartSync()) {
      generatePreview();
      return;
    }
    
    // Open syncignore editor
    if (input === 'i' || input === 'I') {
      if (sourcePath) {
        setShowSyncignore(true);
      } else {
        addNotification({
          type: 'warning',
          message: 'Please select a source path first'
        });
      }
      return;
    }
    
    // Open filter manager
    if (input === 'f' || input === 'F') {
      setShowFilterManager(true);
      return;
    }
    
    if (key.escape) {
      if (showBrowser) {
        setShowBrowser(false);
      } else if (showFilterManager) {
        setShowFilterManager(false);
      } else if (activeComponent === 'preview') {
        setActiveComponent('source');
        setPreview(null);
      }
      return;
    }
    
    // Component navigation (only when not syncing)
    if (syncStatus === 'idle' || syncStatus === 'completed') {
      if (key.tab && !key.shift) {
        navigateNext();
      } else if (key.shift && key.tab) {
        navigatePrevious();
      } else if (key.upArrow && !showBrowser && activeComponent !== 'options') {
        navigatePrevious();
      } else if (key.downArrow && !showBrowser && activeComponent !== 'options') {
        navigateNext();
      }
    }
    
    // Browser toggle
    if (input === 'b' || input === 'B') {
      if (activeComponent === 'source' || activeComponent === 'dest') {
        setBrowserTarget(activeComponent);
        setShowBrowser(true);
      }
    }
  });
  
  // Navigation helpers
  const navigateNext = () => {
    const components = ['source', 'dest', 'options'];
    const currentIndex = components.indexOf(activeComponent);
    if (currentIndex < components.length - 1) {
      setActiveComponent(components[currentIndex + 1]);
    }
  };
  
  const navigatePrevious = () => {
    const components = ['source', 'dest', 'options'];
    const currentIndex = components.indexOf(activeComponent);
    if (currentIndex > 0) {
      setActiveComponent(components[currentIndex - 1]);
    }
  };
  
  // Path handlers
  const handleSourceChange = (path) => {
    setPaths(path, destinationPath);
  };
  
  const handleDestChange = (path) => {
    setPaths(sourcePath, path);
  };
  
  const handleBrowserSelect = (path) => {
    if (browserTarget === 'source') {
      setPaths(path, destinationPath);
    } else if (browserTarget === 'dest') {
      setPaths(sourcePath, path);
    }
    setShowBrowser(false);
    setBrowserTarget(null);
  };
  
  // Check if sync can start
  const canStartSync = () => {
    return sourcePath && 
           destinationPath && 
           sourcePath !== destinationPath &&
           (syncStatus === 'idle' || syncStatus === 'completed');
  };
  
  // Generate preview
  const generatePreview = async () => {
    if (!canStartSync() || !syncHandler) return;
    
    setIsPreviewLoading(true);
    clearError();
    
    try {
      await syncHandler.initialize(state);
      
      const previewResult = await syncHandler.preview(
        sourcePath,
        destinationPath,
        {
          syncDirection,
          dryRun: true
        }
      );
      
      setPreview(previewResult);
      setActiveComponent('preview');
    } catch (error) {
      setError(error.message);
    } finally {
      setIsPreviewLoading(false);
    }
  };
  
  // Start sync
  const startSync = async () => {
    if (!canStartSync() || !syncHandler) return;
    
    setSyncStatus('preparing');
    clearError();
    setSuccessMessage('');
    
    try {
      await syncHandler.initialize(state);
      
      setSyncStatus('syncing');
      
      const result = await syncHandler.startSync(
        sourcePath,
        destinationPath,
        {
          syncDirection,
          dryRun: settings.dryRun || false,
          onProgress: (progress) => {
            updateSyncProgress(progress);
          },
          onError: (error) => {
            addNotification({
              type: 'error',
              message: error.message
            });
          },
          onComplete: (stats) => {
            setSyncStatus('completed');
            setSuccessMessage(`Sync completed! ${stats.totalFiles} files processed.`);
            updateSyncProgress({
              percentage: 100,
              currentFile: '',
              errors: []
            });
          }
        }
      );
      
    } catch (error) {
      setSyncStatus('error');
      setError(error.message);
    }
  };
  
  // Sync controls
  const handlePauseSync = async () => {
    if (syncHandler) {
      await syncHandler.pauseSync();
      setSyncStatus('paused');
    }
  };
  
  const handleResumeSync = async () => {
    if (syncHandler) {
      await syncHandler.resumeSync();
      setSyncStatus('syncing');
    }
  };
  
  const handleStopSync = async () => {
    if (syncHandler) {
      await syncHandler.stopSync();
      setSyncStatus('idle');
      updateSyncProgress({
        percentage: 0,
        currentFile: '',
        errors: []
      });
    }
  };
  
  // Preview handlers
  const handlePreviewConfirm = () => {
    setPreview(null);
    setActiveComponent('source');
    startSync();
  };
  
  const handlePreviewCancel = () => {
    setPreview(null);
    setActiveComponent('source');
  };
  
  // Render browser if active
  if (showBrowser) {
    return (
      <Box flexDirection="column">
        <Divider title="Browse Folders" titleColor="cyan" />
        <Box marginTop={1}>
          <PathBrowser
            onSelect={handleBrowserSelect}
            onCancel={() => setShowBrowser(false)}
            initialPath={browserTarget === 'source' ? sourcePath : destinationPath}
            isActive={true}
          />
        </Box>
      </Box>
    );
  }
  
  // Render preview if active
  if (activeComponent === 'preview' && preview) {
    return (
      <Box flexDirection="column">
        <Divider title="Sync Preview" titleColor="cyan" />
        <Box marginTop={1}>
          <SyncPreview
            preview={preview}
            onConfirm={handlePreviewConfirm}
            onCancel={handlePreviewCancel}
            isActive={true}
          />
        </Box>
      </Box>
    );
  }
  
  // Render filter manager if active
  if (showFilterManager) {
    return (
      <Box flexDirection="column">
        <Divider title="Filter Manager" titleColor="cyan" />
        <Box marginTop={1}>
          <FilterManager
            onApply={(filter) => {
              setActiveFilter(filter);
              setShowFilterManager(false);
              addNotification({
                type: 'success',
                message: `Filter applied: ${filter.name || filter.type}`
              });
            }}
            onCancel={() => setShowFilterManager(false)}
            isActive={true}
            currentFilter={activeFilter}
          />
        </Box>
      </Box>
    );
  }
  
  // Main sync view
  return (
    <Box flexDirection="column">
      <Divider title="Sync Configuration" titleColor="cyan" />
      
      {/* Success message */}
      {successMessage && (
        <SuccessMessage message={successMessage} duration={5000} />
      )}
      
      {/* Path inputs */}
      <Box marginTop={1} flexDirection="column">
        <PathInput
          label="Source Path"
          value={sourcePath}
          onChange={handleSourceChange}
          onSubmit={() => setActiveComponent('dest')}
          isActive={activeComponent === 'source'}
          placeholder="Enter source directory path..."
        />
        
        <PathInput
          label="Destination Path"
          value={destinationPath}
          onChange={handleDestChange}
          onSubmit={() => setActiveComponent('options')}
          isActive={activeComponent === 'dest'}
          placeholder="Enter destination directory path..."
        />
      </Box>
      
      {/* Sync options */}
      <Box marginTop={1}>
        <SyncOptions isActive={activeComponent === 'options'} />
      </Box>
      
      {/* Sync progress */}
      {(syncStatus === 'syncing' || syncStatus === 'paused') && (
        <Box marginTop={1}>
          <SyncProgress
            onPause={handlePauseSync}
            onResume={handleResumeSync}
            onStop={handleStopSync}
          />
        </Box>
      )}
      
      {/* Preview loading */}
      {isPreviewLoading && (
        <Box marginTop={1} justifyContent="center">
          <LoadingSpinner text="Generating preview..." />
        </Box>
      )}
      
      {/* Action buttons */}
      {(syncStatus === 'idle' || syncStatus === 'completed') && (
        <Box marginTop={2} gap={3}>
          <Text color="gray">Actions: </Text>
          <Box>
            <Text color={canStartSync() ? 'green' : 'gray'}>
              Ctrl+S: Start Sync
            </Text>
          </Box>
          <Box>
            <Text color={canStartSync() ? 'yellow' : 'gray'}>
              Ctrl+D: Dry Run Preview
            </Text>
          </Box>
          <Box>
            <Text color="cyan">B: Browse Folders</Text>
          </Box>
          <Box>
            <Text color="cyan">I: Edit Ignore</Text>
          </Box>
          <Box>
            <Text color="cyan">F: Filters</Text>
          </Box>
        </Box>
      )}
      
      {/* Syncignore Editor Modal */}
      {showSyncignore && (
        <Box position="absolute" width="100%" height="100%">
          <Box 
            flexDirection="column" 
            borderStyle="double" 
            borderColor="cyan"
            padding={1}
            margin={2}
          >
            <SyncignoreEditor
              syncignorePath={path.join(sourcePath, '.syncignore')}
              onSave={(patterns) => {
                setShowSyncignore(false);
                addNotification({
                  type: 'success',
                  message: 'Syncignore patterns saved'
                });
              }}
              onCancel={() => setShowSyncignore(false)}
              isActive={true}
              testPath={sourcePath}
            />
          </Box>
        </Box>
      )}
      
    </Box>
  );
};

export default SyncView;