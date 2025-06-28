// wsl-integration.js - Enhanced WSL integration features
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export class WSLIntegration {
  constructor() {
    this.distributions = [];
    this.defaultDistro = null;
    this.wslVersion = null;
    this.capabilities = {
      hasWSL: false,
      hasWSL2: false,
      canPreservePermissions: false,
      canHandleSymlinks: false,
      canDetectDistros: false
    };
  }

  // Initialize WSL integration
  async initialize() {
    try {
      await this.detectWSL();
      if (this.capabilities.hasWSL) {
        await this.detectDistributions();
        await this.detectCapabilities();
      }
    } catch (error) {
      console.error('WSL integration initialization failed:', error);
    }
  }

  // Detect WSL availability and version
  async detectWSL() {
    try {
      // Check if WSL is available
      const { stdout } = await execAsync('wsl --version');
      this.capabilities.hasWSL = true;
      
      // Parse WSL version
      const versionMatch = stdout.match(/WSL version: ([\d.]+)/);
      if (versionMatch) {
        this.wslVersion = versionMatch[1];
        
        // WSL2 features are available in version 2.x
        if (versionMatch[1].startsWith('2.')) {
          this.capabilities.hasWSL2 = true;
        }
      }
      
      this.capabilities.canDetectDistros = true;
      
    } catch (error) {
      // Try alternative detection methods
      try {
        await execAsync('wsl --list --quiet');
        this.capabilities.hasWSL = true;
        this.capabilities.canDetectDistros = true;
      } catch (fallbackError) {
        this.capabilities.hasWSL = false;
      }
    }
  }

  // Detect installed WSL distributions
  async detectDistributions() {
    if (!this.capabilities.canDetectDistros) return;

    try {
      const { stdout } = await execAsync('wsl --list --verbose');
      const lines = stdout.split('\n').filter(line => line.trim());
      
      this.distributions = [];
      
      for (const line of lines) {
        if (line.includes('NAME') || line.includes('----')) continue;
        
        // Parse distribution info
        const match = line.match(/\s*(\*?)\s*([^\s]+)\s+([^\s]+)\s+(\d+)/);
        if (match) {
          const [, isDefault, name, state, version] = match;
          
          const distro = {
            name: name.trim(),
            state: state.trim(),
            version: parseInt(version),
            isDefault: !!isDefault,
            isRunning: state.trim().toLowerCase() === 'running',
            isWSL2: parseInt(version) === 2,
            mountPoint: `/mnt/wsl/${name.toLowerCase()}`,
            capabilities: this.getDistroCapabilities(parseInt(version))
          };
          
          this.distributions.push(distro);
          
          if (distro.isDefault) {
            this.defaultDistro = distro;
          }
        }
      }
      
      // If no default found, use first running distro
      if (!this.defaultDistro && this.distributions.length > 0) {
        this.defaultDistro = this.distributions.find(d => d.isRunning) || this.distributions[0];
      }
      
    } catch (error) {
      console.error('Failed to detect WSL distributions:', error);
    }
  }

  // Get capabilities for a specific WSL version
  getDistroCapabilities(version) {
    return {
      preservePermissions: version === 2,
      followSymlinks: true,
      casePreservation: version === 2,
      extendedAttributes: version === 2,
      nativeFileSystem: version === 2
    };
  }

  // Detect overall WSL capabilities
  async detectCapabilities() {
    // Check if we can preserve Linux file permissions
    this.capabilities.canPreservePermissions = this.distributions.some(d => d.capabilities.preservePermissions);
    
    // Check if we can handle symlinks
    this.capabilities.canHandleSymlinks = this.distributions.some(d => d.capabilities.followSymlinks);
  }

  // Convert Windows path to WSL path
  windowsToWSLPath(windowsPath, distroName = null) {
    if (!windowsPath) return '';
    
    let wslPath = windowsPath;
    
    // Handle drive letters (C:\ -> /mnt/c/)
    const driveMatch = windowsPath.match(/^([A-Za-z]):[\\\/]/);
    if (driveMatch) {
      const drive = driveMatch[1].toLowerCase();
      wslPath = windowsPath.replace(/^[A-Za-z]:[\\\/]/, `/mnt/${drive}/`);
    }
    
    // Convert backslashes to forward slashes
    wslPath = wslPath.replace(/\\/g, '/');
    
    // Remove duplicate slashes
    wslPath = wslPath.replace(/\/+/g, '/');
    
    return wslPath;
  }

  // Convert WSL path to Windows path
  wslToWindowsPath(wslPath) {
    if (!wslPath) return '';
    
    // Handle mounted drives (/mnt/c/ -> C:\)
    const mountMatch = wslPath.match(/^\/mnt\/([a-z])\//);
    if (mountMatch) {
      const drive = mountMatch[1].toUpperCase();
      return wslPath.replace(/^\/mnt\/[a-z]\//, `${drive}:\\`).replace(/\//g, '\\');
    }
    
    // For paths not under /mnt, they're likely within WSL filesystem
    // These can be accessed via \\wsl$\distro_name\path
    const distro = this.defaultDistro?.name || 'Ubuntu';
    return `\\\\wsl$\\${distro}${wslPath.replace(/\//g, '\\')}`;
  }

  // Get file permissions in WSL format
  async getFilePermissions(filePath, distroName = null) {
    if (!this.capabilities.canPreservePermissions) {
      return null;
    }

    try {
      const distro = distroName || this.defaultDistro?.name;
      if (!distro) throw new Error('No WSL distribution available');

      const wslPath = this.windowsToWSLPath(filePath);
      const { stdout } = await execAsync(`wsl -d ${distro} stat -c "%a %U %G" "${wslPath}"`);
      
      const [permissions, owner, group] = stdout.trim().split(' ');
      
      return {
        mode: permissions,
        owner,
        group,
        readable: this.parsePermissions(permissions)
      };
    } catch (error) {
      console.warn('Failed to get file permissions:', error);
      return null;
    }
  }

  // Set file permissions in WSL
  async setFilePermissions(filePath, permissions, distroName = null) {
    if (!this.capabilities.canPreservePermissions || !permissions) {
      return false;
    }

    try {
      const distro = distroName || this.defaultDistro?.name;
      if (!distro) throw new Error('No WSL distribution available');

      const wslPath = this.windowsToWSLPath(filePath);
      
      // Set permissions
      if (permissions.mode) {
        await execAsync(`wsl -d ${distro} chmod ${permissions.mode} "${wslPath}"`);
      }
      
      // Set ownership (if running as root or with sudo)
      if (permissions.owner && permissions.group) {
        try {
          await execAsync(`wsl -d ${distro} chown ${permissions.owner}:${permissions.group} "${wslPath}"`);
        } catch (chownError) {
          // Ownership change might fail due to permissions, but that's often okay
          console.warn('Could not change ownership:', chownError.message);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Failed to set file permissions:', error);
      return false;
    }
  }

  // Handle symbolic links
  async handleSymlink(linkPath, targetPath, operation = 'preserve') {
    if (!this.capabilities.canHandleSymlinks) {
      return { handled: false, reason: 'Symlinks not supported' };
    }

    try {
      const distro = this.defaultDistro?.name;
      if (!distro) throw new Error('No WSL distribution available');

      const wslLinkPath = this.windowsToWSLPath(linkPath);
      
      switch (operation) {
        case 'preserve':
          // Check if it's a symlink and get target
          const { stdout } = await execAsync(`wsl -d ${distro} readlink "${wslLinkPath}"`);
          const target = stdout.trim();
          
          return {
            handled: true,
            isSymlink: true,
            target,
            linkPath: wslLinkPath
          };
          
        case 'create':
          const wslTargetPath = this.windowsToWSLPath(targetPath);
          await execAsync(`wsl -d ${distro} ln -s "${wslTargetPath}" "${wslLinkPath}"`);
          
          return {
            handled: true,
            created: true,
            linkPath: wslLinkPath,
            target: wslTargetPath
          };
          
        case 'resolve':
          // Follow symlink to actual file
          const { stdout: realPath } = await execAsync(`wsl -d ${distro} realpath "${wslLinkPath}"`);
          
          return {
            handled: true,
            resolved: true,
            realPath: realPath.trim(),
            windowsPath: this.wslToWindowsPath(realPath.trim())
          };
          
        default:
          return { handled: false, reason: 'Unknown operation' };
      }
      
    } catch (error) {
      return { 
        handled: false, 
        error: error.message,
        isSymlink: false 
      };
    }
  }

  // Parse numeric permissions to human readable format
  parsePermissions(mode) {
    const permissions = {
      owner: { read: false, write: false, execute: false },
      group: { read: false, write: false, execute: false },
      other: { read: false, write: false, execute: false }
    };

    if (mode.length === 3) {
      const [owner, group, other] = mode.split('').map(Number);
      
      permissions.owner.read = !!(owner & 4);
      permissions.owner.write = !!(owner & 2);
      permissions.owner.execute = !!(owner & 1);
      
      permissions.group.read = !!(group & 4);
      permissions.group.write = !!(group & 2);
      permissions.group.execute = !!(group & 1);
      
      permissions.other.read = !!(other & 4);
      permissions.other.write = !!(other & 2);
      permissions.other.execute = !!(other & 1);
    }

    return permissions;
  }

  // Get WSL system information
  async getSystemInfo(distroName = null) {
    try {
      const distro = distroName || this.defaultDistro?.name;
      if (!distro) return null;

      const { stdout } = await execAsync(`wsl -d ${distro} uname -a`);
      const unameInfo = stdout.trim();
      
      // Get distribution specific info
      let distroInfo = '';
      try {
        const { stdout: lsbRelease } = await execAsync(`wsl -d ${distro} lsb_release -a 2>/dev/null`);
        distroInfo = lsbRelease;
      } catch {
        try {
          const { stdout: osRelease } = await execAsync(`wsl -d ${distro} cat /etc/os-release`);
          distroInfo = osRelease;
        } catch {
          distroInfo = 'Unknown distribution';
        }
      }

      return {
        distroName: distro,
        kernel: unameInfo,
        distribution: distroInfo,
        wslVersion: this.distributions.find(d => d.name === distro)?.version || 1
      };
    } catch (error) {
      console.error('Failed to get WSL system info:', error);
      return null;
    }
  }

  // Check if a path is within WSL filesystem
  isWSLPath(filePath) {
    return filePath.startsWith('\\\\wsl$\\') || 
           filePath.startsWith('/') || 
           filePath.includes('/mnt/wsl/');
  }

  // Get optimal sync strategy based on WSL version and capabilities
  getSyncStrategy(sourcePath, destPath) {
    const sourceIsWSL = this.isWSLPath(sourcePath);
    const destIsWSL = this.isWSLPath(destPath);
    
    const strategy = {
      preservePermissions: false,
      handleSymlinks: 'copy', // 'copy', 'preserve', 'resolve'
      useNativeCommands: false,
      transferMethod: 'standard', // 'standard', 'wsl_cp', 'rsync'
      caseSensitive: false
    };

    // If either path is in WSL2, we can preserve more metadata
    if ((sourceIsWSL || destIsWSL) && this.capabilities.hasWSL2) {
      strategy.preservePermissions = this.capabilities.canPreservePermissions;
      strategy.handleSymlinks = 'preserve';
      strategy.caseSensitive = true;
      
      // Use WSL native commands for better performance
      if (sourceIsWSL && destIsWSL) {
        strategy.useNativeCommands = true;
        strategy.transferMethod = 'wsl_cp';
      }
    }

    return strategy;
  }

  // Get available distributions
  getDistributions() {
    return this.distributions.map(d => ({
      name: d.name,
      state: d.state,
      version: d.version,
      isDefault: d.isDefault,
      isRunning: d.isRunning,
      capabilities: d.capabilities
    }));
  }

  // Get WSL capabilities summary
  getCapabilities() {
    return {
      ...this.capabilities,
      wslVersion: this.wslVersion,
      defaultDistro: this.defaultDistro?.name,
      availableDistros: this.distributions.length,
      runningDistros: this.distributions.filter(d => d.isRunning).length
    };
  }

  // Start a WSL distribution
  async startDistribution(distroName) {
    try {
      await execAsync(`wsl -d ${distroName} --exec echo "Starting distribution"`);
      
      // Update distribution state
      const distro = this.distributions.find(d => d.name === distroName);
      if (distro) {
        distro.isRunning = true;
        distro.state = 'Running';
      }
      
      return true;
    } catch (error) {
      console.error(`Failed to start WSL distribution ${distroName}:`, error);
      return false;
    }
  }

  // Check if running in WSL environment
  isWSL() {
    // Check if we're in a WSL environment by looking at environment variables
    return process.env.WSL_DISTRO_NAME !== undefined || 
           process.env.WSL_INTEROP !== undefined ||
           process.platform === 'linux' && /microsoft/i.test(process.env.KERNEL_VERSION || '');
  }

  // Convert path based on current environment
  convertPath(inputPath) {
    if (!inputPath) return inputPath;
    
    // If we're in WSL and get a Windows path, convert to WSL
    if (this.isWSL() && /^[A-Za-z]:[\\\/]/.test(inputPath)) {
      return this.windowsToWSLPath(inputPath);
    }
    
    // If we're on Windows and get a WSL path, convert to Windows
    if (!this.isWSL() && inputPath.startsWith('/')) {
      return this.wslToWindowsPath(inputPath);
    }
    
    return inputPath;
  }

  // Validate WSL path accessibility
  async validateWSLPath(wslPath, distroName = null) {
    try {
      const distro = distroName || this.defaultDistro?.name;
      if (!distro) {
        throw new Error('No WSL distribution available');
      }

      // Check if path exists and is accessible
      await execAsync(`wsl -d ${distro} test -e "${wslPath}"`);
      
      // Get path info
      const { stdout } = await execAsync(`wsl -d ${distro} stat -c "%F %a" "${wslPath}"`);
      const [fileType, permissions] = stdout.trim().split(' ');
      
      return {
        exists: true,
        accessible: true,
        type: fileType.includes('directory') ? 'directory' : 'file',
        permissions,
        distro
      };
      
    } catch (error) {
      return {
        exists: false,
        accessible: false,
        error: error.message
      };
    }
  }
}

export default WSLIntegration;