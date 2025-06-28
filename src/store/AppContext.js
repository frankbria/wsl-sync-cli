import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { ProfileManager } from '../../lib/profiles.js';
import { SettingsManager } from '../../lib/settings.js';
import { FilterManager } from '../../lib/filters.js';
import { WSLIntegration } from '../../lib/wsl-integration.js';

// Initial state
const initialState = {
  // Navigation
  currentView: 'sync', // 'sync', 'profiles', 'settings'
  
  // Sync state
  syncStatus: 'idle', // 'idle', 'preparing', 'syncing', 'paused', 'completed', 'error'
  syncProgress: {
    percentage: 0,
    currentFile: '',
    totalFiles: 0,
    processedFiles: 0,
    totalSize: 0,
    processedSize: 0,
    speed: 0,
    remainingTime: 0,
    errors: []
  },
  
  // Paths
  sourcePath: '',
  destinationPath: '',
  syncDirection: 'two-way', // 'two-way', 'source-to-dest', 'dest-to-source'
  
  // Profiles
  profiles: [],
  activeProfile: null,
  
  // Settings
  settings: {},
  
  // Filters
  activeFilter: null,
  customFilters: [],
  
  // WSL
  wslIntegration: null,
  wslDistributions: [],
  
  // UI State
  error: null,
  loading: false,
  notifications: []
};

// Action types
const ActionTypes = {
  // Navigation
  SET_VIEW: 'SET_VIEW',
  
  // Sync actions
  SET_SYNC_STATUS: 'SET_SYNC_STATUS',
  UPDATE_SYNC_PROGRESS: 'UPDATE_SYNC_PROGRESS',
  SET_PATHS: 'SET_PATHS',
  SET_SYNC_DIRECTION: 'SET_SYNC_DIRECTION',
  
  // Profile actions
  SET_PROFILES: 'SET_PROFILES',
  SET_ACTIVE_PROFILE: 'SET_ACTIVE_PROFILE',
  ADD_PROFILE: 'ADD_PROFILE',
  UPDATE_PROFILE: 'UPDATE_PROFILE',
  DELETE_PROFILE: 'DELETE_PROFILE',
  
  // Settings actions
  SET_SETTINGS: 'SET_SETTINGS',
  UPDATE_SETTING: 'UPDATE_SETTING',
  
  // Filter actions
  SET_ACTIVE_FILTER: 'SET_ACTIVE_FILTER',
  ADD_CUSTOM_FILTER: 'ADD_CUSTOM_FILTER',
  
  // WSL actions
  SET_WSL_INTEGRATION: 'SET_WSL_INTEGRATION',
  SET_WSL_DISTRIBUTIONS: 'SET_WSL_DISTRIBUTIONS',
  
  // UI actions
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_LOADING: 'SET_LOADING',
  ADD_NOTIFICATION: 'ADD_NOTIFICATION',
  REMOVE_NOTIFICATION: 'REMOVE_NOTIFICATION'
};

// Reducer
function appReducer(state, action) {
  switch (action.type) {
    // Navigation
    case ActionTypes.SET_VIEW:
      return { ...state, currentView: action.payload };
    
    // Sync
    case ActionTypes.SET_SYNC_STATUS:
      return { ...state, syncStatus: action.payload };
    
    case ActionTypes.UPDATE_SYNC_PROGRESS:
      return { 
        ...state, 
        syncProgress: { ...state.syncProgress, ...action.payload }
      };
    
    case ActionTypes.SET_PATHS:
      return { 
        ...state, 
        sourcePath: action.payload.sourcePath,
        destinationPath: action.payload.destinationPath
      };
    
    case ActionTypes.SET_SYNC_DIRECTION:
      return { ...state, syncDirection: action.payload };
    
    // Profiles
    case ActionTypes.SET_PROFILES:
      return { ...state, profiles: action.payload };
    
    case ActionTypes.SET_ACTIVE_PROFILE:
      return { ...state, activeProfile: action.payload };
    
    case ActionTypes.ADD_PROFILE:
      return { ...state, profiles: [...state.profiles, action.payload] };
    
    case ActionTypes.UPDATE_PROFILE:
      return {
        ...state,
        profiles: state.profiles.map(p => 
          p.id === action.payload.id ? action.payload : p
        )
      };
    
    case ActionTypes.DELETE_PROFILE:
      return {
        ...state,
        profiles: state.profiles.filter(p => p.id !== action.payload),
        activeProfile: state.activeProfile?.id === action.payload ? null : state.activeProfile
      };
    
    // Settings
    case ActionTypes.SET_SETTINGS:
      return { ...state, settings: action.payload };
    
    case ActionTypes.UPDATE_SETTING:
      return {
        ...state,
        settings: {
          ...state.settings,
          [action.payload.key]: action.payload.value
        }
      };
    
    // Filters
    case ActionTypes.SET_ACTIVE_FILTER:
      return { ...state, activeFilter: action.payload };
    
    case ActionTypes.ADD_CUSTOM_FILTER:
      return { ...state, customFilters: [...state.customFilters, action.payload] };
    
    // WSL
    case ActionTypes.SET_WSL_INTEGRATION:
      return { ...state, wslIntegration: action.payload };
    
    case ActionTypes.SET_WSL_DISTRIBUTIONS:
      return { ...state, wslDistributions: action.payload };
    
    // UI
    case ActionTypes.SET_ERROR:
      return { ...state, error: action.payload };
    
    case ActionTypes.CLEAR_ERROR:
      return { ...state, error: null };
    
    case ActionTypes.SET_LOADING:
      return { ...state, loading: action.payload };
    
    case ActionTypes.ADD_NOTIFICATION:
      return { 
        ...state, 
        notifications: [...state.notifications, action.payload]
      };
    
    case ActionTypes.REMOVE_NOTIFICATION:
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload)
      };
    
    default:
      return state;
  }
}

