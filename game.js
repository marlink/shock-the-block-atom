/**
 * ShockTheBlock Atom - A block-breaking game with physics
 * Version: v0.3
 * 
 * Features:
 * - Physics-based ball movement with gravity and friction
 * - Object pooling for particle effects
 * - Performance monitoring
 * - Custom dialog implementation
 * - Three-phase gameplay flow
 */

// Get canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game version
const GAME_VERSION = 'v0.3';

// Game variables
let ballsLeft = 3;
let gameRunning = false;
let currentLevel = 1;
let lastFrameTime = 0;
let fps = 0;
let fpsUpdateInterval = 500; // Update FPS display every 500ms
let lastFpsUpdate = 0;
let frameCount = 0;
let isDialogOpen = false; // Flag to track dialog state
let ballsUsed = 0; // Track how many balls have been used

// Performance monitoring
let performanceMetrics = {
    renderTime: 0,
    physicsTime: 0,
    collisionTime: 0
};

// Physics constants
const GRAVITY = 0.05;
const FRICTION = 0.99;
const BOUNCE_FACTOR = 0.8;

// Object Pool for particles
class GameObjectPool {
    constructor(objectType, initialSize = 100) {
        this.objectType = objectType;
        this.pool = [];
        this.activeObjects = [];
        
        // Initialize pool with objects
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(this.createObject());
        }
    }
    
    createObject() {
        if (this.objectType === 'particle') {
            return {
                x: 0,
                y: 0,
                dx: 0,
                dy: 0,
                radius: 2,
                color: '#ffffff',
                alpha: 1,
                life: 0,
                maxLife: 30
            };
        }
        return {};
    }
    
    get() {
        // Get object from pool or create new one if pool is empty
        let object;
        if (this.pool.length > 0) {
            object = this.pool.pop();
        } else {
            object = this.createObject();
        }
        
        this.activeObjects.push(object);
        return object;
    }
    
    release(object) {
        // Return object to pool
        const index = this.activeObjects.indexOf(object);
        if (index !== -1) {
            this.activeObjects.splice(index, 1);
            this.pool.push(object);
        }
    }
    
    update() {
        // Update all active objects
        for (let i = this.activeObjects.length - 1; i >= 0; i--) {
            const obj = this.activeObjects[i];
            
            if (this.objectType === 'particle') {
                // Update particle
                obj.x += obj.dx;
                obj.y += obj.dy;
                obj.life++;
                obj.alpha = 1 - (obj.life / obj.maxLife);
                
                // Release particle if it's dead
                if (obj.life >= obj.maxLife) {
                    this.release(obj);
                }
            }
        }
    }
    
    draw(ctx) {
        // Draw all active objects
        if (this.objectType === 'particle') {
            for (const particle of this.activeObjects) {
                ctx.globalAlpha = particle.alpha;
                ctx.fillStyle = particle.color;
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1; // Reset alpha
        }
    }
    
    getStats() {
        return {
            poolSize: this.pool.length,
            activeCount: this.activeObjects.length
        };
    }
}

// Create particle pool
const particlePool = new GameObjectPool('particle', 300);

// Performance optimization flags
const USE_OBJECT_POOLING = true;
const USE_SPATIAL_PARTITIONING = true;
const ENABLE_PERFORMANCE_MONITORING = true;

// Controls
const angleSlider = document.getElementById('angle');
const powerSlider = document.getElementById('power');
const angleValue = document.getElementById('angle-value');
const powerValue = document.getElementById('power-value');
const confirmPositionBtn = document.getElementById('confirm-position');
const confirmPowerBtn = document.getElementById('confirm-power');
const moveLeftBtn = document.getElementById('move-left');
const moveRightBtn = document.getElementById('move-right');

// Update angle and power display values
angleSlider.addEventListener('input', () => {
    angleValue.textContent = `${angleSlider.value}°`;
});

powerSlider.addEventListener('input', () => {
    powerValue.textContent = powerSlider.value;
});

// Ball properties
const ball = {
    x: canvas.width / 2,
    y: canvas.height - 40,
    radius: 15, // Increased ball size to match larger blocks
    color: '#ffffff',
    dx: 0,
    dy: 0,
    moving: false
};

