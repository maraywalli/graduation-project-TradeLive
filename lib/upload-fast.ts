'use client';

type UploadOptions = {
  timeoutMs?: number;
  maxEdge?: number;
  quality?: number;
};

export async function uploadImageFast(file: File, options: UploadOptions = {}): Promise<string> {
  const compressed = await compressImageFast(file, options.maxEdge ?? 1200, options.quality ?? 0.78).catch(() => file);
  const fd = new FormData();
  fd.append('file', compressed);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), options.timeoutMs ?? 30_000);
  try {
    const res = await fetch('/api/items/upload', {
      method: 'POST',
      body: fd,
      signal: ctrl.signal,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.url) throw new Error(json.error || `Upload failed (${res.status})`);
    return json.url as string;
  } finally {
    clearTimeout(timer);
  }
}

async function compressImageFast(file: File, maxEdge: number, quality: number): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  if (file.size < 180 * 1024) return file;

  const bitmap = await createBitmap(file);
  const ratio = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * ratio));
  const height = Math.max(1, Math.round(bitmap.height * ratio));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(bitmap as CanvasImageSource, 0, 0, width, height);
  if ('close' in bitmap && typeof bitmap.close === 'function') bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob || blob.size >= file.size) return file;

  const base = (file.name.replace(/\.[^.]+$/, '') || 'image').slice(0, 60);
  return new File([blob], `${base}.jpg`, { type: 'image/jpeg' });
}

async function createBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    return createImageBitmap(file, { imageOrientation: 'from-image' });
  }

  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
