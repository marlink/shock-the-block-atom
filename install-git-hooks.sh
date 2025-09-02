#!/bin/bash

# Installation script for Git hooks
# Sets up pre-commit and post-commit hooks for ShockTheBlock Atom game

# Configuration
HOOKS_DIR=".git/hooks"
PRE_COMMIT_HOOK="$HOOKS_DIR/pre-commit"
POST_COMMIT_HOOK="$HOOKS_DIR/post-commit"

# Ensure hooks directory exists
mkdir -p "$HOOKS_DIR"

# Function to install a hook
install_hook() {
    local source_file="$1"
    local target_file="$2"
    local hook_name="$(basename "$target_file")"
    
    if [ ! -f "$source_file" ]; then
        echo "Error: Source file '$source_file' not found"
        return 1
    fi
    
    # Copy hook file
    cp "$source_file" "$target_file"
    
    # Make hook executable
    chmod +x "$target_file"
    
    echo "$hook_name hook installed successfully"
    return 0
}

# Main execution
echo "Installing Git hooks for ShockTheBlock Atom..."

# Install pre-commit hook
if install_hook "pre-commit" "$PRE_COMMIT_HOOK"; then
    echo "Pre-commit hook will run version checks and update version files"
else
    echo "Failed to install pre-commit hook"
fi

# Install post-commit hook
if install_hook "post-commit" "$POST_COMMIT_HOOK"; then
    echo "Post-commit hook will automatically push changes to GitHub"
else
    echo "Failed to install post-commit hook"
fi

# Create log directory if it doesn't exist
mkdir -p ".git/logs"
touch ".git/github-sync.log"

echo ""
echo "Git hooks installation complete!"
echo "Changes will now be automatically synchronized with GitHub after commits"
echo "Use 'npm run sync-status' to check synchronization status"
echo ""