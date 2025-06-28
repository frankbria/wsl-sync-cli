import React from 'react';
import { Box, Text } from 'ink';

const ProfileCard = ({ 
  profile, 
  isSelected = false, 
  isActive = false,
  compact = true 
}) => {
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        return `${diffMinutes} min ago`;
      }
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };
  
  // Format file count
  const formatFileCount = (count) => {
    if (!count) return '0 files';
    if (count === 1) return '1 file';
    if (count > 1000) return `${(count / 1000).toFixed(1)}k files`;
    return `${count} files`;
  };
  
  // Get profile icon based on template
  const getProfileIcon = () => {
    switch (profile.template) {
      case 'webDevelopment': return '🌐';
      case 'pythonProject': return '🐍';
      case 'documents': return '📄';
      case 'sourceCode': return '💻';
      case 'mediaFiles': return '🎨';
      default: return '📁';
    }
  };
  
  // Get sync direction icon
  const getSyncDirectionIcon = () => {
    switch (profile.syncDirection) {
      case 'two-way': return '↔';
      case 'source-to-dest': return '→';
      case 'dest-to-source': return '←';
      default: return '↔';
    }
  };
  
  const borderColor = isSelected ? 'cyan' : (isActive ? 'green' : 'gray');
  const nameColor = isActive ? 'green' : (isSelected ? 'cyan' : 'white');
  
  if (compact) {
    // Compact list view
    return (
      <Box>
        <Text color={isSelected ? 'cyan' : 'gray'}>
          {isSelected ? '▶ ' : '  '}
        </Text>
        <Box flexGrow={1}>
          <Text color={nameColor} bold={isActive}>
            {getProfileIcon()} {profile.name}
          </Text>
          {isActive && <Text color="green"> ★</Text>}
          <Text color="gray"> {getSyncDirectionIcon()}</Text>
          <Text color="gray" dimColor> • </Text>
          <Text color="gray" dimColor>
            Last: {formatDate(profile.lastSyncTime)}
          </Text>
          {profile.stats?.totalFiles > 0 && (
            <>
              <Text color="gray" dimColor> • </Text>
              <Text color="gray" dimColor>
                {formatFileCount(profile.stats.totalFiles)}
              </Text>
            </>
          )}
        </Box>
      </Box>
    );
  }
  
  // Full card view
  return (
    <Box 
      flexDirection="column" 
      borderStyle="round" 
      borderColor={borderColor}
      paddingX={1}
    >
      {/* Header */}
      <Box justifyContent="space-between">
        <Box>
          <Text color={nameColor} bold>
            {getProfileIcon()} {profile.name}
          </Text>
          {isActive && <Text color="green"> ★ Active</Text>}
        </Box>
        <Text color="gray">{getSyncDirectionIcon()}</Text>
      </Box>
      
      {/* Description */}
      {profile.description && (
        <Box marginTop={1}>
          <Text color="gray" italic>{profile.description}</Text>
        </Box>
      )}
      
      {/* Paths */}
      <Box marginTop={1} flexDirection="column">
        <Box>
          <Text color="gray">Source: </Text>
          <Text wrap="truncate">{profile.sourcePath}</Text>
        </Box>
        <Box>
          <Text color="gray">Dest: </Text>
          <Text wrap="truncate">{profile.destinationPath}</Text>
        </Box>
      </Box>
      
      {/* Stats */}
      <Box marginTop={1} gap={2}>
        <Box>
          <Text color="gray">Last sync: </Text>
          <Text color="yellow">{formatDate(profile.lastSyncTime)}</Text>
        </Box>
        {profile.stats && (
          <>
            <Box>
              <Text color="gray">Files: </Text>
              <Text color="cyan">{formatFileCount(profile.stats.totalFiles)}</Text>
            </Box>
            {profile.stats.totalSize > 0 && (
              <Box>
                <Text color="gray">Size: </Text>
                <Text color="cyan">{formatSize(profile.stats.totalSize)}</Text>
              </Box>
            )}
          </>
        )}
      </Box>
      
      {/* Options summary */}
      {profile.options && (
        <Box marginTop={1} gap={1}>
          {profile.options.deleteOrphaned && (
            <Text color="red">🗑 Delete</Text>
          )}
          {profile.options.dryRun && (
            <Text color="yellow">👁 Preview</Text>
          )}
          {profile.options.filter && (
            <Text color="blue">🔍 Filtered</Text>
          )}
        </Box>
      )}
    </Box>
  );
};

// Helper function to format file size
const formatSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default ProfileCard;