import {
    localize
} from './localization.js';
import {
    SPRITE_HEIGHT,
    SPRITE_WIDTH,
    getCountdownAreaFrames,
    getBoomingAreaFrames,   
    DIE_FALLING_THRESHOLD,
    ACTIVATE_FLOAT_THRESHOLD,
    toolTypes,
    actionStatesMap,
    getLevelToolsRemaining,
    setLevelToolsRemaining,
    getCurrentTool,
    RELEASE_RATE_BALANCER,
    FRAMES_PER_ROW,
    spriteSheet,
    spriteFrames,
    setNumberOfLemmingsForCurrentLevel,
    getNumberOfLemmingsForCurrentLevel,
    setLemmingsRescued,
    getLemmingNames,
    getDebugMode,
    AIR_ENEMY_COLOR,
    GROUND_ENEMY_COLOR,
    SPAWN_COLOR,
    getCollisionCanvas,
    getCollisionCtx,
    getCollisionPixels,
    setCollisionPixels,
    getCameraX,
    getLemmingsReleased,
    setLemmingsReleased,
    getStaticEnemies,
    setStaticEnemies,
    resetLemmingsObjects,
    getLemmingsObjects,
    setLemmingsObjects,
    pushNewLemmingToLemmingsObjects,
    getNewLemmingObject,
    getReleaseRate,
    setReleaseRate,
    getLemmingLevelData,
    FRAME_DURATION,
    GRAVITY_SPEED,
    setLemmingsStartPosition,
    LEVEL_WIDTH,
    setGameStateVariable,
    getBeginGameStatus,
    getMaxAttemptsToDrawEnemies,
    getLemmingObject,
    getMenuState,
    getGameVisiblePaused,
    getGameVisibleActive,
    getElements,
    getLanguage,
    getGameInProgress,
    gameState,
    PIXEL_THRESHOLD,
    TURN_COOLDOWN,
    setCollisionImage,
    getCollisionImage,
    changeCollisionImageProperty,
    EXIT_COLOR,
    getLemmingsRescued
} from './constantsAndGlobalVars.js';
import {
    latestMousePos,
    trackCursor,
    visualCanvas,
    createPaintingCanvas,
    createCollisionCanvas,
    updateCamera,
    updateToolButtons
} from './ui.js';
import {
    capitalizeString
} from './utilities.js';

const detectedObjects = {
    enemiesAir: [],
    enemiesGround: [],
    lemmingSpawns: [],
    lemmingExits: []
};

//--------------------------------------------------------------------------------------------------------
export async function startGame() {
    const canvas = getElements().canvas;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const container = getElements().canvasContainer;

    await updateCanvasSize(container, canvas, ctx);

    window.addEventListener('resize', async () => {
      await updateCanvasSize(container, canvas, ctx);
    });

    const levelData = await loadLevel('level1');
    setReleaseRate(levelData.releaseRate);
    setNumberOfLemmingsForCurrentLevel(levelData.lemmings);
    setToolsRemainingFromLevelData(levelData.startingTools);
    await createPaintingCanvas();
    const detectedObjects = await loadCollisionCanvas('level1');

    console.log('Detected air enemy objects:', detectedObjects.enemiesAir);
    console.log('Detected ground enemy objects:', detectedObjects.enemiesGround);
    console.log('Detected lemming spawn points:', detectedObjects.lemmingSpawns);

    await createCollisionCanvas();
    clearSpawnMarkersFromCollisionCanvas(detectedObjects.lemmingSpawns);
    clearAirEnemiesFromCollisionCanvas(detectedObjects.enemiesAir);
    clearExitMarkersFromCollisionCanvas(detectedObjects.lemmingExits);
    replaceGroundEnemyColorsFromCollisionCanvas(detectedObjects.enemiesGround);
    updateCollisionPixels();

    const spawn = detectedObjects.lemmingSpawns[0];
    const lemmingStartPosition = {
        x: Math.round((spawn.minX + spawn.maxX) / 2),
        y: Math.round((spawn.minY + spawn.maxY) / 2)
    };
    setLemmingsStartPosition(lemmingStartPosition);

    initializeLemmings(levelData.lemmings, lemmingStartPosition);
    nameLemmings(getLemmingsObjects());

    gameLoop();
}

async function updateCanvasSize(container, canvas, ctx) {
    const canvasWidth = container.clientWidth * 0.8;
    const canvasHeight = container.clientHeight * 0.8;

    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    //ctx.scale(1, 1);
}

