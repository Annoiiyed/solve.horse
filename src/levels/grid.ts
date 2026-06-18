import type { Coord, Grid, Terrain } from "./types";

const WATER_GLYPH = "~";
const HORSE_GLYPH = "H";

/**
 * Parse a stored map string into a render-ready grid. Water is the only glyph
 * that changes terrain; everything else is grass (value tiles are overlays for
 * later). Rows are padded to the widest row so a ragged map still yields a
 * rectangular grid.
 */
export const parseGrid = (map: string): Grid => {
  const rows = map.split("\n");
  const width = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const height = rows.length;

  let horse: Coord | null = null;
  const terrain: Terrain[][] = rows.map((row, y) => {
    const cells: Terrain[] = [];
    for (let x = 0; x < width; x++) {
      const glyph = row[x] ?? ".";
      if (glyph === HORSE_GLYPH) horse = { x, y };
      cells.push(glyph === WATER_GLYPH ? "water" : "grass");
    }
    return cells;
  });

  return { width, height, terrain, horse };
};
