// file-worker.cjs - Worker thread for file operations (CommonJS)
const { parentPort } = require('worker_threads');
const fs = require('fs').promises;
const path = require('path');
const { createReadStream, createWriteStream } = require('fs');
const crypto = require('crypto');

// Large file threshold (10MB)
const LARGE_FILE_THRESHOLD = 10 * 1024 * 1024;
const CHUNK_SIZE = 64 * 1024; // 64KB chunks

// Pause state
let isPaused = false;
let pauseCheckInterval = 100; // Check pause state every 100ms

// Calculate file hash for integrity check
async function calculateFileHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = createReadStream(filePath);
    
    stream.on('data', data => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

// Copy file with streaming for large files
async function copyFileWithProgress(source, destination, fileSize) {
  if (fileSize < LARGE_FILE_THRESHOLD) {
    // Small file - use regular copy
    await fs.copyFile(source, destination);
    parentPort.postMessage({
      type: 'progress',
      data: { copied: fileSize, total: fileSize, percentage: 100 }
    });
  } else {
    // Large file - use streaming with progress
    return new Promise((resolve, reject) => {
      const readStream = createReadStream(source, { highWaterMark: CHUNK_SIZE });
      const writeStream = createWriteStream(destination);
      
      let copied = 0;
      let lastReportedPercentage = 0;
      
      readStream.on('data', async (chunk) => {
        // Check if paused
        while (isPaused) {
          readStream.pause();
          await new Promise(resolve => setTimeout(resolve, pauseCheckInterval));
        }
        readStream.resume();
        
        copied += chunk.length;
        const percentage = Math.round((copied / fileSize) * 100);
        
        // Report progress every 5%
        if (percentage >= lastReportedPercentage + 5 || percentage === 100) {
          lastReportedPercentage = percentage;
          parentPort.postMessage({
            type: 'progress',
            data: { copied, total: fileSize, percentage }
          });
        }
      });
      
      readStream.on('error', reject);
      writeStream.on('error', reject);
      writeStream.on('finish', resolve);
      
      readStream.pipe(writeStream);
    });
  }
}

// Process a batch of files
async function processBatch(files, operation) {
  const results = [];
  
  for (const file of files) {
    try {
      const startTime = Date.now();
      
      // Ensure destination directory exists
      await fs.ensureDir(path.dirname(file.destination));
      
      // Copy the file
      await copyFileWithProgress(file.source, file.destination, file.size);
      
      // Preserve modification time
      if (file.mtime) {
        await fs.utimes(file.destination, new Date(), new Date(file.mtime));
      }
      
      // Verify copy if requested
      if (operation.verify) {
        const sourceHash = await calculateFileHash(file.source);
        const destHash = await calculateFileHash(file.destination);
        
        if (sourceHash !== destHash) {
          throw new Error('File verification failed - hashes do not match');
        }
      }
      
      const duration = Date.now() - startTime;
      
      results.push({
        success: true,
        file: file.relPath,
        duration,
        size: file.size
      });
      
      parentPort.postMessage({
        type: 'file-complete',
        data: {
          file: file.relPath,
          success: true,
          duration
        }
      });
    } catch (error) {
      // Enhanced error information
      const errorInfo = {
        success: false,
        file: file.relPath,
        error: error.message,
        code: error.code,
        syscall: error.syscall,
        path: error.path,
        dest: error.dest,
        source: file.source,
        destination: file.destination
      };
      
      results.push(errorInfo);
      
      parentPort.postMessage({
        type: 'file-error',
        data: {
          file: file.relPath,
          error: error.message,
          code: error.code,
          details: {
            syscall: error.syscall,
            source: file.source,
            destination: file.destination
          }
        }
      });
      
      // Continue with next file
    }
  }
  
  return results;
}

// Listen for messages from the parent thread
parentPort.on('message', async (message) => {
  // Handle pause/resume messages
  if (message.type === 'pause') {
    isPaused = true;
    parentPort.postMessage({
      type: 'worker-paused',
      data: { timestamp: Date.now() }
    });
    return;
  } else if (message.type === 'resume') {
    isPaused = false;
    parentPort.postMessage({
      type: 'worker-resumed',
      data: { timestamp: Date.now() }
    });
    return;
  }
  
  try {
    const { files, operation } = message;
    
    parentPort.postMessage({
      type: 'start',
      data: { fileCount: files.length }
    });
    
    // Process files in batches for better performance
    const batchSize = operation.batchSize || 10;
    const results = [];
    
    for (let i = 0; i < files.length; i += batchSize) {
      // Check if paused before processing each batch
      while (isPaused) {
        await new Promise(resolve => setTimeout(resolve, pauseCheckInterval));
      }
      
      const batch = files.slice(i, i + batchSize);
      const batchResults = await processBatch(batch, operation);
      results.push(...batchResults);
      
      parentPort.postMessage({
        type: 'batch-complete',
        data: {
          completed: Math.min(i + batchSize, files.length),
          total: files.length
        }
      });
    }
    
    parentPort.postMessage({
      type: 'complete',
      data: { results }
    });
  } catch (error) {
    parentPort.postMessage({
      type: 'error',
      data: { error: error.message }
    });
  }
});