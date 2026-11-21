export function shipCells(start, length, vertical) {
  if (!Number.isInteger(start) || start < 0 || start >= 25) return null;
  const row = Math.floor(start / 5), col = start % 5;
  if ((vertical ? row : col) + length > 5) return null;
  return Array.from({ length }, (_, i) => start + i * (vertical ? 5 : 1));
}
export function canPlace(fleet, selected, cells) {
  return !!cells && !fleet.some((ship, index) => index !== selected && ship.cells.some(cell => cells.includes(cell)));
}

// Bot filosu: her gemi için geçerli TÜM (başlangıç, yön) seçenekleri arasından eşit olasılıkla seçer.
// Gemi sırası da karışık; hiçbir kalıp veya bitişiklik tercihi yoktur.
export function randomFleet(lengths = [3, 2, 1], rng = Math.random) {
  const order = [...lengths].map(v => [rng(), v]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  const taken = [];
  for (const length of order) {
    const options = [];
    for (let start = 0; start < 25; start++) for (const vertical of length === 1 ? [false] : [false, true]) {
      const group = shipCells(start, length, vertical);
      if (group && !group.some(i => taken.includes(i))) options.push(group);
    }
    taken.push(...options[Math.floor(rng() * options.length)]);
  }
  return taken;
}
