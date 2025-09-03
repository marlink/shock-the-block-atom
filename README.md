# ShockTheBlock Atom

## Version: v0.3

A block-breaking game with physics-based ball movement, particle effects, performance monitoring, and database integration for high scores.

## Features

- Physics-based ball movement with gravity and friction
- Object pooling for particle effects
- Performance monitoring
- Custom dialog implementation
- Git-based version tracking
- Three-phase gameplay flow (Targeting, Power Calibration, Execution)
- High score tracking with PostgreSQL database integration
- Player statistics and leaderboard

## Version Control System

This project uses Git for version control with semantic versioning (v0.3, v0.4, etc.).

### Version Display

The current version is displayed in the top-left corner of the game screen along with performance metrics.

### Version Metadata

Version information is embedded in:
- File headers as comments
- Game version constant in game-fixed.js
- Visual display in the game UI

### Git Hooks

The project includes Git hooks for version automation and GitHub synchronization:

1. **post-tag**: Automatically updates version numbers in all files when a new tag is created
2. **pre-commit**: Ensures version numbers are consistent across all files
3. **post-commit**: Automatically pushes changes to GitHub after successful local commits

### GitHub Synchronization

This project includes automated GitHub synchronization that:
- Automatically pushes changes to GitHub after each commit
- Ensures all pending changes are pushed when a session ends
- Provides status notifications for successful synchronization
- Handles connection issues and authentication failures gracefully

## Automated Version Tracking

This project includes an automated version tracking system that:
- Automatically generates summary files in the `manual-version-tracker` directory

## Database Integration

### Setup Instructions

1. Ensure PostgreSQL client tools are properly installed on your local machine
2. Navigate to the server directory and install dependencies:
   ```
   cd server
   npm install
   ```
3. Initialize the database:
   ```
   node init-db.js
   ```
4. Start the game using the provided script (this will start the server and open the game in your browser):
   ```
   ./start-game.sh
   ```
   
   Alternatively, you can manually:
   - Start the server: `cd server && node server.js`
   - Open `index.html` in your browser

### Database Features

- High scores are stored in a PostgreSQL database hosted on Neon
- Player statistics tracking
- Leaderboard functionality
- The server provides API endpoints for retrieving and saving scores
- The client communicates with the server using the GameAPI class
- Increments version numbers when session-ending keywords are detected in commit messages
- Maintains synchronization between version tags and folder names

### Session Keywords

The following keywords in commit messages will trigger version increments:
- "save session"
- "end session"
- "commit changes"
- "upload to git"

### Using Version-Aware Commits

Instead of regular `git commit`, use:
```bash
git gcommit -m "Your commit message"
```

To end a session and increment the version:
```bash
git gcommit -m "save session: implemented feature X"
```

### Version Verification

To verify version synchronization across files:
```bash
npm run version-check
```

### GitHub Synchronization Commands

To check the status of GitHub synchronization:
```bash
npm run sync-status
```

To view detailed synchronization logs:
```bash
npm run sync-verbose
```

To manually push changes to GitHub:
```bash
npm run sync-now
```

To install or update the Git hooks for GitHub synchronization:
```bash
bash install-git-hooks.sh
```

### Creating a New Version

To create a new version manually:

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