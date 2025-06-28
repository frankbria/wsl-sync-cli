#!/bin/bash
#
# WSL Sync CLI - Multi-Profile Synchronization
# Syncs multiple profiles in sequence with error handling
#

# Define profiles to sync (in order)
PROFILES=(
    "documents:critical"
    "code-projects:high"
    "media-files:medium"
    "archives:low"
)

# Configuration
MAX_RETRIES=3
RETRY_DELAY=30
CONTINUE_ON_ERROR=true

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Results tracking
declare -A RESULTS
FAILED_PROFILES=()

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to sync a profile with retry logic
sync_profile() {
    local profile_spec=$1
    local profile_name="${profile_spec%%:*}"
    local priority="${profile_spec##*:}"
    local attempts=0
    local success=false
    
    print_status "$YELLOW" "\n=========================================="
    print_status "$YELLOW" "Syncing profile: $profile_name (Priority: $priority)"
    print_status "$YELLOW" "=========================================="
    
    while [ $attempts -lt $MAX_RETRIES ] && [ "$success" = false ]; do
        attempts=$((attempts + 1))
        
        if [ $attempts -gt 1 ]; then
            print_status "$YELLOW" "Retry attempt $attempts of $MAX_RETRIES..."
            sleep $RETRY_DELAY
        fi
        
        # Run sync
        if wsl-sync --profile "$profile_name" \
            --no-interactive \
            --json \
            --max-errors 50 \
            --skip-errors; then
            
            success=true
            RESULTS[$profile_name]="SUCCESS"
            print_status "$GREEN" "✓ Profile '$profile_name' synced successfully"
        else
            if [ $attempts -eq $MAX_RETRIES ]; then
                RESULTS[$profile_name]="FAILED"
                FAILED_PROFILES+=("$profile_name")
                print_status "$RED" "✗ Profile '$profile_name' failed after $MAX_RETRIES attempts"
                
                if [ "$CONTINUE_ON_ERROR" != true ]; then
                    print_status "$RED" "Stopping due to error (CONTINUE_ON_ERROR=false)"
                    return 1
                fi
            fi
        fi
    done
    
    return 0
}

# Main execution
print_status "$GREEN" "Starting multi-profile synchronization"
print_status "$GREEN" "Profiles to sync: ${#PROFILES[@]}"

START_TIME=$(date +%s)

# Sync each profile
for profile_spec in "${PROFILES[@]}"; do
    if ! sync_profile "$profile_spec"; then
        break
    fi
done

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# Print summary
print_status "$YELLOW" "\n=========================================="
print_status "$YELLOW" "SYNCHRONIZATION SUMMARY"
print_status "$YELLOW" "=========================================="

for profile_spec in "${PROFILES[@]}"; do
    profile_name="${profile_spec%%:*}"
    status="${RESULTS[$profile_name]:-SKIPPED}"
    
    if [ "$status" = "SUCCESS" ]; then
        print_status "$GREEN" "✓ $profile_name: $status"
    elif [ "$status" = "FAILED" ]; then
        print_status "$RED" "✗ $profile_name: $status"
    else
        print_status "$YELLOW" "- $profile_name: $status"
    fi
done

print_status "$YELLOW" "\nTotal duration: $DURATION seconds"

# Exit with error if any profiles failed
if [ ${#FAILED_PROFILES[@]} -gt 0 ]; then
    print_status "$RED" "\nFailed profiles: ${FAILED_PROFILES[*]}"
    exit 1
else
    print_status "$GREEN" "\nAll profiles synced successfully!"
    exit 0
fi