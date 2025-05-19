import { localize } from './localization.js';
import { SPAWN_COLOR, getCollisionCanvas, getCollisionCtx, getCollisionPixels, setCollisionPixels, getCameraX, getLemmingsReleased, setLemmingsReleased, getStaticEnemies, setStaticEnemies, resetLemmingsObjects, getLemmingsObjects, setLemmingsObjects, pushNewLemmingToLemmingsObjects, getNewLemmingObject, getReleaseRate, setReleaseRate, getLemmingLevelData, FRAME_DURATION, GRAVITY_SPEED, setLemmingsStartPosition, LEVEL_WIDTH, setGameStateVariable, getBeginGameStatus, getMaxAttemptsToDrawEnemies, getLemmingObject, getMenuState, getGameVisiblePaused, getGameVisibleActive, getElements, getLanguage, getGameInProgress, gameState, PIXEL_THRESHOLD, TURN_COOLDOWN, setCollisionImage, getCollisionImage, changeCollisionImageProperty } from './constantsAndGlobalVars.js';
import { visualCanvas, createVisualCanvas, createCollisionCanvas, updateCamera } from './ui.js';
import { capitalizeString } from './utilities.js';

//--------------------------------------------------------------------------------------------------------
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

  const levelData = await loadLevel('level1');
  await createVisualCanvas();
  const detectedObjects = await loadCollisionCanvas('level1');

  console.log('Detected enemy objects:', detectedObjects.enemies);
  console.log('Detected lemming spawn points:', detectedObjects.lemmingSpawns);

  await createCollisionCanvas();
  clearSpawnMarkersFromCollisionCanvas(detectedObjects.lemmingSpawns);
  updateCollisionPixels();

  const spawn = detectedObjects.lemmingSpawns[0];
  const lemmingStartPosition = {
    x: Math.round((spawn.minX + spawn.maxX) / 2),
    y: Math.round((spawn.minY + spawn.maxY) / 2)
  };
  setLemmingsStartPosition(lemmingStartPosition);

  initializeLemmings(levelData.lemmings, lemmingStartPosition);

  gameLoop();
}

