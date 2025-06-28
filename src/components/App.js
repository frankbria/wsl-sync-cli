import React, { useEffect, useState } from 'react';
import { Box, Text, useInput, useApp as useInkApp } from 'ink';
import { AppProvider, useApp } from '../store/index.js';
import Layout from './Layout.js';
import SyncView from './views/SyncView.js';
import ProfilesView from './views/ProfilesView.js';
import SettingsView from './views/SettingsView.js';
import LoadingSpinner from './common/LoadingSpinner.js';
import Help from './Help.js';
import ErrorBoundary from './ErrorBoundary.js';
import TerminalAdapter from './TerminalAdapter.js';

// Main app content that uses the context
const AppContent = ({ argv }) => {
  const { exit } = useInkApp();
  const { state, setPaths, setView, setSyncStatus, setSyncDirection, updateSetting, addNotification } = useApp();
  const { currentView, loading, syncStatus } = state;
  const [showHelp, setShowHelp] = useState(false);
  const [ctrlCCount, setCtrlCCount] = useState(0);
  const [lastCtrlCTime, setLastCtrlCTime] = useState(0);
  
  // Handle command line arguments
  useEffect(() => {
    // Handle paths from positional arguments
    const sourcePath = argv.source || argv._?.[0];
    const destinationPath = argv.destination || argv._?.[1];
    
    if (sourcePath && destinationPath) {
      setPaths(sourcePath, destinationPath);
      setView('sync');
    }
    
    // Handle profile loading
    if (argv.profile) {
      // This will be handled by the ProfilesView
      setView('profiles');
      addNotification({
        type: 'info',
        message: `Loading profile: ${argv.profile}`
      });
    }
    
    // Handle filter preset
    if (argv.filter) {
      // Store filter in state for SyncView to use
      state.activeFilter = {
        type: 'preset',
        preset: argv.filter
      };
    }
    
    // Handle ignore patterns
    if (argv.ignore && argv.ignore.length > 0) {
      // Store ignore patterns for SyncView
      state.ignorePatterns = argv.ignore;
    }
    
    // Handle sync direction
    if (argv.oneWay) {
      setSyncDirection('source-to-dest');
    } else if (argv.twoWay) {
      setSyncDirection('two-way');
    }
    
    // Handle worker threads
    if (argv.workers) {
      updateSetting('maxWorkerThreads', argv.workers);
    }
    
    // Handle no-delete option
    if (argv.noDelete) {
      updateSetting('deleteOrphaned', false);
    }
    
    // Handle dry-run
    if (argv.dryRun) {
      state.dryRunMode = true;
    }
    
    // Auto-start sync if requested
    if (argv.autoConfirm && sourcePath && destinationPath) {
      // Delay to allow UI to initialize
      setTimeout(() => {
        addNotification({
          type: 'info',
          message: 'Auto-starting sync...'
        });
      }, 1000);
    }
  }, []);
  
  // Global keyboard shortcuts
  useInput((input, key) => {
    // Handle help display first
    if (showHelp) {
      if (key.escape || input === 'q' || input === 'Q') {
        setShowHelp(false);
      }
      return; // Don't process other shortcuts when help is open
    }
    
    // Exit on Ctrl+C (require double press)
    if (key.ctrl && input === 'c') {
      const now = Date.now();
      if (now - lastCtrlCTime < 1000) {
        // Second Ctrl+C within 1 second
        exit();
      } else {
        // First Ctrl+C
        setCtrlCCount(1);
        setLastCtrlCTime(now);
        addNotification({
          type: 'warning',
          message: 'Press Ctrl+C again to exit'
        });
        
        // Reset after 1 second
        setTimeout(() => {
          setCtrlCCount(0);
        }, 1000);
      }
    }
    
    // Quick exit with Q
    if (input === 'q' || input === 'Q') {
      exit();
    }
    
    // Help shortcuts
    if (key.f1 || input === '?') {
      setShowHelp(true);
    }
    
    // Quick view switching with number keys
    if (input === '1') setView('sync');
    if (input === '2') setView('profiles');
    if (input === '3') setView('settings');
    
    // View switching with Ctrl+Tab
    if (key.ctrl && key.tab) {
      const views = ['sync', 'profiles', 'settings'];
      const currentIndex = views.indexOf(currentView);
      const nextIndex = (currentIndex + 1) % views.length;
      setView(views[nextIndex]);
    }
    
    // Global sync shortcuts (only when in sync view)
    if (currentView === 'sync') {
      // Start sync
      if (key.ctrl && input === 's' && syncStatus === 'idle') {
        // This will be handled by SyncView, but we can show a notification
        addNotification({
          type: 'info',
          message: 'Use Start button or press Enter to begin sync'
        });
      }
      
      // Pause/Resume
      if (key.ctrl && input === 'p') {
        if (syncStatus === 'syncing') {
          setSyncStatus('paused');
          addNotification({
            type: 'info',
            message: 'Sync paused'
          });
        } else if (syncStatus === 'paused') {
          setSyncStatus('syncing');
          addNotification({
            type: 'info',
            message: 'Sync resumed'
          });
        }
      }
    }
  });
  
  // Render current view
  const renderView = () => {
    switch (currentView) {
      case 'sync':
        return <SyncView />;
      case 'profiles':
        return <ProfilesView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <SyncView />;
    }
  };
  
  if (loading) {
    return (
      <Box justifyContent="center" alignItems="center" height="100%">
        <LoadingSpinner text="Initializing WSL Sync..." />
      </Box>
    );
  }
  
  return (
    <Box flexDirection="column" height="100%">
      {showHelp ? (
        <Help 
          context={currentView} 
          onClose={() => setShowHelp(false)}
          isActive={true}
        />
      ) : (
        <Layout>
          {renderView()}
        </Layout>
      )}
    </Box>
  );
};

// Root App component with provider
const App = ({ argv }) => {
  return (
    <ErrorBoundary>
      <TerminalAdapter>
        <AppProvider>
          <AppContent argv={argv} />
        </AppProvider>
      </TerminalAdapter>
    </ErrorBoundary>
  );
};

export default App;