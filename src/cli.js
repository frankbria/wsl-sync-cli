#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import App from './components/App.js';
import { ProfileManager } from '../lib/profiles.js';
import { SettingsManager } from '../lib/settings.js';
import { SyncHandler } from './lib/sync-handler.js';
import { WSLIntegration } from '../lib/wsl-integration.js';
import { ErrorHandler } from '../lib/error-handler.js';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

// Configure yargs
const argv = yargs(hideBin(process.argv))
  .usage('Usage: $0 [source] [destination] [options]')
  .positional('source', {
    describe: 'Source directory path',
    type: 'string'
  })
  .positional('destination', {
    describe: 'Destination directory path',
    type: 'string'
  })
  .option('profile', {
    alias: 'p',
    describe: 'Use specific sync profile',
    type: 'string'
  })
  .option('create-profile', {
    describe: 'Create a new profile from current settings',
    type: 'string'
  })
  .option('list-profiles', {
    alias: 'l',
    describe: 'List all available profiles',
    type: 'boolean'
  })
  .option('dry-run', {
    alias: 'd',
    describe: 'Preview sync without making changes',
    type: 'boolean'
  })
  .option('one-way', {
    describe: 'Force one-way sync (source to destination)',
    type: 'boolean'
  })
  .option('two-way', {
    describe: 'Force two-way sync',
    type: 'boolean'
  })
  .option('filter', {
    alias: 'f',
    describe: 'Apply filter preset (documents, images, code, media)',
    type: 'string',
    choices: ['documents', 'images', 'code', 'media', 'archives']
  })
  .option('ignore', {
    alias: 'i',
    describe: 'Add ignore pattern (can be used multiple times)',
    type: 'array'
  })
  .option('workers', {
    alias: 'w',
    describe: 'Number of worker threads',
    type: 'number',
    default: 4
  })
  .option('no-delete', {
    describe: 'Skip deletion of orphaned files',
    type: 'boolean'
  })
  .option('config', {
    alias: 'c',
    describe: 'Use configuration file',
    type: 'string'
  })
  .option('json', {
    alias: 'j',
    describe: 'Output in JSON format (for scripting)',
    type: 'boolean'
  })
  .option('quiet', {
    alias: 'q',
    describe: 'Quiet mode (minimal output)',
    type: 'boolean'
  })
  .option('verbose', {
    alias: 'v',
    describe: 'Verbose output',
    type: 'boolean'
  })
  .option('no-interactive', {
    describe: 'Run in non-interactive mode',
    type: 'boolean'
  })
  .option('auto-confirm', {
    alias: 'y',
    describe: 'Auto-confirm all prompts',
    type: 'boolean'
  })
  .option('no-color', {
    describe: 'Disable colored output',
    type: 'boolean'
  })
  .option('ascii', {
    describe: 'Use ASCII characters only (no Unicode)',
    type: 'boolean'
  })
  .option('max-errors', {
    describe: 'Maximum errors before stopping',
    type: 'number',
    default: 50
  })
  .option('skip-errors', {
    describe: 'Skip files with errors and continue',
    type: 'boolean'
  })
  .option('error-log', {
    describe: 'Path to error log file',
    type: 'string'
  })
  .conflicts('one-way', 'two-way')
  .conflicts('quiet', 'verbose')
  .conflicts('json', 'verbose')
  .help('h')
  .alias('h', 'help')
  .version()
  .alias('v', 'version')
  .epilogue('For more information, visit https://github.com/frankbria/wsl-sync-cli')
  .argv;

// Helper function to output JSON
const outputJson = (data) => {
  console.log(JSON.stringify(data, null, argv.pretty ? 2 : 0));
};

// Helper function to output text (respects quiet mode)
const output = (message, force = false) => {
  if (!argv.quiet || force) {
    console.log(message);
  }
};

