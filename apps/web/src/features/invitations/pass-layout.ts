import { INVITATION_ASPECT, type InvitationDesign } from "./types";
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
const rounded = (value: number) => Math.round(value * 1e8) / 1e8;
/** Only functional passes are constrained; decorative artwork keeps its bleed and stacking freedom. */
export function constrainEntrySeals(
  design: InvitationDesign
): InvitationDesign {
  const ratio = design.canvas?.ratio ?? INVITATION_ASPECT;
  const widthPx = design.canvas?.widthPx ?? 1080,
    heightPx = widthPx / ratio;
  const corner =
    design.canvas?.edgeStyle === "rounded"
      ? Math.min(design.canvas.cornerRadiusPx ?? 16, widthPx / 2, heightPx / 2)
      : 0;
  // The inset rectangle fits inside rounded corners. Keep a small allowance for borders/deckling.
  const padX = Math.max(
    2,
    800 / widthPx,
    ((corner * (1 - Math.SQRT1_2)) / widthPx) * 100
  );
  const padY = Math.max(
    2,
    800 / heightPx,
    ((corner * (1 - Math.SQRT1_2)) / heightPx) * 100
  );
  let changed = false;
  const layers = design.layers.map((layer) => {
    if (layer.kind !== "code") return layer;
    const radians = ((layer.rotation ?? 0) * Math.PI) / 180;
    const extent = Math.abs(Math.cos(radians)) + Math.abs(Math.sin(radians));
    const width = clamp(
      layer.width,
      16,
      Math.min((100 - 2 * padX) / extent, (100 - 2 * padY) / ratio / extent)
    );
    const height = width * ratio,
      halfX = (width * extent) / 2,
      halfY = (height * extent) / 2;
    const x = rounded(
      clamp(layer.x + layer.width / 2, padX + halfX, 100 - padX - halfX) -
        width / 2
    );
    const y = rounded(
      clamp(
        layer.y + (layer.width * ratio) / 2,
        padY + halfY,
        100 - padY - halfY
      ) -
        height / 2
    );
    const safeWidth = rounded(width);
    if (
      Math.abs(x - layer.x) < 1e-7 &&
      Math.abs(y - layer.y) < 1e-7 &&
      Math.abs(safeWidth - layer.width) < 1e-7
    )
      return layer;
    changed = true;
    return { ...layer, x, y, width: safeWidth };
  });
  return changed ? { ...design, layers } : design;
}
