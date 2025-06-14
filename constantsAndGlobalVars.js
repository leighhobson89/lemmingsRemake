//DEBUG
export let stateLoading = false;

//ELEMENTS
let elements;
let localization = {};
let language = 'en';
let languageSelected = 'en';
let oldLanguage = 'en';

//CONSTANTS
export let gameState;

export const BASE_FPS = 30;
export const BASE_FRAME_DURATION = 1000 / BASE_FPS;

let isFastForward = false;
let frameDuration = BASE_FRAME_DURATION;

export const BUILDER_SLAB_COLOR = 'rgb(253,253,253)';
export const MAX_EXPLOSION_PARTICLES = 400;
export const COLLISION_GRID_CELL_SIZE = 40;
export const EXPLOSION_PARTICLE_COUNT = 75;
export const MAX_DISTANCE_EXPLOSION_PARTICLE = 800;
export const EXPLOSION_PARTICLE_GRAVITY = 0.2;
export const EXPLOSION_RADIUS = 35;
export const FAST_FORWARD_AMOUNT = 4;
export const DIE_FALLING_THRESHOLD = 150;
export const ACTIVATE_FLOAT_THRESHOLD = 80;
export const HOLD_INTERVAL = 60;
export const HOLD_DELAY = 800;
export const CLICK_THRESHOLD = 800;
export const SCROLL_SPEED = 10;
export const SCROLL_EDGE_THRESHOLD = 50;
export const PIXEL_THRESHOLD = 10;
export const RELEASE_RATE_BALANCER = 5;
export const LEVEL_WIDTH = 3000;
export const MENU_STATE = 'menuState';
export const GAME_VISIBLE_PAUSED = 'gameVisiblePaused';
export const GAME_VISIBLE_ACTIVE = 'gameVisibleActive';
export const NUMBER_OF_ENEMY_SQUARES_TO_INITIALIZE = 10;
export const INITIAL_SPEED_LEMMING = 1.5;
export const MAX_ATTEMPTS_TO_DRAW_ENEMIES = 1000;
export const LEMMING_WIDTH = 20;
export const LEMMING_HEIGHT = 25;
export const TURN_COOLDOWN = 5;
export const GRAVITY_SPEED = 5; //0.05
export const COLLISION_CHECK_INTERVAL = 20;
export const NUKE_CLICK_THRESHOLD = 1000;
export const SPAWN_COLOR = {
    r: 255,
    g: 255,
    b: 0
};
export const AIR_ENEMY_COLOR = {
    r: 255,
    g: 0,
    b: 0
}
export const GROUND_ENEMY_COLOR = {
    r: 255,
    g: 165,
    b: 0
};
export const EXIT_COLOR = {
    r: 0,
    g: 255,
    b: 0
};
export const boomingAreaFrames = [
    [
        [8, 9, 10],
        [8, 9, 10],
        [8, 9, 10]
    ],
    [
        [11, 12, 13],
        [11, 12, 13],
        [11, 12, 13]
    ],
    [
        [14, 15, 16],
        [14, 15, 16],
        [14, 15, 16]
    ],
    [
        [null, null, null],
        [null, 18, null],
        [null, 18, null]
    ]
];

export const EXIT_SPRITE_WIDTH = 40;
export const EXIT_SPRITE_HEIGHT = 25;
export const EXITS_SPRITE_SHEET_WIDTH = 171;
export const EXITS_SPRITE_SHEET_HEIGHT = 150;
export const EXITS_SPRITE_SHEET_COLUMNS = Math.floor(EXITS_SPRITE_SHEET_WIDTH / (EXIT_SPRITE_WIDTH + 2));
export const EXITS_SPRITE_SHEET_FRAMES_PER_COLUMN = 6;

