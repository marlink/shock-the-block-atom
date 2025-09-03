// Get canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Original canvas dimensions (design reference)
const ORIGINAL_WIDTH = 1000;
const ORIGINAL_HEIGHT = 800;

// Add responsive canvas scaling variables
let canvasScale = 1;
let scaledWidth = ORIGINAL_WIDTH;
let scaledHeight = ORIGINAL_HEIGHT;
let viewportWidth = window.innerWidth;
let viewportHeight = window.innerHeight;

// Game version
const GAME_VERSION = 'v0.2';

// Game variables
let ballsLeft = 3;
let score = 0;
let gameRunning = false;
let currentLevel = 1;
let lastFrameTime = 0;
let fps = 0;
let fpsUpdateInterval = 500; // Update FPS display every 500ms
let lastFpsUpdate = 0;
let frameCount = 0;
let isDialogOpen = false; // Flag to track dialog state

// Gameplay phase variables
let currentPhase = 1; // 1: Targeting, 2: Power, 3: Execution
let phaseTransitioning = false; // Flag to track phase transitions

// New Aim + Power (Solution A) state
let aimingSweep = false; // sweeping directional line running
let powerCharging = false; // oscillating power bar running
let aimAngle = Math.PI / 2; // current aiming angle (radians)
let lockedAngle = null; // locked aiming angle (radians)
const AIM_MIN = 15 * Math.PI / 180; // 15°
const AIM_MAX = 165 * Math.PI / 180; // 165°
let aimSweepDir = 1; // 1 or -1
const AIM_SWEEP_SPEED = 0.02; // radians per frame (tuned visually)

let powerChargeValue = 0; // 0..1, ping-pong
let powerChargeDir = 1; // 1 or -1
let lockedPowerLevel = null; // 1..4 when locked
// phaseTransitioning already declared above

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
const moveLeftBtn = document.getElementById('move-left');
const moveRightBtn = document.getElementById('move-right');
const confirmPositionBtn = document.getElementById('confirm-position');
const confirmPowerBtn = document.getElementById('confirm-power');
const executionMessage = document.getElementById('execution-message');

// Phase elements
const phaseTargeting = document.getElementById('phase-targeting');
const phasePower = document.getElementById('phase-power');
const phaseExecution = document.getElementById('phase-execution');

// Update angle and power display values
angleSlider.addEventListener('input', () => {
    angleValue.textContent = `${angleSlider.value}°`;
});

powerSlider.addEventListener('input', () => {
    updatePowerLevel();
});

// Update power level indicators
function updatePowerLevel() {
    const powerLevel = powerSlider.value;
    powerValue.textContent = powerLevel;
    
    // Update power level indicators
    document.querySelectorAll('.power-level').forEach(el => {
        const level = parseInt(el.getAttribute('data-level'));
        if (level <= powerLevel) {
            el.style.opacity = '1';
        } else {
            el.style.opacity = '0.3';
        }
    });
}

// Phase management functions
function setActivePhase(phaseNumber) {
    if (phaseTransitioning) return;
    phaseTransitioning = true;
    
    // Hide all phases with transition
    document.querySelectorAll('.phase').forEach(phase => {
        phase.classList.remove('active');
    });
    
    // Show the active phase
    let activePhase;
    switch(phaseNumber) {
        case 1:
            activePhase = phaseTargeting;
            break;
        case 2:
            activePhase = phasePower;
            break;
        case 3:
            activePhase = phaseExecution;
            break;
    }
    
    // Update current phase
    currentPhase = phaseNumber;
    
    // Add active class after a short delay for transition effect
    setTimeout(() => {
        activePhase.classList.add('active');
        phaseTransitioning = false;
    }, 300);
}

// Phase 1: Targeting Setup - Horizontal ball positioning
moveLeftBtn.addEventListener('click', () => {
    if (currentPhase === 1 && !ball.moving) {
        ball.x = Math.max(ball.x - ball.positionStep, ball.minX);
    }
});

moveRightBtn.addEventListener('click', () => {
    if (currentPhase === 1 && !ball.moving) {
        ball.x = Math.min(ball.x + ball.positionStep, ball.maxX);
    }
});

// Confirm position and move to Phase 2
confirmPositionBtn.addEventListener('click', () => {
    if (currentPhase === 1 && !ball.moving) {
        setActivePhase(2);
        updatePowerLevel(); // Initialize power level display (legacy UI)
        // Start Solution A flow: begin sweeping aim
        aimingSweep = true;
        powerCharging = false;
        lockedAngle = null;
        lockedPowerLevel = null;
        aimAngle = Math.PI / 2;
        powerChargeValue = 0;
        powerChargeDir = 1;
    }
});

// Ball properties
const ball = {
    x: canvas.width / 2,
    y: canvas.height - 30,
    radius: 10,
    color: '#ffffff',
    dx: 0,
    dy: 0,
    moving: false,
    positionStep: 10, // Step size for horizontal positioning
    minX: 50, // Minimum x position
    maxX: canvas.width - 50, // Maximum x position
    tailEffect: [] // Array to store tail particles
};

