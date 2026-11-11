/**
 * Bring a card made elsewhere into the studio. SVG, PDF, Illustrator (.ai) and Photoshop (.psd)
 * files are drawn once into a flat PNG picture, then go through the same upload as any other
 * picture. They do not become editable text or layers: the studio says so when it happens.
 * The heavy readers load only when one of these files is chosen.
 */

export type ImportKind = "raster" | "svg" | "pdf" | "psd" | "unsupported";

export const IMPORT_ACCEPT =
  "image/png,image/jpeg,image/webp,image/svg+xml,application/pdf,.svg,.pdf,.ai,.psd";

/** The longest edge of an imported picture, in pixels. */
const MAX_EDGE = 3000;
/** Largest file read into memory for conversion. */
export const MAX_IMPORT_BYTES = 40 * 1024 * 1024;

export function importKind(file: { name: string; type: string }): ImportKind {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  if (/^image\/(png|jpe?g|webp)$/.test(type)) return "raster";
  if (type === "image/svg+xml" || name.endsWith(".svg")) return "svg";
  // Illustrator saves a PDF-compatible stream by default, so .ai files go through the PDF reader.
  if (
    type === "application/pdf" ||
    name.endsWith(".pdf") ||
    name.endsWith(".ai")
  )
    return "pdf";
  if (
    name.endsWith(".psd") ||
    type === "image/vnd.adobe.photoshop" ||
    type === "application/x-photoshop"
  )
    return "psd";
  return "unsupported";
}

export const IMPORT_NOTES: Record<
  Exclude<ImportKind, "raster" | "unsupported">,
  string
> = {
  svg: "Your SVG is in as a flat picture. Its text and shapes are not editable here.",
  pdf: "Page 1 of your file is in as a flat picture. Its text and shapes are not editable here.",
  psd: "Your Photoshop file is in as one flat picture. Its layers are not kept; edit the original to change them.",
};

function fit(width: number, height: number) {
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function toPngFile(canvas: HTMLCanvasElement, source: string): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error("The file could not be converted."));
      const stem = source.replace(/\.[^.]+$/, "") || "card";
      resolve(new File([blob], `${stem}.png`, { type: "image/png" }));
    }, "image/png");
  });
}

async function fromSvg(file: File): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () =>
        reject(
          new Error("This SVG could not be read. Try exporting it as a PNG.")
        );
      el.src = url;
    });
    // An <img> never runs scripts inside an SVG, so an untrusted file cannot execute code here.
    const { width, height } = fit(
      img.naturalWidth || 1200,
      img.naturalHeight || 1200
    );
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
    return await toPngFile(canvas, file.name);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function fromPdf(file: File): Promise<File> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();
  const data = new Uint8Array(await file.arrayBuffer());
  const task = pdfjs.getDocument({ data });
  let doc;
  try {
    doc = await task.promise;
  } catch {
    throw new Error(
      "This file could not be read. If it is an Illustrator file, save it with PDF compatibility, or export a PNG."
    );
  }
  try {
    const page = await doc.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const { width, height } = fit(base.width * 3, base.height * 3);
    const viewport = page.getViewport({ scale: width / base.width });
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    await page.render({ canvas, canvasContext: context, viewport }).promise;
    return await toPngFile(canvas, file.name);
  } finally {
    void task.destroy();
  }
}

async function fromPsd(file: File): Promise<File> {
  const { readPsd } = await import("ag-psd");
  let psd;
  try {
    psd = readPsd(await file.arrayBuffer(), {
      skipLayerImageData: true,
      skipThumbnail: true,
    });
  } catch {
    throw new Error(
      "This Photoshop file could not be read. Try exporting a PNG."
    );
  }
  const flat = psd.canvas as HTMLCanvasElement | undefined;
  if (!flat)
    throw new Error(
      "This Photoshop file has no flattened preview. Save it with 'Maximize compatibility' or export a PNG."
    );
  const { width, height } = fit(flat.width, flat.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(flat, 0, 0, width, height);
  return await toPngFile(canvas, file.name);
}

/** Returns the file itself for PNG, JPG and WebP, a flat PNG for the other formats. */
export async function toRasterPicture(
  file: File
): Promise<{ file: File; note?: string }> {
  const kind = importKind(file);
  if (kind === "raster") return { file };
  if (kind === "unsupported")
    throw new Error(
      "Please choose a PNG, JPG, WebP, SVG, PDF, Illustrator (.ai) or Photoshop (.psd) file."
    );
  if (file.size > MAX_IMPORT_BYTES)
    throw new Error(
      `This file is too large (${Math.round(file.size / 1024 / 1024)} MB). The limit is ${MAX_IMPORT_BYTES / 1024 / 1024} MB.`
    );
  const converted =
    kind === "svg"
      ? await fromSvg(file)
      : kind === "pdf"
        ? await fromPdf(file)
        : await fromPsd(file);
  return { file: converted, note: IMPORT_NOTES[kind] };
}