export const EXITS_THEMES = {
  desert: {
    column: 0,
    framesPerColumn: 6,
    spriteWidth: EXIT_SPRITE_WIDTH,
    spriteHeight: EXIT_SPRITE_HEIGHT,
    horizontalGap: 2,
  },
  ocean: {
    column: 1,
    framesPerColumn: 6,
    spriteWidth: EXIT_SPRITE_WIDTH,
    spriteHeight: EXIT_SPRITE_HEIGHT,
    horizontalGap: 2,
  },
  industrial: {
    column: 2,
    framesPerColumn: 6,
    spriteWidth: EXIT_SPRITE_WIDTH,
    spriteHeight: EXIT_SPRITE_HEIGHT,
    horizontalGap: 2,
  },
  forest: {
    column: 3,
    framesPerColumn: 6,
    spriteWidth: EXIT_SPRITE_WIDTH,
    spriteHeight: EXIT_SPRITE_HEIGHT,
    horizontalGap: 2,
  },
  candy: {
    column: 0,
    framesPerColumn: 6,
    spriteWidth: EXIT_SPRITE_WIDTH,
    spriteHeight: EXIT_SPRITE_HEIGHT,
    horizontalGap: 2,
  },
  autumn: {
    column: 1,
    framesPerColumn: 6,
    spriteWidth: EXIT_SPRITE_WIDTH,
    spriteHeight: EXIT_SPRITE_HEIGHT,
    horizontalGap: 2,
  },
  classic: {
    column: 2,
    framesPerColumn: 6,
    spriteWidth: EXIT_SPRITE_WIDTH,
    spriteHeight: EXIT_SPRITE_HEIGHT,
    horizontalGap: 2,
  },
};

export const SPAWN_SPRITE_WIDTH = 82;
export const SPAWN_SPRITE_HEIGHT = 50;
export const SPAWNS_SPRITE_SHEET_WIDTH = 600;
export const SPAWNS_SPRITE_SHEET_HEIGHT = 600;
export const SPAWNS_SPRITE_SHEET_COLUMNS = Math.floor(SPAWNS_SPRITE_SHEET_WIDTH / (SPAWN_SPRITE_WIDTH + 4));
export const SPAWNS_SPRITE_SHEET_FRAMES_PER_COLUMN = 10;

export const SPAWN_THEMES = {
  desert: {
    column: 0,
    framesPerColumn: 10,
    spriteWidth: SPAWN_SPRITE_WIDTH,
    spriteHeight: SPAWN_SPRITE_HEIGHT,
    horizontalGap: 4,
  },
  ocean: {
    column: 1,
    framesPerColumn: 10,
    spriteWidth: SPAWN_SPRITE_WIDTH,
    spriteHeight: SPAWN_SPRITE_HEIGHT,
    horizontalGap: 4,
  },
  industrial: {
    column: 2,
    framesPerColumn: 10,
    spriteWidth: SPAWN_SPRITE_WIDTH,
    spriteHeight: SPAWN_SPRITE_HEIGHT,
    horizontalGap: 4,
  },
  forest: {
    column: 3,
    framesPerColumn: 10,
    spriteWidth: SPAWN_SPRITE_WIDTH,
    spriteHeight: SPAWN_SPRITE_HEIGHT,
    horizontalGap: 4,
  },
  candy: {
    column: 4,
    framesPerColumn: 10,
    spriteWidth: SPAWN_SPRITE_WIDTH,
    spriteHeight: SPAWN_SPRITE_HEIGHT,
    horizontalGap: 4,
  },
  autumn: {
    column: 5,
    framesPerColumn: 10,
    spriteWidth: SPAWN_SPRITE_WIDTH,
    spriteHeight: SPAWN_SPRITE_HEIGHT,
    horizontalGap: 4,
  },
  classic: {
    column: 6,
    framesPerColumn: 10,
    spriteWidth: SPAWN_SPRITE_WIDTH,
    spriteHeight: SPAWN_SPRITE_HEIGHT,
    horizontalGap: 4,
  },
};

export const spriteSheets = {};
export const spriteFramesMap = {};
export const countdownAreaFrames = [8, 9, 10, 11, 12];
export const LEMMING_SPRITE_WIDTH = 8;
export const LEMMING_SPRITE_HEIGHT = 10;
export const LEMMINGS_SPRITE_SHEET_WIDTH = 160;
export const LEMMINGS_SPRITE_SHEET_HEIGHT = 400;
export const LEMMINGS_SPRITE_SHEET_FRAMES_PER_ROW = LEMMINGS_SPRITE_SHEET_WIDTH / LEMMING_SPRITE_WIDTH;

