import catalogueJson from "../../puzzles/index.json";
import type { CatalogueEntry, Level } from "./types";

export type { CatalogueEntry, Coord, Grid, Level, Terrain } from "./types";
export { parseGrid } from "./grid";

/** The full catalogue, oldest first, as shown in the level menu. */
export const catalogue: readonly CatalogueEntry[] = (catalogueJson as CatalogueEntry[])
  .slice()
  .sort((a, b) => a.dayNumber - b.dayNumber);

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

/** Load and normalize one level by date. Throws if the date isn't archived. */
export const loadLevel = async (date: string): Promise<Level> => {
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
