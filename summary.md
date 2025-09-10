# ShockTheBlock Atom - Comprehensive Game Mechanics Analysis

## Project Overview
**ShockTheBlock Atom** is a physics-based block-breaking game built with HTML5 Canvas and JavaScript. The game features sophisticated mechanics, performance optimizations, and modern web development practices.

## Core Game Mechanics

### 1. Three-Phase Gameplay System
The game implements a structured three-phase approach for each turn:

#### Phase 1: Targeting/Positioning
- **Ball Positioning**: Players can move the ball left/right using arrow buttons
- **Position Constraints**: Ball movement is limited to stay within canvas bounds (minimum 10px from edges)
- **Confirmation Required**: Players must confirm their position before proceeding

#### Phase 2: Power Calibration
- **Angle Control**: Adjustable from 0° to 180° using a range slider
- **Power Levels**: 4 discrete power levels (1-4) with visual indicators
- **Real-time Preview**: Aiming line shows trajectory based on current angle and power
- **Launch Calculation**: Velocity calculated using trigonometry (dx = power × cos(angle), dy = -power × sin(angle))

#### Phase 3: Execution
- **Ball Launch**: Ball becomes active with calculated velocity
- **Physics Simulation**: Real-time physics updates until ball stops or is lost
- **Phase Reset**: Returns to Phase 1 after ball stops moving

### 2. Physics Engine

#### Core Physics Constants
- **Gravity**: 0.05 (downward acceleration)
- **Friction**: 0.99 (velocity dampening)
- **Bounce Factor**: 0.8 (energy loss on collisions)

#### Ball Physics
- **Continuous Movement**: Position updated each frame based on velocity
- **Gravity Application**: Downward acceleration applied continuously
- **Friction Dampening**: Both horizontal and vertical velocities reduced each frame
- **Wall Collisions**: Elastic collisions with energy loss on canvas boundaries
- **Stopping Condition**: Ball stops when velocity drops below 0.1 and is in lower half of screen

### 3. Block System

#### Block Generation
- **Dynamic Grid**: Grid size increases with level (rows: 2 + level/2, columns: 3 + level/3)
- **Maximum Constraints**: Capped at 5 rows × 6 columns
- **Gap Generation**: Random gaps based on level complexity (10% + 5% per level, max 40%)
- **Irregular Edges**: Random edge variations for increased difficulty

#### Block Properties
- **Size**: 120×120 pixels with 20px padding
- **Colors**: 4 different blue shades randomly assigned
- **Special Zones**: Each block contains a red "special zone" (40% of block size)
- **Hit States**: Blocks can be in normal or destroyed states