// Block properties
const BLOCK_WIDTH = 120;
const BLOCK_HEIGHT = 120;
const BLOCK_PADDING = 20; // Increased padding for larger blocks
const BLOCK_OFFSET_TOP = 50;
const BLOCK_OFFSET_LEFT = 35;

// Block colors
const BLOCK_COLORS = [
    '#4a6fa5', // Base color (blue shade)
    '#3d5c8c',
    '#304973',
    '#24365a'
];
const SPECIAL_ZONE_COLOR = '#ff6b6b'; // Special zone color (reddish)

// Blocks array
let blocks = [];

// Create blocks for the current level
function createBlocks() {
    blocks = [];
    
    // Determine grid dimensions based on level - adjusted for larger blocks
    const rows = Math.min(2 + Math.floor(currentLevel / 2), 5);
    const columns = Math.min(3 + Math.floor(currentLevel / 3), 6);
    
    // Calculate complexity factors
    const gapProbability = Math.min(0.1 + (currentLevel * 0.05), 0.4); // Chance of a gap in the grid
    const irregularEdgeProbability = Math.min(0.05 + (currentLevel * 0.03), 0.3); // Chance of irregular edge
    
    for (let r = 0; r < rows; r++) {
        blocks[r] = [];
        for (let c = 0; c < columns; c++) {
            // Create gaps and irregular edges based on level complexity
            if (Math.random() < gapProbability || 
                (r === rows - 1 && Math.random() < irregularEdgeProbability)) {
                blocks[r][c] = null; // Gap in the grid
            } else {
                // Random color from the block colors array
                const colorIndex = Math.floor(Math.random() * BLOCK_COLORS.length);
                
                // Create special zone within the block
                const specialZone = {
                    width: BLOCK_WIDTH * 0.4,
                    height: BLOCK_HEIGHT * 0.4,
                    offsetX: BLOCK_WIDTH * (0.3 + Math.random() * 0.3), // Adjusted to keep special zone fully within block
                    offsetY: BLOCK_HEIGHT * (0.3 + Math.random() * 0.3) // Adjusted to keep special zone fully within block
                };
                
                blocks[r][c] = {
                    x: c * (BLOCK_WIDTH + BLOCK_PADDING) + BLOCK_OFFSET_LEFT,
                    y: r * (BLOCK_HEIGHT + BLOCK_PADDING) + BLOCK_OFFSET_TOP,
                    width: BLOCK_WIDTH,
                    height: BLOCK_HEIGHT,
                    color: BLOCK_COLORS[colorIndex],
                    specialZone: specialZone,
                    hit: false
                };
            }
        }
    }
}

// Draw the blocks with batch rendering optimization
function drawBlocks() {
    // Batch similar blocks together to reduce context state changes
    let visibleBlockCount = 0;
    
    // First pass: Draw all main blocks with the same color
    for (let colorIndex = 0; colorIndex < BLOCK_COLORS.length; colorIndex++) {
        const color = BLOCK_COLORS[colorIndex];
        ctx.fillStyle = color;
        ctx.beginPath();
        
        for (let r = 0; r < blocks.length; r++) {
            for (let c = 0; c < blocks[r].length; c++) {
                const block = blocks[r][c];
                if (block && !block.hit && block.color === color) {
                    ctx.rect(block.x, block.y, block.width, block.height);
                    visibleBlockCount++;
                }
            }
        }
        
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.closePath();
    }
    
    // Second pass: Draw all special zones
    ctx.fillStyle = SPECIAL_ZONE_COLOR;
    ctx.beginPath();
    
    for (let r = 0; r < blocks.length; r++) {
        for (let c = 0; c < blocks[r].length; c++) {
            const block = blocks[r][c];
            if (block && !block.hit) {
                ctx.rect(
                    block.x + block.specialZone.offsetX, 
                    block.y + block.specialZone.offsetY, 
                    block.specialZone.width, 
                    block.specialZone.height
                );
            }
        }
    }
    
    ctx.fill();
    ctx.closePath();
    
    // Display block count for performance monitoring
    if (ENABLE_PERFORMANCE_MONITORING) {
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`Blocks: ${visibleBlockCount}`, 10, 95);
    }
}

