import type { InvitationLayer } from "../../types";
import type { Box } from "../../layer-ops";

/** A group scales as one unit; limits constrain the group instead of stretching individual children. */
export function transformSelection(
  layers: InvitationLayer[],
  origins: Record<string, Box>,
  bounds: Box,
  target: Box
): Record<string, Partial<InvitationLayer>> {
  if (bounds.width <= 0 || bounds.height <= 0) return {};
  const patches: Record<string, Partial<InvitationLayer>> = {};
  const editable = layers.filter((layer) => origins[layer.id] && !layer.locked);
  let minScale = Math.max(
    0.001,
    ...editable.flatMap((layer) => [
      1 / origins[layer.id].width,
      layer.height ? 0.2 / origins[layer.id].height : 0,
      layer.kind === "code" ? 16 / origins[layer.id].width : 0,
      1 / layer.size,
    ])
  );
  let maxScale = Math.min(
    100,
    ...editable.flatMap((layer) => [
      1000 / origins[layer.id].width,
      layer.height ? 1000 / origins[layer.id].height : 100,
      20 / layer.size,
    ])
  );
  const anchorX =
    target.width === bounds.width
      ? 0.5
      : (bounds.x - target.x) / (target.width - bounds.width);
  const anchorY =
    target.height === bounds.height
      ? 0.5
      : (bounds.y - target.y) / (target.height - bounds.height);
  for (const layer of editable) {
    for (const [key, limit] of [
      ["radius", 2000],
      ["radiusTL", 2000],
      ["radiusTR", 2000],
      ["radiusBR", 2000],
      ["radiusBL", 2000],
      ["strokeWidth", 100],
      ["blur", 500],
      ["shadowBlur", 500],
      ["shadowX", 1000],
      ["shadowY", 1000],
    ] as const) {
      const value = Math.abs(layer[key] ?? 0);
      if (value) maxScale = Math.min(maxScale, limit / value);
    }
    for (const [origin, base] of [
      [origins[layer.id].x, bounds.x + bounds.width * anchorX],
      [origins[layer.id].y, bounds.y + bounds.height * anchorY],
    ]) {
      const coefficient = origin - base;
      if (coefficient) {
        const limits = [
          (-500 - base) / coefficient,
          (500 - base) / coefficient,
        ];
        minScale = Math.max(minScale, Math.min(...limits));
        maxScale = Math.min(maxScale, Math.max(...limits));
      }
    }
  }
  const scale = Math.max(
    minScale,
    Math.min(maxScale, target.width / bounds.width)
  );
  const nextWidth = bounds.width * scale,
    nextHeight = bounds.height * scale;
  const x = bounds.x - (nextWidth - bounds.width) * anchorX;
  const y = bounds.y - (nextHeight - bounds.height) * anchorY;
  for (const layer of editable) {
    const origin = origins[layer.id];
    const patch: Partial<InvitationLayer> = {
      x: x + (origin.x - bounds.x) * scale,
      y: y + (origin.y - bounds.y) * scale,
      width: origin.width * scale,
      size: layer.size * scale,
    };
    if (layer.height !== undefined) patch.height = origin.height * scale;
    for (const key of [
      "radius",
      "radiusTL",
      "radiusTR",
      "radiusBR",
      "radiusBL",
      "strokeWidth",
      "blur",
      "shadowBlur",
      "shadowX",
      "shadowY",
    ] as const) {
      if (layer[key] !== undefined) patch[key] = layer[key]! * scale;
    }
    patches[layer.id] = patch;
  }
  return patches;
}