let lastFrameTime = 0;
export function gameLoop(time = 0) {
    const canvas = getElements().canvas;
    const ctx = canvas.getContext('2d', {willReadFrequently: true});
    trackCursor(latestMousePos);
    if (time - lastFrameTime < FRAME_DURATION) {
        requestAnimationFrame(gameLoop);
        return;
    }

    const deltaTime = time - lastFrameTime;
    lastFrameTime = time;

    if (gameState === getGameVisibleActive() || gameState === getGameVisiblePaused()) {
        checkCollisionPixelsChanged();
        ctx.clearRect(0, 0, getElements().canvas.width, getElements().canvas.height);

        updateCamera();

        if (visualCanvas) {
            const cameraX = getCameraX();
            ctx.drawImage(
                visualCanvas,
                cameraX, 0,
                getElements().canvas.width,
                visualCanvas.height,
                0, 0,
                getElements().canvas.width,
                getElements().canvas.height
            );
        }

        if (getCollisionCanvas()) {
            const cameraX = getCameraX();
            ctx.drawImage(
                getCollisionCanvas(),
                cameraX, 0,
                getElements().canvas.width,
                getCollisionCanvas().height,
                0, 0,
                getElements().canvas.width,
                getCollisionCanvas().height
            );
        }

        if (getDebugMode()) {
            drawDetectedObjects(ctx, detectedObjects);
        }

        if (gameState === getGameVisibleActive()) {
            releaseLemmings(deltaTime);

            for (const lemming of getLemmingsObjects()) {
                if (lemming.active) {
                    moveLemmingInstance(lemming);
                    applyGravity(lemming);
                }
            }

            checkAllCollisions();
        }

        for (const lemming of getLemmingsObjects()) {
            if (lemming.active) {
                const frameCount = getFrameCountForState(lemming.state);
                if (gameState === getGameVisibleActive()) {
                    if (lemming.state === 'floating') {
                        updateFloatingAnimation(lemming, deltaTime);
                    } else if (lemming.state === 'floatingLanding') {
                        updateFloatingLandingAnimation(lemming, deltaTime);
                    } else if (lemming.state === 'toppingOut') {
                        const frameCount = getFrameCountForState(lemming.state);
                        updateToppingOutAnimation(lemming, deltaTime, frameCount);
                    } else if (lemming.state === 'dyingFalling') {
                        const frameCount = getFrameCountForState(lemming.state);
                        updateDyingFallingAnimation(lemming, deltaTime, frameCount);
                    } else if (lemming.state === 'countdown' || lemming.countdownActive) {
                        updateCountDownAnimation(lemming, deltaTime);
                        if (lemming.dx > 0) {
                          const frameCount = getFrameCountForState(lemming.state);
                          updateLemmingAnimation(lemming, deltaTime, frameCount);
                        }
                    } else if (lemming.state === 'exploding') {
                        const frameCount = getFrameCountForState(lemming.state);
                        updateExplodingAnimation(lemming, deltaTime, frameCount);
                    } else if (lemming.state === 'booming') {
                        updateBoomingAnimation(lemming, deltaTime);
                    } else if (lemming.state === 'disintegrating') {
                        const frameCount = getFrameCountForState(lemming.state);
                        updateDisintegratingAnimation(lemming, deltaTime, frameCount);
                    } else {
                        const frameCount = getFrameCountForState(lemming.state);
                        updateLemmingAnimation(lemming, deltaTime, frameCount);
                    }
                }
                const row = getSpriteRowForLemming(lemming.state, lemming.facing, lemming.dx, lemming.countdownActive);
                const col = lemming.frameIndex;
                const spriteIndex = row * FRAMES_PER_ROW + col;
                ctx.imageSmoothingEnabled = false;
                drawInstances(ctx, lemming.x, lemming.y, lemming.width, lemming.height, 'lemming', 'green', spriteIndex, lemming);
            }
        }

        const staticEnemies = getStaticEnemies();
        ctx.imageSmoothingEnabled = false;
        drawInstances(ctx, staticEnemies.x, staticEnemies.y, staticEnemies.width, staticEnemies.height, 'enemy', 'red', null);
        const allInactive = getNumberOfLemmingsForCurrentLevel() === getLemmingsReleased() && getLemmingsObjects().every(l => !l.active);
        if (allInactive) {
            console.log('All lemmings are now inactive - can end level');
        }

        updateToolButtons();

        requestAnimationFrame(gameLoop);
    }
} 

function updateDisintegratingAnimation(lemming, deltaTime) {
    if (lemming.frameTime === undefined) {
        lemming.frameTime = 0;
        lemming.frameIndex = 0;
    }

    const ANIMATION_SPEED = 40;
    lemming.frameTime += deltaTime;

    if (lemming.frameTime >= ANIMATION_SPEED) {
        lemming.frameTime = 0;
        lemming.frameIndex++;

        if (lemming.frameIndex === 15) {
            lemming.active = false;
            lemming.frameIndex = 0;
        }
    }
}

function updateBoomingAnimation(lemming, deltaTime) {
    if (lemming.frameTime === undefined) {
        lemming.frameTime = 0;
        lemming.frameIndex = 0;
    }

    const ANIMATION_SPEED = 40;
    lemming.frameTime += deltaTime;

    if (lemming.frameTime >= ANIMATION_SPEED) {
        lemming.frameTime = 0;
        lemming.frameIndex++;

        if (lemming.frameIndex >= getBoomingAreaFrames().length) {
            lemming.frameIndex = 0;
            lemming.state = 'disintegrating';
        }
    }
}

function updateCountDownAnimation(lemming, deltaTime) {
    if (lemming.countdownFrameTime === undefined) {
        lemming.countdownFrameTime = 0;
        lemming.countdownFrameIndex = 0;
    }

    const ANIMATION_SPEED = 1000;
    lemming.countdownFrameTime += deltaTime;

    if (lemming.countdownFrameTime >= ANIMATION_SPEED) {
        lemming.countdownFrameTime = 0;
        lemming.countdownFrameIndex++;

        if (lemming.countdownFrameIndex >= getCountdownAreaFrames().length) {
            lemming.countdownFrameIndex = 0;
            lemming.countdownActive = false;
            lemming.state = 'exploding';
        }
    }
}

function updateExplodingAnimation(lemming, deltaTime) {
    if (lemming.frameTime === undefined) {
        lemming.frameTime = 0;
        lemming.frameIndex = 0;
    }

    const ANIMATION_SPEED = 100;
    lemming.frameTime += deltaTime;

    if (lemming.frameTime >= ANIMATION_SPEED) {
        lemming.frameTime = 0;
        lemming.frameIndex++;

        if (lemming.frameIndex === 15) {
            lemming.state = 'booming';
            lemming.frameIndex = 0;
        }
    }
}

function updateDyingFallingAnimation(lemming, deltaTime) {
    if (lemming.frameTime === undefined) {
        lemming.frameTime = 0;
        lemming.frameIndex = 0;
    }

    const ANIMATION_SPEED = 80;
    lemming.frameTime += deltaTime;

    if (lemming.frameTime >= ANIMATION_SPEED) {
        lemming.frameTime = 0;
        lemming.frameIndex++;

        if (lemming.frameIndex === 15) {
            lemming.active = false;
            lemming.frameIndex = 0;
        }
    }
}

function updateToppingOutAnimation(lemming, deltaTime) {
    if (lemming.frameTime === undefined) {
        lemming.frameTime = 0;
        lemming.frameIndex = 0;
    }

    const ANIMATION_SPEED = 80;
    lemming.frameTime += deltaTime;

    if (lemming.frameTime >= ANIMATION_SPEED) {
        lemming.frameTime = 0;
        lemming.frameIndex++;

        if (lemming.frameIndex > 7) {
            lemming.state = 'walking';
            lemming.frameIndex = 0;
        }
    }
}

