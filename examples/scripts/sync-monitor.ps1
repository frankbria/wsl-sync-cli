# WSL Sync CLI - PowerShell Monitor Script
# Monitors file changes and triggers sync automatically

param(
    [Parameter(Mandatory=$true)]
    [string]$ProfileName,
    
    [Parameter(Mandatory=$false)]
    [string]$WatchPath = "",
    
    [Parameter(Mandatory=$false)]
    [int]$DebounceSeconds = 5,
    
    [Parameter(Mandatory=$false)]
    [switch]$DryRun
)

# Configuration
$Script:LastSync = [DateTime]::MinValue
$Script:PendingChanges = @{}
$Script:SyncInProgress = $false

# Colors for output
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

# Function to run sync
function Start-WslSync {
    if ($Script:SyncInProgress) {
        Write-ColorOutput "Sync already in progress, skipping..." "Yellow"
        return
    }
    
    $Script:SyncInProgress = $true
    $Script:PendingChanges.Clear()
    
    Write-ColorOutput "`n$(Get-Date -Format 'HH:mm:ss') - Starting sync with profile: $ProfileName" "Cyan"
    
    try {
        $args = @("--profile", $ProfileName, "--no-interactive", "--json")
        if ($DryRun) {
            $args += "--dry-run"
        }
        
        $result = wsl wsl-sync @args | ConvertFrom-Json
        
        if ($result.success) {
            $files = $result.result.syncedFiles
            $size = [math]::Round($result.result.totalSize / 1MB, 2)
            Write-ColorOutput "✓ Sync completed: $files files, $size MB" "Green"
        } else {
            Write-ColorOutput "✗ Sync failed: $($result.error)" "Red"
        }
        
        $Script:LastSync = Get-Date
    }
    catch {
        Write-ColorOutput "✗ Sync error: $_" "Red"
    }
    finally {
        $Script:SyncInProgress = $false
    }
}

# Function to handle file changes
function Handle-FileChange {
    param(
        [string]$Path,
        [string]$ChangeType
    )
    
    $Script:PendingChanges[$Path] = @{
        Type = $ChangeType
        Time = Get-Date
    }
    
    Write-ColorOutput "• $ChangeType`: $Path" "DarkGray"
}

# Get watch path from profile if not specified
if (-not $WatchPath) {
    try {
        $profiles = wsl wsl-sync --list-profiles --json | ConvertFrom-Json
        $profile = $profiles.profiles | Where-Object { $_.name -eq $ProfileName }
        
        if ($profile) {
            $WatchPath = $profile.sourcePath
            Write-ColorOutput "Using source path from profile: $WatchPath" "Yellow"
        } else {
            Write-ColorOutput "Profile not found: $ProfileName" "Red"
            exit 1
        }
    }
    catch {
        Write-ColorOutput "Failed to get profile information: $_" "Red"
        exit 1
    }
}

# Verify watch path exists
if (-not (Test-Path $WatchPath)) {
    # Try WSL path
    $wslPath = wsl wslpath -w "$WatchPath" 2>$null
    if ($wslPath -and (Test-Path $wslPath)) {
        $WatchPath = $wslPath
    } else {
        Write-ColorOutput "Watch path not found: $WatchPath" "Red"
        exit 1
    }
}

Write-ColorOutput "==================================" "Cyan"
Write-ColorOutput "WSL Sync Monitor" "Cyan"
Write-ColorOutput "==================================" "Cyan"
Write-ColorOutput "Profile: $ProfileName" "White"
Write-ColorOutput "Watch Path: $WatchPath" "White"
Write-ColorOutput "Debounce: $DebounceSeconds seconds" "White"
Write-ColorOutput "Dry Run: $DryRun" "White"
Write-ColorOutput "==================================" "Cyan"
Write-ColorOutput "Press Ctrl+C to stop monitoring" "Yellow"
Write-ColorOutput ""

# Create file system watcher
$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $WatchPath
$watcher.IncludeSubdirectories = $true
$watcher.EnableRaisingEvents = $true

# Define change handlers
$action = {
    $path = $Event.SourceEventArgs.FullPath
    $changeType = $Event.SourceEventArgs.ChangeType
    Handle-FileChange -Path $path -ChangeType $changeType
}

# Register event handlers
Register-ObjectEvent -InputObject $watcher -EventName "Changed" -Action $action | Out-Null
Register-ObjectEvent -InputObject $watcher -EventName "Created" -Action $action | Out-Null
Register-ObjectEvent -InputObject $watcher -EventName "Deleted" -Action $action | Out-Null
Register-ObjectEvent -InputObject $watcher -EventName "Renamed" -Action $action | Out-Null

# Main monitoring loop
try {
    while ($true) {
        Start-Sleep -Seconds 1
        
        # Check if we have pending changes and debounce period has passed
        if ($Script:PendingChanges.Count -gt 0) {
            $oldestChange = ($Script:PendingChanges.Values | Sort-Object Time | Select-Object -First 1).Time
            $timeSinceChange = (Get-Date) - $oldestChange
            
            if ($timeSinceChange.TotalSeconds -ge $DebounceSeconds) {
                $changeCount = $Script:PendingChanges.Count
                Write-ColorOutput "`nDetected $changeCount changes, triggering sync..." "Yellow"
                Start-WslSync
            }
        }
    }
}
finally {
    # Cleanup
    Get-EventSubscriber | Where-Object { $_.SourceObject -eq $watcher } | Unregister-Event
    $watcher.Dispose()
    Write-ColorOutput "`nMonitoring stopped" "Yellow"
}