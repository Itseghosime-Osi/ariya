import { resizeBoxFast } from "../../engine";
import type { Box, Handle } from "../../layer-ops";

/** Pointer coordinates belong to the viewport; resizing belongs to the layer's local axes. */
export function resizeInLocalAxes(
  start: Box,
  handle: Handle,
  dxPx: number,
  dyPx: number,
  card: { width: number; height: number },
  angle: number,
  keepShape: boolean,
  fromCenter = false
): Box {
  const radians = (angle * Math.PI) / 180;
  const cos = Math.cos(radians),
    sin = Math.sin(radians);
  const factor = fromCenter ? 2 : 1;
  dxPx *= factor;
  dyPx *= factor;
  const localX = ((dxPx * cos + dyPx * sin) / card.width) * 100;
  const localY = ((-dxPx * sin + dyPx * cos) / card.height) * 100;
  const next = resizeBoxFast(start, handle, localX, localY, keepShape);
  if (fromCenter)
    return {
      ...next,
      x: start.x + (start.width - next.width) / 2,
      y: start.y + (start.height - next.height) / 2,
    };
  const centerDX =
    ((next.x + next.width / 2 - start.x - start.width / 2) / 100) * card.width;
  const centerDY =
    ((next.y + next.height / 2 - start.y - start.height / 2) / 100) *
    card.height;
  return {
    ...next,
    x:
      start.x +
      start.width / 2 +
      ((centerDX * cos - centerDY * sin) / card.width) * 100 -
      next.width / 2,
    y:
      start.y +
      start.height / 2 +
      ((centerDX * sin + centerDY * cos) / card.height) * 100 -
      next.height / 2,
  };
}

export function cursorForHandle(handle: Handle, rotation: number) {
  const base = {
    e: 0,
    se: 45,
    s: 90,
    sw: 135,
    w: 180,
    nw: 225,
    n: 270,
    ne: 315,
  }[handle];
  const sector = ((Math.round((base + rotation) / 45) % 4) + 4) % 4;
  return ["ew-resize", "nwse-resize", "ns-resize", "nesw-resize"][sector];
}