// Check collision between ball and blocks with spatial partitioning optimization
function checkBlockCollision() {
    if (!ball.moving) return;
    
    let collisionDetected = false;
    
    // Quick boundary check to skip collision detection if ball is outside block area
    if (ball.y < BLOCK_OFFSET_TOP - ball.radius || 
        ball.x < BLOCK_OFFSET_LEFT - ball.radius) {
        return;
    }
    
    // Only check blocks that are in the vicinity of the ball
    // Calculate potential row and column indices
    const potentialRowStart = Math.max(0, Math.floor((ball.y - BLOCK_OFFSET_TOP - ball.radius) / (BLOCK_HEIGHT + BLOCK_PADDING)));
    const potentialRowEnd = Math.min(blocks.length - 1, Math.floor((ball.y - BLOCK_OFFSET_TOP + ball.radius) / (BLOCK_HEIGHT + BLOCK_PADDING)) + 1);
    
    const potentialColStart = Math.max(0, Math.floor((ball.x - BLOCK_OFFSET_LEFT - ball.radius) / (BLOCK_WIDTH + BLOCK_PADDING)));
    const potentialColEnd = Math.min(blocks[0] ? blocks[0].length - 1 : 0, Math.floor((ball.x - BLOCK_OFFSET_LEFT + ball.radius) / (BLOCK_WIDTH + BLOCK_PADDING)) + 1);
    
    // Only check blocks in the vicinity
    for (let r = potentialRowStart; r <= potentialRowEnd && r < blocks.length; r++) {
        for (let c = potentialColStart; c <= potentialColEnd && c < blocks[r].length; c++) {
            const block = blocks[r][c];
            if (block && !block.hit) {
                // Check if ball collides with block using optimized distance calculation
                const distX = Math.abs(ball.x - (block.x + block.width / 2));
                const distY = Math.abs(ball.y - (block.y + block.height / 2));
                
                if (distX <= (block.width / 2 + ball.radius) && distY <= (block.height / 2 + ball.radius)) {
                    // Check if ball hit the special zone
                    const specialZoneX = block.x + block.specialZone.offsetX;
                    const specialZoneY = block.y + block.specialZone.offsetY;
                    const specialZoneRight = specialZoneX + block.specialZone.width;
                    const specialZoneBottom = specialZoneY + block.specialZone.height;
                    
                    const hitSpecialZone = 
                        ball.x + ball.radius > specialZoneX &&
                        ball.x - ball.radius < specialZoneRight &&
                        ball.y + ball.radius > specialZoneY &&
                        ball.y - ball.radius < specialZoneBottom;
                    
                    if (hitSpecialZone) {
                        // Special zone hit - destroy blocks in a 3x3 area
                        destroyBlockArea(r, c, 1);
                    } else {
                        // Regular hit
                        block.hit = true;
                    }
                    
                    // Determine bounce direction
                    if (distX > distY) {
                        // Horizontal collision
                        ball.dx = -ball.dx * BOUNCE_FACTOR;
                    } else {
                        // Vertical collision
                        ball.dy = -ball.dy * BOUNCE_FACTOR;
                    }
                    
                    collisionDetected = true;
                    break;
                }
            }
        }
        if (collisionDetected) break;
    }
    
    // Check if all blocks are cleared
    checkLevelComplete();
}

// Destroy blocks in an area around the given position with particle effects
function destroyBlockArea(centerRow, centerCol, radius) {
    for (let r = Math.max(0, centerRow - radius); r <= Math.min(blocks.length - 1, centerRow + radius); r++) {
        for (let c = Math.max(0, centerCol - radius); c <= Math.min(blocks[r].length - 1, centerCol + radius); c++) {
            if (blocks[r][c] && !blocks[r][c].hit) {
                const block = blocks[r][c];
                block.hit = true;
                
                // Create particle effects if object pooling is enabled
                if (USE_OBJECT_POOLING) {
                    createDestroyParticles(block.x + block.width/2, block.y + block.height/2, block.color);
                }
            }
        }
    }
}

// Create particle effects when a block is destroyed
function createDestroyParticles(x, y, color) {
    const particleCount = 30; // Increased particle count for larger blocks
    
    for (let i = 0; i < particleCount; i++) {
        const particle = particlePool.get();
        
        // Set particle properties
        particle.x = x;
        particle.y = y;
        particle.radius = 2 + Math.random() * 5; // Larger particles for better visibility
        particle.color = color;
        particle.alpha = 1;
        particle.life = 0;
        particle.maxLife = 30 + Math.random() * 30; // Longer lifetime for particles
        
        // Random velocity
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.5 + Math.random() * 2;
        particle.dx = Math.cos(angle) * speed;
        particle.dy = Math.sin(angle) * speed;
    }
}

