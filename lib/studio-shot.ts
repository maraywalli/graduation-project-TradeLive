// Browser-side professional product photo generator.
// Steps:
// 1. Cut subject out of original photo using @imgly/background-removal (runs in WebAssembly).
// 2. Auto-crop to the subject's bounding box (removes wasted whitespace).
// 3. Render onto a high-res white-to-light-grey backdrop with a soft contact shadow.
// Output: 1024x1024 JPEG suitable for e-commerce hero shots.

import { removeBackground } from '@imgly/background-removal';

const SIZE = 1024;
const PADDING = 0.12; // 12% margin around the subject

async function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } finally {
    // The URL stays valid until revoked; revoke after image is fully drawn elsewhere.
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
}

function getSubjectBounds(img: HTMLImageElement): { x: number; y: number; w: number; h: number } {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height).data;
  let minX = c.width, minY = c.height, maxX = 0, maxY = 0, found = false;
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      const a = data[(y * c.width + x) * 4 + 3];
      if (a > 16) {
        found = true;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (!found) return { x: 0, y: 0, w: c.width, h: c.height };
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

export async function generateStudioShot(
  file: File,
  onProgress?: (stage: string, pct: number) => void,
): Promise<Blob> {
  onProgress?.('Removing background', 5);
  const cutoutBlob = await removeBackground(file, {
    output: { format: 'image/png', quality: 1 },
    progress: (key, current, total) => {
      // imgly progresses in stages: model download, segmentation
      const pct = Math.min(85, 5 + Math.round((current / Math.max(1, total)) * 80));
      onProgress?.(`Processing (${key})`, pct);
    },
  });
  onProgress?.('Compositing studio shot', 90);

  const cutoutImg = await blobToImage(cutoutBlob);
  const bounds = getSubjectBounds(cutoutImg);

  // Final canvas
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;

  // Backdrop: smooth radial vignette from white center to soft cool grey edge
  const grad = ctx.createRadialGradient(SIZE * 0.5, SIZE * 0.42, SIZE * 0.1, SIZE * 0.5, SIZE * 0.55, SIZE * 0.75);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.7, '#f4f4f5');
  grad.addColorStop(1, '#d4d4d8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Floor reflection band — gives it the "infinity cove" studio look
  const floor = ctx.createLinearGradient(0, SIZE * 0.7, 0, SIZE);
  floor.addColorStop(0, 'rgba(0,0,0,0)');
  floor.addColorStop(1, 'rgba(0,0,0,0.06)');
  ctx.fillStyle = floor;
  ctx.fillRect(0, SIZE * 0.7, SIZE, SIZE * 0.3);

  // Compute subject placement: scale to fit (1 - 2*padding) of canvas, anchored slightly above floor
  const targetMax = SIZE * (1 - PADDING * 2);
  const scale = Math.min(targetMax / bounds.w, targetMax / bounds.h);
  const drawW = bounds.w * scale;
  const drawH = bounds.h * scale;
  const drawX = (SIZE - drawW) / 2;
  const drawY = SIZE * 0.55 - drawH / 2; // slightly above center

  // Soft contact shadow ellipse beneath the subject
  const shadowY = drawY + drawH - 4;
  const shadowW = drawW * 0.85;
  const shadowH = Math.max(8, drawH * 0.06);
  ctx.save();
  ctx.translate(SIZE / 2, shadowY);
  ctx.scale(1, shadowH / shadowW);
  const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, shadowW / 2);
  sg.addColorStop(0, 'rgba(0,0,0,0.32)');
  sg.addColorStop(0.6, 'rgba(0,0,0,0.12)');
  sg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.arc(0, 0, shadowW / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Drop the cropped subject in
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    cutoutImg,
    bounds.x, bounds.y, bounds.w, bounds.h,
    drawX, drawY, drawW, drawH,
  );

  onProgress?.('Done', 100);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas export failed'))), 'image/jpeg', 0.92);
  });
}
