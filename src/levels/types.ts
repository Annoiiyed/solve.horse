/** One entry in the puzzle catalogue (`puzzles/index.json`). */
export interface CatalogueEntry {
  readonly date: string;
  readonly dayNumber: number;
  readonly name: string;
  readonly optimalScore: number;
  readonly hasBonus: boolean;
}

/** A loaded level, narrowed to what the renderer and (later) solver need. */
export interface Level {
  readonly date: string;
  readonly name: string;
  /** Newline-joined glyph grid as stored upstream. */
  readonly map: string;
  /** Fence allowance. */
  readonly budget: number;
  readonly optimalScore: number;
}

/**
 * Base terrain. Every non-water glyph is grass for now; value tiles (`C`, `S`,
 * digits, …) sit *on* grass and will be layered in once the solver needs them.
 */
export type Terrain = "grass" | "water";

export interface Coord {
  readonly x: number;
  readonly y: number;
}

/** A level's map parsed into a render-ready grid. */
export interface Grid {
  readonly width: number;
  readonly height: number;
  /** Row-major: `terrain[y][x]`. */
  readonly terrain: readonly (readonly Terrain[])[];
  /** The horse's cell, or null if absent (every real level has exactly one). */
  readonly horse: Coord | null;
}
