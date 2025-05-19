import { getCollisionImage, setCollisionImage, setPaintMode, getPaintMode, SCROLL_SPEED, LEVEL_WIDTH, gameState, getLanguageChangedFlag, setLanguageChangedFlag, getLanguage, setElements, getElements, setBeginGameStatus, getGameInProgress, setGameInProgress, getGameVisiblePaused, getBeginGameStatus, getGameVisibleActive, getMenuState, getLanguageSelected, setLanguageSelected, setLanguage, getBrushRadius, SCROLL_EDGE_THRESHOLD } from './constantsAndGlobalVars.js';
import { updateCollisionPixels, setGameState, startGame, gameLoop } from './game.js';
import { initLocalization, localize } from './localization.js';
import { loadGameOption, loadGame, saveGame, copySaveStringToClipBoard } from './saveLoadGame.js';

let scrollLeft = false;
let scrollRight = false;

let cameraX = 0;

export let collisionCanvas = null;
export let collisionCtx = null;

document.addEventListener('DOMContentLoaded', async () => {
    setElements();
    
    let isPainting = false;
    const canvas = getElements().canvas;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    // Event listeners
    canvas.addEventListener('mousemove', (e) => {
        const canvasWidth = getElements().canvas.width;
        const canvasHeight = getElements().canvas.height;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        
        scrollLeft = x < SCROLL_EDGE_THRESHOLD;
        scrollRight = x > canvasWidth - SCROLL_EDGE_THRESHOLD;
    });

    const paintBtn = document.getElementById('paintMode');

    paintBtn.addEventListener('click', () => {
        let paintMode = getPaintMode();
        paintMode = !paintMode;
        setPaintMode(paintMode);

        if (paintMode) {
            paintBtn.classList.remove('btn-warning');
            paintBtn.classList.add('btn-success');
        } else {
            paintBtn.classList.remove('btn-success');
            paintBtn.classList.add('btn-warning');
        }
        console.log('Paint Mode now: ' + paintMode);
    });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    canvas.addEventListener('mousedown', (e) => {
        if (!getPaintMode()) return;
        let paintType;

        if (e.button === 0) {
            paintType = 'add';
        } else if (e.button === 2) {
            paintType = 'remove';
        } else {
            return;
        }

        isPainting = true;
        paintAtMouse(e, paintType);
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!getPaintMode() || !isPainting) return;
        let paintType;

        if (e.buttons & 1) {
            paintType = 'add';
        } else if (e.buttons & 2) {
            paintType = 'remove';
        } else {
            isPainting = false;
            return;
        }

        paintAtMouse(e, paintType);
    });

    canvas.addEventListener('mouseup', () => {
        isPainting = false;  
    });

    canvas.addEventListener('mouseleave', () => {
        isPainting = false;   
    });

    getElements().newGameMenuButton.addEventListener('click', () => {
        setBeginGameStatus(true);
        if (!getGameInProgress()) {
            setGameInProgress(true);
        }
        disableActivateButton(getElements().resumeGameMenuButton, 'active', 'btn-primary');
        disableActivateButton(getElements().saveGameButton, 'active', 'btn-primary');
        setGameState(getGameVisiblePaused());
        startGame();
    });

    getElements().pauseResumeGameButton.addEventListener('click', () => {
        if (gameState === getGameVisiblePaused()) {
            if (getBeginGameStatus()) {
                setBeginGameStatus(false);
            }
            setGameState(getGameVisibleActive());
        } else if (gameState === getGameVisibleActive()) {
            setGameState(getGameVisiblePaused());
        }
    });

    getElements().resumeGameMenuButton.addEventListener('click', () => {
        if (gameState === getMenuState()) {
            setGameState(getGameVisiblePaused());
        }
        gameLoop();
    });

    getElements().returnToMenuButton.addEventListener('click', () => {
        setGameState(getMenuState());
    });

    getElements().btnEnglish.addEventListener('click', () => {
        handleLanguageChange('en');
        setGameState(getMenuState());
    });

    getElements().btnSpanish.addEventListener('click', () => {
        handleLanguageChange('es');
        setGameState(getMenuState());
    });

    getElements().btnGerman.addEventListener('click', () => {
        handleLanguageChange('de');
        setGameState(getMenuState());
    });

    getElements().btnItalian.addEventListener('click', () => {
        handleLanguageChange('it');
        setGameState(getMenuState());
    });

    getElements().btnFrench.addEventListener('click', () => {
        handleLanguageChange('fr');
        setGameState(getMenuState());
    });

    getElements().saveGameButton.addEventListener('click', function () {
        getElements().overlay.classList.remove('d-none');
        saveGame(true);
    });

    getElements().loadGameButton.addEventListener('click', function () {
        getElements().overlay.classList.remove('d-none');
        loadGameOption();
    });

    getElements().copyButtonSavePopup.addEventListener('click', function () {
        copySaveStringToClipBoard();
    });

    getElements().closeButtonSavePopup.addEventListener('click', function () {
        getElements().saveLoadPopup.classList.add('d-none');
        getElements().overlay.classList.add('d-none');
    });

    getElements().loadStringButton.addEventListener('click', function () {
        loadGame(true)
            .then(() => {
                setElements();
                getElements().saveLoadPopup.classList.add('d-none');
                document.getElementById('overlay').classList.add('d-none');
                setGameState(getMenuState());
            })
            .catch((error) => {
                console.error('Error loading game:', error);
            });
    });
    setGameState(getMenuState());
    handleLanguageChange(getLanguageSelected());
});

