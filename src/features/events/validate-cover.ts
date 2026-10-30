import "server-only";
import sharp from "sharp";

/** Validate bytes without re-encoding: existing image appearance and sharing stay unchanged. */
export async function isValidCoverImage(
  buffer: Buffer,
  mimeType: string
): Promise<boolean> {
  try {
    const image = sharp(buffer, {
      limitInputPixels: 40_000_000,
      failOn: "warning",
    });
    const metadata = await image.metadata();
    const expected = {
      "image/jpeg": "jpeg",
      "image/png": "png",
      "image/webp": "webp",
    }[mimeType];
    if (!expected || metadata.format !== expected) return false;
    // Decode as well as inspecting headers, rejecting truncated or malformed files.
    await image.stats();
    return true;
  } catch {
    return false;
  }
}
