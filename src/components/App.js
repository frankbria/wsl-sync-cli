import React, { useEffect } from 'react';
import { Box, Text, useInput, useApp as useInkApp } from 'ink';
import { AppProvider, useApp } from '../store/index.js';
import Layout from './Layout.js';
import SyncView from './views/SyncView.js';
import ProfilesView from './views/ProfilesView.js';
import SettingsView from './views/SettingsView.js';
import LoadingSpinner from './common/LoadingSpinner.js';

// Main app content that uses the context
const AppContent = ({ argv }) => {
  const { exit } = useInkApp();
  const { state, setPaths, setView } = useApp();
  const { currentView, loading } = state;
  
  // Handle command line arguments
  useEffect(() => {
    if (argv.source && argv.destination) {
      setPaths(argv.source, argv.destination);
      // Optionally switch to sync view if paths are provided
      setView('sync');
    }
  }, [argv.source, argv.destination]);
  
  // Global keyboard shortcuts
  useInput((input, key) => {
    // Exit on Ctrl+C
    if (key.ctrl && input === 'c') {
      exit();
    }
    
    // Quick view switching with number keys
    if (input === '1') setView('sync');
    if (input === '2') setView('profiles');
    if (input === '3') setView('settings');
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
    <Layout>
      {renderView()}
    </Layout>
  );
};

// Root App component with provider
const App = ({ argv }) => {
  return (
    <AppProvider>
      <AppContent argv={argv} />
    </AppProvider>
  );
};

export default App;