import type { Coord, Grid } from "../levels";

/** Set of placed wall cells, keyed by {@link cellKey}. */
export type WallSet = ReadonlySet<string>;

export const cellKey = (x: number, y: number): string => `${x},${y}`;

export interface EnclosureResult {
  /** True when the horse's open region is sealed off from the board edge. */
  readonly enclosed: boolean;
  /** Cells reachable from the horse without crossing a wall or water. */
  readonly region: ReadonlySet<string>;
}

/** A cell the horse can stand on / move through: grass that isn't a wall. */
const isOpen = (grid: Grid, walls: WallSet, x: number, y: number): boolean => {
  if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) return false;
  if (grid.terrain[y]?.[x] !== "grass") return false;
  return !walls.has(cellKey(x, y));
};

const onBorder = (grid: Grid, x: number, y: number): boolean =>
  x === 0 || y === 0 || x === grid.width - 1 || y === grid.height - 1;

/**
 * Flood-fill the horse's open region. The horse is enclosed when that region
 * never reaches an open cell on the board border — i.e. walls and water close
 * every escape. Water cells and placed walls block the flood.
 */
export const analyzeEnclosure = (grid: Grid, walls: WallSet): EnclosureResult => {
  if (!grid.horse) return { enclosed: false, region: new Set() };

  const region = new Set<string>();
  const stack: Coord[] = [grid.horse];
  let leaks = false;

  while (stack.length > 0) {
    const { x, y } = stack.pop() as Coord;
    if (!isOpen(grid, walls, x, y)) continue;
    const key = cellKey(x, y);
    if (region.has(key)) continue;
    region.add(key);
    if (onBorder(grid, x, y)) leaks = true; // reachable open border cell → escape
    stack.push({ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 });
  }

  return { enclosed: region.size > 0 && !leaks, region };
};
