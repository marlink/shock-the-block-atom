#!/bin/bash

# Script to generate versioned summary files for ShockTheBlock Atom game
# Used by git alias for version-aware commits

# Configuration
SUMMARY_DIR="manual-version-tracker"
CURRENT_VERSION=$(grep -o "GAME_VERSION = 'v[0-9]\+\.[0-9]\+'" game-fixed.js | cut -d "'" -f 2)
CURRENT_VERSION_NUM=${CURRENT_VERSION#v}
NEXT_VERSION_NUM="0.$((${CURRENT_VERSION_NUM#0.} + 1))"
NEXT_VERSION="v$NEXT_VERSION_NUM"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")

# Get commit message from command line arguments
COMMIT_MSG="$*"

# Function to generate summary file
generate_summary() {
    local version=$1
    local summary_file="$SUMMARY_DIR/v${version#v*}"
    
    # Remove the dot from version number for filename (v0.1 -> v01)
    summary_file=${summary_file/./}
    summary_file="${summary_file}.md"
    
    # Copy content from the previous version if it exists
    local prev_version_num=${CURRENT_VERSION_NUM#0.}
    local prev_summary_file="$SUMMARY_DIR/v$(printf "%02d" $prev_version_num).md"
    
    if [ -f "$prev_summary_file" ]; then
        cp "$prev_summary_file" "$summary_file"
    else
        # Create a new summary file with basic structure
        cat > "$summary_file" << EOF
ShockTheBlock Atom Game - Development Documentation
Major Changes Implemented (Chronological Order)
1.
Git Repository Initialization

Initialized Git repository with git init
Added all project files to Git
Created initial commit with message "Initial commit: ShockTheBlock Atom game $CURRENT_VERSION"
Added files: game-fixed.js, game.js, index.html, styles.css
EOF
    fi
    
    # Add the new summary file to the commit
    git add "$summary_file"
    
    echo "Generated summary file: $summary_file"
    return 0
}

# Function to update version numbers in files
update_version_numbers() {
    local new_version=$1
    
    # Update version in game-fixed.js
    sed -i "" "s/GAME_VERSION = '$CURRENT_VERSION'/GAME_VERSION = '$new_version'/g" game-fixed.js
    sed -i "" "s/Version: $CURRENT_VERSION/Version: $new_version/g" game-fixed.js
    
    # Update version in README.md
    sed -i "" "s/## Version: $CURRENT_VERSION/## Version: $new_version/g" README.md
    
    # Add the modified files to the commit
    git add game-fixed.js README.md
    
    echo "Updated version numbers from $CURRENT_VERSION to $new_version"
    return 0
}

# Main execution
echo "Running versioned summary generator for ShockTheBlock Atom..."

# Check if this is a session-ending commit
if echo "$COMMIT_MSG" | grep -i -E "save session|end session|commit changes|upload to git" > /dev/null; then
    echo "Session-ending commit detected. Incrementing version..."
    
    # Generate summary file for the new version
    if ! generate_summary "$NEXT_VERSION"; then
        echo "Warning: Failed to generate summary file, but continuing with commit"
    fi
    
    # Update version numbers in files
    if ! update_version_numbers "$NEXT_VERSION"; then
        echo "Warning: Failed to update version numbers, but continuing with commit"
    fi
else
    echo "Regular commit detected. Maintaining current version: $CURRENT_VERSION"
    
    # For regular commits, just ensure we have a summary file for the current version
    if ! generate_summary "$CURRENT_VERSION"; then
        echo "Warning: Failed to generate summary file, but continuing with commit"
    fi
fi

# Return success to allow git commit to proceed
exit 0