import { 
    FAST_FORWARD_AMOUNT,
    setLemmingsReleased,
    NUKE_CLICK_THRESHOLD,   
    setFrameDuration,
    getFrameDuration,
    BASE_FPS,
    BASE_FRAME_DURATION,
    getLevelToolsRemaining,
    toolButtons,
    setCustomMouseCursor,
    getLemmingsObjects,
    HOLD_DELAY,
    HOLD_INTERVAL,
    CLICK_THRESHOLD,
    setCurrentTool,
    getCurrentTool,
    getDebugMode,
    setDebugMode,
    getIsPainting,
    setIsPainting,
    changeCollisionCanvasProperty,
    getCollisionCanvas,
    getCollisionCtx,
    setCollisionCanvas,
    setCollisionCtx,
    getScrollLeftFlag,
    getScrollRightFlag,
    setScrollLeftFlag,
    setScrollRightFlag,
    setCameraX,
    getCameraX,
    getCollisionImage,
    setCollisionImage,
    setPaintMode,
    getPaintMode,
    SCROLL_SPEED,
    LEVEL_WIDTH,
    gameState,
    getLanguageChangedFlag,
    setLanguageChangedFlag,
    getLanguage,
    setElements,
    getElements,
    setBeginGameStatus,
    getGameInProgress,
    setGameInProgress,
    getGameVisiblePaused,
    getBeginGameStatus,
    getGameVisibleActive,
    getMenuState,
    getLanguageSelected,
    setLanguageSelected,
    setLanguage,
    getBrushRadius,
    SCROLL_EDGE_THRESHOLD,
    setReleaseRate,
    getReleaseRate,
    setIsFastForward,
    getIsFastForward,
    getNumberOfLemmingsForCurrentLevel
} from './constantsAndGlobalVars.js';
import {
    updateCollisionPixels,
    setGameState,
    startGame,
    gameLoop,
    handleLemmingClick
} from './game.js';
import {
    initLocalization,
    localize
} from './localization.js';
import {
    loadGameOption,
    loadGame,
    saveGame,
    copySaveStringToClipBoard
} from './saveLoadGame.js';

export let latestMousePos = {
    x: 0,
    y: 0
};
export let isCursorInsideCanvas = false;