// Block properties
const BLOCK_WIDTH = 120;
const BLOCK_HEIGHT = 120;
const BLOCK_PADDING = 10;
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
    
    // Determine grid dimensions based on level
    const rows = Math.min(3 + Math.floor(currentLevel / 2), 8);
    const columns = Math.min(5 + Math.floor(currentLevel / 3), 10);
    
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
                // Allow special blocks to be positioned at edge locations
                const specialZone = {
                    width: BLOCK_WIDTH * 0.3,
                    height: BLOCK_HEIGHT * 0.3,
                    offsetX: BLOCK_WIDTH * Math.random(), // Allow positioning at left edge
                    offsetY: BLOCK_HEIGHT * Math.random() // Allow positioning at top edge
                };
                
                // Ensure special zone stays within block boundaries
                if (specialZone.offsetX + specialZone.width > BLOCK_WIDTH) {
                    specialZone.offsetX = BLOCK_WIDTH - specialZone.width;
                }
                if (specialZone.offsetY + specialZone.height > BLOCK_HEIGHT) {
                    specialZone.offsetY = BLOCK_HEIGHT - specialZone.height;
                }
                
                blocks[r][c] = {
                    x: c * (BLOCK_WIDTH + BLOCK_PADDING) + BLOCK_OFFSET_LEFT,
                    y: r * (BLOCK_HEIGHT + BLOCK_PADDING) + BLOCK_OFFSET_TOP,
                    width: BLOCK_WIDTH,
                    height: BLOCK_HEIGHT,
                    color: BLOCK_COLORS[colorIndex],
                    specialZone: specialZone,
                    hit: false,
                    hitCount: 0,  // Track number of hits for standard blocks
                    maxHits: 3    // Standard blocks require 3 hits to destroy
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
        ctx.fillText(`Blocks: ${visibleBlockCount}`, 10, 80);
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
                    // Clear tail effect on block hit for visual clarity
                    if (currentPhase === 3) {
                        ball.tailEffect = [];
                    }
                    
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
                        score += 30; // Bonus points for special zone
                    } else {
                        // Regular hit - increment hit count
                        block.hitCount++;
                        
                        // Check if block should be destroyed
                        if (block.hitCount >= block.maxHits) {
                            block.hit = true;
                            score += 10;
                            
                            // Create particle effects if object pooling is enabled
                            if (USE_OBJECT_POOLING) {
                                createDestroyParticles(block.x + block.width/2, block.y + block.height/2, block.color);
                            }
                        } else {
                            // Visual feedback for partial hits - darken the color
                            const colorIndex = BLOCK_COLORS.indexOf(block.color);
                            if (colorIndex >= 0 && colorIndex < BLOCK_COLORS.length - 1) {
                                block.color = BLOCK_COLORS[colorIndex + 1];
                            }
                            score += 2; // Partial points for each hit
                        }
                    }
                    
                    document.getElementById('score').textContent = score;
                    
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
                score += 5; // Points for each destroyed block
                
                // Create particle effects if object pooling is enabled
                if (USE_OBJECT_POOLING) {
                    createDestroyParticles(block.x + block.width/2, block.y + block.height/2, block.color);
                }
            }
        }
    }
    document.getElementById('score').textContent = score;
}

// Create particle effects when a block is destroyed
function createDestroyParticles(x, y, color) {
    const particleCount = 15;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = particlePool.get();
        
        // Set particle properties
        particle.x = x;
        particle.y = y;
        particle.radius = 1 + Math.random() * 3;
        particle.color = color;
        particle.alpha = 1;
        particle.life = 0;
        particle.maxLife = 20 + Math.random() * 20;
        
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
            ball.y = canvas.height - 30;
            ball.dx = 0;
            ball.dy = 0;
            ball.moving = false;
            
            // Create new blocks for the next level
            createBlocks();
        });
    }
}

// Draw the ball with dynamic velocity-based tail effect
function drawBall() {
    // Draw tail effect if ball is moving
    if (ball.moving && currentPhase === 3) {
        // Calculate tail properties based on velocity
        const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
        const tailLength = Math.min(20, Math.max(5, speed * 1.5)); // Tail length proportional to speed
        const tailWidth = Math.min(ball.radius, Math.max(2, speed * 0.5)); // Tail width proportional to speed
        
        // Store current position in tail effect array
        ball.tailEffect.unshift({x: ball.x, y: ball.y});
        
        // Limit tail length
        if (ball.tailEffect.length > tailLength) {
            ball.tailEffect.pop();
        }
        
        // Draw tail
        if (ball.tailEffect.length > 1) {
            ctx.beginPath();
            ctx.moveTo(ball.tailEffect[0].x, ball.tailEffect[0].y);
            
            for (let i = 1; i < ball.tailEffect.length; i++) {
                ctx.lineTo(ball.tailEffect[i].x, ball.tailEffect[i].y);
            }
            
            // Create gradient for tail
            const gradient = ctx.createLinearGradient(
                ball.tailEffect[0].x, ball.tailEffect[0].y,
                ball.tailEffect[ball.tailEffect.length - 1].x, ball.tailEffect[ball.tailEffect.length - 1].y
            );
            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(1, 'rgba(255, 170, 0, 0)');
            
            ctx.strokeStyle = gradient;
            ctx.lineWidth = tailWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
        }
    }
    
    // Draw the ball
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = ball.color;
    ctx.fill();
    ctx.closePath();
}

// Draw the aiming line when not moving
function drawAimingLine() {
    // Solution A visuals only in Phase 2 while ball is stationary
    if (currentPhase !== 2 || ball.moving) return;

    // Update sweep animation
    if (aimingSweep) {
        aimAngle += AIM_SWEEP_SPEED * aimSweepDir;
        if (aimAngle >= AIM_MAX) { aimAngle = AIM_MAX; aimSweepDir = -1; }
        if (aimAngle <= AIM_MIN) { aimAngle = AIM_MIN; aimSweepDir = 1; }
    }

    // Update power charge animation (ping-pong)
    if (powerCharging) {
        const speed = 0.02; // tune: bar speed per frame
        powerChargeValue += speed * powerChargeDir;
        if (powerChargeValue >= 1) { powerChargeValue = 1; powerChargeDir = -1; }
        if (powerChargeValue <= 0) { powerChargeValue = 0; powerChargeDir = 1; }
    }

    // Use locked angle if already fixed; otherwise use current sweep angle
    const angle = lockedAngle != null ? lockedAngle : aimAngle;

    // Draw directional line from ball
    const lineLength = 120; // fixed length for clarity
    const endX = ball.x + Math.cos(angle) * lineLength;
    const endY = ball.y - Math.sin(angle) * lineLength;

    // Base line
    ctx.beginPath();
    ctx.moveTo(ball.x, ball.y);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = lockedAngle != null ? '#4CAF50' : '#ff4d4d';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.closePath();

    // Draw arrowhead for direction
    const headLen = 12;
    const hx1 = endX - headLen * Math.cos(angle - Math.PI / 6);
    const hy1 = endY + headLen * Math.sin(angle - Math.PI / 6);
    const hx2 = endX - headLen * Math.cos(angle + Math.PI / 6);
    const hy2 = endY + headLen * Math.sin(angle + Math.PI / 6);
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(hx1, hy1);
    ctx.moveTo(endX, endY);
    ctx.lineTo(hx2, hy2);
    ctx.strokeStyle = ctx.strokeStyle;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.closePath();

    // Draw power indicator adjacent to the ball
    const barWidth = 14;
    const barHeight = 80;
    const barX = ball.x + 20; // right of the ball
    const barY = ball.y - barHeight / 2;

    // Bar background
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Level markers (4 tiers)
    for (let i = 1; i < 4; i++) {
        const y = barY + (barHeight * i) / 4;
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(barX, y);
        ctx.lineTo(barX + barWidth, y);
        ctx.stroke();
        ctx.closePath();
    }

    // Fill according to current charge or locked level
    let fillRatio;
    if (lockedPowerLevel != null) {
        fillRatio = lockedPowerLevel / 4; // 0.25..1
    } else if (powerCharging) {
        fillRatio = powerChargeValue; // 0..1
    } else {
        fillRatio = 0; // before charging starts
    }

    const filledHeight = barHeight * fillRatio;
    // Gradient color from green to red
    const grad = ctx.createLinearGradient(0, barY + barHeight, 0, barY);
    grad.addColorStop(0, '#4CAF50');
    grad.addColorStop(0.5, '#FF9800');
    grad.addColorStop(1, '#f44336');
    ctx.fillStyle = grad;
    ctx.fillRect(barX, barY + (barHeight - filledHeight), barWidth, filledHeight);

    // Hint text
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    if (aimingSweep) {
        ctx.fillText('Tap to lock angle', barX + 22, barY + 14);
    } else if (powerCharging) {
        ctx.fillText('Tap to lock power', barX + 22, barY + 14);
    }
}

