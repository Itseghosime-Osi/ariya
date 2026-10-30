import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { isValidCoverImage } from "./validate-cover";

describe("cover image byte validation", () => {
  it.each(["jpeg", "png", "webp"] as const)(
    "accepts a valid %s without modifying its bytes",
    async (format) => {
      const image = await sharp({
        create: { width: 2, height: 2, channels: 3, background: "red" },
      })
        .toFormat(format)
        .toBuffer();
      const original = Buffer.from(image);
      expect(await isValidCoverImage(image, `image/${format}`)).toBe(true);
      expect(image.equals(original)).toBe(true);
    }
  );
  it("rejects HTML disguised as a JPEG", async () => {
    expect(
      await isValidCoverImage(
        Buffer.from("<script>alert(1)</script>"),
        "image/jpeg"
      )
    ).toBe(false);
  });
  it("rejects mismatched content types and truncated data", async () => {
    const png = await sharp({
      create: { width: 2, height: 2, channels: 3, background: "red" },
    })
      .png()
      .toBuffer();
    expect(await isValidCoverImage(png, "image/jpeg")).toBe(false);
    expect(await isValidCoverImage(png.subarray(0, 32), "image/png")).toBe(
      false
    );
  });
});