loadSpriteSheet('lemmings', './assets/sprites/spriteSheet.png');
loadSpriteSheet('spawns', './assets/sprites/spawnsSprites.png',
  SPAWN_SPRITE_WIDTH,
  SPAWN_SPRITE_HEIGHT,
  SPAWNS_SPRITE_SHEET_WIDTH,
  SPAWNS_SPRITE_SHEET_HEIGHT,
  {
    horizontalGap: 4,
    columns: Object.keys(SPAWN_THEMES).length,
    framesPerColumn: 10,
    order: 'column',
  }
);
loadSpriteSheet('exits', './assets/sprites/exitsSprites.png',
  EXIT_SPRITE_WIDTH,
  EXIT_SPRITE_HEIGHT,
  EXITS_SPRITE_SHEET_WIDTH,
  EXITS_SPRITE_SHEET_HEIGHT,
  {
    horizontalGap: 2,
    columns: 4,
    framesPerColumn: 6,
    order: 'column',
  }
);

export function loadSpriteSheet(
  id,
  src,
  spriteWidth = LEMMING_SPRITE_WIDTH,
  spriteHeight = LEMMING_SPRITE_HEIGHT,
  sheetWidth = LEMMINGS_SPRITE_SHEET_WIDTH,
  sheetHeight = LEMMINGS_SPRITE_SHEET_HEIGHT,
  options = {}
) {
  const {
    horizontalGap = 0,
    framesPerColumn = Math.floor(sheetHeight / spriteHeight),
    columns = Math.floor(sheetWidth / spriteWidth),
    order = 'row',
  } = options;

  const img = new Image();
  img.src = src;
  spriteSheets[id] = img;

  img.onload = () => {
    const frames = [];

    if (order === 'row') {
      for (let row = 0; row < framesPerColumn; row++) {
        for (let col = 0; col < columns; col++) {
          const x = col * (spriteWidth + horizontalGap);
          const y = row * spriteHeight;

          if (x + spriteWidth <= sheetWidth && y + spriteHeight <= sheetHeight) {
            frames.push({ x, y, w: spriteWidth, h: spriteHeight, col, row });
          }
        }
      }
    } else if (order === 'column') {
      for (let col = 0; col < columns; col++) {
        for (let row = 0; row < framesPerColumn; row++) {
          const x = col * (spriteWidth + horizontalGap);
          const y = row * spriteHeight;

          if (x + spriteWidth <= sheetWidth && y + spriteHeight <= sheetHeight) {
            frames.push({ x, y, w: spriteWidth, h: spriteHeight, col, row });
          }
        }
      }
    } else {
      console.warn(`Unknown frame order "${order}" for sprite sheet "${id}".`);
    }

    spriteFramesMap[id] = frames;
    console.log(`Sprite sheet "${id}" loaded with ${frames.length} frames.`);
  };
}

export function getSpawnGlobalFrameIndex(theme, frameIndex) {
  const themeData = SPAWN_THEMES[theme];
  if (!themeData) throw new Error(`Unknown theme: ${theme}`);

  const { column, framesPerColumn } = themeData;

  if (frameIndex < 0 || frameIndex >= framesPerColumn) {
    throw new Error(`Invalid frameIndex: ${frameIndex} for theme: ${theme}`);
  }

  return column * framesPerColumn + frameIndex;
}

export const urlCustomMouseCursorNormal = './assets/mouse/mouseCrosshair.png';
export const urlCustomMouseCursorHoverLemming = './assets/mouse/mouseHoverLemming.png';

export function setLemmingsStartPosition({
    x,
    y
}) {
    const lemming = getLemmingObject();
    lemming.x = x;
    lemming.y = y;
}

export const toolTypes = new Set(['climberTool', 'floaterTool']);
export const actionStatesMap = {
  builderTool: 'building',
  blockerTool: 'blocking',
  basherTool: 'bashing',
  minerTool: 'mining',
  diggerTool: 'digging',
};

const levelToolsRemaining = {
    "climberTool": 1,
    "floaterTool": 1,
    "exploderTool": 1,
    "blockerTool": 1,
    "builderTool": 1,
    "basherTool": 1,
    "minerTool": 1,
    "diggerTool": 1
};