#### Special Zone Mechanics
- **Area Effect**: Hitting a special zone destroys blocks in a 3×3 area
- **Random Positioning**: Special zones positioned randomly within each block
- **Visual Distinction**: Red color (#ff6b6b) distinguishes special zones

### 4. Collision Detection System

#### Spatial Partitioning Optimization
- **Boundary Checks**: Quick elimination of impossible collisions
- **Grid-Based Detection**: Only checks blocks in ball's vicinity
- **Efficient Calculation**: Uses optimized distance calculations

#### Collision Response
- **Direction Detection**: Determines horizontal vs. vertical collisions
- **Bounce Calculation**: Reverses appropriate velocity component with energy loss
- **Special Zone Detection**: Separate collision detection for special zones

### 5. Resource Management System

#### Ball Management
- **Limited Resources**: 3 balls per game
- **Ball Tracking**: Visual counter shows remaining balls
- **Loss Conditions**: Ball lost when it exits bottom of screen
- **Game Over**: Triggered when all balls are exhausted

#### Level Progression
- **Completion Condition**: All blocks must be destroyed
- **Automatic Advancement**: Immediate progression to next level
- **Difficulty Scaling**: More blocks and complex layouts in higher levels
- **Ball Reset**: Ball count remains between levels

### 6. Particle Effects System

#### Object Pooling Implementation
- **Memory Efficiency**: Pre-allocated particle pool (300 particles)
- **Reuse Strategy**: Particles recycled rather than created/destroyed
- **Performance Optimization**: Reduces garbage collection overhead

#### Particle Types
- **Destruction Particles**: Created when blocks are destroyed (30 particles per block)
- **Launch Particles**: Visual feedback when ball is launched (5+ particles based on power)
- **Particle Properties**: Position, velocity, color, alpha, lifetime

#### Particle Behavior
- **Physics**: Particles have position and velocity
- **Lifecycle**: Fade out over time (alpha decreases)
- **Automatic Cleanup**: Particles returned to pool when expired

### 7. Performance Monitoring

#### Real-time Metrics
- **FPS Counter**: Updates every 500ms
- **Timing Metrics**: Physics, collision, and render time tracking
- **Object Pool Stats**: Active particle count and pool utilization
- **Block Count**: Number of visible blocks for performance assessment

#### Optimization Features
- **Batch Rendering**: Groups similar blocks to reduce context state changes
- **Spatial Partitioning**: Limits collision checks to relevant areas
- **Object Pooling**: Prevents memory allocation during gameplay

### 8. User Interface Systems

#### Phase Management UI
- **Visual Indicators**: Active phase highlighted with visual cues
- **Control Visibility**: Phase-appropriate controls shown/hidden
- **Progress Tracking**: Clear indication of current game state

#### Ball Counter UI
- **Visual Representation**: Circular indicators for each ball
- **State Indication**: Used balls visually distinguished
- **Status Messages**: "No balls remaining" message when appropriate

#### Custom Dialog System
- **Non-blocking**: Custom implementation replaces browser alerts
- **Game Integration**: Maintains game state during dialogs
- **Callback Support**: Supports post-dialog actions

### 9. Backend Integration

#### Database System
- **PostgreSQL Integration**: Stores high scores and player statistics
- **API Endpoints**: RESTful API for score management
- **Player Tracking**: Individual player statistics and history

#### Score Management
- **High Score Tracking**: Top 10 scores maintained
- **Player Statistics**: Average score, games played, high score per player
- **Level Tracking**: Records highest level reached

### 10. Technical Architecture

#### Performance Optimizations
- **Spatial Partitioning**: Efficient collision detection
- **Object Pooling**: Memory management for particles
- **Batch Rendering**: Optimized drawing operations
- **Performance Monitoring**: Real-time performance tracking

#### Code Organization
- **Modular Design**: Separate files for different concerns (API, zoom prevention)
- **Version Management**: Automated version tracking and synchronization
- **Git Integration**: Automated GitHub synchronization

#### Browser Compatibility
- **Touch Optimization**: Prevents unwanted zoom on mobile devices
- **Responsive Design**: Adapts to different screen sizes
- **Cross-browser Support**: Uses standard web technologies

## Game Flow Integration

All mechanics work together to create a cohesive gameplay experience:

1. **Setup Phase**: Player positions ball and sets angle/power
2. **Physics Phase**: Ball moves according to realistic physics
3. **Interaction Phase**: Collisions trigger block destruction and particle effects
4. **Evaluation Phase**: Check for level completion or ball loss
5. **Progression Phase**: Advance to next level or end game

The game successfully combines classic block-breaking gameplay with modern web technologies, sophisticated physics simulation, and performance optimization techniques to create an engaging and technically impressive browser-based game.

## File Structure

### Core Game Files
- `game.html` - Main game interface with three-phase UI
- `game.js` - Core game logic, physics engine, and mechanics (822 lines)
- `styles.css` - Game styling and responsive design

### Supporting Files
- `js/api.js` - Database API integration for high scores
- `js/prevent-zoom.js` - Mobile touch optimization
- `index.html` - Landing page with game information

### Server Components
- `server/server.js` - Express.js backend with PostgreSQL integration
- `server/init.sql` - Database schema for player scores
- `server/package.json` - Server dependencies

### Development Tools
- `package.json` - Project configuration and scripts
- `README.md` - Comprehensive project documentation
- Git hooks for automated version management and GitHub sync

## Technical Specifications

### Performance Metrics
- **Canvas Size**: 1000×800 pixels
- **Block Size**: 120×120 pixels
- **Ball Radius**: 15 pixels
- **Particle Pool**: 300 pre-allocated particles
- **FPS Target**: 60 FPS with real-time monitoring

### Physics Parameters
- **Gravity**: 0.05 units/frame²
- **Friction**: 0.99 (1% velocity loss per frame)
- **Bounce Factor**: 0.8 (20% energy loss on collision)
- **Stopping Threshold**: 0.1 velocity units

### Game Balance
- **Starting Balls**: 3 per game
- **Power Levels**: 4 discrete levels
- **Angle Range**: 0° to 180°
- **Level Scaling**: Dynamic grid size and complexity
- **Special Zone Effect**: 3×3 block destruction area