function updateFloatingLandingAnimation(lemming, deltaTime) {
    if (lemming.frameTime === undefined) {
        lemming.frameTime = 0;
        lemming.frameIndex = 3;
    }

    const ANIMATION_SPEED = 120;
    lemming.frameTime += deltaTime;

    if (lemming.frameTime >= ANIMATION_SPEED) {
        lemming.frameTime = 0;
        lemming.frameIndex--;

        if (lemming.frameIndex < 0) {
            lemming.state = 'walking';
            lemming.frameIndex = 0;
        }
    }
}

function updateFloatingAnimation(lemming, deltaTime) {
    let animationSpeed;

    if (lemming.frameTime === undefined) {
        lemming.frameTime = 0;
        lemming.frameIndex = 0;
        lemming.floatingFirstCycleDone = false;
        animationSpeed = 80;
    } else {
        animationSpeed = 120;
    }

    
    lemming.frameTime += deltaTime;

    if (lemming.frameTime >= animationSpeed) {
        lemming.frameTime = 0;

        if (!lemming.floatingFirstCycleDone) {
            lemming.frameIndex++;
            if (lemming.frameIndex > 7) {
                lemming.frameIndex = 4;
                lemming.floatingFirstCycleDone = true;
            }
        } else {
            lemming.frameIndex++;
            if (lemming.frameIndex > 7) {
                lemming.frameIndex = 4;
            }
        }
    }
}

function setToolsRemainingFromLevelData(startingTools) {
  for (const [tool, count] of Object.entries(startingTools)) {
    setLevelToolsRemaining(tool, count);
  }
}

function getFrameCountForState(state) {
    switch (state) {
        case 'walking':
            return 8;
        case 'climbing':
            return 8;
        case 'toppingOut':
            return 8;
        case 'floating':
            return 8;
        case 'digging':
            return 8;
        case 'falling':
            return 4;
        case 'blocking':
            return 16;
        case 'dyingFalling':
            return 16;
        case 'exploding':
            return 16;
        case 'disintegrating':
            return 16;
        default:
            return 8;
    }
}

function nameLemmings(lemmings) {
    const names = [...getLemmingNames()];
    const used = new Set();

    function getRandomName() {
        const available = names.filter(n => !used.has(n));
        if (available.length === 0) {
            return null;
        }
        const randomIndex = Math.floor(Math.random() * available.length);
        const name = available[randomIndex];
        used.add(name);
        return name;
    }

    for (let i = 0; i < lemmings.length; i++) {
        const name = getRandomName();
        if (name) {
            lemmings[i].name = name;
        } else {
            lemmings[i].name = `Lemming${i + 1}`;
        }
    }
}


function initializeLemmings(lemmingsQuantity, startPosition) {
    resetLemmingsObjects();

    for (let i = 0; i < lemmingsQuantity; i++) {
        const newLemming = getNewLemmingObject();

        newLemming.x = startPosition.x;
        newLemming.y = startPosition.y;

        pushNewLemmingToLemmingsObjects(newLemming);
    }
}

let releaseTimer = 0;

function releaseLemmings(deltaTime) {
    if (getLemmingsReleased() >= getLemmingsObjects().length) {
        return;
    }

    const releaseRate = getReleaseRate() * RELEASE_RATE_BALANCER;

    releaseTimer += deltaTime;

    if (releaseTimer >= releaseRate) {
        setLemmingsObjects(true, getLemmingsReleased(), 'active');
        setLemmingsReleased(getLemmingsReleased() + 1);
        releaseTimer = 0;
    }
}

let lastCollisionPixels = null;

function checkCollisionPixelsChanged() {
    if (!getCollisionPixels()) return;

    const currentData = getCollisionPixels().data;

    if (!lastCollisionPixels) {
        lastCollisionPixels = new Uint8ClampedArray(currentData);
        return;
    }

    const len = currentData.length;

    for (let i = 0; i < len; i++) {
        if (currentData[i] !== lastCollisionPixels[i]) {
            return;
        }
    }

    // Update snapshot for next frame
    lastCollisionPixels = new Uint8ClampedArray(currentData);
}

function moveLemmingInstance(lemming) {
    if (lemming.state === 'walking' || ((lemming.countdownActive || lemming.state === 'countdown') && !lemming.collisionBox)) {
        lemming.x += lemming.dx;

        if (lemming.x < 0) {
            lemming.active = false;
            return;
        }

        if (lemming.x + lemming.width > LEVEL_WIDTH) {
            lemming.active = false;
            return;
        }

        adjustLemmingHeight(lemming);
    } else if (lemming.state === 'climbing') {
        lemming.y -= GRAVITY_SPEED / 8;
    } else if (lemming.state === 'floating') {
        lemming.y += GRAVITY_SPEED / 4;
    } else if (lemming.state === 'toppingOut') {
        lemming.y + 1;
    } else if (((lemming.state === 'countdown' || lemming.countdownActive) && lemming.collisionBox) || lemming.state === 'exploding' || lemming.state === 'booming' || lemming.state === 'disintegrating' || lemming.state === 'blocking') {
        lemming.x + 0
    }

    const canvasHeight = getElements().canvas.height;
    if (lemming.y > canvasHeight) {
        lemming.active = false;
    }
}