// Check if the level is complete
function checkLevelComplete() {
    let allBlocksHit = true;
    
    for (let r = 0; r < blocks.length; r++) {
        for (let c = 0; c < blocks[r].length; c++) {
            if (blocks[r][c] && !blocks[r][c].hit) {
                allBlocksHit = false;
                break;
            }
        }
        if (!allBlocksHit) break;
    }
    
    if (allBlocksHit) {
        // Level complete
        currentLevel++;
        showDialog(`Level ${currentLevel-1} complete! Moving to level ${currentLevel}`, () => {
            // Reset ball position
            ball.x = canvas.width / 2;
            ball.y = canvas.height - 40;
            ball.dx = 0;
            ball.dy = 0;
            ball.moving = false;
            
            // Reset to phase 1 for new level
            currentPhase = 1;
            
            // Reset balls for new level
            ballsLeft = 3;
            ballsUsed = 0;
            
            // Create new blocks for next level
            createBlocks();
            
            // Update UI
            updateBallCounterUI();
            updatePhaseUI();
            
            // Show controls again
            const controlsElement = document.querySelector('.controls');
            if (controlsElement) {
                controlsElement.classList.remove('controls-hidden');
                controlsElement.classList.add('controls-visible');
            }
        });
    }
}

// Draw the ball
function drawBall() {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = ball.color;
    ctx.fill();
    ctx.closePath();
}

// Draw the aiming line when not moving
function drawAimingLine() {
    if (!ball.moving) {
        const angle = angleSlider.value * (Math.PI / 180);
        const power = powerSlider.value * 5; // Multiply for better visualization
        
        const endX = ball.x + Math.cos(angle) * power;
        const endY = ball.y - Math.sin(angle) * power;
        
        ctx.beginPath();
        ctx.moveTo(ball.x, ball.y);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = '#ff4d4d';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.closePath();
    }
}

// Update ball position and handle collisions
function updateBall() {
    if (ball.moving) {
        // Apply physics
        ball.dy += GRAVITY;
        ball.dx *= FRICTION;
        ball.dy *= FRICTION;
        
        // Update position
        ball.x += ball.dx;
        ball.y += ball.dy;
        
        // Handle wall collisions
        // Right wall
        if (ball.x + ball.radius > canvas.width) {
            ball.x = canvas.width - ball.radius;
            ball.dx = -ball.dx * BOUNCE_FACTOR;
        }
        
        // Left wall
        if (ball.x - ball.radius < 0) {
            ball.x = ball.radius;
            ball.dx = -ball.dx * BOUNCE_FACTOR;
        }
        
        // Top wall
        if (ball.y - ball.radius < 0) {
            ball.y = ball.radius;
            ball.dy = -ball.dy * BOUNCE_FACTOR;
        }
        
        // Bottom wall (ball is lost)
        if (ball.y + ball.radius > canvas.height) {
            ballLost();
        }
        
        // Stop the ball if it's moving too slow
        if (Math.abs(ball.dx) < 0.1 && Math.abs(ball.dy) < 0.1 && ball.y > canvas.height / 2) {
            ball.dx = 0;
            ball.dy = 0;
            ball.moving = false;
            currentPhase = 1;
            updatePhaseUI();
        }
    }
}

// Handle lost ball
function ballLost() {
    ballsLeft--;
    ballsUsed++;
    document.getElementById('balls-count').textContent = ballsLeft;
    
    // Update ball counter UI
    updateBallCounterUI();
    
    if (ballsLeft > 0) {
        // Reset ball position
        ball.x = canvas.width / 2;
        ball.y = canvas.height - 30;
        ball.dx = 0;
        ball.dy = 0;
        ball.moving = false;
        
        // Reset phase back to 1
        currentPhase = 1;
        updatePhaseUI();
        
        // Show controls when ball is reset
        const controlsElement = document.querySelector('.controls');
        if (controlsElement) {
            controlsElement.classList.remove('controls-hidden');
            controlsElement.classList.add('controls-visible');
        }
    } else {
        // Game over
        showDialog('Game Over! No balls remaining.', () => {
            // Reset game
            ballsLeft = 3;
            ballsUsed = 0;
            currentLevel = 1;
            currentPhase = 1;
            createBlocks();
            updateBallCounterUI();
            updatePhaseUI();
        });
    }
}

