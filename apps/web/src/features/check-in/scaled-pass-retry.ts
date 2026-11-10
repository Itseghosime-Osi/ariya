/** Preserve native detail first; these sizes recover oversized/rotated frames missed by ZXing. */
export const PASS_SCAN_RETRY_SIZES = [600, 400] as const;
interface CanvasPassReader {
  decodeFromCanvas(canvas: HTMLCanvasElement): { getText(): string };
}
/** Frames stay in memory and the canvas is reused until the camera session ends. */
export function createScaledPassRetry(reader: CanvasPassReader) {
  let canvas: HTMLCanvasElement | null = null;
  return (video: HTMLVideoElement): string | null => {
    const width = video.videoWidth,
      height = video.videoHeight;
    if (video.readyState < 2 || width <= 0 || height <= 0) return null;
    for (const size of PASS_SCAN_RETRY_SIZES) {
      const scale = Math.min(1, size / Math.max(width, height));
      if (scale === 1) continue;
      try {
        canvas ??= document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        const context = canvas.getContext("2d");
        if (!context) return null;
        context.imageSmoothingQuality = "high";
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const code = reader.decodeFromCanvas(canvas).getText().trim();
        if (code) return code;
      } catch {
        /* An unreadable frame can be tried at the next size or on the next video frame. */
      }
    }
    return null;
  };
}
