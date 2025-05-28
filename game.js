import {
	localize
} from './localization.js';
import {
	spriteFramesMap,
	spriteSheets,
	BUILDER_SLAB_COLOR,
	MAX_EXPLOSION_PARTICLES,
	COLLISION_GRID_CELL_SIZE,
	EXPLOSION_PARTICLE_COUNT,
	EXPLOSION_PARTICLE_GRAVITY,
	MAX_DISTANCE_EXPLOSION_PARTICLE,
	EXPLOSION_RADIUS,
	FAST_FORWARD_AMOUNT,
	getIsFastForward,
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
	getFrameDuration,
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
	getLemmingsRescued,
  getInitialSpeedLemming
} from './constantsAndGlobalVars.js';
import {
	latestMousePos,
	trackCursor,
	visualCanvas,
	createPaintingCanvas,
	createCollisionCanvas,
	updateCamera,
	updateToolButtons,
	updatePaintButtonState
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
let activeExplosionParticles = 0;
let solidGroundMap = null;

export async function startGame() {
	const canvas = getElements().canvas;
	const ctx = canvas.getContext('2d');
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

	// console.log('Detected air enemy objects:', detectedObjects.enemiesAir);
	// console.log('Detected ground enemy objects:', detectedObjects.enemiesGround);
	// console.log('Detected lemming spawn points:', detectedObjects.lemmingSpawns);

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

	initializeLemmings(levelData.lemmings, lemmingStartPosition, levelData.facing);
	nameLemmings(getLemmingsObjects());
	gameLoop();
}

async function updateCanvasSize(container, canvas, ctx) {
	const canvasWidth = container.clientWidth * 0.95;
	const canvasHeight = container.clientHeight;

	canvas.style.width = `${canvasWidth}px`;
	canvas.style.height = `${canvasHeight}px`;

	canvas.width = canvasWidth;
	canvas.height = canvasHeight;

	//ctx.scale(1, 1);
}

let lastFrameTime = 0;
export function gameLoop(time = 0) {
	const canvas = getElements().canvas;
	const ctx = canvas.getContext('2d', {
		willReadFrequently: true
	});
	trackCursor(latestMousePos);
	if (time - lastFrameTime < getFrameDuration()) {
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

		if (getDebugMode() && visualCanvas) {
			// In debug mode, draw both: collision first, then visual overlay
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
			ctx.drawImage(
				visualCanvas,
				cameraX, 0,
				getElements().canvas.width,
				visualCanvas.height,
				0, 0,
				getElements().canvas.width,
				visualCanvas.height
			);
		} else if (getCollisionCanvas()) {
			// In play mode, draw only the collision canvas
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
			if (getLemmingsReleased() < getNumberOfLemmingsForCurrentLevel()) {
				releaseLemmings(deltaTime);
			}

			for (const lemming of getLemmingsObjects()) {
				if (lemming.active) {
          moveLemmingInstance(lemming);
          applyGravity(lemming);
					if (lemming.nukeActive && lemming.state !== 'exploding' && lemming.state !== 'booming' && lemming.state !== 'disintegrating'
					) {
						lemming.countdownActive = true;
					}
				}
			}

			checkAllCollisions();
		}

		for (const lemming of getLemmingsObjects()) {
			if (lemming.active) {
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
					} else if (lemming.state === 'exploding') {
						const frameCount = getFrameCountForState(lemming.state);
						updateExplodingAnimation(lemming, deltaTime, frameCount);
					} else if (lemming.state === 'booming') {
						updateBoomingAnimation(lemming, deltaTime);
					} else if (lemming.state === 'disintegrating') {
						const frameCount = getFrameCountForState(lemming.state);
						updateDisintegratingAnimation(lemming, deltaTime, frameCount);
					} else if (lemming.state === 'building') {
						const frameCount = getFrameCountForState(lemming.state);
						updateBuildingAnimation(lemming, deltaTime, frameCount);
					} else if (lemming.state === 'bashing') {
						const frameCount = getFrameCountForState(lemming.state);
						updateBashingAnimation(lemming, deltaTime, frameCount);
					} else if (lemming.state === "mining") {
						const frameCount = getFrameCountForState(lemming.state);
						updateMiningAnimation(lemming, deltaTime, frameCount);
					} else if (lemming.state === "runOutOfSlabs") {
						const frameCount = getFrameCountForState(lemming.state);
						updateRunOutOfSlabsAnimation(lemming, deltaTime, frameCount);
					} else if (lemming.state === "digging") {
						const frameCount = getFrameCountForState(lemming.state);
						updateDiggingAnimation(lemming, deltaTime, frameCount);
					} else {
						const frameCount = getFrameCountForState(lemming.state);
						updateLemmingAnimation(lemming, deltaTime, frameCount);
					}

					if (lemming.countdownActive) {
						updateCountDownAnimation(lemming, deltaTime);
					}
				}

				const rows = getSpriteRowForLemming(lemming.state, lemming.facing, lemming.frameIndex);
				let rowNumber;
				let col;

				if (Array.isArray(rows)) {
					const framesPerRow = 16;
					const rowIndex = Math.floor(lemming.frameIndex / framesPerRow);
					rowNumber = rows[rowIndex];
					col = lemming.frameIndex % framesPerRow;
				} else {
					rowNumber = rows;
					col = lemming.frameIndex;
				}
				let spriteIndex;
				if (lemming.state !== 'mining') {
					spriteIndex = rowNumber * FRAMES_PER_ROW + col;
				} else {
					spriteIndex = rowNumber * FRAMES_PER_ROW + (col * 2);
				}

				drawLemmingInstances(ctx, lemming.x, lemming.y, lemming.width, lemming.height, 'lemming', 'green', spriteIndex, lemming);
			}
		}

		const staticEnemies = getStaticEnemies();
		ctx.imageSmoothingEnabled = false;
		drawLemmingInstances(ctx, staticEnemies.x, staticEnemies.y, staticEnemies.width, staticEnemies.height, 'enemy', 'red', null);
		const allInactive = getNumberOfLemmingsForCurrentLevel() === getLemmingsReleased() && getLemmingsObjects().every(l => !l.active);
		if (allInactive) {
			//console.log('All lemmings are now inactive - can end level');
		}

		updateToolButtons();
		updatePaintButtonState();

		requestAnimationFrame(gameLoop);
	}
}

