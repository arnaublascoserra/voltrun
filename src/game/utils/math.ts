export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

export function distSq(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

/** Shortest horizontal delta on a map that wraps horizontally (tunnels). */
export function wrappedDx(ax: number, bx: number, width: number): number {
  let dx = ax - bx;
  if (dx > width / 2) dx -= width;
  else if (dx < -width / 2) dx += width;
  return dx;
}
