import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { eventEndedError } from "@/features/events/expiry";
import { isValidCoverImage } from "@/features/events/validate-cover";
import { mapError } from "@/lib/errors";

const ART_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_ART_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "Please choose an image to import" },
        { status: 400 }
      );
    }

    if (!ART_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invitation art must be a JPEG, PNG or WebP image",
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_ART_FILE_SIZE) {
      return NextResponse.json(
        { ok: false, error: "Invitation art must not exceed 15 MB" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const ended = await eventEndedError(supabase, eventId);
    if (ended) {
      return NextResponse.json({ ok: false, error: ended }, { status: 403 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Authentication required to import art" },
        { status: 401 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!(await isValidCoverImage(buffer, file.type))) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Please import a valid JPEG, PNG or WebP image (up to 40 megapixels).",
        },
        { status: 400 }
      );
    }

    const ext =
      file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
          ? "webp"
          : "jpg";
    const path = `${eventId}/design/${crypto.randomUUID()}.${ext}`;

    const { data, error } = await supabase.storage
      .from("event-covers")
      .upload(path, buffer, { contentType: file.type, upsert: true });

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: mapError(error, "Failed to import the invitation art"),
        },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from("event-covers")
      .getPublicUrl(data.path);

    return NextResponse.json({ ok: true, url: publicUrlData.publicUrl });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Failed to upload image",
      },
      { status: 500 }
    );
  }
}
