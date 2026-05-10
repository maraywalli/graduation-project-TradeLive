'use client';

type UploadOptions = {
  timeoutMs?: number;
  maxEdge?: number;
  quality?: number;
  onProgress?: (percent: number) => void;
};

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;
const MIN_COMPRESS_SIZE = 800 * 1024;

export async function uploadImageFast(file: File, options: UploadOptions = {}): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image uploads are allowed');
  }
  if (file.size > MAX_UPLOAD_SIZE) {
    throw new Error('Image must be under 10 MB');
  }

  const shouldCompress = file.size >= MIN_COMPRESS_SIZE;
  const compressed = shouldCompress
    ? await compressImageFast(file, options.maxEdge ?? 1200, options.quality ?? 0.78).catch(() => file)
    : file;

  const fd = new FormData();
  fd.append('file', compressed, compressed.name);

  return await new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const timeoutMs = options.timeoutMs ?? 30_000;
    const timer = window.setTimeout(() => xhr.abort(), timeoutMs);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && typeof options.onProgress === 'function') {
        options.onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      window.clearTimeout(timer);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const json = JSON.parse(xhr.responseText || '{}');
          if (json?.url) {
            resolve(json.url as string);
            return;
          }
          reject(new Error(json?.error || `Upload failed (${xhr.status})`));
        } catch {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      } else {
        try {
          const json = JSON.parse(xhr.responseText || '{}');
          reject(new Error(json?.error || `Upload failed (${xhr.status})`));
        } catch {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      }
    };

    xhr.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error('Upload failed'));
    };

    xhr.onabort = () => {
      window.clearTimeout(timer);
      reject(new DOMException('Upload aborted', 'AbortError'));
    };

    xhr.open('POST', '/api/items/upload');
    xhr.send(fd);
  });
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