function applyGravity(lemming) {
    if (!lemming.gravity) return;

    if (lemming.state === 'falling') {
        lemming.y += GRAVITY_SPEED;
        lemming.fallenDistance = (lemming.fallenDistance || 0) + GRAVITY_SPEED;

        if (lemming.fallenDistance > ACTIVATE_FLOAT_THRESHOLD &&
            (lemming.tool === 'floaterTool' || lemming.tool === 'athlete') &&
            lemming.state !== 'floating') {
            lemming.state = 'floating';
            return;
        }

        if (lemming.fallenDistance > DIE_FALLING_THRESHOLD &&
            lemming.tool !== 'floaterTool' &&
            lemming.tool !== 'athlete') {
            lemming.dieUponImpact = true;
        }

        if (isOnGround(lemming)) {
            if (lemming.dieUponImpact && lemming.state === 'falling') {
                lemming.state = 'dyingFalling';
            } else {
                lemming.state = 'walking';
            }
            lemming.y = Math.floor(lemming.y);
        }
    } else {
        if (!isOnGround(lemming) && lemming.state !== 'floating') {
            if (lemming.state === 'climbing') {
               lemming.state = 'toppingOut';
               lemming.frameIndex = 0;
               lemming.frameTime = 0;
            } else {
                if (lemming.state !== 'toppingOut') {
                    if (lemming.state === 'blocking') {
                      lemming.collisionBox = false;
                    }
                    lemming.state = 'falling';
                    lemming.fallenDistance = 0;
                    lemming.dieUponImpact = false;
                }
            }
        }

        if (isOnGround(lemming) && lemming.state === 'floating') {
            lemming.state = 'floatingLanding';
            lemming.frameIndex = 3;
            lemming.frameTime = 0;
        }
    }
}

function checkAllCollisions() {
    getLemmingsObjects().forEach(lemming => {
        if (!lemming.active) return;
        checkLemmingVersusNonSurfaceCollisions(getLemmingsObjects());
    });
}

function drawFloatingLemming(ctx, x, y, width, height, frameIndex, cameraX) {
    const frameWidth = spriteFrames[0].w;
    const frameHeight = spriteFrames[0].h;

    const frameX = (frameIndex % 8) * frameWidth;
    const topRowY = 6 * frameHeight;
    const bottomRowY = 7 * frameHeight;

    ctx.drawImage(
        spriteSheet,
        frameX,
        topRowY,
        frameWidth,
        frameHeight,
        x - cameraX,
        y - height,
        width,
        height
    );

    ctx.drawImage(
        spriteSheet,
        frameX,
        bottomRowY,
        frameWidth,
        frameHeight,
        x - cameraX,
        y,
        width,
        height
    );
}

function drawBoomingLemming(ctx, x, y, width, height, frameIndex, cameraX) {
    const frame = getBoomingAreaFrames()[frameIndex];

    for (let row = 0; row < frame.length; row++) {
        for (let col = 0; col < frame[row].length; col++) {
            const tileCol = frame[row][col];
            if (tileCol === null) continue;

            const spriteIndex = (row * FRAMES_PER_ROW) + tileCol;
            const sprite = spriteFrames[spriteIndex];
            if (!sprite) continue;

            // Calculate draw position relative to center
            const drawX = x + (col - 1) * width - cameraX;
            const drawY = y + (row - 1) * height;

            ctx.drawImage(
                spriteSheet,
                sprite.x, sprite.y,
                sprite.w, sprite.h,
                drawX, drawY,
                width, height
            );
        }
    }
}

function drawCountdownMarkerOverLemming(ctx, x, y, width, height, frameIndex, cameraX) {
    const col = getCountdownAreaFrames()[frameIndex];
    const row = 4;

    const spriteIndex = row * FRAMES_PER_ROW + col;
    const sprite = spriteFrames[spriteIndex];
    if (!sprite) return;

    ctx.drawImage(
        spriteSheet,
        sprite.x, sprite.y,
        sprite.w, sprite.h,
        x - cameraX,
        y - height,
        width,
        height
    );
}



function drawInstances(ctx, x, y, width, height, type, color, spriteIndex = null, lemmingObject = null) {
    const cameraX = getCameraX();

    if (type === 'lemming') {
        if (spriteIndex !== null && spriteFrames[spriteIndex]) {
            if (lemmingObject && (lemmingObject.state === 'floating' || lemmingObject.state === 'floatingLanding')) {
                drawFloatingLemming(ctx, x, y, width, height, lemmingObject.frameIndex, cameraX);
            } else if (lemmingObject && (lemmingObject.state === 'booming')) {
                drawBoomingLemming(ctx, x, y, width, height, lemmingObject.frameIndex, cameraX);
            } else {
                if (lemmingObject && (lemmingObject.state === 'countdown' || lemmingObject.countdownActive)) {
                  drawCountdownMarkerOverLemming(ctx, x, y, width, height, lemmingObject.countdownFrameIndex, cameraX);
                }
                const frame = spriteFrames[spriteIndex];
                ctx.drawImage(
                    spriteSheet,
                    frame.x, frame.y,
                    frame.w, frame.h,
                    x - cameraX, y,
                    width, height
                );
            }
        } else {
            ctx.fillStyle = color;
            ctx.fillRect(x - cameraX, y, width, height);
        }

        if (lemmingObject && getDebugMode()) {
            ctx.fillStyle = 'white';
            ctx.font = '8px sans-serif';
            ctx.textAlign = 'center';

            const baseY = y - 10;
            const centerX = x - cameraX + width / 2;

            ctx.fillText(capitalizeString(lemmingObject.state), centerX, baseY);

            if (lemmingObject.state === 'falling') {
                ctx.fillText(`Fallen: ${Math.round(lemmingObject.fallenDistance || 0)}`, centerX, baseY - 10);
                ctx.fillText(`DieOnImpact: ${lemmingObject.dieUponImpact ? 'true' : 'false'}`, centerX, baseY - 20);
            }
        }
    } else if (type === 'enemy') {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(
            100,
            280,
            width / 2,
            0,
            Math.PI * 2
        );
        ctx.closePath();
        ctx.fill();
    }
}

function rectsOverlap(r1, r2) {
    return !(r2.x > r1.x + r1.width ||
        r2.x + r2.width < r1.x ||
        r2.y > r1.y + r1.height ||
        r2.y + r2.height < r1.y);
}

