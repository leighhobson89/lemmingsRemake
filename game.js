import { localize } from './localization.js';
import { setPaintMode, getPaintMode, FRAME_DURATION, GRAVITY_SPEED, setLemmingsStartPosition, LEVEL_WIDTH, setGameStateVariable, getBeginGameStatus, getMaxAttemptsToDrawEnemies, getLemmingObject as getLemmingObject, getMenuState, getGameVisiblePaused, getGameVisibleActive, getNumberOfEnemySquares, getElements, getLanguage, getGameInProgress, gameState, CANVAS_WIDTH } from './constantsAndGlobalVars.js';
import { updateCollisionPixels, collisionCanvas, collisionCtx, createCollisionCanvas, getCameraX, updateCamera } from './ui.js';
import { drawCollisionOverlay, capitalizeString } from './utilities.js';

let lemmingObject = getLemmingObject();
let staticEnemy = {};
let collisionPixels;
let lastFrameTime = 0;
let lemmingHeightAdjustFrameCounter = 0;

export let backgroundImage = null;
export let collisionImage = null;

let lastCollisionPixels = null;
let collisionChangedDetected = false;

const enemySquares = [];

//--------------------------------------------------------------------------------------------------------

function initializeEnemySquares() {
    enemySquares.length = 0;
    let attempts = 0;

    while (enemySquares.length < getNumberOfEnemySquares() && attempts < getMaxAttemptsToDrawEnemies()) {
        const newSquare = generateRandomSquare();

        if (!enemySquares.some(square => checkCollision(newSquare, square)) &&
            !checkCollision(newSquare, lemmingObject)) {
            enemySquares.push(newSquare);
        }

        attempts++;
    }

    if (attempts >= getMaxAttemptsToDrawEnemies()) {
        console.warn(`Could not place all ${getNumberOfEnemySquares()} squares. Only ${enemySquares.length} squares were placed due to overlap constraints.`);
    }
}

function initializeMovingEnemy() {
    staticEnemy = generateEnemyObject();
}

export async function startGame() {
    const ctx = getElements().canvas.getContext('2d');
    const container = getElements().canvasContainer;

    function updateCanvasSize() {
        const canvasWidth = container.clientWidth * 0.8;
        const canvasHeight = container.clientHeight * 0.8;

        getElements().canvas.style.width = `${canvasWidth}px`;
        getElements().canvas.style.height = `${canvasHeight}px`;

        getElements().canvas.width = canvasWidth;
        getElements().canvas.height = canvasHeight;

        ctx.scale(1, 1);
    }

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    await Promise.all([
        loadLevel('level1'),
        loadCollisionCanvas('level1'),
    ]);

    await createCollisionCanvas();       
    collisionPixels = collisionCtx.getImageData(0, 0, collisionCanvas.width, collisionCanvas.height);
    
    const lemmingStartPosition = { x: 20, y: 100 }; //debug
    setLemmingsStartPosition(lemmingStartPosition);

    initializeEnemySquares();
    initializeMovingEnemy();

    gameLoop();
}

export function gameLoop(time = 0) {
  if (time - lastFrameTime < FRAME_DURATION) {
    requestAnimationFrame(gameLoop);
    return;
  }
  lastFrameTime = time;

  if (getBeginGameStatus()) {
    lemmingObject = getLemmingObject();
  }

  const ctx = getElements().canvas.getContext('2d');

  if (gameState === getGameVisibleActive() || gameState === getGameVisiblePaused()) {
    checkCollisionPixelsChanged();
    ctx.clearRect(0, 0, getElements().canvas.width, getElements().canvas.height);

    updateCamera();

    if (backgroundImage && backgroundImage.complete) {
      const cameraX = getCameraX();

      ctx.drawImage(
        backgroundImage,
        cameraX, 0,
        getElements().canvas.width,
        backgroundImage.height,
        0, 0,
        getElements().canvas.width,
        getElements().canvas.height
      );
    }

    if (collisionCanvas) {
      const cameraX = getCameraX();
      ctx.drawImage(
        collisionCanvas,
        cameraX, 0,
        getElements().canvas.width,
        collisionCanvas.height,
        0, 0,
        getElements().canvas.width,
        collisionCanvas.height
      );
    }

    //drawCollisionOverlay(ctz, getCameraX());

    // Only update game logic if game is active (not paused)
    if (gameState === getGameVisibleActive()) {
      moveLemming(lemmingObject);
      applyGravity(lemmingObject);
      checkAllCollisions();
    }

    // Draw game objects on top
    drawMovingObject(ctx, lemmingObject.x, lemmingObject.y, lemmingObject.width, lemmingObject.height, 'green');
    drawMovingObject(ctx, staticEnemy.x, staticEnemy.y, staticEnemy.width, staticEnemy.height, 'red');

    enemySquares.forEach(square => {
      drawEnemySquare(ctx, square.x, square.y, square.width, square.height);
    });

    // Request next frame
    requestAnimationFrame(gameLoop);
  }
}

