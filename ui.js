import { setPaintMode, getPaintMode, SCROLL_SPEED, LEVEL_WIDTH, CANVAS_HEIGHT, CANVAS_WIDTH, gameState, getLanguageChangedFlag, setLanguageChangedFlag, getLanguage, setElements, getElements, setBeginGameStatus, getGameInProgress, setGameInProgress, getGameVisiblePaused, getBeginGameStatus, getGameVisibleActive, getMenuState, getLanguageSelected, setLanguageSelected, setLanguage, getBrushRadius } from './constantsAndGlobalVars.js';
import { getPixelColor, collisionImage, setGameState, startGame, gameLoop } from './game.js';
import { initLocalization, localize } from './localization.js';
import { loadGameOption, loadGame, saveGame, copySaveStringToClipBoard } from './saveLoadGame.js';

let scrollLeft = false;
let scrollRight = false;

let cameraX = 0;

export let collisionCanvas = null;
export let collisionCtx = null;
export let collisionPixels;

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
        
        scrollLeft = x < 50;
        scrollRight = x > canvasWidth - 50;
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

    canvas.addEventListener('mousedown', (e) => {
    if (!getPaintMode()) return;
        isPainting = true;
        paintAtMouse(e);
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!getPaintMode() || !isPainting) return;
            paintAtMouse(e);
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

export function updateCollisionPixels() {
  if (collisionCtx && collisionCanvas) {
    collisionPixels = collisionCtx.getImageData(0, 0, collisionCanvas.width, collisionCanvas.height);
  }
}

function paintAtMouse(e) {
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

  //console.log("Painting...");
  //paintCircleOnCanvas(collisionCanvas, collisionCtx, mouseX, mouseY, radius);
  //paintCircleOnCanvas(canvas, ctx, rawMouseX, mouseY, radius);
  paintCircleOnBothCanvases(rawMouseX, mouseY, radius);

setTimeout(() => {
  updateCollisionPixels();
  const testColor = getPixelColor(mouseX, mouseY);
  //console.log(`Pixel at (${mouseX}, ${mouseY}) =`, testColor);
}, 0);

}

function paintCircleOnBothCanvases(centerX, centerY, radius) {
  const visibleCanvas = getElements().canvas;
  const visibleCtx = visibleCanvas.getContext('2d', { willReadFrequently: true });
  
  if (!collisionCanvas || !collisionCtx) {
    console.warn('Collision canvas/context not ready!');
    return;
  }

  const canvases = [
    { canvas: collisionCanvas, ctx: collisionCtx },
    { canvas: visibleCanvas, ctx: visibleCtx }
  ];

  canvases.forEach(({ canvas, ctx }) => {
    const startX = Math.max(0, centerX - radius);
    const startY = Math.max(0, centerY - radius);
    const width = Math.min(radius * 2, canvas.width - startX);
    const height = Math.min(radius * 2, canvas.height - startY);

    const imageData = ctx.getImageData(startX, startY, width, height);
    const data = imageData.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x + startX - centerX;
        const dy = y + startY - centerY;
        if (dx * dx + dy * dy <= radius * radius) {
          const idx = (y * width + x) * 4;
          data[idx] = 255;       // R
          data[idx + 1] = 255;   // G
          data[idx + 2] = 255;   // B
          data[idx + 3] = 255;   // A
        }
      }
    }
    ctx.putImageData(imageData, startX, startY);
  });
}

function paintCircleOnCanvas(canvas, ctx, centerX, centerY, radius) {
  const startX = Math.max(0, centerX - radius);
  const startY = Math.max(0, centerY - radius);
  const width = Math.min(radius * 2, canvas.width - startX);
  const height = Math.min(radius * 2, canvas.height - startY);

  const imageData = ctx.getImageData(startX, startY, width, height);
  const data = imageData.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x + startX - centerX;
      const dy = y + startY - centerY;
      if (dx * dx + dy * dy <= radius * radius) {
        const idx = (y * width + x) * 4;
        data[idx] = 255;       // R
        data[idx + 1] = 255;   // G
        data[idx + 2] = 255;   // B
        data[idx + 3] = 255;   // A
      }
    }
  }
  ctx.putImageData(imageData, startX, startY);
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
    const mainCanvas = getElements().canvas;

    collisionCanvas = document.createElement('canvas');
    collisionCanvas.width = LEVEL_WIDTH;
    collisionCanvas.height = getElements().canvas.height;

    collisionCtx = collisionCanvas.getContext('2d', { willReadFrequently: true });

    collisionCtx.drawImage(
    collisionImage,
    0, 0, collisionImage.width, collisionImage.height,
    0, 0, collisionCanvas.width, collisionCanvas.height
    );

    console.log(`Collision canvas created. Size: ${collisionCanvas.width}x${collisionCanvas.height}`);
}