function updateRunOutOfSlabsAnimation(lemming, deltaTime) {
	if (lemming.frameTime === undefined) {
		lemming.frameTime = 0;
		lemming.frameIndex = 0;
	}

	const ANIMATION_SPEED = 80;
	lemming.frameTime += deltaTime;

	if (lemming.frameTime >= ANIMATION_SPEED / (getIsFastForward() ? FAST_FORWARD_AMOUNT : 1)) {
		lemming.frameTime = 0;
		lemming.frameIndex++;

		if (lemming.frameIndex === 15) {
			lemming.lastState = lemming.state;
			lemming.state = 'walking';
			lemming.frameIndex = 0;
		}
	}
}

function updateMiningAnimation(lemming, deltaTime) {
  if (lemming.frameTime === undefined) {
    lemming.frameTime = 0;
    lemming.frameIndex = 0;
  }

  const ANIMATION_SPEED =
    (lemming.frameIndex >= 0 && lemming.frameIndex <= 2) ||
    (lemming.frameIndex >= 15 && lemming.frameIndex <= 17)
      ? 120
      : 80;
  lemming.frameTime += deltaTime;

  if (lemming.frameTime >= ANIMATION_SPEED) {
    lemming.frameTime = 0;

	  const radius = lemming.height * 0.5;
	  const centerX = lemming.x;
	  const centerY = lemming.y;

      const ctx = getCollisionCanvas().getContext("2d");
      ctx.imageSmoothingEnabled = false;
      mineBlock(ctx, lemming, centerX, centerY, radius);

    lemming.frameIndex++;

    if (lemming.frameIndex > 17) {
      lemming.frameIndex = 0;
    }

    if (lemming.reachedEndOfMiningSquare > 4) {
      lemming.lastState = lemming.state;
      lemming.state = "walking";
      lemming.frameIndex = 0;
      lemming.reachedEndOfMiningSquare = 0;
    }
  }
}	

function updateDiggingAnimation(lemming, deltaTime) {
  if (lemming.frameTime === undefined) {
    lemming.frameTime = 0;
    lemming.frameIndex = 0;
  }

  const ANIMATION_SPEED = 40;
  const frameCount = 16;

  lemming.frameTime += deltaTime;

  if (
    lemming.frameTime >=
    ANIMATION_SPEED / (getIsFastForward() ? FAST_FORWARD_AMOUNT : 1)
  ) {
    lemming.frameTime = 0;
    lemming.frameIndex = (lemming.frameIndex + 1) % frameCount;

    if (lemming.frameIndex >= 0 && lemming.frameIndex <= 8) {
      const canvas = getCollisionCanvas();
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = false;

      const centerX = lemming.x + lemming.width / 2;
      const centerY = lemming.y + lemming.height;

      digBlock(ctx, lemming, centerX, centerY);
    }

	if (lemming.reachedEndOfDiggingSquare > 4) {
		lemming.lastState = lemming.state;
		lemming.state = "falling";
		lemming.frameIndex = 0;
		lemming.reachedEndOfDiggingSquare = 0;
	}
  }
}


function updateBashingAnimation(lemming, deltaTime) {
	if (lemming.frameTime === undefined) {
		lemming.frameTime = 0;
		lemming.frameIndex = 0;
	}

	const ANIMATION_SPEED = 40;
	lemming.frameTime += deltaTime;

	if (lemming.frameTime >= ANIMATION_SPEED / (getIsFastForward() ? FAST_FORWARD_AMOUNT : 1)) {
		lemming.frameTime = 0;
		lemming.frameIndex++;

		if (
			([1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31].includes(lemming.frameIndex))
		) {
			const radius = lemming.height / 2 + 1;
      		const centerX = lemming.x + lemming.width / 2;
      		const centerY = lemming.y + lemming.height / 2;

			const shift = lemming.facing === 'right' ? 1 : -1;
			const canvas = getCollisionCanvas();
			const ctx = canvas.getContext('2d');
			ctx.imageSmoothingEnabled = false;
			bashBlock(ctx, lemming, centerX + shift, centerY, radius);
		}

		if (lemming.frameIndex > 31) {
			lemming.frameIndex = 0;
		}
		if (lemming.reachedEndOfBashingSquare > 4) {
				lemming.lastState = lemming.state;
				lemming.frameIndex = 0;
				lemming.state = 'walking';
				lemming.reachedEndOfBashingSquare = 0;
		}
	}
}

function updateBuildingAnimation(lemming, deltaTime) {
	if (lemming.frameTime === undefined) {
		lemming.frameTime = 0;
		lemming.frameIndex = 0;
	}

	const ANIMATION_SPEED = 30;
	lemming.frameTime += deltaTime;

	if (lemming.frameTime >= ANIMATION_SPEED / (getIsFastForward() ? FAST_FORWARD_AMOUNT : 1)) {
		lemming.frameTime = 0;
		lemming.frameIndex++;

		if (lemming.frameIndex === 10) {
			buildSlab(lemming);
		}

		if (lemming.frameIndex > 15) {
			lemming.buildingSlabs = (lemming.buildingSlabs || 0) + 1;
			lemming.frameIndex = 0;

			if (lemming.buildingSlabs === 10 || lemming.buildingSlabs === 11 || lemming.buildingSlabs === 12) {
				//console.log('play running out sound');
			}

			if (lemming.buildingSlabs === 12) {
				lemming.lastState = lemming.state;
				lemming.state = 'runOutOfSlabs';
				lemming.buildingSlabs = 0;
			}
		}
	}
}

