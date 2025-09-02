#!/bin/bash

# Session-end trigger script for ShockTheBlock Atom game
# Ensures all pending changes are committed and pushed to GitHub when a session ends

# Configuration
REMOTE="origin"
BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null || echo "main")
LOG_FILE=".git/github-sync.log"
NOTIFICATION_FILE=".git/last-sync-status.txt"

# Function to log messages with timestamps
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
    echo "$1"
}

# Function to update notification status
update_status() {
    echo "$1" > "$NOTIFICATION_FILE"
}

# Function to handle errors
handle_error() {
    local error_msg="$1"
    local error_code="$2"
    
    log_message "ERROR: $error_msg (Code: $error_code)"
    update_status "SYNC FAILED: $error_msg"
    
    # Send desktop notification if available
    if command -v osascript &> /dev/null; then
        osascript -e "display notification \"$error_msg\" with title \"GitHub Sync Failed\" subtitle \"ShockTheBlock Atom\" sound name \"Basso\""
    fi
    
    exit $error_code
}

# Main execution
log_message "Starting session-end synchronization..."
update_status "SESSION-END SYNC IN PROGRESS"

# Check if there are any changes to commit
if git status --porcelain | grep -q '^\(.\|?\)'; then
    log_message "Uncommitted changes detected. Committing..."
    
    # Stage all changes
    git add -A
    
    # Commit with session-end message
    if ! git commit -m "save session: automated commit at session end"; then
        handle_error "Failed to commit changes" 1
    fi
    
    log_message "Changes committed successfully"
else
    log_message "No uncommitted changes detected"
fi

# Check if remote exists
if ! git remote get-url "$REMOTE" &> /dev/null; then
    handle_error "Remote '$REMOTE' not configured" 2
fi

# Check network connectivity to GitHub
if ! ping -c 1 github.com &> /dev/null; then
    handle_error "Cannot connect to GitHub. Check your internet connection" 3
fi

# Try to push changes to GitHub
log_message "Pushing changes to $REMOTE/$BRANCH..."

if ! push_output=$(git push "$REMOTE" "$BRANCH" 2>&1); then
    # Check for authentication issues
    if echo "$push_output" | grep -i "authentication" > /dev/null; then
        handle_error "Authentication failed. Please check your GitHub credentials" 4
    # Check for conflicts
    elif echo "$push_output" | grep -i "conflict" > /dev/null; then
        handle_error "Push rejected due to conflicts. Pull latest changes first" 5
    # Generic error
    else
        handle_error "Failed to push to GitHub: $push_output" 6
    fi
fi

# Success
log_message "Successfully synchronized session changes with GitHub"
update_status "SESSION-END SYNC SUCCESSFUL: $(date '+%Y-%m-%d %H:%M:%S')"

# Send desktop notification if available
if command -v osascript &> /dev/null; then
    osascript -e "display notification \"Session changes successfully pushed to GitHub\" with title \"Session-End Sync Complete\" subtitle \"ShockTheBlock Atom\" sound name \"Glass\""
fi

exit 0