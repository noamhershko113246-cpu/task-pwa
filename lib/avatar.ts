"use client";

import { supabase } from "./supabase";

const MAX_DIMENSION = 512; // px — displayed as a small circle everywhere, no need for more
const JPEG_QUALITY = 0.85;
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // reject obviously-huge originals before we even try to decode them

/** Center-crops to a square then downscales/compresses, so every avatar fills its circle
 *  cleanly (like a WhatsApp/Instagram profile photo) instead of squashing a rectangular photo. */
async function toSquareJpegBlob(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;
  const outSide = Math.min(side, MAX_DIMENSION);

  const canvas = document.createElement("canvas");
  canvas.width = outSide;
  canvas.height = outSide;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("לא ניתן לעבד את התמונה בדפדפן הזה");
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, outSide, outSide);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("עיבוד התמונה נכשל"))), "image/jpeg", JPEG_QUALITY);
  });
}

export async function uploadAvatarPhoto(userId: string, file: File): Promise<{ url: string } | { error: string }> {
  if (!file.type.startsWith("image/")) return { error: "יש לבחור קובץ תמונה" };
  if (file.size > MAX_UPLOAD_BYTES) return { error: "התמונה גדולה מדי (מקסימום 8MB)" };

  let blob: Blob;
  try {
    blob = await toSquareJpegBlob(file);
  } catch {
    return { error: "לא ניתן היה לעבד את התמונה הזו" };
  }

  // One object per user, fixed name — every re-upload simply overwrites the last one
  // instead of accumulating orphaned files in the bucket forever.
  const path = `${userId}/avatar.jpg`;
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, blob, { contentType: "image/jpeg", upsert: true });
  if (uploadError) return { error: "העלאת התמונה נכשלה: " + uploadError.message };

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  // Cache-bust so the new photo shows immediately even though the path/filename is unchanged.
  return { url: `${data.publicUrl}?v=${Date.now()}` };
}

export async function removeAvatarPhoto(userId: string): Promise<void> {
  await supabase.storage.from("avatars").remove([`${userId}/avatar.jpg`]);
}