export const lemmingLevelData = {
    level1: {
        lemmings: 15,
        releaseRate: 500,
        startingTools: {
            "climberTool": 10,
            "floaterTool": 10,
            "exploderTool": 10,
            "blockerTool": 6,
            "builderTool": 15,
            "basherTool": 10,
            "minerTool": 10,
            "diggerTool": 15
        },
        facing: 'right',
        theme: 'industrial'
    }
}

export const toolButtons = [
    'climberTool',
    'floaterTool',
    'exploderTool',
    'blockerTool',
    'builderTool',
    'basherTool',
    'minerTool',
    'diggerTool'
];

export const lemmingNames = [
    "Alex", "Bailey", "Casey", "Drew", "Elliot", "Finley", "Gray", "Harper", "Indigo", "Jesse",
    "Kai", "Logan", "Morgan", "Nico", "Ocean", "Parker", "Quinn", "Riley", "Sawyer", "Taylor",
    "Blake", "Cameron", "Dakota", "Emery", "Flynn", "Genesis", "Haven", "Ivory", "Jaden", "Kendall",
    "Lane", "Marlow", "Nova", "Oakley", "Phoenix", "Quincy", "Reese", "Sage", "Tatum", "Urban",
    "Vale", "Winter", "Xen", "Yale", "Zion", "Arden", "Blaine", "Charlie", "Devon", "Emerson",
    "Frankie", "Gale", "Hayden", "Ira", "Jules", "Karter", "Lee", "Micah", "Noel", "Onyx",
    "Peyton", "Quade", "Rory", "Skyler", "Terry", "Umber", "Vega", "Wren", "Xander", "Yael",
    "Zane", "Ash", "Bryn", "Cruz", "Denver", "Ellis", "Florian", "Grayce", "Hollis", "Izzy",
    "Jory", "Kris", "Lennon", "Marlo", "Nicolette", "Oak", "Pax", "Raine", "Sasha", "Toby",
    "Urban", "Vail", "West", "Xavi", "Yanni", "Zephyr", "Ari", "Blair", "Cyan", "Dallas"
];

export const lemmingObject = {
    x: 100,
    y: 100,
    width: LEMMING_WIDTH,
    height: LEMMING_HEIGHT,
    dx: getInitialSpeedLemming(),
    dy: getInitialSpeedLemming(),
    facing: 'right',
    gravity: true,
    tool: null,
    state: 'falling',
    fallenDistance: 0,
    dieUponImpact: false,
    collisionBox: false,
    countdownActive: false,
    active: false,
    name: null,
    reachedEndOfBashingSquare: 0,
    reachedEndOfMiningSquare: 0,
    reachedEndOfDiggingSquare: 0,
};

export function getNewLemmingObject() {
    return {
      x: 100,
      y: 100,
      width: LEMMING_WIDTH,
      height: LEMMING_HEIGHT,
      dx: getInitialSpeedLemming(),
      dy: getInitialSpeedLemming(),
      facing: "right",
      gravity: true,
      tool: null,
      state: "falling",
      fallenDistance: 0,
      dieUponImpact: false,
      collisionBox: false,
      countdownActive: false,
      active: false,
      name: null,
      reachedEndOfBashingSquare: 0,
      reachedEndOfMiningSquare: 0,
      reachedEndOfDiggingSquare: 0,
    };
}

//GLOBAL VARIABLES
let lastPaintClickLocation = null;
let brushRadius = 15;
let releaseRate = 1000;
let lemmingsObjects = [];
let collisionImage = null;
let staticEnemies = {};
let lemmingsReleased = 0;
let cameraX = 0;
let collisionPixels = null;
let collisionCanvas = null;
let collisionCtx = null;
let numberOfLemmingsForCurrentLevel = 0;
let lemmingsRescued = 0;
let currentTool = 'climberTool';
let paintColor = '#FFFFFF';

//FLAGS
let audioMuted;
let languageChangedFlag;
let beginGameState = true;
let gameInProgress = false;
let debugFlag = false;
let paintMode = false;
let scrollLeft = false;
let scrollRight = false;
let isPainting = false;
let levelStarted = false;
let spawnOpenedForLevel = false;

let autoSaveOn = false;
export let pauseAutoSaveCountdown = true;