// Clear the canvas
function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// Main game loop
function gameLoop(timestamp) {
    // Calculate FPS
    if (!lastFrameTime) {
        lastFrameTime = timestamp;
    }
    const deltaTime = timestamp - lastFrameTime;
    lastFrameTime = timestamp;
    
    // Update FPS counter
    frameCount++;
    if (timestamp - lastFpsUpdate > fpsUpdateInterval) {
        fps = Math.round((frameCount * 1000) / (timestamp - lastFpsUpdate));
        lastFpsUpdate = timestamp;
        frameCount = 0;
    }
    
    clearCanvas();
    
    // Measure physics update time
    const physicsStartTime = performance.now();
    updateBall();
    
    // Update particle effects if object pooling is enabled
    if (USE_OBJECT_POOLING) {
        particlePool.update();
    }
    
    performanceMetrics.physicsTime = performance.now() - physicsStartTime;
    
    // Measure collision detection time
    const collisionStartTime = performance.now();
    checkBlockCollision();
    performanceMetrics.collisionTime = performance.now() - collisionStartTime;
    
    // Measure rendering time
    const renderStartTime = performance.now();
    drawBlocks();
    
    // Draw particle effects if object pooling is enabled
    if (USE_OBJECT_POOLING) {
        particlePool.draw(ctx);
    }
    
    drawAimingLine();
    drawBall();
    
    // Display performance metrics if enabled
    if (ENABLE_PERFORMANCE_MONITORING) {
        displayPerformanceMetrics();
    }
    
    performanceMetrics.renderTime = performance.now() - renderStartTime;
    
    requestAnimationFrame(gameLoop);
}

// Display performance metrics
function displayPerformanceMetrics() {
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    
    // Display version
    ctx.fillText(`Version: ${GAME_VERSION}`, 10, 20);
    
    // Display FPS
    ctx.fillText(`FPS: ${fps}`, 10, 35);
    
    // Display timing metrics
    ctx.fillText(`Physics: ${performanceMetrics.physicsTime.toFixed(2)}ms`, 10, 50);
    ctx.fillText(`Collision: ${performanceMetrics.collisionTime.toFixed(2)}ms`, 10, 65);
    ctx.fillText(`Render: ${performanceMetrics.renderTime.toFixed(2)}ms`, 10, 80);
    
    // Display object pool stats if enabled
    if (USE_OBJECT_POOLING) {
        const stats = particlePool.getStats();
        ctx.fillText(`Particles: ${stats.activeCount}/${stats.activeCount + stats.poolSize}`, 10, 110);
    }
}

// Initialize the game
function init() {
    // Reset game state
    ballsLeft = 3;
    currentLevel = 1;
    ballsUsed = 0;
    gameRunning = true;
    currentPhase = 1;
    document.getElementById('balls-count').textContent = ballsLeft;
    
    // Reset ball counter UI
    updateBallCounterUI();
    
    // Reset ball position
    ball.x = canvas.width / 2;
    ball.y = canvas.height - 30;
    ball.dx = 0;
    ball.dy = 0;
    ball.moving = false;
    
    // Setup enhanced input handlers
    setupInputHandlers();
    
    // Initialize power level indicators
    updatePowerLevels();
    
    // Update UI
    updatePhaseUI();
    
    // Make controls visible initially
    const controlsElement = document.querySelector('.controls');
    if (controlsElement) {
        controlsElement.classList.remove('controls-hidden');
        controlsElement.classList.add('controls-visible');
    }
    
    // Create blocks for the first level
    createBlocks();
    
    // Start the game loop
    gameLoop();
    
    console.log('Game initialized with enhanced input handling - Version:', GAME_VERSION);
}