function checkLemmingVersusNonSurfaceCollisions(lemmings) {
    for (const lemming of lemmings) {
        if (!lemming.active) continue;

        const lemmingRect = {
            x: lemming.x,
            y: lemming.y,
            width: lemming.width,
            height: lemming.height
        };

        // Enemy collision checks...
        for (const enemy of detectedObjects.enemiesAir) {
            const scaledMinY = enemy.minY * 0.8;
            const scaledMaxY = enemy.maxY * 0.8;
            const enemyRect = {
                x: enemy.minX,
                y: scaledMinY,
                width: enemy.maxX - enemy.minX,
                height: scaledMaxY - scaledMinY
            };
            if (rectsOverlap(lemmingRect, enemyRect)) {
                console.log(`Air enemy triggered by lemming: ${lemming.name}`);
                lemming.active = false;
            }
        }

        for (const enemy of detectedObjects.enemiesGround) {
            const scaledMinY = enemy.minY * 0.8;
            const scaledMaxY = enemy.maxY * 0.8;
            const enemyRect = {
                x: enemy.minX,
                y: scaledMinY,
                width: enemy.maxX - enemy.minX,
                height: scaledMaxY - scaledMinY
            };
            if (rectsOverlap(lemmingRect, enemyRect)) {
                console.log(`Ground enemy triggered by lemming: ${lemming.name}`);
                lemming.active = false;
            }
        }

        for (const exit of detectedObjects.lemmingExits) {
            const scaledMinY = exit.minY * 0.8;
            const scaledMaxY = exit.maxY * 0.8;
            const exitRect = {
                x: exit.minX,
                y: scaledMinY,
                width: exit.maxX - exit.minX,
                height: scaledMaxY - scaledMinY
            };
            if (rectsOverlap(lemmingRect, exitRect)) {
                setLemmingsRescued();
                console.log(`Lemming ${lemming.name} reached the exit, now rescued ${getLemmingsRescued()} out of a possible ${getNumberOfLemmingsForCurrentLevel()}`);
                lemming.active = false;
            }
        }

        // Collision box check with other lemmings
        if (lemming.state === 'walking') {
            for (const other of lemmings) {
                if (
                    other === lemming ||
                    !other.active ||
                    other.collisionBox !== true
                ) continue;

                const collisionBoxLeft = {
                    x: other.x,
                    y: other.y,
                    width: 4,
                    height: other.height
                };

                const collisionBoxRight = {
                    x: other.x + other.width - 2,
                    y: other.y,
                    width: 4,
                    height: other.height
                };

                if (
                    rectsOverlap(lemmingRect, collisionBoxLeft) ||
                    rectsOverlap(lemmingRect, collisionBoxRight)
                ) {
                    lemming.facing = (lemming.facing === 'left') ? 'right' : 'left';
                    lemming.dx = -lemming.dx;

                    lemming.x += (lemming.facing === 'left') ? -2 : 2;

                    break;
                }
            }
        }
    }
}


function isOnGround(lemming) {
    const samplePoints = [
        Math.floor(lemming.x),
        Math.floor(lemming.x + lemming.width / 2),
        Math.floor(lemming.x + lemming.width - 1)
    ];
    const y = Math.floor(lemming.y + lemming.height + 1);

    for (const x of samplePoints) {
        const pixel = getPixelColor(x, y);

        if (pixel[0] > PIXEL_THRESHOLD || pixel[1] > PIXEL_THRESHOLD || pixel[2] > PIXEL_THRESHOLD) {
            return true;
        }
    }
    return false;
}

export function getPixelColor(x, y) {
    if (x < 0 || y < 0 || x >= getCollisionCanvas().width || y >= getCollisionCanvas().height) return [0, 0, 0, 0];

    const index = (y * getCollisionCanvas().width + x) * 4;
    const data = getCollisionPixels().data;
    return [data[index], data[index + 1], data[index + 2], data[index + 3]];
}

export function loadLevel(levelName) {
    const lemmingLevelData = getLemmingLevelData(levelName);
    return lemmingLevelData;
}

export function loadCollisionCanvas(levelName) {
    return new Promise((resolve) => {
        setCollisionImage(new Image());
        changeCollisionImageProperty(`./assets/levels/collision${capitalizeString(levelName)}.png`, 'src');
        getCollisionImage().onload = () => {
            console.log(`Collision image for ${levelName} loaded. Dimensions: ${getCollisionImage().width}x${getCollisionImage().height}`);
            const detectedObjects = floodFillCollisionObjectsByColor(getCollisionImage());

            resolve(detectedObjects);
        };
    });
}

export function clearExitMarkersFromCollisionCanvas(lemmingExits) {
    const ctx = getCollisionCanvas().getContext('2d');
    const imageData = ctx.getImageData(0, 0, getCollisionCanvas().width, getCollisionCanvas().height);
    const data = imageData.data;

    lemmingExits.forEach(exit => {
        for (let y = exit.minY; y <= exit.maxY; y++) {
            for (let x = exit.minX; x <= exit.maxX; x++) {
                const index = (y * getCollisionCanvas().width + x) * 4;
                if (
                    data[index] === EXIT_COLOR.r &&
                    data[index + 1] === EXIT_COLOR.g &&
                    data[index + 2] === EXIT_COLOR.b
                ) {
                    data[index] = 0;
                    data[index + 1] = 0;
                    data[index + 2] = 0;
                }
            }
        }
    });

    ctx.putImageData(imageData, 0, 0);
}

function clearSpawnMarkersFromCollisionCanvas() {
    const collisionCanvas = getCollisionCanvas();
    if (!collisionCanvas) return;

    const ctx = collisionCanvas.getContext('2d');

    const width = collisionCanvas.width;
    const height = collisionCanvas.height;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const tolerance = 0;

    for (let i = 0; i < data.length; i += 4) {
        const dr = Math.abs(data[i]     - SPAWN_COLOR.r);
        const dg = Math.abs(data[i + 1] - SPAWN_COLOR.g);
        const db = Math.abs(data[i + 2] - SPAWN_COLOR.b);

        if (dr <= tolerance && dg <= tolerance && db <= tolerance) {
            data[i]     = 0;
            data[i + 1] = 0;
            data[i + 2] = 0;
        }
    }

    ctx.putImageData(imageData, 0, 0);
}