// Handle tap/clicks on canvas for Solution A (two-tap lock)
canvas.addEventListener('pointerdown', () => {
    if (isDialogOpen) return;
    if (currentPhase !== 2 || ball.moving) return;

    // First tap: lock angle, start power charging
    if (aimingSweep) {
        lockedAngle = Math.max(AIM_MIN, Math.min(AIM_MAX, aimAngle));
        aimingSweep = false;
        powerCharging = true;
        return;
    }

    // Second tap: lock power, move to execution and launch
    if (powerCharging) {
        // Map 0..1 to 1..4 (four segments)
        const level = Math.min(4, Math.max(1, Math.floor(powerChargeValue * 4) + 1));
        lockedPowerLevel = level;
        powerCharging = false;
        setActivePhase(3);
        // Slight delay for feedback can be added if desired; launch immediately for responsiveness
        launchBall();
        return;
    }
});

// Launch the ball with dynamic velocity-based tail effect
function launchBall() {
    if (ball.moving || ballsLeft <= 0) return;
    
    // Use locked values from Solution A if available, otherwise fallback to sliders
    const angle = (lockedAngle != null ? lockedAngle : angleSlider.value * (Math.PI / 180));

    let powerLevel;
    if (lockedPowerLevel != null) {
        powerLevel = lockedPowerLevel;
    } else {
        powerLevel = parseInt(powerSlider.value);
    }
    
    // Map power level (1-4) to actual power values (3-15)
    const powerValues = [3, 7, 11, 15];
    const power = powerValues[Math.max(0, Math.min(3, powerLevel - 1))];
    
    // Calculate velocity based on angle and power
    ball.dx = power * Math.cos(angle);
    ball.dy = -power * Math.sin(angle); // Negative because canvas Y is inverted

    // Reset aim/power UI state after launch
    aimingSweep = false;
    powerCharging = false;
    lockedAngle = null;
    lockedPowerLevel = null;

    // Create launch particles for visual feedback
    if (USE_OBJECT_POOLING) {
        const particleCount = Math.floor(power / 2) + 10; // More particles for higher power
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

    // Initialize tail effect based on power level
    ball.tailEffect = [];
    
    // Set execution message based on power level
    const powerMessages = [
        "Low power launch...",
        "Medium power launch...",
        "High power launch...",
        "Maximum power launch!"
    ];
    executionMessage.textContent = powerMessages[powerLevel - 1];
    
    ball.moving = true;
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
        ctx.fillText(`Particles: ${stats.activeCount}/${stats.activeCount + stats.poolSize}`, 10, 95);
    }
}

// Initialize the game when the page loads
window.addEventListener('load', init);

// Add window resize event listener for responsive canvas
window.addEventListener('resize', function() {
    resizeCanvas();
});

// Custom dialog functions
const customDialog = document.getElementById('custom-dialog');
const dialogMessage = document.getElementById('dialog-message');
const dialogOkBtn = document.getElementById('dialog-ok-btn');