// Update the ball counter UI
function updateBallCounterUI() {
    // First, reset all balls to their default state
    for (let i = 1; i <= 3; i++) {
        const ballElement = document.getElementById(`ball-${i}`);
        if (ballElement) {
            ballElement.classList.remove('ball-used');
        }
    }
    
    // Mark used balls
    for (let i = 1; i <= ballsUsed; i++) {
        const ballElement = document.getElementById(`ball-${i}`);
        if (ballElement) {
            ballElement.classList.add('ball-used');
        }
    }
    
    // Show/hide the "No balls remaining" message
    const ballStatusMessage = document.getElementById('ball-status-message');
    if (ballStatusMessage) {
        if (ballsLeft <= 0) {
            ballStatusMessage.classList.remove('hidden');
        } else {
            ballStatusMessage.classList.add('hidden');
        }
    }
}

// Update the phase UI
function updatePhaseUI() {
    // Remove active class from all phases
    document.querySelectorAll('.phase').forEach(phase => {
        phase.classList.remove('active');
    });
    
    // Add active class to current phase
    const currentPhaseElement = document.querySelector(`.phase-${currentPhase}`);
    if (currentPhaseElement) {
        currentPhaseElement.classList.add('active');
    }
    
    // Update game container data attribute for CSS styling
    const gameContainer = document.querySelector('.game-container');
    if (gameContainer) {
        gameContainer.setAttribute('data-phase', currentPhase);
    }
    
    // Update execution message
    const executionMessage = document.getElementById('execution-message');
    if (currentPhase === 3 && executionMessage) {
        executionMessage.textContent = 'Ball in motion...';
    }
    
    // Add keyboard shortcut hints to phase content
    updateShortcutHints();
}

// Add keyboard shortcut hints
function updateShortcutHints() {
    const phase1Content = document.querySelector('#phase-targeting .phase-content');
    const phase2Content = document.querySelector('#phase-power .phase-content');
    
    if (phase1Content) {
        phase1Content.setAttribute('data-shortcuts', 'Keys: ←→ or A/D to move, Space/Enter to confirm');
    }
    
    if (phase2Content) {
        phase2Content.setAttribute('data-shortcuts', 'Keys: ↑↓ or W/S for angle, ←→ or A/D for power, 1-4 for direct power, Space/Enter to fire');
    }
}

// Game phase management
let currentPhase = 1;
let isMouseDown = false;
let isDragging = false;
let mouseStartX = 0;
let mouseStartY = 0;
let lastMouseX = 0;
let lastMouseY = 0;

// Input handling variables
let keys = {};
let mousePosition = { x: 0, y: 0 };
let isAiming = false;
let aimStartX = 0;
let aimStartY = 0;

// Enhanced input handling for multiple devices
function setupInputHandlers() {
    // Mouse and trackpad events
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    
    // Touch events for mobile/trackpad gestures
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    // Keyboard events
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    // Prevent context menu on right click
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

// Mouse/trackpad handlers
function handleMouseDown(e) {
    if (isDialogOpen) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    mousePosition.x = x;
    mousePosition.y = y;
    isMouseDown = true;
    mouseStartX = x;
    mouseStartY = y;
    
    if (currentPhase === 1 && !ball.moving) {
        // Phase 1: Position control with mouse
        isDragging = true;
        ball.x = Math.max(ball.radius + 10, Math.min(canvas.width - ball.radius - 10, x));
    } else if (currentPhase === 2 && !ball.moving) {
        // Phase 2: Start aiming
        isAiming = true;
        aimStartX = x;
        aimStartY = y;
    }
}

function handleMouseMove(e) {
    if (isDialogOpen) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    mousePosition.x = x;
    mousePosition.y = y;
    
    if (currentPhase === 1 && isDragging && !ball.moving) {
        // Phase 1: Drag to position ball
        ball.x = Math.max(ball.radius + 10, Math.min(canvas.width - ball.radius - 10, x));
    } else if (currentPhase === 2 && isAiming && !ball.moving) {
        // Phase 2: Mouse aiming
        const deltaX = x - aimStartX;
        const deltaY = y - aimStartY;
        
        // Calculate angle from mouse movement
        let angle = Math.atan2(-deltaY, deltaX) * (180 / Math.PI);
        if (angle < 0) angle += 360;
        if (angle > 180) angle = 180;
        
        angleSlider.value = Math.max(0, Math.min(180, angle));
        angleValue.textContent = Math.round(angleSlider.value) + '°';
        
        // Calculate power from distance
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const power = Math.max(1, Math.min(4, Math.floor(distance / 30) + 1));
        powerSlider.value = power;
        powerValue.textContent = power;
        updatePowerLevels();
    }
    
    lastMouseX = x;
    lastMouseY = y;
}

function handleMouseUp(e) {
    if (isDialogOpen) return;
    
    isMouseDown = false;
    isDragging = false;
    
    if (currentPhase === 2 && isAiming && !ball.moving) {
        // Auto-confirm power after aiming with mouse
        isAiming = false;
        setTimeout(() => {
            if (currentPhase === 2) {
                confirmPowerBtn.click();
            }
        }, 100);
    }
}

// Wheel/scroll handling for fine adjustments
function handleWheel(e) {
    if (isDialogOpen) return;
    e.preventDefault();
    
    if (currentPhase === 2 && !ball.moving) {
        const delta = e.deltaY > 0 ? -1 : 1;
        
        if (e.shiftKey) {
            // Shift + scroll: adjust power
            const newPower = Math.max(1, Math.min(4, parseInt(powerSlider.value) + delta));
            powerSlider.value = newPower;
            powerValue.textContent = newPower;
            updatePowerLevels();
        } else {
            // Normal scroll: adjust angle
            const newAngle = Math.max(0, Math.min(180, parseInt(angleSlider.value) + delta * 5));
            angleSlider.value = newAngle;
            angleValue.textContent = newAngle + '°';
        }
    }
}

// Touch handlers for mobile/trackpad gestures
function handleTouchStart(e) {
    if (isDialogOpen) return;
    e.preventDefault();
    
    if (e.touches.length === 1) {
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        // Simulate mouse down
        handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY });
    }
}