function clearAirEnemiesFromCollisionCanvas() {
    const collisionCanvas = getCollisionCanvas();
    if (!collisionCanvas) return;

    const ctx = collisionCanvas.getContext('2d');
    const width = collisionCanvas.width;
    const height = collisionCanvas.height;

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const tolerance = 0;

    for (let i = 0; i < data.length; i += 4) {
        const dr = Math.abs(data[i]     - AIR_ENEMY_COLOR.r);
        const dg = Math.abs(data[i + 1] - AIR_ENEMY_COLOR.g);
        const db = Math.abs(data[i + 2] - AIR_ENEMY_COLOR.b);

        if (dr <= tolerance && dg <= tolerance && db <= tolerance) {
            data[i]     = 0;
            data[i + 1] = 0;
            data[i + 2] = 0;
        }
    }

    ctx.putImageData(imageData, 0, 0);
}

function replaceGroundEnemyColorsFromCollisionCanvas() {
    const canvas = getCollisionCanvas();
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const visited = new Uint8Array(width * height);
    const RADIUS = 3;

    function getIndex(x, y) {
        return (y * width + x) * 4;
    }

    function isGroundEnemyPixel(x, y) {
        const i = getIndex(x, y);
        return (
            data[i] === GROUND_ENEMY_COLOR.r &&
            data[i + 1] === GROUND_ENEMY_COLOR.g &&
            data[i + 2] === GROUND_ENEMY_COLOR.b
        );
    }

    function floodFillEnemy(xStart, yStart) {
        const queue = [[xStart, yStart]];
        const enemyPixels = [];

        while (queue.length) {
            const [x, y] = queue.pop();
            const idx = y * width + x;
            if (visited[idx]) continue;
            visited[idx] = 1;

            if (!isGroundEnemyPixel(x, y)) continue;
            enemyPixels.push([x, y]);

            // 4-connected neighbors
            if (x > 0) queue.push([x - 1, y]);
            if (x < width - 1) queue.push([x + 1, y]);
            if (y > 0) queue.push([x, y - 1]);
            if (y < height - 1) queue.push([x, y + 1]);
        }

        return enemyPixels;
    }

    function getMostCommonSurroundingColor(enemyPixels) {
        const colorCount = {};

        for (const [x0, y0] of enemyPixels) {
            for (let dy = -RADIUS; dy <= RADIUS; dy++) {
                for (let dx = -RADIUS; dx <= RADIUS; dx++) {
                    const x = x0 + dx;
                    const y = y0 + dy;
                    if (x < 0 || y < 0 || x >= width || y >= height) continue;
                    if (Math.hypot(dx, dy) > RADIUS) continue;

                    const idx = y * width + x;
                    if (visited[idx]) continue;

                    const i = getIndex(x, y);
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];

                    // Ignore ground or air pixels
                    if ((r === 255 && g === 0 && b === 0) || (r === 255 && g === 165 && b === 0)) continue;

                    const key = `${r},${g},${b}`;
                    colorCount[key] = (colorCount[key] || 0) + 1;
                }
            }
        }

        const mostCommon = Object.entries(colorCount).reduce((a, b) => b[1] > a[1] ? b : a, [null, 0])[0];
        return mostCommon ? mostCommon.split(',').map(Number) : null;
    }

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            if (visited[idx] || !isGroundEnemyPixel(x, y)) continue;

            const enemyPixels = floodFillEnemy(x, y);
            const replacementColor = getMostCommonSurroundingColor(enemyPixels);
            if (!replacementColor) continue;

            for (const [ex, ey] of enemyPixels) {
                const i = getIndex(ex, ey);
                data[i] = replacementColor[0];
                data[i + 1] = replacementColor[1];
                data[i + 2] = replacementColor[2];
            }
        }
    }

    ctx.putImageData(imageData, 0, 0);
}

function floodFillCollisionObjectsByColor(collisionImage) {
    const canvas = document.createElement('canvas');
    canvas.width = collisionImage.width;
    canvas.height = collisionImage.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(collisionImage, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const visited = new Uint8Array(canvas.width * canvas.height);

    function getIndex(x, y) {
        return y * canvas.width + x;
    }

    function isColorPixel(x, y, color) {
        const i = getIndex(x, y) * 4;
        return data[i] === color.r && data[i + 1] === color.g && data[i + 2] === color.b && data[i + 3] === 255;
    }

    const directions = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1]
    ];

    function floodFill(x, y, color) {
        let queue = [
            [x, y]
        ];
        visited[getIndex(x, y)] = 1;

        let minX = x,
            maxX = x,
            minY = y,
            maxY = y;

        while (queue.length > 0) {
            const [cx, cy] = queue.pop();

            for (const [dx, dy] of directions) {
                const nx = cx + dx;
                const ny = cy + dy;

                if (nx >= 0 && nx < canvas.width && ny >= 0 && ny < canvas.height) {
                    const idx = getIndex(nx, ny);
                    if (!visited[idx] && isColorPixel(nx, ny, color)) {
                        visited[idx] = 1;
                        queue.push([nx, ny]);

                        minX = Math.min(minX, nx);
                        maxX = Math.max(maxX, nx);
                        minY = Math.min(minY, ny);
                        maxY = Math.max(maxY, ny);
                    }
                }
            }
        }

        return {
            minX,
            maxX,
            minY,
            maxY
        };
    }

    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            const idx = getIndex(x, y);
            if (!visited[idx]) {
                if (isColorPixel(x, y, AIR_ENEMY_COLOR)) {
                    const obj = floodFill(x, y, AIR_ENEMY_COLOR);
                    detectedObjects.enemiesAir.push(obj);
                } else if (isColorPixel(x, y, GROUND_ENEMY_COLOR)) {
                    const obj = floodFill(x, y, GROUND_ENEMY_COLOR);
                    detectedObjects.enemiesGround.push(obj);
                } else if (isColorPixel(x, y, SPAWN_COLOR)) {
                    const obj = floodFill(x, y, SPAWN_COLOR);
                    detectedObjects.lemmingSpawns.push(obj);
                } else if (isColorPixel(x, y, EXIT_COLOR)) {
                    const obj = floodFill(x, y, EXIT_COLOR);
                    detectedObjects.lemmingExits.push(obj);
                }
            }
        }
    }

    return detectedObjects;
}

