// Basic test to verify modules work
import { ProfileManager } from './lib/profiles.js';
import { SettingsManager } from './lib/settings.js';
import { FilterManager } from './lib/filters.js';
import { ErrorHandler } from './lib/error-handler.js';

console.log('Testing basic module imports...\n');

try {
  // Test ProfileManager
  const pm = new ProfileManager();
  console.log('✓ ProfileManager loaded');
  
  // Test SettingsManager
  const sm = new SettingsManager();
  console.log('✓ SettingsManager loaded');
  
  // Test FilterManager
  const fm = new FilterManager();
  console.log('✓ FilterManager loaded');
  
  // Test ErrorHandler
  const eh = new ErrorHandler();
  console.log('✓ ErrorHandler loaded');
  
  // Test filter functionality
  fm.applyPreset('sourceCode');
  console.log('✓ Filter preset applied');
  
  // Test error categorization
  const testError = new Error('Test');
  testError.code = 'EACCES';
  const category = eh.categorizeError(testError);
  console.log(`✓ Error categorized as: ${category}`);
  
  console.log('\n✅ All basic modules working correctly!');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
}