function checkCollisionPixelsChanged() {
  if (collisionChangedDetected || !collisionPixels) return;

  const currentData = collisionPixels.data;

  if (!lastCollisionPixels) {
    lastCollisionPixels = new Uint8ClampedArray(currentData);
    console.log("false no data");
    return;
  }

  const len = currentData.length;

  for (let i = 0; i < len; i++) {
    if (currentData[i] !== lastCollisionPixels[i]) {
      console.log("true");
      collisionChangedDetected = true;
      return;
    }
  }

  console.log("false");

  // Update snapshot for next frame
  lastCollisionPixels = new Uint8ClampedArray(currentData);
}



function moveLemming(lemming) {
    if (!lemming.falling) {
        lemming.x += lemming.dx;

        //lemming will be lost if it hits the edge, change this rebound logic eventually when they have a surface to walk on
        if (lemming.x < 0) {
            lemming.x = 0;
            lemming.dx = Math.abs(lemming.dx);
            lemming.facing = 'right';
        } else if (lemming.x + lemming.width > LEVEL_WIDTH) {
            lemming.x = LEVEL_WIDTH - lemming.width;
            lemming.dx = -Math.abs(lemming.dx);
            lemming.facing = 'left';
        }
        adjustLemmingHeight(lemming);
    }
}

function applyGravity(lemming) {
  if (!lemming.gravity) return;

  if (lemming.falling) {
    lemming.y += GRAVITY_SPEED;

    if (isOnGround(lemming)) {
      lemming.falling = false;
      lemming.y = Math.floor(lemming.y);
    }
  } else {
    if (!isOnGround(lemming)) lemming.falling = true;
  }
}

function checkAllCollisions() {
    enemySquares.forEach(square => {
        if (checkCollision(lemmingObject, square)) {
            handleCollisionBetweenEnemySquares(lemmingObject, square);
        }
    });

    if (checkCollision(lemmingObject, staticEnemy)) {
        handleCollisionBetweenEnemySquares(lemmingObject, staticEnemy);
        handleCollisionBetweenEnemySquares(staticEnemy, lemmingObject);
    }
}

function generateRandomSquare() {
    const canvasHeight = getElements().canvas.height;
    const size = 20;
    const x = Math.random() * (LEVEL_WIDTH - size);
    const y = Math.random() * (canvasHeight - size);
    return { x, y, width: size, height: size };
}

function generateEnemyObject() {
    const canvasHeight = getElements().canvas.height;

    const size = 25;
    const x = (LEVEL_WIDTH / 2);
    const y = canvasHeight - size;
    const dx = 0;
    const dy = 0;
    return { x, y, width: size, height: size, dx, dy };
}

function drawMovingObject(ctx, x, y, width, height, color) {
    const cameraX = getCameraX();
    ctx.fillStyle = color;

    if (color === 'green') {
        ctx.fillRect(x - cameraX, y, width, height);
    } else {
        ctx.beginPath(); 
        ctx.arc(
            x - cameraX + width / 2,
            y + height / 2,
            width / 2,
            0,
            Math.PI * 2
        );
        ctx.closePath();
        ctx.fill();
    }
}

function drawEnemySquare(ctx, x, y, width, height) {
    const cameraX = getCameraX();
    ctx.fillStyle = 'yellow';
    ctx.fillRect(x - cameraX, y, width, height);
}

function checkCollision(rect1, rect2) {
    return !(rect1.x + rect1.width < rect2.x ||
             rect1.x > rect2.x + rect2.width ||
             rect1.y + rect1.height < rect2.y ||
             rect1.y > rect2.y + rect2.height);
}