function adjustLemmingHeight(lemming) {
    const height = lemming.height;
    const checkHeight = Math.max(1, Math.floor(height * 0.1));
    const bottomY = Math.floor(lemming.y + height);

    let footX;
    if (lemming.facing === 'right') {
        footX = Math.floor(lemming.x + lemming.width);
    } else {
        footX = Math.floor(lemming.x);
    }

    if (typeof lemming.turnCooldown === 'undefined') {
        lemming.turnCooldown = 0;
    }

    const pixelAbove = getPixelColor(footX, Math.floor(lemming.y) - 1);
    if (
        lemming.turnCooldown === 0 &&
        (pixelAbove[0] > PIXEL_THRESHOLD || pixelAbove[1] > PIXEL_THRESHOLD || pixelAbove[2] > PIXEL_THRESHOLD)
    ) {
        if (lemming.tool === 'climberTool' || lemming.tool === 'athlete') {
            lemming.state = 'climbing';
            return;
        }

        lemming.facing = (lemming.facing === 'right') ? 'left' : 'right';
        lemming.dx = -lemming.dx;
        lemming.turnCooldown = TURN_COOLDOWN;
        return;
    }

    if (lemming.turnCooldown > 0) {
        lemming.turnCooldown--;
    }

    let solidPixels = 0;
    let solidAboveCount = 0;

    for (let i = 0; i < checkHeight; i++) {
        const sampleY = bottomY - 1 - i;
        const pixel = getPixelColor(footX, sampleY);
        if (pixel[0] > PIXEL_THRESHOLD || pixel[1] > PIXEL_THRESHOLD || pixel[2] > PIXEL_THRESHOLD) solidPixels++;
    }

    for (let i = checkHeight; i < height; i++) {
        const sampleY = bottomY - 1 - i;
        const pixel = getPixelColor(footX, sampleY);
        if (pixel[0] > PIXEL_THRESHOLD || pixel[1] > PIXEL_THRESHOLD || pixel[2] > PIXEL_THRESHOLD) solidAboveCount++;
    }

    if (solidPixels > 0) {
        if (solidAboveCount <= 8) {
            lemming.y -= solidAboveCount;
            lemming.state = 'walking';
        } else {
            // Wall too tall — turn around
            if (lemming.turnCooldown === 0) {
                lemming.facing = (lemming.facing === 'right') ? 'left' : 'right';
                lemming.dx = -Math.abs(lemming.dx);
                lemming.turnCooldown = TURN_COOLDOWN;
            }
        }
    } else {
        let airPixelCount = 0;
        for (let offset = 1; offset <= 10; offset++) {
            const sampleY = bottomY + offset;
            const pixel = getPixelColor(footX, sampleY);
            if (pixel[0] <= 10 && pixel[1] <= 10 && pixel[2] <= 10) {
                airPixelCount++;
            } else {
                break;
            }
        }

        if (airPixelCount >= 1 && airPixelCount < 10) {
            lemming.y += 1;
            lemming.state = 'falling';
            lemming.fallenDistance = 0;
        }
    }
}

export function updateCollisionPixels() {
    if (getCollisionCtx() && getCollisionCanvas()) {
        setCollisionPixels(getCollisionCtx().getImageData(0, 0, getCollisionCanvas().width, getCollisionCanvas().height));
    }
}

function drawDetectedObjects(ctx, detectedObjects) {
    const cameraX = getCameraX();
    const radius = 20;
    const Y_SCALE = 0.8;

    detectedObjects.enemiesAir.forEach(enemy => {
        const centerX = (enemy.minX + enemy.maxX) / 2 - cameraX;
        const centerY = ((enemy.minY * Y_SCALE) + (enemy.maxY * Y_SCALE)) / 2;

        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fill();
    });

    detectedObjects.enemiesGround.forEach(enemy => {
        const centerX = (enemy.minX + enemy.maxX) / 2 - cameraX;
        const centerY = ((enemy.minY * Y_SCALE) + (enemy.maxY * Y_SCALE)) / 2;

        ctx.fillStyle = 'orange';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fill();
    });

    detectedObjects.lemmingSpawns.forEach(spawn => {
        const centerX = (spawn.minX + spawn.maxX) / 2 - cameraX;
        const centerY = ((spawn.minY * Y_SCALE) + (spawn.maxY * Y_SCALE)) / 2;

        ctx.fillStyle = 'yellow';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fill();
    });

    detectedObjects.lemmingExits.forEach(exit => {
        const centerX = (exit.minX + exit.maxX) / 2 - cameraX;
        const centerY = ((exit.minY * Y_SCALE) + (exit.maxY * Y_SCALE)) / 2;

        ctx.fillStyle = 'green';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fill();
    });
}

function getSpriteRowForLemming(state, facing, dx, countDownActive) {
    if (countDownActive && dx === 0) { //blocking with countdown PROBABLY WRONG
        return 10;
    }
    if (state === 'walking') {
        return facing === 'right' ? 0 : 1;
    }
    if (state === 'falling') {
        return facing === 'right' ? 2 : 3;
    }
    if (state === 'climbing') {
        return facing === 'right' ? 4 : 5;
    }
    if (state === 'toppingOut') {
        return facing === 'right' ? 8 : 9;
    }
    if (state === 'floating') {
        //handled in special case
        return 0;
    }
    if (state === 'blocking') {
        return 10;
    }
    if (state === 'dyingFalling') {
        return 11;
    }
    if (state === 'exploding') {
        return 12;
    }
    if (state === 'disintegrating') {
        return 13;
    }
    return 0;
}

function updateLemmingAnimation(lemming, deltaTime, frameCount = 8) {
    if (lemming.frameTime === undefined) {
        lemming.frameTime = 0;
        lemming.frameIndex = 0;
    }

    const ANIMATION_SPEED = 80;
    lemming.frameTime += deltaTime;

    if (lemming.frameTime >= ANIMATION_SPEED) {
        lemming.frameTime = 0;
        lemming.frameIndex = (lemming.frameIndex + 1) % frameCount;
    }
}

