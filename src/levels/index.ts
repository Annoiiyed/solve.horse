import catalogueJson from "../../puzzles/index.json";
import { FIXTURE_LEVELS } from "./fixtures";
import type { CatalogueEntry, Level } from "./types";

export type { CatalogueEntry, Coord, Grid, Level, Terrain } from "./types";
export { parseGrid } from "./grid";

// Fixtures get negative day numbers so they sort ahead of day 1 in the menu.
const fixtureCatalogue: readonly CatalogueEntry[] = FIXTURE_LEVELS.map((level, index) => ({
  date: level.date,
  dayNumber: index - FIXTURE_LEVELS.length,
  name: level.name,
  optimalScore: level.optimalScore,
  hasBonus: false,
}));

/** The full catalogue (fixtures, then real puzzles oldest-first) for the menu. */
export const catalogue: readonly CatalogueEntry[] = [
  ...fixtureCatalogue,
  ...(catalogueJson as CatalogueEntry[]),
].sort((a, b) => a.dayNumber - b.dayNumber);

/** The level selected on first load: the first real puzzle (day 1), not a fixture. */
export const defaultDate: string =
  (catalogue.find((entry) => entry.dayNumber >= 1) ?? catalogue[0])?.date ?? "";

/** The stored per-date puzzle shape — only the fields we consume are typed. */
interface StoredPuzzle {
  readonly date: string;
  readonly optimalScore: number;
  readonly level: { readonly map: string; readonly budget: number; readonly name: string };
}

// Each per-date file becomes a lazily-imported chunk, keyed by its date.
const loaders = import.meta.glob<{ default: StoredPuzzle }>("../../puzzles/2*.json");

const loaderByDate = new Map<string, () => Promise<{ default: StoredPuzzle }>>();
for (const [path, loader] of Object.entries(loaders)) {
  const date = path.match(/(\d{4}-\d{2}-\d{2})\.json$/)?.[1];
  if (date) loaderByDate.set(date, loader);
}

const fixtureByDate = new Map(FIXTURE_LEVELS.map((level) => [level.date, level] as const));

/** Load and normalize one level by date. Throws if the date isn't known. */
export const loadLevel = async (date: string): Promise<Level> => {
  const fixture = fixtureByDate.get(date);
  if (fixture) return fixture;

  const loader = loaderByDate.get(date);
  if (!loader) throw new Error(`No archived puzzle for ${date}`);
  const { default: puzzle } = await loader();
  return {
    date: puzzle.date,
    name: puzzle.level.name,
    map: puzzle.level.map,
    budget: puzzle.level.budget,
    optimalScore: puzzle.optimalScore,
  };
};