let lastFrameTime = 0;
export function gameLoop(time = 0) {
  if (time - lastFrameTime < FRAME_DURATION) {
    requestAnimationFrame(gameLoop);
    return;
  }

  const deltaTime = time - lastFrameTime;
  lastFrameTime = time;

  const ctx = getElements().canvas.getContext('2d');

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
        drawInstances(ctx, lemming.x, lemming.y, lemming.width, lemming.height, 'lemming', 'green');
      }
    }

    const staticEnemies = getStaticEnemies();
    drawInstances(ctx, staticEnemies.x, staticEnemies.y, staticEnemies.width, staticEnemies.height, 'enemy', 'red');

    const activeCount = getLemmingsObjects().filter(l => l.active).length;
    //console.log(`Active lemmings: ${activeCount}`);

    requestAnimationFrame(gameLoop);
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

    const releaseRate = getReleaseRate();

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
  if (!lemming.falling) {
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
  }

  const canvasHeight = getElements().canvas.height;
  if (lemming.y > canvasHeight) {
    lemming.active = false;
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
  getLemmingsObjects().forEach(lemming => {
    if (!lemming.active) return;
  });
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

function drawInstances(ctx, x, y, width, height, type, color) {
    const cameraX = getCameraX();
    ctx.fillStyle = color;

    if (type === 'lemming') {
        ctx.fillRect(x - cameraX, y, width, height);
    } else if (type === 'enemy') {
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

function isOnGround(lemming) {
  const samplePoints = [
    Math.floor(lemming.x),
    Math.floor(lemming.x + lemming.width / 2),
    Math.floor(lemming.x + lemming.width - 1)
  ];
  const y = Math.floor(lemming.y + lemming.height + 1);

  for (const x of samplePoints) {
    const pixel = getPixelColor(x, y);

    if (pixel[0] > 10 || pixel[1] > 10 || pixel[2] > 10) {
      return true;
    }
  }
  return false;
}

export function getPixelColor(x, y) {
  if (x < 0 || y < 0 || x >= getCollisionCanvas().width || y >= getCollisionCanvas().height) return [0,0,0,0];

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

function clearSpawnMarkersFromCollisionCanvas() {
  const collisionCanvas = getCollisionCanvas();
  if (!collisionCanvas) return;

  const ctx = collisionCanvas.getContext('2d');
  const width = collisionCanvas.width;
  const height = collisionCanvas.height;

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    if (
      r === SPAWN_COLOR.r &&
      g === SPAWN_COLOR.g &&
      b === SPAWN_COLOR.b
    ) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 255;
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

  function isColorPixel(x, y, r, g, b) {
    const i = getIndex(x, y) * 4;
    return data[i] === r && data[i + 1] === g && data[i + 2] === b && data[i + 3] === 255;
  }

  const directions = [
    [1, 0], [-1, 0],
    [0, 1], [0, -1]
  ];

  const detectedObjects = {
    enemies: [],
    lemmingSpawns: []
  };

  function floodFill(x, y, r, g, b) {
    let queue = [[x, y]];
    visited[getIndex(x, y)] = 1;

    let minX = x, maxX = x, minY = y, maxY = y;

    while (queue.length > 0) {
      const [cx, cy] = queue.pop();

      for (const [dx, dy] of directions) {
        const nx = cx + dx;
        const ny = cy + dy;

        if (nx >= 0 && nx < canvas.width && ny >= 0 && ny < canvas.height) {
          const idx = getIndex(nx, ny);
          if (!visited[idx] && isColorPixel(nx, ny, r, g, b)) {
            visited[idx] = 1;
            queue.push([nx, ny]);

            if (nx < minX) minX = nx;
            if (nx > maxX) maxX = nx;
            if (ny < minY) minY = ny;
            if (ny > maxY) maxY = ny;
          }
        }
      }
    }

    return { minX, maxX, minY, maxY };
  }

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const idx = getIndex(x, y);
      if (!visited[idx]) {
        if (isColorPixel(x, y, 255, 0, 0)) {
          // Red pixel = enemy
          const enemyObj = floodFill(x, y, 255, 0, 0);
          detectedObjects.enemies.push(enemyObj);
        } else if (isColorPixel(x, y, 255, 255, 0)) {
          // Yellow pixel = lemming spawn
          const lemmingObj = floodFill(x, y, 255, 255, 0);
          detectedObjects.lemmingSpawns.push(lemmingObj);
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

  // Initialize cooldown if undefined
  if (typeof lemming.turnCooldown === 'undefined') {
    lemming.turnCooldown = 0;
  }

  // Check pixel directly above lemming top edge
  const pixelAbove = getPixelColor(footX, Math.floor(lemming.y) - 1);
  if (lemming.turnCooldown === 0 &&
      (pixelAbove[0] > PIXEL_THRESHOLD || pixelAbove[1] > PIXEL_THRESHOLD || pixelAbove[2] > PIXEL_THRESHOLD)) {
    // Turn around and start cooldown
    lemming.facing = (lemming.facing === 'right') ? 'left' : 'right';
    lemming.dx = -lemming.dx;
    lemming.turnCooldown = TURN_COOLDOWN; // 10 frames cooldown
    return; // skip rest this frame to avoid weird climbing in same frame
  }

  // Decrement cooldown if active
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
      // All clear above — climb
      lemming.y -= solidAboveCount;
      lemming.falling = false;
    } else {
      // Wall too tall — turn around
      if (lemming.turnCooldown === 0) {
        lemming.facing = (lemming.facing === 'right') ? 'left' : 'right';
        lemming.dx = -Math.abs(lemming.dx);
        lemming.turnCooldown = TURN_COOLDOWN;
      }
    }
  } else {
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
    }
  }
}

export function updateCollisionPixels() {
  if (getCollisionCtx() && getCollisionCanvas()) {
    setCollisionPixels(getCollisionCtx().getImageData(0, 0, getCollisionCanvas().width, getCollisionCanvas().height));
  }
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