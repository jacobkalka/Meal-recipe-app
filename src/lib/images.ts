"use client";

import { useEffect, useState } from "react";
import { repository } from "./data/local-repository";

/** Long-edge limit and JPEG quality for images sent to the AI. */
export const AI_IMAGE_MAX_EDGE = 1568;
export const AI_IMAGE_QUALITY = 0.85;
/** Smaller copy kept in storage for display and later recipe tweaks. */
const STORED_IMAGE_MAX_EDGE = 900;
const STORED_IMAGE_QUALITY = 0.78;

async function decode(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // fall through to <img> decoding (older Safari, unusual formats)
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function render(source: ImageBitmap | HTMLImageElement, maxEdge: number, quality: number): string {
  const width = "naturalWidth" in source ? source.naturalWidth : source.width;
  const height = "naturalHeight" in source ? source.naturalHeight : source.height;
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available");
  // JPEG has no alpha: paint white first so transparent PNGs don't turn black.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

export interface PreparedImage {
  /** Full-size copy for the AI (max 1568px, JPEG ~0.85). */
  forAI: string;
  /** Smaller copy for storage and display. */
  forStorage: string;
}

/** Resizes + compresses a picked photo client-side before it is uploaded. */
export async function prepareImage(file: Blob): Promise<PreparedImage> {
  const source = await decode(file);
  try {
    return {
      forAI: render(source, AI_IMAGE_MAX_EDGE, AI_IMAGE_QUALITY),
      forStorage: render(source, STORED_IMAGE_MAX_EDGE, STORED_IMAGE_QUALITY),
    };
  } finally {
    if ("close" in source) source.close();
  }
}

/** Tiny square avatar (center-cropped). */
export async function prepareAvatar(file: Blob, size = 160): Promise<string> {
  const source = await decode(file);
  const width = "naturalWidth" in source ? source.naturalWidth : source.width;
  const height = "naturalHeight" in source ? source.naturalHeight : source.height;
  const side = Math.min(width, height);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available");
  ctx.drawImage(source, (width - side) / 2, (height - side) / 2, side, side, 0, 0, size, size);
  if ("close" in source) source.close();
  return canvas.toDataURL("image/jpeg", 0.8);
}

// ---------- in-memory caches ----------

const displayCache = new Map<string, string>();
/** Full-resolution copies from this session, preferred when re-sending to the AI. */
const aiCache = new Map<string, string>();

export function rememberImage(id: string, image: PreparedImage) {
  displayCache.set(id, image.forStorage);
  aiCache.set(id, image.forAI);
}

export async function storeImage(id: string, image: PreparedImage): Promise<boolean> {
  rememberImage(id, image);
  return repository.putImage(id, image.forStorage);
}

/** Best available copy of an image for an AI request (null if it's gone). */
export async function imageForAI(id: string | null): Promise<string | null> {
  if (!id) return null;
  return aiCache.get(id) ?? displayCache.get(id) ?? (await repository.getImage(id));
}

/** Loads a stored image for display. */
export function useStoredImage(id: string | null): { src: string | null; loading: boolean } {
  const [loaded, setLoaded] = useState<{ id: string; src: string | null } | null>(null);

  useEffect(() => {
    if (!id || displayCache.has(id)) return;
    let alive = true;
    repository.getImage(id).then((src) => {
      if (src) displayCache.set(id, src);
      if (alive) setLoaded({ id, src });
    });
    return () => {
      alive = false;
    };
  }, [id]);

  if (!id) return { src: null, loading: false };
  const cached = displayCache.get(id);
  if (cached) return { src: cached, loading: false };
  return loaded?.id === id ? { src: loaded.src, loading: false } : { src: null, loading: true };
}
