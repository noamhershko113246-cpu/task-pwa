"use client";

import { supabase } from "./supabase";

const MAX_DIMENSION = 1600; // px, long edge — plenty for a phone/tablet background
const JPEG_QUALITY = 0.82;
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // reject obviously-huge originals before we even try to decode them

/** Downscales/compresses an image file client-side so uploads stay small and fast. */
async function resizeToJpegBlob(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("לא ניתן לעבד את התמונה בדפדפן הזה");
  ctx.drawImage(bitmap, 0, 0, width, height);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("עיבוד התמונה נכשל"))), "image/jpeg", JPEG_QUALITY);
  });
}

export async function uploadBackground(userId: string, file: File): Promise<{ url: string } | { error: string }> {
  if (!file.type.startsWith("image/")) return { error: "יש לבחור קובץ תמונה" };
  if (file.size > MAX_UPLOAD_BYTES) return { error: "התמונה גדולה מדי (מקסימום 8MB)" };

  let blob: Blob;
  try {
    blob = await resizeToJpegBlob(file);
  } catch {
    return { error: "לא ניתן היה לעבד את התמונה הזו" };
  }

  // One object per user, fixed name — every re-upload simply overwrites the last one
  // instead of accumulating orphaned files in the bucket forever.
  const path = `${userId}/background.jpg`;
  const { error: uploadError } = await supabase.storage
    .from("backgrounds")
    .upload(path, blob, { contentType: "image/jpeg", upsert: true });
  if (uploadError) return { error: "העלאת התמונה נכשלה: " + uploadError.message };

  const { data } = supabase.storage.from("backgrounds").getPublicUrl(path);
  // Cache-bust so the new image shows immediately even though the path/filename is unchanged.
  return { url: `${data.publicUrl}?v=${Date.now()}` };
}

export async function removeBackground(userId: string): Promise<void> {
  await supabase.storage.from("backgrounds").remove([`${userId}/background.jpg`]);
}
