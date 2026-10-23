"use client";

import { LIMITS } from "./types";

export type CompressedImage = { dataUrl: string; w: number; h: number; bytes: number };

const MAX_EDGE = 1600;
const TARGET_BYTES = 450_000; // ~600 KB as base64, comfortably inside one Firestore doc

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

function readAsDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

/**
 * Shrinks a screenshot in the browser (max 1600px edge, WebP or JPEG) so it can be stored
 * in Firestore without Cloud Storage and without passing through our server.
 */
export async function compressImage(file: File): Promise<CompressedImage> {
  if (!file.type.startsWith("image/")) throw new Error(`${file.name} isn't an image.`);
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error(`Couldn't read ${file.name}.`);

  let scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  // Each pass lowers quality, then size, until the image fits.
  for (let pass = 0; pass < 6; pass++) {
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const quality = Math.max(0.5, 0.82 - pass * 0.08);
    let blob = await toBlob(canvas, "image/webp", quality);
    // Safari can't encode WebP and silently returns PNG; use JPEG there.
    if (!blob || blob.type !== "image/webp") blob = await toBlob(canvas, "image/jpeg", quality);
    if (blob && blob.size <= TARGET_BYTES) {
      const dataUrl = await readAsDataUrl(blob);
      if (dataUrl.length <= LIMITS.fileChars) {
        bitmap.close();
        return { dataUrl, w: canvas.width, h: canvas.height, bytes: blob.size };
      }
    }
    if (pass >= 2) scale *= 0.75;
  }
  bitmap.close();
  throw new Error(`${file.name} is too large even after compressing. Try a smaller screenshot.`);
}
