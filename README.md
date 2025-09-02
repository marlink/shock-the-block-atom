# ShockTheBlock Atom

## Version: v0.1

A block-breaking game with physics-based ball movement, particle effects, and performance monitoring.

## Features

- Physics-based ball movement with gravity and friction
- Object pooling for particle effects
- Performance monitoring
- Custom dialog implementation
- Git-based version tracking

## Version Control System

This project uses Git for version control with semantic versioning (v0.1, v0.2, etc.).

### Version Display

The current version is displayed in the top-left corner of the game screen along with performance metrics.

### Version Metadata

Version information is embedded in:
- File headers as comments
- Game version constant in game-fixed.js
- Visual display in the game UI

### Git Hooks

The project includes Git hooks for version automation:

1. **post-tag**: Automatically updates version numbers in all files when a new tag is created
2. **pre-commit**: Ensures version numbers are consistent across all files

### Creating a New Version

To create a new version:

```bash
# Make your changes
git add .
git commit -m "Description of changes"

# Create a new version tag
git tag -a v0.2 -m "Version 0.2: Description of this version"

# The post-tag hook will automatically update version numbers in files
```

## Development

To run the game locally, open index.html in a web browser or use a local server.