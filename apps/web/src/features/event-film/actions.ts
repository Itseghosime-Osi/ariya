"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { mapError } from "@/lib/errors";
import { eventEndedError } from "@/features/events/expiry";
import { isValidCoverImage } from "@/features/events/validate-cover";
import type { Json } from "@/lib/supabase/database.types";
import { filmDesignSchema, SONG_MAX_BYTES } from "./design";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const BUCKET = "event-film";
const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

function refresh(eventId: string, slug?: string | null) {
  revalidatePath(`/events/${eventId}/page-editor`);
  revalidatePath(`/events/${eventId}`);
  if (slug) revalidatePath(`/e/${slug}`);
}

/** Saves the host's film: their scenes, song, colours and celebrant photos. Never longer than 45 s. */
export async function saveFilmDesignAction(
  eventId: string,
  design: unknown
): Promise<Result> {
  const parsed = filmDesignSchema.safeParse(design);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "That film design is not valid",
    };
  }

  const supabase = await createClient();
  const ended = await eventEndedError(supabase, eventId);
  if (ended) return { ok: false, error: ended };

  const { data, error } = await supabase
    .from("events")
    .update({ film_design: parsed.data as unknown as Json })
    .eq("id", eventId)
    .select("slug");

  if (error) {
    return { ok: false, error: mapError(error, "Could not save the film") };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "Celebration not found or not yours to edit" };
  }

  refresh(eventId, data[0].slug);
  return { ok: true };
}

/** Live: guests can open the page and their links. Test mode: only the celebration's own team can. */
export async function setInvitationLiveAction(
  eventId: string,
  live: boolean
): Promise<Result> {
  const supabase = await createClient();
  const ended = await eventEndedError(supabase, eventId);
  if (ended) return { ok: false, error: ended };

  const { data, error } = await supabase
    .from("events")
    .update({ invitation_live: Boolean(live) })
    .eq("id", eventId)
    .select("slug");

  if (error) {
    return {
      ok: false,
      error: mapError(error, "Could not change the invitation's mode"),
    };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "Celebration not found or not yours to edit" };
  }

  refresh(eventId, data[0].slug);
  return { ok: true };
}

/** MP3 starts with an ID3 tag or an MPEG audio frame sync; anything else is not a song. */
export function looksLikeMp3(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  const id3 = bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33;
  const frame = bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
  return id3 || frame;
}

export async function uploadFilmSongAction(
  eventId: string,
  formData: FormData
): Promise<Result<{ url: string; title: string }>> {
  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return { ok: false, error: "Choose an MP3 file" };
  }
  if (file.type !== "audio/mpeg" && !/\.mp3$/i.test(file.name)) {
    return { ok: false, error: "The song must be an MP3 file" };
  }
  if (file.size > SONG_MAX_BYTES) {
    return { ok: false, error: "The song must be 10 MB or smaller" };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!looksLikeMp3(bytes)) {
    return { ok: false, error: "That file does not look like an MP3" };
  }

  const supabase = await createClient();
  const ended = await eventEndedError(supabase, eventId);
  if (ended) return { ok: false, error: ended };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to upload a song" };

  const path = `${eventId}/song.mp3`;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, Buffer.from(bytes), {
      contentType: "audio/mpeg",
      upsert: true,
    });
  if (error) {
    return { ok: false, error: mapError(error, "Could not upload the song") };
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
  const title = file.name
    .replace(/\.mp3$/i, "")
    .replace(/[_-]+/g, " ")
    .trim()
    .slice(0, 80);
  // The version keeps a replaced song from being served out of a cache.
  return { ok: true, url: `${pub.publicUrl}?v=${Date.now()}`, title };
}

export async function uploadFilmPhotoAction(
  eventId: string,
  slot: number,
  formData: FormData
): Promise<Result<{ url: string }>> {
  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return { ok: false, error: "Choose a photo" };
  }
  const ext = IMAGE_TYPES[file.type];
  if (!ext)
    return { ok: false, error: "The photo must be a JPEG, PNG or WebP" };
  if (file.size > MAX_PHOTO_BYTES) {
    return { ok: false, error: "The photo must be 5 MB or smaller" };
  }
  if (!Number.isInteger(slot) || slot < 0 || slot > 1) {
    return { ok: false, error: "A film can show two photos" };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!(await isValidCoverImage(buffer, file.type))) {
    return { ok: false, error: "That does not look like a valid image" };
  }

  const supabase = await createClient();
  const ended = await eventEndedError(supabase, eventId);
  if (ended) return { ok: false, error: ended };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to upload a photo" };

  const path = `${eventId}/photo-${slot + 1}.${ext}`;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: true });
  if (error) {
    return { ok: false, error: mapError(error, "Could not upload the photo") };
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
  return { ok: true, url: `${pub.publicUrl}?v=${Date.now()}` };
}
