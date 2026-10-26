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

/** The same list as an <input type="file" accept> value, so the picker only offers what will be accepted. */
export const ATTACHMENT_ACCEPT = "image/jpeg,image/png,image/webp,application/pdf,.doc,.docx,.xls,.xlsx";

/** How many files can be attached while creating a task (more can always be added from the task itself). */
export const MAX_FILES_ON_CREATE = 5;

/** null when the file is acceptable, otherwise the reason (in Hebrew) it is not. */
export function validateAttachmentFile(file: File): string | null {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return "סוג קובץ לא נתמך — תמונה (JPG/PNG/WEBP), PDF, Word או Excel בלבד";
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return "הקובץ גדול מדי (מקסימום 15MB)";
  }
  return null;
}

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
  const invalid = validateAttachmentFile(file);
  if (invalid) return { error: invalid };

  // One subfolder per task; every upload is its own object (a timestamp + random suffix, so
  // re-uploading the same file never overwrites the earlier one). The storage key is plain ASCII on
  // purpose: the file's real name (often Hebrew, with spaces) is kept in the database for display,
  // but as a storage key it is rejected by some characters and, once URL-encoded in the public link,
  // no longer matches the key — which made deleting the file silently fail.
  const ext = (file.name.split(".").pop() ?? "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);
  const path = `${taskId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext ? `.${ext}` : ""}`;
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
  // The public URL is percent-encoded; the storage key is not.
  const path = decodeURIComponent(fileUrl.slice(idx + marker.length));
  await supabase.storage.from("task-attachments").remove([path]);
}