// Show custom dialog instead of alert
function showDialog(message, callback) {
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

// Add error handling for ObjectPool initialization
window.addEventListener('error', function(event) {
    console.error('Error occurred:', event.error);
    if (event.error && event.error.message && event.error.message.includes('ObjectPool')) {
        alert('Error initializing game components. Please refresh the page or check console for details.');
    }
});

// Function to show high scores
function showHighScores() {
    const highScoresModal = document.getElementById('high-scores-modal');
    const highScoresList = document.getElementById('high-scores-list');
    highScoresModal.classList.remove('hidden');
    
    // Show loading message
    highScoresList.innerHTML = '<div class="loading">Loading scores...</div>';
    
    // Fetch high scores from the server
    const gameApi = new GameAPI();
    gameApi.getHighScores()
        .then(scores => {
            if (scores && scores.length > 0) {
                // Create HTML for high scores
                let html = '<table class="high-scores-table">';
                html += '<tr><th>Rank</th><th>Player</th><th>Score</th></tr>';
                
                scores.forEach((score, index) => {
                    html += `<tr>
                        <td>${index + 1}</td>
                        <td>${score.player_name}</td>
                        <td>${score.score}</td>
                    </tr>`;
                });
                
                html += '</table>';
                highScoresList.innerHTML = html;
            } else {
                highScoresList.innerHTML = '<p>No high scores yet. Be the first!</p>';
            }
        })
        .catch(error => {
            console.error('Error fetching high scores:', error);
            highScoresList.innerHTML = '<p>Error loading high scores. Please try again later.</p>';
        });
    
    // Close button functionality
    const closeButton = highScoresModal.querySelector('.close-button');
    const newCloseButton = closeButton.cloneNode(true);
    closeButton.parentNode.replaceChild(newCloseButton, closeButton);
    
    newCloseButton.addEventListener('click', () => {
        highScoresModal.classList.add('hidden');
        init(); // Restart the game
    });
}

// Add a button to show high scores
function addHighScoresButton() {
    const gameStats = document.querySelector('.game-stats');
    
    // Create high scores button if it doesn't exist
    if (!document.getElementById('high-scores-btn')) {
        const highScoresBtn = document.createElement('div');
        highScoresBtn.id = 'high-scores-btn';
        highScoresBtn.className = 'high-scores-btn';
        highScoresBtn.textContent = 'High Scores';
        highScoresBtn.addEventListener('click', showHighScores);
        gameStats.appendChild(highScoresBtn);
    }
}

// Initialize the game immediately
init();

// Add high scores button after initialization
addHighScoresButton();



// Add responsive canvas scaling variables
let canvasScale = 1;
let scaledWidth = ORIGINAL_WIDTH;
let scaledHeight = ORIGINAL_HEIGHT;
let viewportWidth = window.innerWidth;
let viewportHeight = window.innerHeight;

// Add comprehensive canvas resizing function
function resizeCanvas() {
    // Get current viewport dimensions
    viewportWidth = window.innerWidth;
    viewportHeight = window.innerHeight;
    
    // Get game container element
    const gameContainer = document.querySelector('.game-container');
    const gamePhases = document.querySelector('.game-phases');
    
    // Calculate available space for canvas (accounting for UI elements)
    const containerPadding = 40; // Total padding
    const headerHeight = 80; // Approximate header + stats height
    const controllerWidth = 270; // Game phases controller width + margin
    const controllerHeight = 320; // Game phases controller height + margin
    const ballCounterHeight = 60; // Ball counter height
    
    // Calculate maximum available dimensions
    const maxCanvasWidth = viewportWidth - containerPadding - controllerWidth;
    const maxCanvasHeight = viewportHeight - containerPadding - headerHeight - ballCounterHeight;
    
    // Calculate scale factors while maintaining aspect ratio
    const scaleX = maxCanvasWidth / ORIGINAL_WIDTH;
    const scaleY = maxCanvasHeight / ORIGINAL_HEIGHT;
    
    // Use the smaller scale to ensure everything fits
    canvasScale = Math.min(scaleX, scaleY, 1); // Never scale up beyond original size
    
    // Ensure minimum scale for playability
    const minScale = 0.4;
    canvasScale = Math.max(canvasScale, minScale);
    
    // Calculate final canvas dimensions
    scaledWidth = ORIGINAL_WIDTH * canvasScale;
    scaledHeight = ORIGINAL_HEIGHT * canvasScale;
    
    // Apply dimensions to canvas
    canvas.width = scaledWidth;
    canvas.height = scaledHeight;
    canvas.style.width = scaledWidth + 'px';
    canvas.style.height = scaledHeight + 'px';
    
    // Update game container dimensions to fit content
    const totalWidth = scaledWidth + controllerWidth + containerPadding;
    const totalHeight = scaledHeight + headerHeight + ballCounterHeight + containerPadding;
    
    gameContainer.style.width = Math.min(totalWidth, viewportWidth * 0.95) + 'px';
    gameContainer.style.height = Math.min(totalHeight, viewportHeight * 0.95) + 'px';
    
    // Ensure controllers remain visible and properly positioned
    adjustControllerPositions();
    
    // Update game object positions based on new canvas size
    updateGameObjectPositions();
    
    console.log(`Canvas resized: ${scaledWidth}x${scaledHeight} (scale: ${canvasScale.toFixed(2)})`);
}

// Function to adjust controller positions for optimal visibility
function adjustControllerPositions() {
    const gamePhases = document.querySelector('.game-phases');
    const gameContainer = document.querySelector('.game-container');
    
    if (!gamePhases || !gameContainer) return;
    
    const containerRect = gameContainer.getBoundingClientRect();
    const controllerRect = gamePhases.getBoundingClientRect();
    
    // Ensure controller doesn't exceed container boundaries
    const rightMargin = 20;
    const bottomMargin = 20;
    
    // Adjust position if controller would be clipped
    if (controllerRect.right > containerRect.right - rightMargin) {
        gamePhases.style.right = rightMargin + 'px';
        gamePhases.style.left = 'auto';
    }
    
    if (controllerRect.bottom > containerRect.bottom - bottomMargin) {
        gamePhases.style.bottom = bottomMargin + 'px';
        gamePhases.style.top = 'auto';
    }
    
    // For very small screens, make controller more compact
    if (viewportWidth < 768) {
        gamePhases.style.width = '200px';
        gamePhases.style.fontSize = '0.75em';
        gamePhases.style.maxHeight = '250px';
    } else {
        gamePhases.style.width = '250px';
        gamePhases.style.fontSize = '0.85em';
        gamePhases.style.maxHeight = '300px';
    }
}

// Function to update game object positions after canvas resize
function updateGameObjectPositions() {
    // Update ball position constraints
    ball.minX = 50 * canvasScale;
    ball.maxX = scaledWidth - (50 * canvasScale);
    
    // Reset ball to center if not moving
    if (!ball.moving) {
        ball.x = scaledWidth / 2;
        ball.y = scaledHeight - (30 * canvasScale);
    }
    
    // Update block positions and sizes
    if (blocks.length > 0) {
        createBlocks(); // Recreate blocks with new dimensions
    }
}

// Enhanced initialization function
function init() {
    // Initialize responsive canvas
    resizeCanvas();
    
    // Initialize the game immediately
    init();
    
    // Initialize high scores button after initialization
    addHighScoresButton();
}

// Add a button to show high scores
function addHighScoresButton() {
    const gameStats = document.querySelector('.game-stats');
    
    // Create high scores button if it doesn't exist
    if (!document.getElementById('high-scores-btn')) {
        const highScoresBtn = document.createElement('div');
        highScoresBtn.id = 'high-scores-btn';
        highScoresBtn.className = 'high-scores-btn';
        highScoresBtn.textContent = 'High Scores';
        highScoresBtn.addEventListener('click', showHighScores);
        gameStats.appendChild(highScoresBtn);
    }
}

// Initialize the game immediately
init();

// Add high scores button after initialization
addHighScoresButton();



// Custom dialog functions
const customDialog = document.getElementById('custom-dialog');
const dialogMessage = document.getElementById('dialog-message');
const dialogOkBtn = document.getElementById('dialog-ok-btn');

// Show custom dialog instead of alert
function showDialog(message, callback) {
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

// Add error handling for ObjectPool initialization
window.addEventListener('error', function(event) {
    console.error('Error occurred:', event.error);
    if (event.error && event.error.message && event.error.message.includes('ObjectPool')) {
        alert('Error initializing game components. Please refresh the page or check console for details.');
    }
});

// Function to show high scores
function showHighScores() {
    const highScoresModal = document.getElementById('high-scores-modal');
    const highScoresList = document.getElementById('high-scores-list');
    highScoresModal.classList.remove('hidden');
    
    // Show loading message
    highScoresList.innerHTML = '<div class="loading">Loading scores...</div>';
    
    // Fetch high scores from the server
    const gameApi = new GameAPI();
    gameApi.getHighScores()
        .then(scores => {
            if (scores && scores.length > 0) {
                // Create HTML for high scores
                let html = '<table class="high-scores-table">';
                html += '<tr><th>Rank</th><th>Player</th><th>Score</th></tr>';
                
                scores.forEach((score, index) => {
                    html += `<tr>
                        <td>${index + 1}</td>
                        <td>${score.player_name}</td>
                        <td>${score.score}</td>
                    </tr>`;
                });
                
                html += '</table>';
                highScoresList.innerHTML = html;
            } else {
                highScoresList.innerHTML = '<p>No high scores yet. Be the first!</p>';
            }
        })
        .catch(error => {
            console.error('Error fetching high scores:', error);
            highScoresList.innerHTML = '<p>Error loading high scores. Please try again later.</p>';
        });
    
    // Close button functionality
    const closeButton = highScoresModal.querySelector('.close-button');
    const newCloseButton = closeButton.cloneNode(true);
    closeButton.parentNode.replaceChild(newCloseButton, closeButton);
    
    newCloseButton.addEventListener('click', () => {
        highScoresModal.classList.add('hidden');
        init(); // Restart the game
    });
}

// Add a button to show high scores
function addHighScoresButton() {
    const gameStats = document.querySelector('.game-stats');
    
    // Create high scores button if it doesn't exist
    if (!document.getElementById('high-scores-btn')) {
        const highScoresBtn = document.createElement('div');
        highScoresBtn.id = 'high-scores-btn';
        highScoresBtn.className = 'high-scores-btn';
        highScoresBtn.textContent = 'High Scores';
        highScoresBtn.addEventListener('click', showHighScores);
        gameStats.appendChild(highScoresBtn);
    }
}

// Initialize the game immediately
init();

// Add high scores button after initialization
addHighScoresButton();



// Custom dialog functions
const customDialog = document.getElementById('custom-dialog');
const dialogMessage = document.getElementById('dialog-message');
const dialogOkBtn = document.getElementById('dialog-ok-btn');

// Show custom dialog instead of alert
function showDialog(message, callback) {
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

// Add error handling for ObjectPool initialization
window.addEventListener('error', function(event) {
    console.error('Error occurred:', event.error);
    if (event.error && event.error.message && event.error.message.includes('ObjectPool')) {
        alert('Error initializing game components. Please refresh the page or check console for details.');
    }
});

// Function to show high scores
function showHighScores() {
    const highScoresModal = document.getElementById('high-scores-modal');
    const highScoresList = document.getElementById('high-scores-list');
    highScoresModal.classList.remove('hidden');
    
    // Show loading message
    highScoresList.innerHTML = '<div class="loading">Loading scores...</div>';
    
    // Fetch high scores from the server
    const gameApi = new GameAPI();
    gameApi.getHighScores()
        .then(scores => {
            if (scores && scores.length > 0) {
                // Create HTML for high scores
                let html = '<table class="high-scores-table">';
                html += '<tr><th>Rank</th><th>Player</th><th>Score</th></tr>';
                
                scores.forEach((score, index) => {
                    html += `<tr>
                        <td>${index + 1}</td>
                        <td>${score.player_name}</td>
                        <td>${score.score}</td>
                    </tr>`;
                });
                
                html += '</table>';
                highScoresList.innerHTML = html;
            } else {
                highScoresList.innerHTML = '<p>No high scores yet. Be the first!</p>';
            }
        })
        .catch(error => {
            console.error('Error fetching high scores:', error);
            highScoresList.innerHTML = '<p>Error loading high scores. Please try again later.</p>';
        });
    
    // Close button functionality
    const closeButton = highScoresModal.querySelector('.close-button');
    const newCloseButton = closeButton.cloneNode(true);
    closeButton.parentNode.replaceChild(newCloseButton, closeButton);
    
    newCloseButton.addEventListener('click', () => {
        highScoresModal.classList.add('hidden');
        init(); // Restart the game
    });
}

// Add a button to show high scores
function addHighScoresButton() {
    const gameStats = document.querySelector('.game-stats');
    
    // Create high scores button if it doesn't exist
    if (!document.getElementById('high-scores-btn')) {
        const highScoresBtn = document.createElement('div');
        highScoresBtn.id = 'high-scores-btn';
        highScoresBtn.className = 'high-scores-btn';
        highScoresBtn.textContent = 'High Scores';
        highScoresBtn.addEventListener('click', showHighScores);
        gameStats.appendChild(highScoresBtn);
    }
}

// Initialize the game immediately
init();

// Add high scores button after initialization
addHighScoresButton();



// Custom dialog functions
const customDialog = document.getElementById('custom-dialog');
const dialogMessage = document.getElementById('dialog-message');
const dialogOkBtn = document.getElementById('dialog-ok-btn');

// Show custom dialog instead of alert
function showDialog(message, callback) {
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

// Add error handling for ObjectPool initialization
window.addEventListener('error', function(event) {
    console.error('Error occurred:', event.error);
    if (event.error && event.error.message && event.error.message.includes('ObjectPool')) {
        alert('Error initializing game components. Please refresh the page or check console for details.');
    }
});

// Function to show high scores
function showHighScores() {
    const highScoresModal = document.getElementById('high-scores-modal');
    const highScoresList = document.getElementById('high-scores-list');
    highScoresModal.classList.remove('hidden');
    
    // Show loading message
    highScoresList.innerHTML = '<div class="loading">Loading scores...</div>';
    
    // Fetch high scores from the server
    const gameApi = new GameAPI();
    gameApi.getHighScores()
        .then(scores => {
            if (scores && scores.length > 0) {
                // Create HTML for high scores
                let html = '<table class="high-scores-table">';
                html += '<tr><th>Rank</th><th>Player</th><th>Score</th></tr>';
                
                scores.forEach((score, index) => {
                    html += `<tr>
                        <td>${index + 1}</td>
                        <td>${score.player_name}</td>
                        <td>${score.score}</td>
                    </tr>`;
                });
                
                html += '</table>';
                highScoresList.innerHTML = html;
            } else {
                highScoresList.innerHTML = '<p>No high scores yet. Be the first!</p>';
            }
        })
        .catch(error => {
            console.error('Error fetching high scores:', error);
            highScoresList.innerHTML = '<p>Error loading high scores. Please try again later.</p>';
        });
    
    // Close button functionality
    const closeButton = highScoresModal.querySelector('.close-button');
    const newCloseButton = closeButton.cloneNode(true);
    closeButton.parentNode.replaceChild(newCloseButton, closeButton);
    
    newCloseButton.addEventListener('click', () => {
        highScoresModal.classList.add('hidden');
        init(); // Restart the game
    });
}

// Add a button to show high scores
function addHighScoresButton() {
    const gameStats = document.querySelector('.game-stats');
    
    // Create high scores button if it doesn't exist
    if (!document.getElementById('high-scores-btn')) {
        const highScoresBtn = document.createElement('div');
        highScoresBtn.id = 'high-scores-btn';
        highScoresBtn.className = 'high-scores-btn';
        highScoresBtn.textContent = 'High Scores';
        highScoresBtn.addEventListener('click', showHighScores);
        gameStats.appendChild(highScoresBtn);
    }
}

// Initialize the game immediately
init();

// Add high scores button after initialization
addHighScoresButton();



// Custom dialog functions
const customDialog = document.getElementById('custom-dialog');
const dialogMessage = document.getElementById('dialog-message');
const dialogOkBtn = document.getElementById('dialog-ok-btn');

// Show custom dialog instead of alert
function showDialog(message, callback) {
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

// Add error handling for ObjectPool initialization
window.addEventListener('error', function(event) {
    console.error('Error occurred:', event.error);
    if (event.error && event.error.message && event.error.message.includes('ObjectPool')) {
        alert('Error initializing game components. Please refresh the page or check console for details.');
    }
});

// Function to show high scores
function showHighScores() {
    const highScoresModal = document.getElementById('high-scores-modal');
    const highScoresList = document.getElementById('high-scores-list');
    highScoresModal.classList.remove('hidden');
    
    // Show loading message
    highScoresList.innerHTML = '<div class="loading">Loading scores...</div>';
    
    // Fetch high scores from the server
    const gameApi = new GameAPI();
    gameApi.getHighScores()
        .then(scores => {
            if (scores && scores.length > 0) {
                // Create HTML for high scores
                let html = '<table class="high-scores-table">';
                html += '<tr><th>Rank</th><th>Player</th><th>Score</th></tr>';
                
                scores.forEach((score, index) => {
                    html += `<tr>
                        <td>${index + 1}</td>
                        <td>${score.player_name}</td>
                        <td>${score.score}</td>
                    </tr>`;
                });
                
                html += '</table>';
                highScoresList.innerHTML = html;
            } else {
                highScoresList.innerHTML = '<p>No high scores yet. Be the first!</p>';
            }
        })
        .catch(error => {
            console.error('Error fetching high scores:', error);
            highScoresList.innerHTML = '<p>Error loading high scores. Please try again later.</p>';
        });
    
    // Close button functionality
    const closeButton = highScoresModal.querySelector('.close-button');
    const newCloseButton = closeButton.cloneNode(true);
    closeButton.parentNode.replaceChild(newCloseButton, closeButton);
    
    newCloseButton.addEventListener('click', () => {
        highScoresModal.classList.add('hidden');
        init(); // Restart the game
    });
}

// Add a button to show high scores
function addHighScoresButton() {
    const gameStats = document.querySelector('.game-stats');
    
    // Create high scores button if it doesn't exist
    if (!document.getElementById('high-scores-btn')) {
        const highScoresBtn = document.createElement('div');
        highScoresBtn.id = 'high-scores-btn';
        highScoresBtn.className = 'high-scores-btn';
        highScoresBtn.textContent = 'High Scores';
        highScoresBtn.addEventListener('click', showHighScores);
        gameStats.appendChild(highScoresBtn);
    }
}

// Initialize the game immediately
init();

// Add high scores button after initialization
addHighScoresButton();



// Custom dialog functions
const customDialog = document.getElementById('custom-dialog');
const dialogMessage = document.getElementById('dialog-message');
const dialogOkBtn = document.getElementById('dialog-ok-btn');

// Show custom dialog instead of alert
function showDialog(message, callback) {
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

// Add error handling for ObjectPool initialization
window.addEventListener('error', function(event) {
    console.error('Error occurred:', event.error);
    if (event.error && event.error.message && event.error.message.includes('ObjectPool')) {
        alert('Error initializing game components. Please refresh the page or check console for details.');
    }
});

// Function to show high scores
function showHighScores() {
    const highScoresModal = document.getElementById('high-scores-modal');
    const highScoresList = document.getElementById('high-scores-list');
    highScoresModal.classList.remove('hidden');
    
    // Show loading message
    highScoresList.innerHTML = '<div class="loading">Loading scores...</div>';
    
    // Fetch high scores from the server
    const gameApi = new GameAPI();
    gameApi.getHighScores()
        .then(scores => {
            if (scores && scores.length > 0) {
                // Create HTML for high scores
                let html = '<table class="high-scores-table">';
                html += '<tr><th>Rank</th><th>Player</th><th>Score</th></tr>';
                
                scores.forEach((score, index) => {
                    html += `<tr>
                        <td>${index + 1}</td>
                        <td>${score.player_name}</td>
                        <td>${score.score}</td>
                    </tr>`;
                });
                
                html += '</table>';
                highScoresList.innerHTML = html;
            } else {
                highScoresList.innerHTML = '<p>No high scores yet. Be the first!</p>';
            }
        })
        .catch(error => {
            console.error('Error fetching high scores:', error);
            highScoresList.innerHTML = '<p>Error loading high scores. Please try again later.</p>';
        });
    
    // Close button functionality
    const closeButton = highScoresModal.querySelector('.close-button');
    const newCloseButton = closeButton.cloneNode(true);
    closeButton.parentNode.replaceChild(newCloseButton, closeButton);
    
    newCloseButton.addEventListener('click', () => {
        highScoresModal.classList.add('hidden');
        init(); // Restart the game
    });
}

// Add a button to show high scores
function addHighScoresButton() {
    const gameStats = document.querySelector('.game-stats');
    
    // Create high scores button if it doesn't exist
    if (!document.getElementById('high-scores-btn')) {
        const highScoresBtn = document.createElement('div');
        highScoresBtn.id = 'high-scores-btn';
        highScoresBtn.className = 'high-scores-btn';
        highScoresBtn.textContent = 'High Scores';
        highScoresBtn.addEventListener('click', showHighScores);
        gameStats.appendChild(highScoresBtn);
    }
}

// Initialize the game immediately
init();

// Add high scores button after initialization
addHighScoresButton();



// Custom dialog functions
const customDialog = document.getElementById('custom-dialog');
const dialogMessage = document.getElementById('dialog-message');
const dialogOkBtn = document.getElementById('dialog-ok-btn');

// Show custom dialog instead of alert
function showDialog(message, callback) {
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

// Add error handling for ObjectPool initialization
window.addEventListener('error', function(event) {
    console.error('Error occurred:', event.error);
    if (event.error && event.error.message && event.error.message.includes('ObjectPool')) {
        alert('Error initializing game components. Please refresh the page or check console for details.');
    }
});

// Function to show high scores
function showHighScores() {
    const highScoresModal = document.getElementById('high-scores-modal');
    const highScoresList = document.getElementById('high-scores-list');
    highScoresModal.classList.remove('hidden');
    
    // Show loading message
    highScoresList.innerHTML = '<div class="loading">Loading scores...</div>';
    
    // Fetch high scores from the server
    const gameApi = new GameAPI();
    gameApi.getHighScores()
        .then(scores => {
            if (scores && scores.length > 0) {
                // Create HTML for high scores
                let html = '<table class="high-scores-table">';
                html += '<tr><th>Rank</th><th>Player</th><th>Score</th></tr>';
                
                scores.forEach((score, index) => {
                    html += `<tr>
                        <td>${index + 1}</td>
                        <td>${score.player_name}</td>
                        <td>${score.score}</td>
                    </tr>`;
                });
                
                html += '</table>';
                highScoresList.innerHTML = html;
            } else {
                highScoresList.innerHTML = '<p>No high scores yet. Be the first!</p>';
            }
        })
        .catch(error => {
            console.error('Error fetching high scores:', error);
            highScoresList.innerHTML = '<p>Error loading high scores. Please try again later.</p>';
        });
    
    // Close button functionality
    const closeButton = highScoresModal.querySelector('.close-button');
    const newCloseButton = closeButton.cloneNode(true);
    closeButton.parentNode.replaceChild(newCloseButton, closeButton);
    
    newCloseButton.addEventListener('click', () => {
        highScoresModal.classList.add('hidden');
        init(); // Restart the game
    });
}

// Add a button to show high scores
function addHighScoresButton() {
    const gameStats = document.querySelector('.game-stats');
    
    // Create high scores button if it doesn't exist
    if (!document.getElementById('high-scores-btn')) {
        const highScoresBtn = document.createElement('div');
        highScoresBtn.id = 'high-scores-btn';
        highScoresBtn.className = 'high-scores-btn';
        highScoresBtn.textContent = 'High Scores';
        highScoresBtn.addEventListener('click', showHighScores);
        gameStats.appendChild(highScoresBtn);
    }
}

// Initialize the game immediately
init();

// Add high scores button after initialization
addHighScoresButton();



// Custom dialog functions
const customDialog = document.getElementById('custom-dialog');
const dialogMessage = document.getElementById('dialog-message');
const dialogOkBtn = document.getElementById('dialog-ok-btn');

// Show custom dialog instead of alert
function showDialog(message, callback) {
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

// Add error handling for ObjectPool initialization
window.addEventListener('error', function(event) {
    console.error('Error occurred:', event.error);
    if (event.error && event.error.message && event.error.message.includes('ObjectPool')) {
        alert('Error initializing game components. Please refresh the page or check console for details.');
    }
});

// Function to show high scores
function showHighScores() {
    const highScoresModal = document.getElementById('high-scores-modal');
    const highScoresList = document.getElementById('high-scores-list');
    highScoresModal.classList.remove('hidden');
    
    // Show loading message
    highScoresList.innerHTML = '<div class="loading">Loading scores...</div>';
    
    // Fetch high scores from the server
    const gameApi = new GameAPI();
    gameApi.getHighScores()
        .then(scores => {
            if (scores && scores.length > 0) {
                // Create HTML for high scores
                let html = '<table class="high-scores-table">';
                html += '<tr><th>Rank</th><th>Player</th><th>Score</th></tr>';
                
                scores.forEach((score, index) => {
                    html += `<tr>
                        <td>${index + 1}</td>
                        <td>${score.player_name}</td>
                        <td>${score.score}</td>
                    </tr>`;
                });
                
                html += '</table>';
                highScoresList.innerHTML = html;
            } else {
                highScoresList.innerHTML = '<p>No high scores yet. Be the first!</p>';
            }
        })
        .catch(error => {
            console.error('Error fetching high scores:', error);
            highScoresList.innerHTML = '<p>Error loading high scores. Please try again later.</p>';
        });
    
    // Close button functionality
    const closeButton = highScoresModal.querySelector('.close-button');
    const newCloseButton = closeButton.cloneNode(true);
    closeButton.parentNode.replaceChild(newCloseButton, closeButton);
    
    newCloseButton.addEventListener('click', () => {
        highScoresModal.classList.add('hidden');
        init(); // Restart the game
    });
}

// Add a button to show high scores
function addHighScoresButton() {
    const gameStats = document.querySelector('.game-stats');
    
    // Create high scores button if it doesn't exist
    if (!document.getElementById('high-scores-btn')) {
        const highScoresBtn = document.createElement('div');
        highScoresBtn.id = 'high-scores-btn';
        highScoresBtn.className = 'high-scores-btn';
        highScoresBtn.textContent = 'High Scores';
        highScoresBtn.addEventListener('click', showHighScores);
        gameStats.appendChild(highScoresBtn);
    }
}

// Initialize the game immediately
init();

// Add high scores button after initialization
addHighScoresButton();



// Custom dialog functions
const customDialog = document.getElementById('custom-dialog');
const dialogMessage = document.getElementById('dialog-message');
const dialogOkBtn = document.getElementById('dialog-ok-btn');

// Show custom dialog instead of alert
function showDialog(message, callback) {
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

// Add error handling for ObjectPool initialization
window.addEventListener('error', function(event) {
    console.error('Error occurred:', event.error);
    if (event.error && event.error.message && event.error.message.includes('ObjectPool')) {
        alert('Error initializing game components. Please refresh the page or check console for details.');
    }
});

// Function to show high scores
function showHighScores() {
    const highScoresModal = document.getElementById('high-scores-modal');
    const highScoresList = document.getElementById('high-scores-list');
    highScoresModal.classList.remove('hidden');
    
    // Show loading message
    highScoresList.innerHTML = '<div class="loading">Loading scores...</div>';
    
    // Fetch high scores from the server
    const gameApi = new GameAPI();
    gameApi.getHighScores()
        .then(scores => {
            if (scores && scores.length > 0) {
                // Create HTML for high scores
                let html = '<table class="high-scores-table">';
                html += '<tr><th>Rank</th><th>Player</th><th>Score</th></tr>';
                
                scores.forEach((score, index) => {
                    html += `<tr>
                        <td>${index + 1}</td>
                        <td>${score.player_name}</td>
                        <td>${score.score}</td>
                    </tr>`;
                });
                
                html += '</table>';
                highScoresList.innerHTML = html;
            } else {
                highScoresList.innerHTML = '<p>No high scores yet. Be the first!</p>';
            }
        })
        .catch(error => {
            console.error('Error fetching high scores:', error);
            highScoresList.innerHTML = '<p>Error loading high scores. Please try again later.</p>';
        });
    
    // Close button functionality
    const closeButton = highScoresModal.querySelector('.close-button');
    const newCloseButton = closeButton.cloneNode(true);
    closeButton.parentNode.replaceChild(newCloseButton, closeButton);
    
    newCloseButton.addEventListener('click', () => {
        highScoresModal.classList.add('hidden');
        init(); // Restart the game
    });
}

// Add a button to show high scores
function addHighScoresButton() {
    const gameStats = document.querySelector('.game-stats');
    
    // Create high scores button if it doesn't exist
    if (!document.getElementById('high-scores-btn')) {
        const highScoresBtn = document.createElement('div');
        highScoresBtn.id = 'high-scores-btn';
        highScoresBtn.className = 'high-scores-btn';
        highScoresBtn.textContent = 'High Scores';
        highScoresBtn.addEventListener('click', showHighScores);
        gameStats.appendChild(highScoresBtn);
    }
}

// Initialize the game immediately
init();

// Add high scores button after initialization
addHighScoresButton();



// Custom dialog functions
const customDialog = document.getElementById('custom-dialog');
const dialogMessage = document.getElementById('dialog-message');
const dialogOkBtn = document.getElementById('dialog-ok-btn');

// Show custom dialog instead of alert
function showDialog(message, callback) {
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

// Add error handling for ObjectPool initialization
window.addEventListener('error', function(event) {
    console.error('Error occurred:', event.error);
    if (event.error && event.error.message && event.error.message.includes('ObjectPool')) {
        alert('Error initializing game components. Please refresh the page or check console for details.');
    }
});

// Function to show high scores
function showHighScores() {
    const highScoresModal = document.getElementById('high-scores-modal');
    const highScoresList = document.getElementById('high-scores-list');
    highScoresModal.classList.remove('hidden');
    
    // Show loading message
    highScoresList.innerHTML = '<div class="loading">Loading scores...</div>';
    
    // Fetch high scores from the server
    const gameApi = new GameAPI();
    gameApi.getHighScores()
        .then(scores => {
            if (scores && scores.length > 0) {
                // Create HTML for high scores
                let html = '<table class="high-scores-table">';
                html += '<tr><th>Rank</th><th>Player</th><th>Score</th></tr>';
                
                scores.forEach((score, index) => {
                    html += `<tr>
                        <td>${index + 1}</td>
                        <td>${score.player_name}</td>
                        <td>${score.score}</td>
                    </tr>`;
                });
                
                html += '</table>';
                highScoresList.innerHTML = html;
            } else {
                highScoresList.innerHTML = '<p>No high scores yet. Be the first!</p>';
            }
        })
        .catch(error => {
            console.error('Error fetching high scores:', error);
            highScoresList.innerHTML = '<p>Error loading high scores. Please try again later.</p>';
        });
    
    // Close button functionality
    const closeButton = highScoresModal.querySelector('.close-button');
    const newCloseButton = closeButton.cloneNode(true);
    closeButton.parentNode.replaceChild(newCloseButton, closeButton);
    
    newCloseButton.addEventListener('click', () => {
        highScoresModal.classList.add('hidden');
        init(); // Restart the game