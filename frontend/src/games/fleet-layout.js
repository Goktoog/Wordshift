export function shipCells(start, length, vertical) {
  if (!Number.isInteger(start) || start < 0 || start >= 25) return null;
  const row = Math.floor(start / 5), col = start % 5;
  if ((vertical ? row : col) + length > 5) return null;
  return Array.from({ length }, (_, i) => start + i * (vertical ? 5 : 1));
}
export function canPlace(fleet, selected, cells) {
  return !!cells && !fleet.some((ship, index) => index !== selected && ship.cells.some(cell => cells.includes(cell)));
}