// Error handler with exit codes
const handleError = (error, code = 1) => {
  if (argv.json) {
    outputJson({
      success: false,
      error: error.message,
      code
    });
  } else {
    console.error(`Error: ${error.message}`);
  }
  process.exit(code);
};

// Exit codes
const EXIT_CODES = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  INVALID_ARGS: 2,
  PROFILE_NOT_FOUND: 3,
  PATH_NOT_FOUND: 4,
  SYNC_FAILED: 5,
  PERMISSION_DENIED: 6,
  CONFIG_ERROR: 7
};

// Handle non-interactive operations
const handleNonInteractive = async () => {
  try {
    // Initialize managers
    const profileManager = new ProfileManager();
    await profileManager.initialize();
    
    const settingsManager = new SettingsManager();
    await settingsManager.initialize();
    
    const wslIntegration = new WSLIntegration();
    await wslIntegration.initialize();
    
    // Handle list profiles
    if (argv.listProfiles) {
      const profiles = await profileManager.getProfiles();
      if (argv.json) {
        outputJson({ profiles });
      } else {
        output('Available profiles:');
        profiles.forEach(profile => {
          output(`  - ${profile.name}: ${profile.sourcePath} → ${profile.destinationPath}`);
        });
      }
      process.exit(EXIT_CODES.SUCCESS);
    }
    
    // Handle create profile
    if (argv.createProfile) {
      if (!argv.source || !argv.destination) {
        handleError(new Error('Source and destination paths required for profile creation'), EXIT_CODES.INVALID_ARGS);
      }
      
      const profile = {
        name: argv.createProfile,
        sourcePath: argv.source,
        destinationPath: argv.destination,
        syncDirection: argv.oneWay ? 'source-to-dest' : 'two-way',
        deleteOrphaned: !argv.noDelete,
        workerThreads: argv.workers,
        ignorePatterns: argv.ignore || []
      };
      
      await profileManager.createProfile(profile);
      
      if (argv.json) {
        outputJson({ success: true, profile });
      } else {
        output(`Profile '${argv.createProfile}' created successfully`);
      }
      process.exit(EXIT_CODES.SUCCESS);
    }
    
    // Handle sync operation
    let sourcePath = argv.source || argv._[0];
    let destinationPath = argv.destination || argv._[1];
    
    // Load profile if specified
    if (argv.profile) {
      const profile = await profileManager.getProfileByName(argv.profile);
      if (!profile) {
        handleError(new Error(`Profile '${argv.profile}' not found`), EXIT_CODES.PROFILE_NOT_FOUND);
      }
      
      sourcePath = sourcePath || profile.sourcePath;
      destinationPath = destinationPath || profile.destinationPath;
      
      // Apply profile settings
      if (profile.ignorePatterns && !argv.ignore) {
        argv.ignore = profile.ignorePatterns;
      }
      if (profile.workerThreads && !argv.workers) {
        argv.workers = profile.workerThreads;
      }
    }
    
    // Validate paths
    if (!sourcePath || !destinationPath) {
      handleError(new Error('Source and destination paths are required'), EXIT_CODES.INVALID_ARGS);
    }
    
    // Check if paths exist
    try {
      await fs.access(sourcePath);
    } catch {
      handleError(new Error(`Source path not found: ${sourcePath}`), EXIT_CODES.PATH_NOT_FOUND);
    }
    
    // Create destination if it doesn't exist
    try {
      await fs.mkdir(destinationPath, { recursive: true });
    } catch (error) {
      handleError(new Error(`Cannot create destination: ${error.message}`), EXIT_CODES.PERMISSION_DENIED);
    }
    
    // Create sync handler
    const syncHandler = new SyncHandler();
    
    // Configure sync options
    const syncOptions = {
      sourcePath,
      destinationPath,
      direction: argv.oneWay ? 'source-to-dest' : (argv.twoWay ? 'two-way' : 'two-way'),
      dryRun: argv.dryRun,
      deleteOrphaned: !argv.noDelete,
      workerThreads: argv.workers,
      filter: argv.filter,
      ignorePatterns: argv.ignore || [],
      verbose: argv.verbose,
      quiet: argv.quiet,
      maxErrors: argv.maxErrors,
      skipErrors: argv.skipErrors,
      errorHandling: {
        enableLogging: true,
        logDir: argv.errorLog ? path.dirname(argv.errorLog) : undefined
      }
    };
    
    // Apply config file if specified
    if (argv.config) {
      try {
        const configData = await fs.readFile(argv.config, 'utf-8');
        const config = JSON.parse(configData);
        Object.assign(syncOptions, config);
      } catch (error) {
        handleError(new Error(`Failed to load config: ${error.message}`), EXIT_CODES.CONFIG_ERROR);
      }
    }
    
    // Start sync
    output(`Starting sync: ${sourcePath} → ${destinationPath}`);
    if (argv.dryRun) {
      output('DRY RUN MODE - No changes will be made');
    }
    
    const startTime = Date.now();
    
    // Set up progress reporting
    let lastProgress = 0;
    syncHandler.on('progress', (progress) => {
      if (argv.json) {
        // Don't output progress in JSON mode unless verbose
        if (argv.verbose) {
          outputJson({ type: 'progress', ...progress });
        }
      } else if (!argv.quiet) {
        const percent = Math.floor(progress.percentage);
        if (percent > lastProgress) {
          output(`Progress: ${percent}% (${progress.processedFiles}/${progress.totalFiles} files)`);
          lastProgress = percent;
        }
      }
    });
    
    syncHandler.on('error', (error) => {
      if (argv.json && argv.verbose) {
        outputJson({ type: 'error', error: error.message });
      } else if (!argv.quiet) {
        output(`Error: ${error.message}`);
      }
    });
    
    // Perform sync
    try {
      const result = await syncHandler.sync(syncOptions);
      const duration = (Date.now() - startTime) / 1000;
      
      if (argv.json) {
        outputJson({
          success: true,
          result: {
            ...result,
            duration
          }
        });
      } else {
        output(`\nSync completed successfully in ${duration.toFixed(1)}s`);
        output(`Files processed: ${result.totalFiles}`);
        output(`Files synced: ${result.syncedFiles}`);
        if (result.errors.length > 0) {
          output(`Errors: ${result.errors.length}`);
        }
      }
      
      process.exit(EXIT_CODES.SUCCESS);
    } catch (error) {
      handleError(error, EXIT_CODES.SYNC_FAILED);
    }
    
  } catch (error) {
    handleError(error, EXIT_CODES.GENERAL_ERROR);
  }
};

// Main execution
const main = async () => {
  // Set environment variables for terminal capabilities
  if (argv.noColor) {
    process.env.FORCE_COLOR = '0';
  }
  if (argv.ascii) {
    process.env.WSL_SYNC_ASCII = '1';
  }
  
  // Initialize error handler with custom log path if provided
  if (argv.errorLog) {
    const errorHandler = new ErrorHandler({
      logDir: path.dirname(argv.errorLog),
      enableLogging: true
    });
    await errorHandler.initialize();
  }
  
  // Handle non-interactive mode or specific commands
  if (argv.noInteractive || argv.listProfiles || argv.createProfile || 
      (argv.source && argv.destination)) {
    await handleNonInteractive();
  } else {
    // Check if terminal supports interactive mode
    if (!process.stdout.isTTY) {
      console.error('Error: Interactive mode requires a TTY terminal');
      console.error('Use --no-interactive flag for non-TTY environments');
      process.exit(EXIT_CODES.GENERAL_ERROR);
    }
    
    // Launch interactive UI
    render(<App argv={argv} />);
  }
};

// Run main function
main().catch(error => {
  handleError(error, EXIT_CODES.GENERAL_ERROR);
});