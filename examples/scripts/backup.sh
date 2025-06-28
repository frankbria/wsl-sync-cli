#!/bin/bash
#
# WSL Sync CLI - Automated Backup Script
# This script performs daily backups with logging and error handling
#

# Configuration
PROFILE_NAME="backup"
LOG_DIR="/var/log/wsl-sync"
RETENTION_DAYS=30

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Generate timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${LOG_DIR}/backup_${TIMESTAMP}.log"

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to send notification (optional)
notify() {
    if command -v notify-send &> /dev/null; then
        notify-send "WSL Sync Backup" "$1"
    fi
}

# Start backup
log "Starting backup with profile: $PROFILE_NAME"

# Run sync with error handling
if wsl-sync --profile "$PROFILE_NAME" \
    --no-interactive \
    --json \
    --error-log "${LOG_FILE}.errors" \
    2>&1 | tee -a "$LOG_FILE"; then
    
    # Extract results from JSON output
    RESULT=$(tail -1 "$LOG_FILE" | grep '^{' | jq -r '.result')
    if [ -n "$RESULT" ]; then
        FILES_SYNCED=$(echo "$RESULT" | jq -r '.syncedFiles // 0')
        TOTAL_SIZE=$(echo "$RESULT" | jq -r '.totalSize // 0')
        
        log "Backup completed successfully"
        log "Files synced: $FILES_SYNCED"
        log "Total size: $TOTAL_SIZE bytes"
        
        notify "Backup completed: $FILES_SYNCED files synced"
    else
        log "Backup completed (no JSON output)"
        notify "Backup completed"
    fi
else
    EXIT_CODE=$?
    log "Backup failed with exit code: $EXIT_CODE"
    notify "Backup failed! Check logs at $LOG_FILE"
    
    # Send alert email (optional)
    if [ -n "$ALERT_EMAIL" ] && command -v mail &> /dev/null; then
        tail -50 "$LOG_FILE" | mail -s "WSL Sync Backup Failed" "$ALERT_EMAIL"
    fi
    
    exit $EXIT_CODE
fi

# Clean up old logs
log "Cleaning up logs older than $RETENTION_DAYS days"
find "$LOG_DIR" -name "backup_*.log*" -type f -mtime +$RETENTION_DAYS -delete

log "Backup script completed"