export function handleLemmingClick(lemming) {
  const currentTool = getCurrentTool();
  const toolsRemaining = getLevelToolsRemaining();

  if (!toolsRemaining[currentTool] || toolsRemaining[currentTool] <= 0) {
    console.log(`No ${currentTool} tools left to use.`);
    return;
  }

  if (currentTool === 'exploderTool') {
    lemming.state = actionStatesMap[currentTool];
    lemming.countdownActive = true;
    console.log(`Set state '${lemming.state}' for lemming ${lemming.name}`);
    setLevelToolsRemaining(currentTool, toolsRemaining[currentTool] - 1);
    return;
  }

  if (lemming.state === 'blocking') {
    console.log(`Lemming ${lemming.name} is blocking and ignores ${currentTool}`);
    return;
  }

  const isClimber = lemming.tool === 'climberTool';
  const isFloater = lemming.tool === 'floaterTool';
  const isAthlete = lemming.tool === 'athlete';

  if (currentTool === 'climberTool' || currentTool === 'floaterTool') {
    if (isAthlete) {
      console.log(`Lemming ${lemming.name} is already an athlete and cannot be assigned ${currentTool}`);
      return;
    }

    if (
      (currentTool === 'climberTool' && isClimber) ||
      (currentTool === 'floaterTool' && isFloater)
    ) {
      console.log(`Lemming ${lemming.name} already has ${currentTool}`);
      return;
    }

    if ((currentTool === 'climberTool' && isFloater) ||
        (currentTool === 'floaterTool' && isClimber)) {
      lemming.tool = 'athlete';
      console.log(`Lemming ${lemming.name} is now an athlete`);
    } else {
      lemming.tool = currentTool;
      console.log(`Assigned tool ${currentTool} to lemming ${lemming.name}`);
    }

    setLevelToolsRemaining(currentTool, toolsRemaining[currentTool] - 1);
    return;
  }

  // Apply state change if different
  if (currentTool in actionStatesMap) {
    const newState = actionStatesMap[currentTool];

    if (lemming.state === newState) {
      console.log(`Lemming ${lemming.name} is already ${newState}`);
      return;
    }

    lemming.state = newState;
    if (newState === 'blocking') {
      lemming.collisionBox = true;
    }
    console.log(`Changed state to '${newState}' for lemming ${lemming.name}`);
    setLevelToolsRemaining(currentTool, toolsRemaining[currentTool] - 1);
    return;
  }

  console.log(`Tool ${currentTool} does not map to an action or tool.`);
}


export function setGameState(newState) {
    //console.log("Setting game state to " + newState);
    setGameStateVariable(newState);

    switch (newState) {
        case getMenuState():
            getElements().menu.classList.remove('d-none');
            getElements().menu.classList.add('d-flex');
            getElements().buttonRow.classList.add('d-none');
            getElements().buttonRow.classList.remove('d-flex');
            getElements().canvasContainer.classList.remove('d-flex');
            getElements().canvasContainer.classList.add('d-none');
            getElements().returnToMenuButton.classList.remove('d-flex');
            getElements().returnToMenuButton.classList.add('d-none');
            getElements().pauseResumeGameButton.classList.remove('d-flex');
            getElements().pauseResumeGameButton.classList.add('d-none');

            const languageButtons = [getElements().btnEnglish, getElements().btnSpanish, getElements().btnGerman, getElements().btnItalian, getElements().btnFrench];
            languageButtons.forEach(button => {
                button.classList.remove('active');
            });

            const currentLanguage = getLanguage();
            console.log("Language is " + getLanguage());
            switch (currentLanguage) {
                case 'en':
                    console.log("Setting Active state on English");
                    getElements().btnEnglish.classList.add('active');
                    break;
                case 'es':
                    console.log("Setting Active state on Spanish");
                    getElements().btnSpanish.classList.add('active');
                    break;
                case 'de':
                    console.log("Setting Active state on German");
                    getElements().btnGerman.classList.add('active');
                    break;
                case 'it':
                    console.log("Setting Active state on Italian");
                    getElements().btnItalian.classList.add('active');
                    break;
                case 'fr':
                    console.log("Setting Active state on French");
                    getElements().btnFrench.classList.add('active');
                    break;
            }

            if (getGameInProgress()) {
                getElements().copyButtonSavePopup.innerHTML = `${localize('copyButton', getLanguage())}`;
                getElements().closeButtonSavePopup.innerHTML = `${localize('closeButton', getLanguage())}`;
            }
            break;
        case getGameVisiblePaused():
            getElements().menu.classList.remove('d-flex');
            getElements().menu.classList.add('d-none');
            getElements().buttonRow.classList.remove('d-none');
            getElements().buttonRow.classList.add('d-flex');
            getElements().canvasContainer.classList.remove('d-none');
            getElements().canvasContainer.classList.add('d-flex');
            getElements().returnToMenuButton.classList.remove('d-none');
            getElements().returnToMenuButton.classList.add('d-flex');
            getElements().pauseResumeGameButton.classList.remove('d-none');
            getElements().pauseResumeGameButton.classList.add('d-flex');
            if (getBeginGameStatus()) {
                getElements().pauseResumeGameButton.innerHTML = `${localize('begin', getLanguage())}`;
            } else {
                getElements().pauseResumeGameButton.innerHTML = `${localize('resumeGame', getLanguage())}`;
            }

            getElements().returnToMenuButton.innerHTML = `${localize('menuTitle', getLanguage())}`;
            break;
        case getGameVisibleActive():
            getElements().menu.classList.remove('d-flex');
            getElements().menu.classList.add('d-none');
            getElements().buttonRow.classList.remove('d-none');
            getElements().buttonRow.classList.add('d-flex');
            getElements().canvasContainer.classList.remove('d-none');
            getElements().canvasContainer.classList.add('d-flex');
            getElements().returnToMenuButton.classList.remove('d-none');
            getElements().returnToMenuButton.classList.add('d-flex');
            getElements().pauseResumeGameButton.classList.remove('d-none');
            getElements().pauseResumeGameButton.classList.add('d-flex');
            getElements().pauseResumeGameButton.innerHTML = `${localize('pause', getLanguage())}`;
            getElements().returnToMenuButton.innerHTML = `${localize('menuTitle', getLanguage())}`;
            break;
    }
}