function handleTouchMove(e) {
    if (isDialogOpen) return;
    e.preventDefault();
    
    if (e.touches.length === 1) {
        const touch = e.touches[0];
        // Simulate mouse move
        handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
    }
}

function handleTouchEnd(e) {
    if (isDialogOpen) return;
    e.preventDefault();
    
    // Simulate mouse up
    handleMouseUp(e);
}

// Keyboard handlers
function handleKeyDown(e) {
    if (isDialogOpen) return;
    
    keys[e.code] = true;
    
    // Phase navigation
    if (e.code === 'Space') {
        e.preventDefault();
        if (currentPhase === 1) {
            confirmPositionBtn.click();
        } else if (currentPhase === 2) {
            confirmPowerBtn.click();
        }
    }
    
    // Phase 1: Position control
    if (currentPhase === 1 && !ball.moving) {
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
            e.preventDefault();
            ball.x = Math.max(ball.radius + 10, ball.x - (e.shiftKey ? 5 : 20));
        } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
            e.preventDefault();
            ball.x = Math.min(canvas.width - ball.radius - 10, ball.x + (e.shiftKey ? 5 : 20));
        } else if (e.code === 'Enter') {
            e.preventDefault();
            confirmPositionBtn.click();
        }
    }
    
    // Phase 2: Angle and power control
    if (currentPhase === 2 && !ball.moving) {
        if (e.code === 'ArrowUp' || e.code === 'KeyW') {
            e.preventDefault();
            const newAngle = Math.max(0, parseInt(angleSlider.value) - (e.shiftKey ? 1 : 5));
            angleSlider.value = newAngle;
            angleValue.textContent = newAngle + '°';
        } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
            e.preventDefault();
            const newAngle = Math.min(180, parseInt(angleSlider.value) + (e.shiftKey ? 1 : 5));
            angleSlider.value = newAngle;
            angleValue.textContent = newAngle + '°';
        } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
            e.preventDefault();
            const newPower = Math.max(1, parseInt(powerSlider.value) - 1);
            powerSlider.value = newPower;
            powerValue.textContent = newPower;
            updatePowerLevels();
        } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
            e.preventDefault();
            const newPower = Math.min(4, parseInt(powerSlider.value) + 1);
            powerSlider.value = newPower;
            powerValue.textContent = newPower;
            updatePowerLevels();
        } else if (e.code === 'Enter') {
            e.preventDefault();
            confirmPowerBtn.click();
        }
        
        // Number keys for direct power selection
        if (e.code >= 'Digit1' && e.code <= 'Digit4') {
            e.preventDefault();
            const power = parseInt(e.code.slice(-1));
            powerSlider.value = power;
            powerValue.textContent = power;
            updatePowerLevels();
        }
    }
    
    // Global shortcuts
    if (e.code === 'Escape') {
        e.preventDefault();
        // Reset to phase 1 if not in motion
        if (!ball.moving && currentPhase > 1) {
            currentPhase = 1;
            updatePhaseUI();
        }
    }
}