function paintAtMouse(e, type) {
  const ctx = getElements().canvas.getContext('2d', { willReadFrequently: true });
  const rect = canvas.getBoundingClientRect();
  const rawMouseX = Math.floor(e.clientX - rect.left);
  const mouseY = Math.floor(e.clientY - rect.top);
  const mouseX = rawMouseX + getCameraX();
  const radius = getBrushRadius();

  if (!collisionCanvas || !collisionCtx) {
    console.warn('Collision canvas/context not ready!');
    return;
  }

  paintCircleOnBothCanvases(mouseX, mouseY, radius, type);

setTimeout(() => {
  updateCollisionPixels();
}, 0);

}

function paintCircleOnBothCanvases(centerX, centerY, radius, type) {
if (!collisionCanvas || !collisionCtx || !visualCanvas || !visualCtx) return;

  collisionCtx.save();
  collisionCtx.beginPath();
  collisionCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  collisionCtx.closePath();
  collisionCtx.clip();

  if (type === 'add') {
    collisionCtx.fillStyle = 'white';
    collisionCtx.globalAlpha = 1.0;
    collisionCtx.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
  } else if (type === 'remove') {
    collisionCtx.fillStyle = 'black';
    collisionCtx.globalAlpha = 1.0;
    collisionCtx.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
  }
  collisionCtx.restore();

  visualCtx.save();
  visualCtx.beginPath();
  visualCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  visualCtx.closePath();
  visualCtx.clip();

  if (type === 'add') {
    visualCtx.fillStyle = 'white';
    visualCtx.globalAlpha = 1.0;
    visualCtx.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
  } else if (type === 'remove') {
    visualCtx.fillStyle = 'black';
    visualCtx.globalAlpha = 1.0;
    visualCtx.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
  }
  visualCtx.restore();
}

export function updateCamera() {
    if (scrollLeft) {
        cameraX = Math.max(0, cameraX - SCROLL_SPEED);
    }
    if (scrollRight) {
        const canvasWidth = getElements().canvas.width;
        cameraX = Math.min(LEVEL_WIDTH - canvasWidth, cameraX + SCROLL_SPEED);
    }
}

async function setElementsLanguageText() {
    getElements().menuTitle.innerHTML = `<h2>${localize('menuTitle', getLanguage())}</h2>`;
    getElements().newGameMenuButton.innerHTML = `${localize('newGame', getLanguage())}`;
    getElements().resumeGameMenuButton.innerHTML = `${localize('resumeGame', getLanguage())}`;
    getElements().loadGameButton.innerHTML = `${localize('loadGame', getLanguage())}`;
    getElements().saveGameButton.innerHTML = `${localize('saveGame', getLanguage())}`;
    getElements().loadStringButton.innerHTML = `${localize('loadButton', getLanguage())}`;
}

export async function handleLanguageChange(languageCode) {
    setLanguageSelected(languageCode);
    await setupLanguageAndLocalization();
    setElementsLanguageText();
}

async function setupLanguageAndLocalization() {
    setLanguage(getLanguageSelected());
    await initLocalization(getLanguage());
}

export function disableActivateButton(button, action, activeClass) {
    switch (action) {
        case 'active':
            button.classList.remove('disabled');
            button.classList.add(activeClass);
            break;
        case 'disable':
            button.classList.remove(activeClass);
            button.classList.add('disabled');
            break;
    }
}

export function getCameraX() {
    return cameraX;
}

export function setCameraX(value) {
    cameraX = value;
}

export async function createCollisionCanvas() {
    collisionCanvas = document.createElement('canvas');
    collisionCanvas.width = LEVEL_WIDTH;
    collisionCanvas.height = getElements().canvas.height;

    collisionCtx = collisionCanvas.getContext('2d', { willReadFrequently: true });
    const collisionImage = getCollisionImage();

    collisionCtx.drawImage(
    collisionImage,
    0, 0, collisionImage.width, collisionImage.height,
    0, 0, collisionCanvas.width, collisionCanvas.height
    );
}

export let visualCanvas = null;
export let visualCtx = null;

export async function createVisualCanvas() {
    visualCanvas = document.createElement('canvas');
    visualCanvas.width = LEVEL_WIDTH;
    visualCanvas.height = getElements().canvas.height;
    visualCtx = visualCanvas.getContext('2d', { willReadFrequently: true });
}
