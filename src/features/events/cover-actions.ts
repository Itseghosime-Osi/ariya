"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { mapError } from "@/lib/errors";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function uploadEventCoverAction(
  eventId: string,
  formData: FormData
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return { ok: false, error: "Please provide a valid image file" };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      ok: false,
      error: "Cover banner must be a JPEG, PNG, or WebP image",
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      ok: false,
      error: "Cover banner image must not exceed 5 MB",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Authentication required to upload cover" };
  }

  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";
  const path = `${eventId}/cover.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { data, error } = await supabase.storage
    .from("event-covers")
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (error) {
    return {
      ok: false,
      error: mapError(error, "Failed to upload cover banner"),
    };
  }

  const { data: publicUrlData } = supabase.storage
    .from("event-covers")
    .getPublicUrl(data.path);

  const publicUrl = publicUrlData.publicUrl;

  const { error: updateError } = await supabase
    .from("events")
    .update({ cover_image_url: publicUrl })
    .eq("id", eventId);

  if (updateError) {
    return {
      ok: false,
      error: mapError(updateError, "Failed to save cover image to celebration"),
    };
  }

  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/events/${eventId}/page-editor`);
  return { ok: true, url: publicUrl };
}

export async function removeEventCoverAction(
  eventId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Authentication required" };
  }

  const { data: files } = await supabase.storage
    .from("event-covers")
    .list(eventId);

  if (files && files.length > 0) {
    const filePaths = files.map((f) => `${eventId}/${f.name}`);
    await supabase.storage.from("event-covers").remove(filePaths);
  }

  const { error } = await supabase
    .from("events")
    .update({ cover_image_url: null })
    .eq("id", eventId);

  if (error) {
    return {
      ok: false,
      error: mapError(error, "Failed to remove cover image"),
    };
  }

  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/events/${eventId}/page-editor`);
  return { ok: true };
}