// Create context
const AppContext = createContext();

// Provider component
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  // Initialize managers
  useEffect(() => {
    const initializeApp = async () => {
      try {
        dispatch({ type: ActionTypes.SET_LOADING, payload: true });
        
        // Initialize WSL integration
        const wsl = new WSLIntegration();
        await wsl.initialize();
        dispatch({ type: ActionTypes.SET_WSL_INTEGRATION, payload: wsl });
        dispatch({ type: ActionTypes.SET_WSL_DISTRIBUTIONS, payload: wsl.getDistributions() });
        
        // Initialize settings
        const settingsManager = new SettingsManager();
        await settingsManager.initialize();
        const settings = await settingsManager.loadSettings();
        dispatch({ type: ActionTypes.SET_SETTINGS, payload: settings });
        
        // Initialize profiles
        const profileManager = new ProfileManager();
        await profileManager.initialize();
        const profiles = await profileManager.getProfiles();
        dispatch({ type: ActionTypes.SET_PROFILES, payload: profiles });
        
        // Set default paths from settings
        if (settings.defaultPaths) {
          dispatch({
            type: ActionTypes.SET_PATHS,
            payload: {
              sourcePath: settings.defaultPaths.source || '',
              destinationPath: settings.defaultPaths.destination || ''
            }
          });
        }
        
      } catch (error) {
        dispatch({ type: ActionTypes.SET_ERROR, payload: error.message });
      } finally {
        dispatch({ type: ActionTypes.SET_LOADING, payload: false });
      }
    };
    
    initializeApp();
  }, []);
  
  // Context value with state and action creators
  const value = {
    state,
    
    // Navigation actions
    setView: (view) => dispatch({ type: ActionTypes.SET_VIEW, payload: view }),
    
    // Sync actions
    setSyncStatus: (status) => dispatch({ type: ActionTypes.SET_SYNC_STATUS, payload: status }),
    updateSyncProgress: (progress) => dispatch({ type: ActionTypes.UPDATE_SYNC_PROGRESS, payload: progress }),
    setPaths: (sourcePath, destinationPath) => dispatch({ 
      type: ActionTypes.SET_PATHS, 
      payload: { sourcePath, destinationPath }
    }),
    setSyncDirection: (direction) => dispatch({ type: ActionTypes.SET_SYNC_DIRECTION, payload: direction }),
    
    // Profile actions
    setActiveProfile: (profile) => dispatch({ type: ActionTypes.SET_ACTIVE_PROFILE, payload: profile }),
    addProfile: (profile) => dispatch({ type: ActionTypes.ADD_PROFILE, payload: profile }),
    updateProfile: (profile) => dispatch({ type: ActionTypes.UPDATE_PROFILE, payload: profile }),
    deleteProfile: (profileId) => dispatch({ type: ActionTypes.DELETE_PROFILE, payload: profileId }),
    
    // Settings actions
    updateSetting: (key, value) => dispatch({ 
      type: ActionTypes.UPDATE_SETTING, 
      payload: { key, value }
    }),
    
    // Filter actions
    setActiveFilter: (filter) => dispatch({ type: ActionTypes.SET_ACTIVE_FILTER, payload: filter }),
    addCustomFilter: (filter) => dispatch({ type: ActionTypes.ADD_CUSTOM_FILTER, payload: filter }),
    
    // UI actions
    setError: (error) => dispatch({ type: ActionTypes.SET_ERROR, payload: error }),
    clearError: () => dispatch({ type: ActionTypes.CLEAR_ERROR }),
    addNotification: (notification) => {
      const id = Date.now().toString();
      dispatch({ 
        type: ActionTypes.ADD_NOTIFICATION, 
        payload: { ...notification, id }
      });
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        dispatch({ type: ActionTypes.REMOVE_NOTIFICATION, payload: id });
      }, 5000);
    }
  };
  
  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

// Custom hook to use the app context
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}

// Export action types for testing
export { ActionTypes };