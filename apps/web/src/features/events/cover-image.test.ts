import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isValidCoverImageUrl } from "./cover-image";
import { updateEventSchema } from "./schemas";

describe("isValidCoverImageUrl", () => {
  const originalEnv = process.env.NEXT_PUBLIC_SUPABASE_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:57321";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalEnv;
  });

  it("returns true for valid event-covers bucket URL", () => {
    const valid =
      "http://127.0.0.1:57321/storage/v1/object/public/event-covers/evt-123/cover.jpg";
    expect(isValidCoverImageUrl(valid)).toBe(true);
  });

  it("returns false for external image URLs", () => {
    expect(
      isValidCoverImageUrl(
        "https://images.unsplash.com/photo-1519741497674-611481863552"
      )
    ).toBe(false);
    expect(
      isValidCoverImageUrl("https://lh3.googleusercontent.com/avatar123")
    ).toBe(false);
  });

  it("returns false for wrong storage bucket", () => {
    expect(
      isValidCoverImageUrl(
        "http://127.0.0.1:57321/storage/v1/object/public/avatars/evt-123/pic.jpg"
      )
    ).toBe(false);
  });

  it("returns false for empty or non-string values", () => {
    expect(isValidCoverImageUrl(null)).toBe(false);
    expect(isValidCoverImageUrl(undefined)).toBe(false);
    expect(isValidCoverImageUrl("")).toBe(false);
    expect(isValidCoverImageUrl("not-a-url")).toBe(false);
  });

  it("validates coverImageUrl in updateEventSchema", () => {
    const valid = updateEventSchema.safeParse({
      coverImageUrl:
        "http://127.0.0.1:57321/storage/v1/object/public/event-covers/evt-123/cover.jpg",
    });
    expect(valid.success).toBe(true);

    const invalid = updateEventSchema.safeParse({
      coverImageUrl: "https://images.unsplash.com/invalid-photo",
    });
    expect(invalid.success).toBe(false);

    const empty = updateEventSchema.safeParse({
      coverImageUrl: "",
    });
    expect(empty.success).toBe(true);
  });
});
