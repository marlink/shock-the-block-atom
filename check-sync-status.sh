#!/bin/bash

# Sync status checker for ShockTheBlock Atom game
# Provides information about the last GitHub synchronization

# Configuration
NOTIFICATION_FILE=".git/last-sync-status.txt"
LOG_FILE=".git/github-sync.log"

# Function to display status with color
display_status() {
    if [ -f "$NOTIFICATION_FILE" ]; then
        status=$(cat "$NOTIFICATION_FILE")
        
        # Determine color based on status
        if echo "$status" | grep -q "SUCCESSFUL"; then
            # Green for success
            echo "\033[0;32m$status\033[0m"
        elif echo "$status" | grep -q "IN PROGRESS"; then
            # Yellow for in progress
            echo "\033[0;33m$status\033[0m"
        elif echo "$status" | grep -q "FAILED"; then
            # Red for failure
            echo "\033[0;31m$status\033[0m"
        else
            # Default color
            echo "$status"
        fi
    else
        echo "No synchronization status available"
    fi
}

# Function to display recent log entries
display_recent_logs() {
    if [ -f "$LOG_FILE" ]; then
        echo "\nRecent synchronization logs:"
        tail -n 10 "$LOG_FILE"
    else
        echo "\nNo synchronization logs available"
    fi
}

# Main execution
echo "ShockTheBlock Atom - GitHub Synchronization Status"
echo "================================================"

echo -e "Current Status: $(display_status)"

# Display git remote information
echo -e "\nRemote Repository:"
git remote -v | grep "(push)"

# Display last commit information
echo -e "\nLast Commit:"
git log -1 --pretty=format:"%h - %s (%cr) <%an>"

# Display recent logs if verbose flag is provided
if [ "$1" = "-v" ] || [ "$1" = "--verbose" ]; then
    display_recent_logs
fi

echo -e "\nFor detailed logs, use: cat $LOG_FILE"
echo "================================================"