function updateDisintegratingAnimation(lemming, deltaTime) {
	if (lemming.frameTime === undefined) {
		lemming.frameTime = 0;
		lemming.frameIndex = 0;
	}

	const ANIMATION_SPEED = 40;
	lemming.frameTime += deltaTime;

	if (lemming.frameTime >= ANIMATION_SPEED / (getIsFastForward() ? FAST_FORWARD_AMOUNT : 1)) {
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

	if (lemming.frameTime >= ANIMATION_SPEED / (getIsFastForward() ? FAST_FORWARD_AMOUNT : 1)) {
		lemming.frameTime = 0;
		lemming.frameIndex++;

		if (lemming.frameIndex === 1) {
			explodeTerrain(lemming);
		}

		if (lemming.frameIndex >= getBoomingAreaFrames().length) {
			lemming.frameIndex = 0;
			if (isOnGround(lemming)) {
				lemming.lastState = lemming.state;
				lemming.state = 'disintegrating';
			} else {
				lemming.active = false;
			}
		}
	}
}

function updateCountDownAnimation(lemming, deltaTime) {
	if (lemming.countdownFrameTime === undefined) {
		lemming.countdownFrameTime = 0;
		lemming.countdownFrameIndex = 0;
	}

	const ANIMATION_SPEED = 1000;
	const effectiveDelta = getIsFastForward() ? deltaTime * FAST_FORWARD_AMOUNT : deltaTime;

	lemming.countdownFrameTime += effectiveDelta;

	if (lemming.countdownFrameTime >= ANIMATION_SPEED / (getIsFastForward() ? FAST_FORWARD_AMOUNT : 1)) {
		lemming.countdownFrameTime = 0;
		lemming.countdownFrameIndex++;

		if (lemming.countdownFrameIndex >= getCountdownAreaFrames().length) {
			lemming.countdownFrameIndex = 0;
			lemming.countdownActive = false;

			lemming.state = (
				lemming.state === 'floating' ||
				lemming.state === 'floatingLanding' ||
				lemming.state === 'falling'
			) ? 'booming' : 'exploding';

			lemming.frameIndex = 0;
		}
	}
}

function updateExplodingAnimation(lemming, deltaTime) {
	if (lemming.frameTime === undefined) {
		lemming.frameTime = 0;
		lemming.frameIndex = 0;
	}

	const ANIMATION_SPEED = 60;
	lemming.frameTime += deltaTime;

	if (lemming.frameTime >= ANIMATION_SPEED / (getIsFastForward() ? FAST_FORWARD_AMOUNT : 1)) {
		lemming.frameTime = 0;
		lemming.frameIndex++;

		if (lemming.frameIndex === 15) {
			lemming.lastState = lemming.state;
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

	if (lemming.frameTime >= ANIMATION_SPEED / (getIsFastForward() ? FAST_FORWARD_AMOUNT : 1)) {
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

	if (lemming.frameTime >= ANIMATION_SPEED / (getIsFastForward() ? FAST_FORWARD_AMOUNT : 1)) {
		lemming.frameTime = 0;
		lemming.frameIndex++;

		if (lemming.frameIndex > 7) {
			lemming.lastState = lemming.state;
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

	if (lemming.frameTime >= ANIMATION_SPEED / (getIsFastForward() ? FAST_FORWARD_AMOUNT : 1)) {
		lemming.frameTime = 0;
		lemming.frameIndex--;

		if (lemming.frameIndex < 0) {
			lemming.lastState = lemming.state;
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
    case "walking":
      return 8;
    case "climbing":
      return 8;
    case "toppingOut":
      return 8;
    case "floating":
      return 8;
    case "digging":
      return 8;
    case "falling":
      return 4;
    case "blocking":
      return 16;
    case "dyingFalling":
      return 16;
    case "exploding":
      return 16;
    case "disintegrating":
      return 16;
    case "building":
      return 16;
	case "digging":
		return 16;
    case "runOutOfSlabs":
      return 16;
    case "bashing":
      return 32;
    case "mining":
      return 18;
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


function initializeLemmings(lemmingsQuantity, startPosition, facing) {
	resetLemmingsObjects();

	for (let i = 0; i < lemmingsQuantity; i++) {
		const newLemming = getNewLemmingObject();

		newLemming.x = startPosition.x;
		newLemming.y = startPosition.y;
    newLemming.facing = facing;

		pushNewLemmingToLemmingsObjects(newLemming);
	}
}

let releaseTimer = 0;

function releaseLemmings(deltaTime) {
	if (getLemmingsReleased() >= getLemmingsObjects().length) {
		return;
	}

	let releaseRate = getReleaseRate() * RELEASE_RATE_BALANCER;

	if (getIsFastForward()) {
		releaseRate /= FAST_FORWARD_AMOUNT;
	}

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

	lastCollisionPixels = new Uint8ClampedArray(currentData);
}

function checkIfOnSlab(lemming) {
    const centerX = Math.floor(lemming.x + lemming.width / 2);
    const footY = Math.floor(lemming.y + lemming.height);

    for (let offset = -8; offset <= 8; offset++) {
        const sampleX = centerX + offset;
        const pixel = getPixelColor(sampleX, footY);
        if ((pixel[0] === BUILDER_SLAB_COLOR.r && pixel[1] === BUILDER_SLAB_COLOR.g && pixel[2] === BUILDER_SLAB_COLOR.b) || (pixel[0] === 255 && pixel[1] === 255 && pixel[2] === 255)) {
            lemming.walkingOnSlab = true;
            return;
        }
    }

    lemming.walkingOnSlab = false;
}

function moveLemmingInstance(lemming) {
	if (lemming.state === "walking") {
    if (lemming.facing === "right") {
      lemming.x += 2;
    } else if (lemming.facing === "left") {
      lemming.x -= 2;
    }

    checkIfOnSlab(lemming);

    if (lemming.x < 0 || lemming.x + lemming.width > LEVEL_WIDTH) {
      lemming.active = false;
      return;
    }

    adjustLemmingHeight(lemming);
  } else if (lemming.state === "climbing") {
    lemming.y -= GRAVITY_SPEED / 8;
  } else if (lemming.state === "floating") {
    lemming.y += GRAVITY_SPEED / 3;
  } else if (lemming.state === "toppingOut") {
    lemming.y += 1;
  } else if (
    (lemming.countdownActive && lemming.collisionBox) ||
    lemming.state === "exploding" ||
    lemming.state === "booming" ||
    lemming.state === "disintegrating" ||
    lemming.state === "blocking" ||
    lemming.state === "runOutOfSlabs"
  ) {
    lemming.x += 0;
  } else if (lemming.state === "building") {
    if (lemming.frameIndex === 15) {
      if (lemming.facing === "right") {
        lemming.x += 5;
      } else if (lemming.facing === "left") {
        lemming.x -= 5;
      }
      lemming.y -= 2;
    }
  } else if (lemming.state === "bashing") {
    if ([1, 3, 11, 13, 15, 17, 19, 21, 29, 31].includes(lemming.frameIndex)) {
      if (lemming.facing === "right") {
        lemming.x += 1.5;
      } else if (lemming.facing === "left") {
        lemming.x -= 1.5;
      }
    }
  } else if (lemming.state === "mining") {
    if (lemming.frameIndex > 0 && lemming.frameIndex <= 8) {
      if (lemming.facing === "right") {
        lemming.x += 0.8;
        lemming.y += 0.4;
      } else if (lemming.facing === "left") {
        lemming.x -= 0.8;
        lemming.y += 0.4;
      }
    }
  } else if (lemming.state === "digging") {
	lemming.y += 0.3;
  }

	const canvasHeight = getElements().canvas.height;
	if (lemming.y > canvasHeight) {
		lemming.active = false;
	}
}

function applyGravity(lemming) {
	if (!lemming.gravity) return;

	// Handle falling state
	if (lemming.state === 'falling') {
		lemming.y += GRAVITY_SPEED;
		lemming.fallenDistance = (lemming.fallenDistance || 0) + GRAVITY_SPEED;

		// Switch to floating if threshold passed and has floater/athlete
		if (
			lemming.fallenDistance > ACTIVATE_FLOAT_THRESHOLD &&
			(lemming.tool === 'floaterTool' || lemming.tool === 'athlete') &&
			lemming.state !== 'floating'
		) {
			lemming.lastState = lemming.state;
			lemming.state = 'floating';
			return;
		}

		// Mark for death if fallen too far without floater/athlete
		if (
			lemming.fallenDistance > DIE_FALLING_THRESHOLD &&
			lemming.tool !== 'floaterTool' &&
			lemming.tool !== 'athlete'
		) {
			lemming.dieUponImpact = true;
		}

		// Landed on ground
		if (isOnGround(lemming)) {
			lemming.lastState = lemming.state;
			if (lemming.dieUponImpact) {
				lemming.state = 'dyingFalling';
			} else {
				lemming.state = 'walking';
			}
			lemming.y = Math.floor(lemming.y);
		}
		return;
	}

	const onGround = isOnGround(lemming);

	// If not on ground and not floating, start falling (unless in special states)
	if (!onGround && lemming.state !== 'floating') {
		if (lemming.state === 'climbing') {
			lemming.lastState = lemming.state;
			lemming.state = 'toppingOut';
			lemming.frameIndex = 0;
			lemming.frameTime = 0;
		} else if (
			!['toppingOut', 'booming', 'disintegrating', 'building', 'runOutOfSlabs'].includes(lemming.state)
		) {
			if (lemming.state === 'blocking') {
				lemming.collisionBox = false;
			}
			if (!lemming.walkingOnSlab) {
				lemming.lastState = lemming.state;
				lemming.state = 'falling';
				lemming.fallenDistance = 0;
				lemming.dieUponImpact = false;
			}
		}
		return;
	}

	// If landed while floating, switch to floatingLanding
	if (onGround && lemming.state === 'floating') {
		lemming.lastState = lemming.state;
		lemming.state = 'floatingLanding';
		lemming.frameIndex = 3;
		lemming.frameTime = 0;
	}
}

function checkAllCollisions() {
    const lemmings = getLemmingsObjects().filter(lemming => lemming.active);
    checkLemmingVersusNonSurfaceCollisions(lemmings);
}

function drawFloatingLemming(ctx, x, y, width, height, frameIndex, cameraX) {
    const frames = spriteFramesMap['lemmings'];
    const sheet = spriteSheets['lemmings'];

    if (!frames || !sheet) {
        console.warn('Default sprite sheet not loaded yet.');
        return;
    }

    const frameWidth = frames[0].w;
    const frameHeight = frames[0].h;

    const frameX = (frameIndex % 8) * frameWidth;
    const topRowY = 6 * frameHeight;
    const bottomRowY = 7 * frameHeight;

    ctx.drawImage(
        sheet,
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
        sheet,
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
	const frames = spriteFramesMap['lemmings'];
	const sheet = spriteSheets['lemmings'];

	if (!frames || !sheet) {
		console.warn('Default sprite sheet not loaded yet.');
		return;
	}

	const frame = getBoomingAreaFrames()[frameIndex];

	for (let row = 0; row < frame.length; row++) {
		for (let col = 0; col < frame[row].length; col++) {
			const tileCol = frame[row][col];
			if (tileCol === null) continue;

			const spriteIndex = (row * FRAMES_PER_ROW) + tileCol;
			const sprite = frames[spriteIndex];
			if (!sprite) continue;

			const drawX = x + (col - 1) * width - cameraX;
			const drawY = y + (row - 1) * height;

			ctx.drawImage(
				sheet,
				sprite.x, sprite.y,
				sprite.w, sprite.h,
				drawX, drawY,
				width, height
			);
		}
	}
}

function drawCountdownMarkerOverLemming(ctx, x, y, width, height, countdownIndex, cameraX, state) {
	const frames = spriteFramesMap['lemmings'];
	const sheet = spriteSheets['lemmings'];

	if (!frames || !sheet) {
		console.warn('Default sprite sheet not loaded yet.');
		return;
	}

	const col = getCountdownAreaFrames()[countdownIndex];
	const row = 4;

	const spriteIndex = row * FRAMES_PER_ROW + col;
	const sprite = frames[spriteIndex];
	if (!sprite) return;

	ctx.drawImage(
		sheet,
		sprite.x, sprite.y,
		sprite.w, sprite.h,
		x - cameraX,
		state === 'floating' ? y - (height * 2) : y - height,
		width,
		height
	);
}

function drawMiningLemming(ctx, x, y, width, height, frameIndex, facing, cameraX, sheetId = 'lemmings') {
	const frames = spriteFramesMap[sheetId];
	const sheet = spriteSheets[sheetId];

	if (!frames || !sheet) {
		console.warn(`Sprite sheet "${sheetId}" not loaded.`);
		return;
	}

	let rows;
	if (facing === "right") {
		rows = [22, 24];
	} else {
		rows = [26, 28];
	}

	const framesPerRow = 9;
	const rowIndex = Math.floor(frameIndex / framesPerRow);
	const colIndex = frameIndex % framesPerRow;

	const bottomRightRow = rows[rowIndex];
	const bottomRightCol = colIndex * 2 + 1;

	const bottomRightIndex = bottomRightRow * FRAMES_PER_ROW + bottomRightCol;
	const topLeftIndex = bottomRightIndex - FRAMES_PER_ROW - 1;
	const topRightIndex = bottomRightIndex - FRAMES_PER_ROW;
	const bottomLeftIndex = bottomRightIndex - 1;

	const topLeftFrame = frames[topLeftIndex];
	const topRightFrame = frames[topRightIndex];
	const bottomLeftFrame = frames[bottomLeftIndex];
	const bottomRightFrame = frames[bottomRightIndex];

	if (!topLeftFrame || !topRightFrame || !bottomLeftFrame || !bottomRightFrame) return;

	ctx.drawImage(
		sheet,
		topLeftFrame.x,
		topLeftFrame.y,
		topLeftFrame.w,
		topLeftFrame.h,
		x - width - cameraX,
		y - height,
		width,
		height
	);
	ctx.drawImage(
		sheet,
		topRightFrame.x,
		topRightFrame.y,
		topRightFrame.w,
		topRightFrame.h,
		x - cameraX,
		y - height,
		width,
		height
	);
	ctx.drawImage(
		sheet,
		bottomLeftFrame.x,
		bottomLeftFrame.y,
		bottomLeftFrame.w,
		bottomLeftFrame.h,
		x - width - cameraX,
		y,
		width,
		height
	);
	ctx.drawImage(
		sheet,
		bottomRightFrame.x,
		bottomRightFrame.y,
		bottomRightFrame.w,
		bottomRightFrame.h,
		x - cameraX,
		y,
		width,
		height
	);
}

function drawBashingLemming(ctx, x, y, width, height, frameIndex, facing, cameraX, sheetId = 'lemmings') {
	const frames = spriteFramesMap[sheetId];
	const sheet = spriteSheets[sheetId];

	if (!frames || !sheet) {
		console.warn(`Sprite sheet "${sheetId}" not loaded.`);
		return;
	}

	let row;
	let rowOffset;

	if (facing === 'right') {
		row = frameIndex < 16 ? 17 : 18;
		rowOffset = frameIndex % 16;
	} else {
		row = frameIndex < 16 ? 19 : 20;
		rowOffset = frameIndex % 16;
	}

	const spriteIndex = row * FRAMES_PER_ROW + rowOffset;
	const frame = frames[spriteIndex];

	if (!frame) return;

	ctx.drawImage(
		sheet,
		frame.x, frame.y,
		frame.w, frame.h,
		x - cameraX,
		y,
		width,
		height
	);
}

function drawLemmingInstances(ctx, x, y, width, height, type, color, spriteIndex = null, lemmingObject = null, sheetId = 'lemmings') {
	const cameraX = getCameraX();

	const frames = spriteFramesMap[sheetId];
	const sheet = spriteSheets[sheetId];

	if (!frames || !sheet) {
		console.warn(`Sprite sheet "${sheetId}" not loaded.`);
		return;
	}

	if (type === 'lemming') {
		if (spriteIndex !== null && frames[spriteIndex]) {
			if (lemmingObject && (lemmingObject.state === 'floating' || lemmingObject.state === 'floatingLanding')) {
				drawFloatingLemming(ctx, x, y, width, height, lemmingObject.frameIndex, cameraX, sheetId);
			} else if (lemmingObject && lemmingObject.state === 'booming') {
				drawBoomingLemming(ctx, x, y, width, height, lemmingObject.frameIndex ?? 0, cameraX, sheetId);
			} else if (lemmingObject && lemmingObject.state === 'bashing') {
				drawBashingLemming(ctx, x, y, width, height, lemmingObject.frameIndex, lemmingObject.facing, cameraX, sheetId);
			} else if (lemmingObject && lemmingObject.state === 'mining') {
				drawMiningLemming(ctx, x, y, width, height, lemmingObject.frameIndex, lemmingObject.facing, cameraX, sheetId);
			} else {
				if (lemmingObject && lemmingObject.countdownActive) {
					drawCountdownMarkerOverLemming(
						ctx,
						x,
						y,
						width,
						height,
						lemmingObject.countdownFrameIndex,
						cameraX,
						lemmingObject.state,
						sheetId
					);
				}

				const frame = frames[spriteIndex];
				ctx.drawImage(
					sheet,
					frame.x,
					frame.y,
					frame.w,
					frame.h,
					x - cameraX,
					y,
					width,
					height
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
		ctx.arc(100, 280, width / 2, 0, Math.PI * 2);
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
	const lemmingGrid = buildLemmingGrid(lemmings);
	for (const lemming of lemmings) {
		if (!lemming.active) continue;

		const lemmingRect = {
			x: lemming.x,
			y: lemming.y,
			width: lemming.width,
			height: lemming.height
		};

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
				//console.log(`Lemming ${lemming.name} reached the exit, now rescued ${getLemmingsRescued()} out of a possible ${getNumberOfLemmingsForCurrentLevel()}`);
				lemming.active = false;
			}
		}

		if (lemming.state === 'walking' || lemming.state === 'building' || lemming.state === 'mining') { // TO CHECK FOR MINING
			// Use the grid to only check nearby lemmings
			const cellX = Math.floor(lemming.x / COLLISION_GRID_CELL_SIZE);
			const cellY = Math.floor(lemming.y / COLLISION_GRID_CELL_SIZE);

			outer: for (let dx = -1; dx <= 1; dx++) {
				for (let dy = -1; dy <= 1; dy++) {
					const key = `${cellX + dx},${cellY + dy}`;
					const others = lemmingGrid.get(key);
					if (!others) continue;

					for (const other of others) {
						if (
							other === lemming ||
							!other.active ||
							other.collisionBox !== true
						) continue;

						const collisionBoxLeft = {
							x: other.x,
							y: other.y,
							width: 2,
							height: other.height
						};

						const collisionBoxRight = {
							x: other.x + other.width - 2,
							y: other.y,
							width: 2,
							height: other.height
						};

            const leftCollision = rectsOverlap(lemmingRect, collisionBoxLeft);
            const rightCollision = rectsOverlap(lemmingRect, collisionBoxRight);

            if (leftCollision && rightCollision && lemming.state === 'walking') {
                // Stuck between two blockers — force nudge
                const shift = (lemming.facing === 'right') ? 24 : -24;
                lemming.x += shift;
                console.log(`Lemming ${lemming.name} auto-pushed ${shift > 0 ? 'right' : 'left'} to escape blocker sandwich`);
                break outer;
            } else if (leftCollision || rightCollision) {
                // Normal wall bounce behavior
                lemming.facing = (lemming.facing === 'left') ? 'right' : 'left';
                lemming.dx = -lemming.dx;
                lemming.x += (lemming.facing === 'left') ? -2 : 2;
                break outer;
            }
					}
				}
			}
		}
	}
}

function buildLemmingGrid(lemmings) {
	const grid = new Map();

	for (const lemming of lemmings) {
		if (!lemming.active) continue;
		const cellX = Math.floor(lemming.x / COLLISION_GRID_CELL_SIZE);
		const cellY = Math.floor(lemming.y / COLLISION_GRID_CELL_SIZE);
		const key = `${cellX},${cellY}`;
		if (!grid.has(key)) grid.set(key, []);
		grid.get(key).push(lemming);
	}
	return grid;
}

function updateSolidGroundMap() {
    const width = getCollisionCanvas().width;
    const height = getCollisionCanvas().height;
    const data = getCollisionPixels().data;
    solidGroundMap = new Uint8Array(width * height);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            if (r === 253 && g === 253 && b === 253) {
                solidGroundMap[y * width + x] = 0;
            } else {
                solidGroundMap[y * width + x] =
                    (r > PIXEL_THRESHOLD ||
                     g > PIXEL_THRESHOLD ||
                     b > PIXEL_THRESHOLD) ? 1 : 0;
            }
        }
    }
}

function isOnGround(lemming) {
    const width = getCollisionCanvas().width;
    const y = Math.floor(lemming.y + lemming.height + 1);
    const centerX = Math.floor(lemming.x + lemming.width / 2);

    let solidCount = 0;
    let total = 0;
    for (let offset = -8; offset <= 8; offset++) {
        const x = centerX + offset;
        if (x < 0 || x >= width || y < 0 || y >= getCollisionCanvas().height) continue;
        total++;
        if (solidGroundMap[y * width + x]) solidCount++;
    }

    return total > 0 && (solidCount / total) >= 0.2;
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
		const dr = Math.abs(data[i] - SPAWN_COLOR.r);
		const dg = Math.abs(data[i + 1] - SPAWN_COLOR.g);
		const db = Math.abs(data[i + 2] - SPAWN_COLOR.b);

		if (dr <= tolerance && dg <= tolerance && db <= tolerance) {
			data[i] = 0;
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
		const dr = Math.abs(data[i] - AIR_ENEMY_COLOR.r);
		const dg = Math.abs(data[i + 1] - AIR_ENEMY_COLOR.g);
		const db = Math.abs(data[i + 2] - AIR_ENEMY_COLOR.b);

		if (dr <= tolerance && dg <= tolerance && db <= tolerance) {
			data[i] = 0;
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
		const queue = [
			[xStart, yStart]
		];
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

function isSolidPixel(pixel) {
    if (
        (typeof BUILDER_SLAB_COLOR !== 'undefined' &&
         pixel[0] === BUILDER_SLAB_COLOR.r &&
         pixel[1] === BUILDER_SLAB_COLOR.g &&
         pixel[2] === BUILDER_SLAB_COLOR.b)
    ) {
        return false;
    }
    return (pixel[0] > PIXEL_THRESHOLD || pixel[1] > PIXEL_THRESHOLD || pixel[2] > PIXEL_THRESHOLD);
}

function turnLemmingIfCollidesWithWall(lemming) {
    const height = lemming.height;
    const checkHeight = Math.floor(height * 0.6);
    const footY = Math.floor(lemming.y + height);

	const footX = (lemming.facing === 'right')
		? Math.floor(lemming.x + lemming.width) - 4
		: Math.floor(lemming.x) + 4;


    let solidCount = 0;
    let highestSolidOffset = null;

    for (let offset = 0; offset < checkHeight; offset++) {
        const sampleY = footY - offset;
        const pixel = getPixelColor(footX, sampleY);
        if (isSolidPixel(pixel)) {
            solidCount++;
            if (highestSolidOffset === null) {
                highestSolidOffset = offset;
            }
        }
    }

    if (solidCount >= checkHeight / 2) {
        lemming.facing = (lemming.facing === 'right') ? 'left' : 'right';
        lemming.dx = -lemming.dx;
        lemming.turnCooldown = TURN_COOLDOWN;
    }
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
        isSolidPixel(pixelAbove)
    ) {
        if (lemming.tool === 'climberTool' || lemming.tool === 'athlete') {
            lemming.lastState = lemming.state;
            lemming.state = 'climbing';
            return;
        }
		turnLemmingIfCollidesWithWall(lemming);
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
        if (isSolidPixel(pixel)) solidPixels++;
    }

    for (let i = checkHeight; i < height; i++) {
        const sampleY = bottomY - 1 - i;
        const pixel = getPixelColor(footX, sampleY);
        if (isSolidPixel(pixel)) solidAboveCount++;
    }

    if (solidPixels > 0) {
        if (solidAboveCount <= 8) {
            lemming.y -= solidAboveCount;
            lemming.lastState = lemming.state;
            if (!lemming.countdownActive && !lemming.nukeActive) {
                lemming.state = 'walking';
            }
        }
    } else {
        let airPixelUnderFeetCount = 0;
        for (let offset = 1; offset <= 10; offset++) {
            const sampleY = bottomY + offset;
            const pixel = getPixelColor(footX, sampleY);
            if ((pixel[0] <= PIXEL_THRESHOLD && pixel[1] <= PIXEL_THRESHOLD && pixel[2] <= PIXEL_THRESHOLD) ||
                (
                 pixel[0] === BUILDER_SLAB_COLOR.r &&
                 pixel[1] === BUILDER_SLAB_COLOR.g &&
                 pixel[2] === BUILDER_SLAB_COLOR.b)
            ) {
                airPixelUnderFeetCount++;
            } else {
                break;
            }
        }

        if (airPixelUnderFeetCount >= 1 && airPixelUnderFeetCount < 10 && !lemming.walkingOnSlab) {
				lemming.lastState = lemming.state;
                lemming.state = 'falling';
                lemming.fallenDistance = 0;
        }
    }
}

export function updateCollisionPixels() {
    if (getCollisionCtx() && getCollisionCanvas()) {
        setCollisionPixels(getCollisionCtx().getImageData(0, 0, getCollisionCanvas().width, getCollisionCanvas().height));
        updateSolidGroundMap();
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

function getSpriteRowForLemming(state, facing) {
	if (state === 'walking') {
		return facing === 'right' ? [0] : [1];
	}
	if (state === 'falling') {
		return facing === 'right' ? [2] : [3];
	}
	if (state === 'climbing') {
		return facing === 'right' ? [4] : [5];
	}
	if (state === 'toppingOut') {
		return facing === 'right' ? [8] : [9];
	}
	if (state === 'floating') {
		return [0]; // handled elsewhere
	}
	if (state === 'blocking') {
		return [10];
	}
	if (state === 'dyingFalling') {
		return [11];
	}
	if (state === 'exploding') {
		return [12];
	}
	if (state === 'disintegrating') {
		return [13];
	}
	if (state === 'building') {
		return facing === 'right' ? [14] : [15];
	}
	if (state === 'runOutOfSlabs') {
		return [16];
	}
	if (state === 'bashing') {
		return facing === 'right' ? [17, 18] : [19, 20];
	}
	if (state === "mining") {
    	return facing === "right" ? [22, 24] : [26, 28];
    }
	if (state === "digging") {
    	return [29];
  	}
	return [0];
}

function updateLemmingAnimation(lemming, deltaTime, frameCount = 8) {
	if (lemming.frameTime === undefined) {
		lemming.frameTime = 0;
		lemming.frameIndex = 0;
	}

	const ANIMATION_SPEED = 80;
	lemming.frameTime += deltaTime;

	if (lemming.frameTime >= ANIMATION_SPEED / (getIsFastForward() ? FAST_FORWARD_AMOUNT : 1)) {
		lemming.frameTime = 0;
		lemming.frameIndex = (lemming.frameIndex + 1) % frameCount;
	}
}

export function handleLemmingClick(lemming) {
    const currentTool = getCurrentTool();
    const toolsRemaining = getLevelToolsRemaining();

    if (!toolsRemaining[currentTool] || toolsRemaining[currentTool] <= 0) {
        return;
    }

    // Only allow exploderTool or floaterTool while falling
    if (lemming.state === 'falling') {
        if (currentTool !== 'exploderTool' && currentTool !== 'floaterTool') {
            return;
        }
    }

    if (currentTool === 'exploderTool') {
        lemming.countdownActive = true;
        setLevelToolsRemaining(currentTool, toolsRemaining[currentTool] - 1);
        return;
    }

    if (lemming.state === 'blocking') {
        return;
    }

    const isClimber = lemming.tool === 'climberTool';
    const isFloater = lemming.tool === 'floaterTool';
    const isAthlete = lemming.tool === 'athlete';

    if (currentTool === 'climberTool' || currentTool === 'floaterTool') {
        if (isAthlete) {
            return;
        }

        if (
            (currentTool === 'climberTool' && isClimber) ||
            (currentTool === 'floaterTool' && isFloater)
        ) {
            return;
        }

        if ((currentTool === 'climberTool' && isFloater) ||
            (currentTool === 'floaterTool' && isClimber)) {
            lemming.tool = 'athlete';
        } else {
            lemming.tool = currentTool;
        }

        setLevelToolsRemaining(currentTool, toolsRemaining[currentTool] - 1);
        return;
    }

    if (currentTool in actionStatesMap) {
        const newState = actionStatesMap[currentTool];

        if (lemming.state === newState) {
            return;
        }

        lemming.state = newState;
        if (newState === 'blocking') {
            lemming.collisionBox = true;
        }
        setLevelToolsRemaining(currentTool, toolsRemaining[currentTool] - 1);
        return;
    }
}

function mineBlock(ctx, lemming, x, y, radius) {
  const offsetX =
    lemming.facing === "right" ? lemming.width * 0.5 : -lemming.width * 0.5;
  const offsetY = lemming.height / 2;

  const checkX = x + offsetX;
  const checkY = y + offsetY;
  const checkYBelow = checkY + lemming.height / 2;

  const imageData = ctx.getImageData(
    Math.floor(checkX - radius),
    Math.floor(checkYBelow - radius),
    Math.ceil(radius * 2),
    Math.ceil(radius * 2)
  );
  const data = imageData.data;
  const diameter = Math.ceil(radius * 2);

  let bottomTotal = 0;
  let bottomSolidCount = 0;

  for (let dy = Math.floor(diameter / 2); dy < diameter; dy++) {
    for (let dx = 0; dx < diameter; dx++) {
      const px = dx - radius;
      const py = dy - radius;
      if (px * px + py * py <= radius * radius) {
        const index = (dy * diameter + dx) * 4;
        const pixel = [data[index], data[index + 1], data[index + 2]];
        bottomTotal++;
        if (isSolidPixel(pixel)) bottomSolidCount++;
      }
    }
  }

  const bottomSolidRatio = bottomTotal ? bottomSolidCount / bottomTotal : 0;
  if (bottomSolidRatio < 0.8) {
    lemming.reachedEndOfMiningSquare++;
	const direction = lemming.facing === "right" ? 1 : -1;
  for (let i = 0; i < 15; i++) {
    const arcX = checkX + direction * i;
    const arcY = checkY + 1 * i * 0.5;

    ctx.fillStyle = "rgb(0,0,0)";
    ctx.beginPath();
    ctx.arc(arcX, arcY, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  }

  ctx.fillStyle = "rgb(0,0,0)";
  ctx.beginPath();
  ctx.arc(checkX, checkY, radius, 0, Math.PI * 2);
  ctx.fill();

  updateCollisionPixels();
}
  
  
function digBlock(ctx, lemming, centerX, centerY) {
  const digWidth = lemming.width * 1.2;
  const digHeight = 6;
  const checkHeight = 4;

  const startX = Math.floor(centerX - digWidth / 2);
  const digY = Math.floor(centerY - 6);
  const checkY = digY + digHeight - 2;

  ctx.fillStyle = "rgb(0, 0, 0)";
  ctx.fillRect(startX, digY, digWidth, digHeight);

  const imageData = ctx.getImageData(
    startX,
    checkY,
    Math.ceil(digWidth),
    checkHeight
  );
  const data = imageData.data;

  let totalPixels = 0;
  let blackPixels = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    totalPixels++;
    if (r === 0 && g === 0 && b === 0) {
      blackPixels++;
    }
  }

  const blackRatio = totalPixels > 0 ? blackPixels / totalPixels : 0;

  if (blackRatio >= 0.95) {
    lemming.reachedEndOfDiggingSquare++;
  }

  updateCollisionPixels();
} 

function bashBlock(ctx, lemming, x, y, radius) {
	const checkOffsetX = x + (lemming.facing === 'right' ? lemming.width : -lemming.width);

	const imageData = ctx.getImageData(
		Math.floor(checkOffsetX - radius),
		Math.floor(y - radius),
		Math.ceil(radius * 2),
		Math.ceil(radius * 2)
	);
	const data = imageData.data;
	let totalPixels = 0;
	let solidPixels = 0;

	const diameter = Math.ceil(radius * 2);

	for (let dy = 0; dy < diameter; dy++) {
		for (let dx = 0; dx < diameter; dx++) {
			const px = dx - radius;
			const py = dy - radius;
			if (px * px + py * py <= radius * radius) {
				const index = (dy * diameter + dx) * 4;
				const pixel = [data[index], data[index + 1], data[index + 2]];
				totalPixels++;
				if (isSolidPixel(pixel)) solidPixels++;
			}
		}
	}

	ctx.fillStyle = 'rgb(0,0,0)';
	ctx.beginPath();
	ctx.arc(x, y, radius, 0, Math.PI * 2);
	ctx.fill();

	const solidRatio = solidPixels / totalPixels;
	if (solidRatio < 0.04) {
		lemming.reachedEndOfBashingSquare++;
	}

	let edgeSolidCount = 0;
	let edgeTotal = 0;

	const rowsToCheck = 4;

	for (let row = 0; row < rowsToCheck; row++) {
		const dy = diameter - 1 - row; 

		const halfStart = Math.floor(diameter * 0.25);
		const halfEnd = Math.ceil(diameter * 0.75);

		for (let dx = halfStart; dx < halfEnd; dx++) {
			const index = (dy * diameter + dx) * 4;
			const pixel = [data[index], data[index + 1], data[index + 2]];
			edgeTotal++;
			if (isSolidPixel(pixel)) edgeSolidCount++;
		}
	}

	const edgeSolidRatio = edgeSolidCount / edgeTotal;
	if (edgeSolidRatio < 0.5) {
		lemming.reachedEndOfBashingSquare++;
	}

	updateCollisionPixels();
}


function buildSlab(lemming) {
    const collisionCanvas = getCollisionCanvas();
    if (!collisionCanvas) return;

    const ctx = collisionCanvas.getContext('2d');
    const slabWidth = 8;
    const slabHeight = 3;

    const slabY = lemming.y + lemming.height - 2;
    const lemmingCenterX = lemming.x + lemming.width / 2;
    let firstSlabX, secondSlabX;

    if (lemming.facing === 'right') {
        firstSlabX = Math.round(lemmingCenterX + 1);
        secondSlabX = firstSlabX + slabWidth;
    } else {
        firstSlabX = Math.round(lemmingCenterX - 1 - slabWidth);
        secondSlabX = firstSlabX - slabWidth;
    }

    if ((lemming.buildingSlabs || 0) < 4) {
        ctx.fillStyle = 'rgb(255,255,255)';
        ctx.fillRect(firstSlabX, slabY, slabWidth, slabHeight);
        ctx.fillRect(secondSlabX, slabY, slabWidth, slabHeight);
    } else {
        ctx.fillStyle = 'rgb(255,255,255)';
        ctx.fillRect(firstSlabX, slabY, slabWidth, slabHeight);
        ctx.fillStyle = BUILDER_SLAB_COLOR;
        ctx.fillRect(secondSlabX, slabY, slabWidth, slabHeight);
    }

	const extremeEdgeX = lemming.facing === 'right'
    ? secondSlabX + slabWidth - 1
    : secondSlabX - slabWidth + 1;

	let allNotBlack = false;
	for (let dy = 0; dy < 3; dy++) {
		const pixel = getPixelColor(extremeEdgeX, slabY + dy);
		if (pixel[0] > PIXEL_THRESHOLD && pixel[1] > PIXEL_THRESHOLD && pixel[2] > PIXEL_THRESHOLD && lemming.buildingSlabs > 2) {
			allNotBlack = true;
			break;
		}
	}

	if (allNotBlack) {
		lemming.state = 'walking';
	}

	updateCollisionPixels();
}

function explodeTerrain(lemming) {
	const collisionCanvas = getCollisionCanvas();
	if (!collisionCanvas) return;

	const ctx = collisionCanvas.getContext('2d');
	if (!ctx) return;

	const centerX = lemming.x + lemming.width / 2;
	const centerY = lemming.y + lemming.height / 2;

	ctx.fillStyle = 'black';
	ctx.beginPath();
	ctx.arc(centerX, centerY, EXPLOSION_RADIUS, 0, Math.PI * 2);
	ctx.fill();

	explosionDebrisAnimation(centerX, centerY);
	updateCollisionPixels();
}

function explosionDebrisAnimation(originX, originY) {
	originY *= 1.25;
	const container = document.body;

	let particlesToCreate = Math.min(EXPLOSION_PARTICLE_COUNT, MAX_EXPLOSION_PARTICLES - activeExplosionParticles);
	if (particlesToCreate <= 0) return;

	for (let i = 0; i < EXPLOSION_PARTICLE_COUNT; i++) {
		activeExplosionParticles++;
		const particle = document.createElement('div');
		particle.classList.add('explosion-particle');

		const colors = ['#ff0000', '#ff6600', '#ffffcc', '#ffffff'];
		particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];

		const startX = originX;
		const startY = originY;
		particle.style.left = `${startX}px`;
		particle.style.top = `${startY}px`;

		const angle = Math.random() * 2 * Math.PI;
		const speed = Math.random() * 10 + 5;
		let vx = Math.cos(angle) * speed;
		let vy = Math.sin(angle) * speed;

		let x = startX;
		let y = startY;
		let distanceTravelled = 0;

		container.appendChild(particle);

		function animate() {
			vx *= 0.98;
			vy += EXPLOSION_PARTICLE_GRAVITY;

			x += vx;
			y += vy;
			distanceTravelled += Math.sqrt(vx * vx + vy * vy);

			particle.style.transform = `translate(${x - startX}px, ${y - startY}px)`;

			if (distanceTravelled < MAX_DISTANCE_EXPLOSION_PARTICLE) {
				requestAnimationFrame(animate);
			} else {
				particle.remove();
				activeExplosionParticles--;
			}
		}

		const opacity = 1 - (distanceTravelled / MAX_DISTANCE_EXPLOSION_PARTICLE);
		particle.style.opacity = opacity;
		requestAnimationFrame(animate);
	}
}

export function setGameState(newState) {
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
			//console.log("Language is " + getLanguage());
			switch (currentLanguage) {
				case 'en':
					getElements().btnEnglish.classList.add('active');
					break;
				case 'es':
					getElements().btnSpanish.classList.add('active');
					break;
				case 'de':
					getElements().btnGerman.classList.add('active');
					break;
				case 'it':
					getElements().btnItalian.classList.add('active');
					break;
				case 'fr':
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