document.addEventListener('DOMContentLoaded', async () => {
    setElements();
    const canvas = getElements().canvas;

    toolButtons.forEach(toolId => {
        const btn = document.getElementById(toolId);
        if (!btn) return;

        btn.addEventListener('click', () => {
            setCurrentTool(toolId);

            toolButtons.forEach(id => {
                const button = document.getElementById(id);
                if (!button) return;

                if (id === toolId) {
                    button.classList.remove('btn-secondary');
                    button.classList.add('btn-success');
                } else {
                    button.classList.remove('btn-success');
                    button.classList.add('btn-secondary');
                }
            });
        });
    });

    canvas.addEventListener('mouseenter', () => {
        isCursorInsideCanvas = true;
        enableCustomCursor();
    });

    canvas.addEventListener('mouseleave', () => {
        isCursorInsideCanvas = false;
        disableCustomCursor();
    });

    // Event listeners
    // release rate Buttons
    setupHoldableButton(document.getElementById('releaseRateMinus'), decreaseReleaseRate);
    setupHoldableButton(document.getElementById('releaseRatePlus'), increaseReleaseRate);

    // Nuke button
    let lastNukeClickTime = 0;
    document.getElementById('nukeButton').addEventListener('click', () => {
        const now = Date.now();

        if (now - lastNukeClickTime <= NUKE_CLICK_THRESHOLD) {
            triggerNuke();
            lastNukeClickTime = 0;
        } else {
            lastNukeClickTime = now;
        }
    });

    // Fast forward button
    document.getElementById('fastForwardButton').addEventListener('click', () => toggleFastForward());

    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        latestMousePos.x = e.clientX - rect.left;
        latestMousePos.y = e.clientY - rect.top;

        const canvasWidth = getElements().canvas.width;
        const x = e.clientX - rect.left;

        setScrollLeftFlag(x < SCROLL_EDGE_THRESHOLD);
        setScrollRightFlag(x > canvasWidth - SCROLL_EDGE_THRESHOLD);

        if (!getPaintMode() || !getIsPainting()) return;

        let paintType;

        if (e.buttons & 1) {
            paintType = 'add';
        } else if (e.buttons & 2) {
            paintType = 'remove';
        } else {
            setIsPainting(false);
            return;
        }

        paintAtMouse(e, paintType);
    });

    const debugBtn = document.getElementById('debugMode');

    debugBtn.addEventListener('click', () => {
        let debugMode = getDebugMode();
        debugMode = !debugMode;
        setDebugMode(debugMode);

        if (debugMode) {
            debugBtn.classList.remove('btn-warning');
            debugBtn.classList.add('btn-success');
        } else {
            debugBtn.classList.remove('btn-success');
            debugBtn.classList.add('btn-warning');
        }
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
    });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    canvas.addEventListener('mousedown', (e) => {
        if (getPaintMode()) {
            let paintType;

            if (e.button === 0) {
                paintType = 'add';
            } else if (e.button === 2) {
                paintType = 'remove';
            } else {
                return;
            }

            setIsPainting(true);
            paintAtMouse(e, paintType);
            return;
        }

        const rect = getElements().canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const worldX = mouseX + getCameraX();
        const worldY = mouseY;

        let closestLemming = null;
        let minDistance = Infinity;

        for (const lemming of getLemmingsObjects()) {
            if (isPointInsideLemming(worldX, worldY, lemming)) {
                const centerX = lemming.x + lemming.width / 2;
                const centerY = lemming.y + lemming.height / 2;
                const dx = worldX - centerX;
                const dy = worldY - centerY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < minDistance) {
                    minDistance = distance;
                    closestLemming = lemming;
                }
            }
        }

        if (closestLemming) {
            handleLemmingClick(closestLemming);
        }
    });

    canvas.addEventListener('mouseup', () => {
        setIsPainting(false);
    });

    canvas.addEventListener('mouseleave', () => {
        setIsPainting(false);
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

    getElements().saveGameButton.addEventListener('click', function() {
        getElements().overlay.classList.remove('d-none');
        saveGame(true);
    });

    getElements().loadGameButton.addEventListener('click', function() {
        getElements().overlay.classList.remove('d-none');
        loadGameOption();
    });

    getElements().copyButtonSavePopup.addEventListener('click', function() {
        copySaveStringToClipBoard();
    });

    getElements().closeButtonSavePopup.addEventListener('click', function() {
        getElements().saveLoadPopup.classList.add('d-none');
        getElements().overlay.classList.add('d-none');
    });

    getElements().loadStringButton.addEventListener('click', function() {
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
})

function setupHoldableButton(element, action) {
    let pressStartTime = 0;
    let holdTimeoutId = null;
    let holdIntervalId = null;
    let holdMode = false;

    const start = () => {
        pressStartTime = Date.now();
        holdMode = false;

        holdTimeoutId = setTimeout(() => {
            holdMode = true;
            holdIntervalId = setInterval(action, HOLD_INTERVAL);
        }, HOLD_DELAY);
    };

    const stop = () => {
        const pressDuration = Date.now() - pressStartTime;

        clearTimeout(holdTimeoutId);
        if (holdIntervalId) {
            clearInterval(holdIntervalId);
            holdIntervalId = null;
        }

        if (!holdMode && pressDuration < CLICK_THRESHOLD) {
            action();
        } else if (holdMode) {}
    };

    element.addEventListener('mousedown', start);
    element.addEventListener('mouseup', stop);
    element.addEventListener('mouseleave', stop);
}


function paintAtMouse(e, type) {
    const rect = canvas.getBoundingClientRect();
    const rawMouseX = Math.floor(e.clientX - rect.left);
    const mouseY = Math.floor(e.clientY - rect.top);
    const mouseX = rawMouseX + getCameraX();
    const radius = getBrushRadius();

    if (!getCollisionCanvas() || !getCollisionCtx()) {
        console.warn('Collision canvas/context not ready!');
        return;
    }

    paintCircleOnBothCanvases(mouseX, mouseY, radius, type);

    setTimeout(() => {
        updateCollisionPixels();
    }, 0);

}

function paintCircleOnBothCanvases(centerX, centerY, radius, type) {
    if (!getCollisionCanvas() || !getCollisionCtx() || !visualCanvas || !visualCtx) return;

    const collisionCtx = getCollisionCtx();

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
    if (getScrollLeftFlag()) {
        setCameraX(Math.max(0, getCameraX() - SCROLL_SPEED));
    }
    if (getScrollRightFlag()) {
        const canvasWidth = getElements().canvas.width;
        setCameraX(Math.min(LEVEL_WIDTH - canvasWidth, getCameraX() + SCROLL_SPEED));
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

export async function createCollisionCanvas() {
    const collisionCanvas = document.createElement('canvas');
    setCollisionCanvas(collisionCanvas);

    changeCollisionCanvasProperty(LEVEL_WIDTH, 'width');
    changeCollisionCanvasProperty(getElements().canvas.height, 'height');

    const ctx = collisionCanvas.getContext('2d', {
        willReadFrequently: true
    });
    ctx.imageSmoothingEnabled = false;

    setCollisionCtx(ctx);

    const collisionImage = getCollisionImage();
    ctx.drawImage(
        collisionImage,
        0, 0, collisionImage.width, collisionImage.height,
        0, 0, collisionCanvas.width, collisionCanvas.height
    );
}

export let visualCanvas = null;
export let visualCtx = null;

export async function createPaintingCanvas() {
    visualCanvas = document.createElement('canvas');
    visualCanvas.width = LEVEL_WIDTH;
    visualCanvas.height = getElements().canvas.height;
    visualCtx = visualCanvas.getContext('2d', {
        willReadFrequently: true
    });
}

export function increaseReleaseRate() {
    const currentRate = getReleaseRate();
    if (currentRate > 10) {
        setReleaseRate(currentRate - 10);
    }
    // console.log('Release rate:', String(100 - getReleaseRate() / 10).padStart(2, '0'));
}

export function decreaseReleaseRate() {
    const currentRate = getReleaseRate();
    if (currentRate < 990) {
        setReleaseRate(currentRate + 10);
    }
    // console.log('Release rate:', String(100 - getReleaseRate() / 10).padStart(2, '0'));
}

export function toggleFastForward() {
    setIsFastForward(!getIsFastForward());
    setFrameDuration(getIsFastForward() ? BASE_FRAME_DURATION / FAST_FORWARD_AMOUNT : BASE_FRAME_DURATION);

    const btn = document.getElementById('fastForwardButton');
    btn.classList.remove('btn-success', 'btn-warning');
    btn.classList.add(getIsFastForward() ? 'btn-success' : 'btn-warning');
}

export function getCustomMouseCursor(value) {
    switch (value) {
        case 'normal':
            return urlCustomMouseCursorNormal;
        case 'hoverLemming':
            return urlCustomMouseCursorHoverLemming;
    }
}

export function trackCursor(pos) {
    if (!pos) return;

    const customCursor = getElements().customCursor;
    if (!customCursor) return;

    const canvas = getElements().canvas;
    const rect = canvas.getBoundingClientRect();

    const cursorWidth = 32;
    const cursorHeight = 32;
    const offsetX = cursorWidth / 2;
    const offsetY = cursorHeight / 2;

    const pageX = pos.x + rect.left;
    const pageY = pos.y + rect.top;

    customCursor.style.transform = `translate(${pageX - offsetX}px, ${pageY - offsetY}px)`;

    // Use pageX/pageY for hit testing if needed
    const mockEvent = {
        clientX: pageX,
        clientY: pageY
    };
    const isHoveringLemming = checkIfHoveringLemming(mockEvent);

    if (isHoveringLemming) {
        setCustomMouseCursor('hoverLemming');
    } else {
        setCustomMouseCursor('normal');
    }
}

function checkIfHoveringLemming(event) {
    const canvas = getElements().canvas;
    const rect = canvas.getBoundingClientRect();

    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const worldX = mouseX + getCameraX();
    const worldY = mouseY;

    for (const lemming of getLemmingsObjects()) {
        if (isPointInsideLemming(worldX, worldY, lemming)) {
            return true;
        }
    }

    return false;
}


function isPointInsideLemming(x, y, lemming) {
    return (
        x >= lemming.x &&
        x <= lemming.x + lemming.width &&
        y >= lemming.y &&
        y <= lemming.y + lemming.height
    );
}

function enableCustomCursor() {
    const canvas = getElements().canvas;
    canvas.style.cursor = 'none';

    const cursor = getElements().customCursor;
    if (cursor) {
        cursor.classList.remove('d-none');
    }
}

function disableCustomCursor() {
    const canvas = getElements().canvas;
    canvas.style.cursor = 'default';

    const cursor = getElements().customCursor;
    if (cursor) {
        cursor.classList.add('d-none');
    }
}

export function updateToolButtons() {
  const toolsRemaining = getLevelToolsRemaining();

  Object.entries(toolsRemaining).forEach(([toolId, count]) => {
    const button = document.getElementById(toolId);
    if (!button) return;

    const baseLabel = button.dataset.baseLabel || button.innerHTML.split('<br>')[0];
    button.dataset.baseLabel = baseLabel;
    button.innerHTML = `${baseLabel}<br>(${count})`;
  });
}

function triggerNuke() {
    setLemmingsReleased(getNumberOfLemmingsForCurrentLevel());
    const lemmings = getLemmingsObjects();
    let totalDelay = 0;

    for (const lemming of lemmings) {
        if (lemming.active) {
            const delay = Math.random() * 50 + 50;
            totalDelay += delay;

            setTimeout(() => {
                lemming.countdownActive = true;
            }, totalDelay);
        }
    }
}