//GETTER SETTER METHODS
export function setElements() {
    elements = {
        menu: document.getElementById('menu'),
        menuTitle: document.getElementById('menuTitle'),
        newGameMenuButton: document.getElementById('newGame'),
        resumeGameMenuButton: document.getElementById('resumeFromMenu'),
        loadGameButton: document.getElementById('loadGame'),
        saveGameButton: document.getElementById('saveGame'),
        saveLoadPopup: document.getElementById('loadSaveGameStringPopup'),
        loadSaveGameStringTextArea: document.getElementById('loadSaveGameStringTextArea'),
        loadStringButton: document.getElementById('loadStringButton'),
        textAreaLabel: document.getElementById('textAreaLabel'),
        returnToMenuButton: document.getElementById('returnToMenu'),
        pauseResumeGameButton: document.getElementById('resumeGame'),
        canvas: document.getElementById('canvas'),
        canvasContainer: document.getElementById('canvasContainer'),
        buttonRow: document.getElementById('buttonRow'),
        btnEnglish: document.getElementById('btnEnglish'),
        btnSpanish: document.getElementById('btnSpanish'),
        btnFrench: document.getElementById('btnFrench'),
        btnGerman: document.getElementById('btnGerman'),
        btnItalian: document.getElementById('btnItalian'),
        copyButtonSavePopup: document.getElementById('copyButtonSavePopup'),
        closeButtonSavePopup: document.getElementById('closeButtonSavePopup'),
        overlay: document.getElementById('overlay'),
        customCursor: document.getElementById('customCursor'),
        paintButton: document.getElementById('paintMode'),
        colorPallette: document.getElementById('colorPallette'),
    };
}

export function setDebugMode(value) {
    debugFlag = value;
}

export function getDebugMode() {
    return debugFlag;
}

export function setPaintMode(value) {
    paintMode = value;
}

export function getPaintMode() {
    return paintMode;
}

export function getLemmingObject() {
    return lemmingObject;
}

export function setGameStateVariable(value) {
    gameState = value;
}

export function getGameStateVariable() {
    return gameState;
}

export function getElements() {
    return elements;
}

export function getLanguageChangedFlag() {
    return languageChangedFlag;
}

export function setLanguageChangedFlag(value) {
    languageChangedFlag = value;
}

export function resetAllVariables() {
    // GLOBAL VARIABLES

    // FLAGS
}

export function captureGameStatusForSaving() {
    let gameState = {};

    // Game variables

    // Flags

    // UI elements

    gameState.language = getLanguage();

    return gameState;
}
export function restoreGameStatus(gameState) {
    return new Promise((resolve, reject) => {
        try {
            // Game variables

            // Flags

            // UI elements

            setLanguage(gameState.language);

            resolve();
        } catch (error) {
            reject(error);
        }
    });
}

export function setReleaseRate(value) {
    releaseRate = value;
}

export function getReleaseRate() {
    return releaseRate;
}

export function getLemmingLevelData(level) {
    return lemmingLevelData[level];
}

export function setLocalization(value) {
    localization = value;
}

export function getLocalization() {
    return localization;
}

export function setLanguage(value) {
    language = value;
}

export function getLanguage() {
    return language;
}

export function setOldLanguage(value) {
    oldLanguage = value;
}

export function getOldLanguage() {
    return oldLanguage;
}

export function setAudioMuted(value) {
    audioMuted = value;
}

export function getAudioMuted() {
    return audioMuted;
}

export function getMenuState() {
    return MENU_STATE;
}

export function getGameVisiblePaused() {
    return GAME_VISIBLE_PAUSED;
}

export function getGameVisibleActive() {
    return GAME_VISIBLE_ACTIVE;
}

export function getInitialSpeedLemming() {
    return INITIAL_SPEED_LEMMING;
}

export function getMaxAttemptsToDrawEnemies() {
    return MAX_ATTEMPTS_TO_DRAW_ENEMIES;
}

export function getLanguageSelected() {
    return languageSelected;
}

export function setLanguageSelected(value) {
    languageSelected = value;
}

export function getBeginGameStatus() {
    return beginGameState;
}

export function setBeginGameStatus(value) {
    beginGameState = value;
}

export function getGameInProgress() {
    return gameInProgress;
}