function handleCollisionBetweenEnemySquares(rectangle, square) {
    const rectCenterX = rectangle.x + rectangle.width / 2;
    const rectCenterY = rectangle.y + rectangle.height / 2;
    const squareCenterX = square.x + square.width / 2;
    const squareCenterY = square.y + square.height / 2;

    const dx = Math.abs(rectCenterX - squareCenterX);
    const dy = Math.abs(rectCenterY - squareCenterY);
    const overlapX = rectangle.width / 2 + square.width / 2 - dx;
    const overlapY = rectangle.height / 2 + square.height / 2 - dy;

    if (overlapX >= overlapY) {
        if (rectCenterY < squareCenterY) {
            rectangle.dy = -Math.abs(rectangle.dy);
        } else {
            rectangle.dy = Math.abs(rectangle.dy);
        }
    } else {
        if (rectCenterX < squareCenterX) {
            rectangle.dx = -Math.abs(rectangle.dx);
        } else {
            rectangle.dx = Math.abs(rectangle.dx);
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
    // You can uncomment this for verbose debugging:
    // console.log(`Checking pixel at (${x}, ${y}):`, pixel);

    if (pixel[0] > 10 || pixel[1] > 10 || pixel[2] > 10) {
      return true;
    }
  }
  return false;
}

export function getPixelColor(x, y) {
  if (x < 0 || y < 0 || x >= collisionCanvas.width || y >= collisionCanvas.height) return [0,0,0,0];

  const index = (y * collisionCanvas.width + x) * 4;
  const data = collisionPixels.data;
  return [data[index], data[index + 1], data[index + 2], data[index + 3]];
}

export function getRightmostBoundary() {
    const player = getLemmingObject();
    const objects = [player, staticEnemy, ...enemySquares];
    return Math.max(...objects.map(obj => obj.x + obj.width));
}

export function loadLevel(levelName) {
  return new Promise((resolve) => {
    backgroundImage = new Image();
    backgroundImage.src = `./assets/levels/background${capitalizeString(levelName)}.png`;
    backgroundImage.onload = () => {
      console.log(`Background image for ${levelName} loaded. Dimensions: ${backgroundImage.width}x${backgroundImage.height}`);
      resolve();
    };
  });
}

export function loadCollisionCanvas(levelName) {
  return new Promise((resolve) => {
    collisionImage = new Image();
    collisionImage.src = `./assets/levels/collision${capitalizeString(levelName)}.png`;
    collisionImage.onload = () => {
      console.log(`Collision image for ${levelName} loaded. Dimensions: ${collisionImage.width}x${collisionImage.height}`);
      resolve();
    };
  });
}

function adjustLemmingHeight(lemming) {
  lemmingHeightAdjustFrameCounter++;
  
  if (lemmingHeightAdjustFrameCounter % 5 !== 0) return;

  const height = lemming.height;
  const checkHeight = Math.max(1, Math.floor(height * 0.1)); // bottom 10%
  const bottomY = Math.floor(lemming.y + height);

  let footX;
  if (lemming.facing === 'right') {
    footX = Math.floor(lemming.x + lemming.width); // just outside right edge
  } else {
    footX = Math.floor(lemming.x); // just outside left edge
  }

  let solidPixels = 0;
  let solidAboveCount = 0;

  // Count solid pixels in bottom 10%
  for (let i = 0; i < checkHeight; i++) {
    const sampleY = bottomY - 1 - i;
    const pixel = getPixelColor(footX, sampleY);
    if (pixel[0] > 10 || pixel[1] > 10 || pixel[2] > 10) solidPixels++;
  }

  // Count solid pixels above bottom 10%
  for (let i = checkHeight; i < height; i++) {
    const sampleY = bottomY - 1 - i;
    const pixel = getPixelColor(footX, sampleY);
    if (pixel[0] > 10 || pixel[1] > 10 || pixel[2] > 10) solidAboveCount++;
  }

//   console.log(`[Lemming] Facing: ${lemming.facing}`);
//   console.log(`[Lemming] Solid pixels in bottom 10%: ${solidPixels}/${checkHeight} (${((solidPixels / checkHeight) * 100).toFixed(1)}%)`);
//   console.log(`[Lemming] Solid pixels ABOVE bottom 10%: ${solidAboveCount}`);

  if (solidPixels > 0) {
    if (solidAboveCount <= 8) {
      // All clear above — climb
      lemming.y -= solidAboveCount;
      lemming.falling = false;
      //console.log(`[Lemming] Climbing up ${solidAboveCount}px`);
    } else {
      // Wall too tall — move up then turn around, set cooldown
      //lemming.y -= solidAboveCount;
      lemming.facing = (lemming.facing === 'right') ? 'left' : 'right';
      lemming.dx = -Math.abs(lemming.dx);
      //console.log(`[Lemming] Wall too tall — moved up ${solidAboveCount}px then turned around, cooldown set`);
    }
  } else {
    //console.log(`[Lemming] No climbable surface detected`);

    let transparentCount = 0;
    for (let offset = 1; offset <= 10; offset++) {
      const sampleY = bottomY + offset;
      const pixel = getPixelColor(footX, sampleY);
      if (pixel[0] <= 10 && pixel[1] <= 10 && pixel[2] <= 10) {
        transparentCount++;
      } else {
        break;
      }
    }

    if (transparentCount >= 1 && transparentCount < 10) {
      lemming.y += 1;
      lemming.falling = true;
      console.log(`[Lemming] Small drop — descending 1px`);
    }
  }
}

export function setGameState(newState) {
    console.log("Setting game state to " + newState);
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