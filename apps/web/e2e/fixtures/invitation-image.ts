import { PASS_SCAN_RETRY_SIZES } from "../../src/features/check-in/scaled-pass-retry";
import type { Page, Locator } from "@playwright/test";
import { realpathSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
const load = createRequire(
  realpathSync(
    path.resolve(__dirname, "../../node_modules/@zxing/browser/package.json")
  )
);
const {
  QRCodeReader,
  RGBLuminanceSource,
  HybridBinarizer,
  BinaryBitmap,
  DecodeHintType,
} = load("@zxing/library");
/** Decode in memory only: callers must not log personal pass data or persist its raster. */
export async function inspectInvitationImage(
  page: Page,
  card: Locator,
  png: Buffer,
  picture?: Locator,
  maxDimension = 0
) {
  const paper = (await card.boundingBox())!,
    seal = (await card.locator("[data-entry-seal]").boundingBox())!;
  const photo = picture ? (await picture.boundingBox())! : null;
  const pixels = await page.evaluate(
    async ({ url, frame, maxDimension }) => {
      const image = new Image();
      image.src = url;
      await image.decode();
      const scale = image.naturalWidth / frame.paper.width;
      const left = Math.max(
          0,
          Math.floor((frame.seal.x - frame.paper.x) * scale) - 8
        ),
        top = Math.max(
          0,
          Math.floor((frame.seal.y - frame.paper.y) * scale) - 8
        );
      const canvas = document.createElement("canvas");
      const sourceWidth = Math.ceil(frame.seal.width * scale) + 16,
        sourceHeight = Math.ceil(frame.seal.height * scale) + 16;
      const decodeScale = maxDimension
        ? Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight))
        : 1;
      canvas.width = Math.round(sourceWidth * decodeScale);
      canvas.height = Math.round(sourceHeight * decodeScale);
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(
        image,
        left,
        top,
        sourceWidth,
        sourceHeight,
        0,
        0,
        canvas.width,
        canvas.height
      );
      const rgba = ctx.getImageData(0, 0, canvas.width, canvas.height).data,
        grey = new Uint8Array(canvas.width * canvas.height);
      for (let i = 0; i < rgba.length; i += 4)
        grey[i / 4] = Math.round(
          0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2]
        );
      let photoPixel: number[] = [];
      if (frame.photo) {
        const pixel = document.createElement("canvas");
        pixel.width = 1;
        pixel.height = 1;
        const p = pixel.getContext("2d")!;
        p.drawImage(
          image,
          (frame.photo.x - frame.paper.x + frame.photo.width / 2) * scale,
          (frame.photo.y - frame.paper.y + frame.photo.height / 2) * scale,
          1,
          1,
          0,
          0,
          1,
          1
        );
        photoPixel = Array.from(p.getImageData(0, 0, 1, 1).data);
      }
      let binary = "";
      for (let offset = 0; offset < grey.length; offset += 16384)
        binary += String.fromCharCode(...grey.subarray(offset, offset + 16384));
      return {
        width: canvas.width,
        height: canvas.height,
        greyBase64: btoa(binary),
        photoPixel,
      };
    },
    {
      url: `data:image/png;base64,${png.toString("base64")}`,
      frame: { paper, seal, photo },
      maxDimension,
    }
  );
  const reader = new QRCodeReader();
  const hints = new Map<unknown, unknown>([[DecodeHintType.TRY_HARDER, true]]);
  const decoded: string = reader
    .decode(
      new BinaryBitmap(
        new HybridBinarizer(
          new RGBLuminanceSource(
            new Uint8ClampedArray(Buffer.from(pixels.greyBase64, "base64")),
            pixels.width,
            pixels.height
          )
        )
      ),
      hints
    )
    .getText();
  return {
    decoded,
    photoPixel: pixels.photoPixel,
    decoderWidth: pixels.width,
    decoderHeight: pixels.height,
  };
}

/** The same native-first, scaled-retry policy used by the real check-in fallback decoder. */
export async function inspectInvitationWithRetry(
  page: Page,
  card: Locator,
  png: Buffer,
  picture?: Locator
) {
  for (const maxDimension of [0, ...PASS_SCAN_RETRY_SIZES]) {
    try {
      return {
        ...(await inspectInvitationImage(
          page,
          card,
          png,
          picture,
          maxDimension
        )),
        samplingMax: maxDimension,
      };
    } catch {
      /* Try the next input size, just as the camera does for an unreadable frame. */
    }
  }
  throw new Error(
    "The exported pass could not be decoded at native or retry sizes"
  );
}
