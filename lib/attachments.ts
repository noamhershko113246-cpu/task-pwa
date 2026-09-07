"use client";

import { supabase } from "./supabase";

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15MB — a bit more generous than avatar/background
// uploads (8MB) since a PDF or Word doc legitimately runs bigger than a photo.

// Deliberately narrow: images to actually illustrate the task, plus the document types people
// realistically attach for context (a report, a spreadsheet). Anything else (executables,
// archives, scripts) is rejected outright — there's no legitimate task-attachment use case for
// them here, and no reason to accept a wider surface than needed.
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export function isImageAttachment(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function uploadTaskAttachment(
  taskId: string,
  file: File
): Promise<{ url: string; fileName: string; mimeType: string; sizeBytes: number } | { error: string }> {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return { error: "סוג קובץ לא נתמך — תמונה (JPG/PNG/WEBP), PDF, Word או Excel בלבד" };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: "הקובץ גדול מדי (מקסימום 15MB)" };
  }

  // One subfolder per task, original filename kept but timestamp-prefixed so re-uploading the
  // same filename twice never silently overwrites the earlier one (unlike the avatar/background
  // buckets, where a fixed name is the point — here every upload is its own attachment).
  const path = `${taskId}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from("task-attachments")
    .upload(path, file, { contentType: file.type });
  if (uploadError) return { error: "העלאת הקובץ נכשלה: " + uploadError.message };

  const { data } = supabase.storage.from("task-attachments").getPublicUrl(path);
  return { url: data.publicUrl, fileName: file.name, mimeType: file.type, sizeBytes: file.size };
}

/** Deletes the underlying storage object given its public URL — the store's removeAttachment
 *  deletes the DB row separately (see lib/store.tsx). */
export async function removeTaskAttachmentFile(fileUrl: string): Promise<void> {
  const marker = "/task-attachments/";
  const idx = fileUrl.indexOf(marker);
  if (idx === -1) return;
  const path = fileUrl.slice(idx + marker.length);
  await supabase.storage.from("task-attachments").remove([path]);
}
