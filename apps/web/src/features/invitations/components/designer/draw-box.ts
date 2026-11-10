/** Shape-drawing geometry in screen pixels. Shift constrains a square; Alt keeps the starting point at the centre. */
export function drawBox(
  start: { x: number; y: number },
  end: { x: number; y: number },
  square = false,
  centre = false
) {
  let dx = end.x - start.x,
    dy = end.y - start.y;
  if (square) {
    const side = Math.max(Math.abs(dx), Math.abs(dy));
    dx = (dx < 0 ? -1 : 1) * side;
    dy = (dy < 0 ? -1 : 1) * side;
  }
  return {
    left: centre ? start.x - Math.abs(dx) : Math.min(start.x, start.x + dx),
    top: centre ? start.y - Math.abs(dy) : Math.min(start.y, start.y + dy),
    width: Math.abs(dx) * (centre ? 2 : 1),
    height: Math.abs(dy) * (centre ? 2 : 1),
  };
}