export function setGameInProgress(value) {
    gameInProgress = value;
}

export function getBrushRadius() {
    return brushRadius;
}

export function setBrushRadius(value) {
    brushRadius = value;
}

export function getLemmingsObjects() {
    return lemmingsObjects;
}

export function setLemmingsObjects(value, key, property) {
    lemmingsObjects[key][property] = value;
}

export function pushNewLemmingToLemmingsObjects(value) {
    lemmingsObjects.push(value);
}

export function resetLemmingsObjects() {
    lemmingsObjects.length = 0
}

export function getCollisionImage() {
    return collisionImage;
}

export function setCollisionImage(value) {
    collisionImage = value;
}

export function changeCollisionImageProperty(value, property) {
    collisionImage[property] = value;
}

export function getStaticEnemies() {
    return staticEnemies;
}

export function setStaticEnemies(value) {
    Object.assign(staticEnemies, value);
}

export function getLemmingsReleased() {
    return lemmingsReleased;
}

export function setLemmingsReleased(value) {
    lemmingsReleased = value;
}

export function getCameraX() {
    return cameraX;
}

export function setCameraX(value) {
    cameraX = value;
}

export function getScrollLeftFlag() {
    return scrollLeft;
}

export function setScrollLeftFlag(value) {
    scrollLeft = value;
}

export function getScrollRightFlag() {
    return scrollRight;
}

export function setScrollRightFlag(value) {
    scrollRight = value;
}

export function getCollisionPixels() {
    return collisionPixels;
}

export function setCollisionPixels(value) {
    collisionPixels = value;
}

export function getCollisionCanvas() {
    return collisionCanvas;
}

export function setCollisionCanvas(value) {
    collisionCanvas = value;
}

export function getCollisionCtx() {
    return collisionCtx;
}

export function setCollisionCtx(value) {
    collisionCtx = value;
}

export function changeCollisionCanvasProperty(value, property) {
    collisionCanvas[property] = value;
}

export function getIsPainting() {
    return isPainting;
}

export function setIsPainting(value) {
    isPainting = value;
}

export function getLemmingNames() {
    return lemmingNames;
}

export function setLemmingsRescued() {
    lemmingsRescued++;
}

export function getLemmingsRescued() {
    return lemmingsRescued;
}

export function setNumberOfLemmingsForCurrentLevel(value) {
    numberOfLemmingsForCurrentLevel = value;
}

export function getNumberOfLemmingsForCurrentLevel() {
    return numberOfLemmingsForCurrentLevel;
}

export function setCurrentTool(value) {
    currentTool = value;
}

export function getCurrentTool() {
    return currentTool;
}

export function setCustomMouseCursor(value) {
    const cursorElement = getElements().customCursor;
    if (!cursorElement) return;
    cursorElement.src = getCustomMouseCursor(value);
}

export function getCustomMouseCursor(value) {
    switch (value) {
        case 'normal':
            return urlCustomMouseCursorNormal;
        case 'hoverLemming':
            return urlCustomMouseCursorHoverLemming;
    }
}

export function getLevelToolsRemaining() {
    return levelToolsRemaining;
}

export function setLevelToolsRemaining(property, value) {
    levelToolsRemaining[property] = value;
}

export function getBoomingAreaFrames() {
    return boomingAreaFrames;
}

export function getCountdownAreaFrames() {
    return countdownAreaFrames;
}

export function getIsFastForward() {
    return isFastForward;
}

export function setIsFastForward(value) {
    isFastForward = value;
}

export function setFrameDuration(value) {
    frameDuration = value;
}

export function getFrameDuration() {
    return frameDuration;
}   

export function setPaintColor(value) {
  paintColor = value;
}

export function getPaintColor() {
  return paintColor;
}  

export function setLastPaintClickLocation({ x, y }) {
  lastPaintClickLocation = { x, y };
}  

export function getLastPaintClickLocation() {
  return lastPaintClickLocation;
}  

export function setLevelStarted(value) {
  levelStarted = value;
}  

export function getLevelStarted() {
  return levelStarted;
}  

export function setSpawnOpenedForLevel(value) {
  spawnOpenedForLevel = value;
}  

export function getSpawnOpenedForLevel() {
  return spawnOpenedForLevel;
}  