function handleKeyUp(e) {
    keys[e.code] = false;
}

// Update power level visual indicators
function updatePowerLevels() {
    const powerLevels = document.querySelectorAll('.power-level');
    const currentPower = parseInt(powerSlider.value);
    
    powerLevels.forEach((level, index) => {
        const levelValue = index + 1;
        if (levelValue <= currentPower) {
            level.classList.add('active');
        } else {
            level.classList.remove('active');
        }
    });
}

// Position controls (keeping original button functionality)
moveLeftBtn.addEventListener('click', () => {
    if (currentPhase === 1 && !ball.moving) {
        ball.x = Math.max(ball.radius + 10, ball.x - 20);
    }
});

moveRightBtn.addEventListener('click', () => {
    if (currentPhase === 1 && !ball.moving) {
        ball.x = Math.min(canvas.width - ball.radius - 10, ball.x + 20);
    }
});

confirmPositionBtn.addEventListener('click', () => {
    if (currentPhase === 1) {
        currentPhase = 2;
        updatePhaseUI();
    }
});

confirmPowerBtn.addEventListener('click', () => {
    if (currentPhase === 2 && !ball.moving && ballsLeft > 0) {
        const angle = angleSlider.value * (Math.PI / 180);
        const power = powerSlider.value;
        
        // Calculate velocity based on angle and power
        ball.dx = power * Math.cos(angle);
        ball.dy = -power * Math.sin(angle); // Negative because canvas Y is inverted
        
        currentPhase = 3;
        updatePhaseUI();
        
        // Create launch particles for visual feedback
        if (USE_OBJECT_POOLING) {
            const particleCount = Math.floor(power / 3) + 5; // More particles for higher power
            for (let i = 0; i < particleCount; i++) {
                const particle = particlePool.get();
                
                // Set particle properties for launch effect
                particle.x = ball.x;
                particle.y = ball.y;
                particle.radius = 1 + Math.random() * 2;
                particle.color = '#ffaa00'; // Orange-yellow for launch effect
                particle.alpha = 1;
                particle.life = 0;
                particle.maxLife = 10 + Math.random() * 10;
                
                // Particles shoot in opposite direction of ball launch
                const spreadAngle = angle + (Math.random() * 0.5 - 0.25); // Slight spread
                const particlePower = power * 0.2 * (0.8 + Math.random() * 0.4);
                particle.dx = -particlePower * Math.cos(spreadAngle) * 0.5;
                particle.dy = particlePower * Math.sin(spreadAngle) * 0.5;
            }
        }
        
        ball.moving = true;
        
        // Hide controls when ball is moving
        const controlsElement = document.querySelector('.controls');
        if (controlsElement) {
            controlsElement.classList.remove('controls-visible');
            controlsElement.classList.add('controls-hidden');
        }
        
        // Mark the first ball as used when the round begins
        if (ballsUsed === 0) {
            ballsUsed = 1;
            updateBallCounterUI();
        }
    }
});

// Initialize the game when the page loads
window.addEventListener('load', init);

// Custom dialog functions
const customDialog = document.getElementById('custom-dialog');
const dialogMessage = document.getElementById('dialog-message');
const dialogOkBtn = document.getElementById('dialog-ok-btn');

// Show custom dialog instead of alert
function showDialog(message, callback) {
    if (!customDialog || !dialogMessage || !dialogOkBtn) {
        console.warn('Dialog elements not found, using alert instead');
        alert(message);
        if (callback) callback();
        return;
    }
    
    isDialogOpen = true;
    dialogMessage.textContent = message;
    customDialog.classList.remove('hidden');
    
    // Remove any existing event listeners to prevent duplicates
    const newOkBtn = dialogOkBtn.cloneNode(true);
    dialogOkBtn.parentNode.replaceChild(newOkBtn, dialogOkBtn);
    
    // Add click event listener to OK button
    newOkBtn.addEventListener('click', () => {
        customDialog.classList.add('hidden');
        isDialogOpen = false;
        if (callback) callback();
    });
}