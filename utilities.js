import { collisionCanvas, collisionCtx } from "./ui.js";
import { getElements } from "./constantsAndGlobalVars.js";

export function capitalizeString(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export function drawCollisionOverlay(ctx, cameraX) {
  if (!collisionCanvas || !collisionCtx) {
    console.warn('Collision canvas or context not available');
    return;
  }

  const width = collisionCanvas.width;
  const height = collisionCanvas.height;

  // Grab fresh pixel data each time
  const imageData = collisionCtx.getImageData(0, 0, width, height);
  const data = imageData.data;

  ctx.save();
  ctx.globalAlpha = 1.0;
  ctx.fillStyle = 'yellow';

  const step = 4;

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const index = (y * width + x) * 4;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];

      if (r > 10 || g > 10 || b > 10) {
        const drawX = x - cameraX;
        if (drawX + step >= 0 && drawX <= getElements().canvas.width) {
          ctx.fillRect(drawX, y, step, step);
        }
      }
    }
  }

  ctx.restore();
}

