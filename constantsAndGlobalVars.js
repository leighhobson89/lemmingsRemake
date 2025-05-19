//DEBUG
export let debugFlag = false;
export let debugOptionFlag = false;
export let stateLoading = false;

//ELEMENTS
let elements;
let localization = {};
let language = 'en';
let languageSelected = 'en';
let oldLanguage = 'en';

//CONSTANTS
export let gameState;

export const SCROLL_SPEED = 5;
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export const LEVEL_WIDTH = 3000;
export const MENU_STATE = 'menuState';
export const GAME_VISIBLE_PAUSED = 'gameVisiblePaused';
export const GAME_VISIBLE_ACTIVE = 'gameVisibleActive';
export const NUMBER_OF_ENEMY_SQUARES = 10;
export const INITIAL_SPEED_LEMMING = 1;
export const MAX_ATTEMPTS_TO_DRAW_ENEMIES = 1000;
export const LEMMING_WIDTH = 5;
export const LEMMING_HEIGHT = 20;
export const GRAVITY_SPEED = 4; //0.05
export const FPS = 60;
export const FRAME_DURATION = 1000 / FPS;
export const COLLISION_CHECK_INTERVAL = 20;

export const SPRITE_SIZE = 10;
export const SHEET_WIDTH = 200;
export const SHEET_HEIGHT = 200;
export const FRAMES_PER_ROW = SHEET_WIDTH / SPRITE_SIZE;

export const spriteSheet = new Image();
spriteSheet.src = './assets/sprites/spritesheet.png';

const spriteFrames = []

spriteSheet.onload = () => {
  for (let row = 0; row < SHEET_HEIGHT / SPRITE_SIZE; row++) {
    for (let col = 0; col < SHEET_WIDTH / SPRITE_SIZE; col++) {
      spriteFrames.push({
        x: col * SPRITE_SIZE,
        y: row * SPRITE_SIZE,
        w: SPRITE_SIZE,
        h: SPRITE_SIZE
      });
    }
  }

  console.log('Sprite cache ready:', spriteFrames.length, 'frames');
};


export function setLemmingsStartPosition({ x, y }) {
    const lemming = getLemmingObject();
    lemming.x = x;
    lemming.y = y;
}

export const lemmingObject = {
    x: 100,
    y: 100,
    width: LEMMING_WIDTH,
    height: LEMMING_HEIGHT,
    dx: getInitialSpeedLemming(),
    dy: getInitialSpeedLemming(),
    facing: 'right',
    gravity: true,
    falling: true
};

//GLOBAL VARIABLES
let brushRadius = 5;

//FLAGS
let audioMuted;
let languageChangedFlag;
let beginGameState = true;
let gameInProgress = false;
let paintMode = false;

let autoSaveOn = false;
export let pauseAutoSaveCountdown = true;

//GETTER SETTER METHODS
export function setElements() {
    elements = {
        menu: document.getElementById('menu'),
        menuTitle: document.getElementById('menuTitle'),
        newGameMenuButton:  document.getElementById('newGame'),
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
        overlay: document.getElementById('overlay')
    };
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

export function getNumberOfEnemySquares() {
    return NUMBER_OF_ENEMY_SQUARES;
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
