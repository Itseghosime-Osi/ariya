/** Project pointer movement into the rotated shape's local axes. Values are screen pixels. */
export function radiusDragDelta(
  dx: number,
  dy: number,
  angle: number,
  corner: "tl" | "tr" | "br" | "bl"
) {
  const radians = (angle * Math.PI) / 180;
  const x = dx * Math.cos(radians) + dy * Math.sin(radians);
  const y = -dx * Math.sin(radians) + dy * Math.cos(radians);
  const signs = { tl: [1, 1], tr: [-1, 1], br: [-1, -1], bl: [1, -1] }[corner];
  return (x * signs[0] + y * signs[1]) / 2;
}
