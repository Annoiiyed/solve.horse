import { queryProlog } from "../engine";
import { buildIngestProgram } from "../prolog/ingest";
import solverSource from "../prolog/solver.pl?raw";
import type { Level } from "../levels";
import { cellKey, type WallSet } from "./enclosure";

/**
 * Read a binary-compound term from swipl-wasm's JS representation. A term `1-2`
 * comes back as a PrologCompound `{ "$t": "t", functor: "-", "-": [[1, 2]] }`:
 * the functor name is in `functor`, and the arguments sit at `obj[functor][0]`.
 * Any binary functor with two integer args is accepted — `X-Y`, `wall(X, Y)`,
 * `c(X, Y)` all work.
 */
const coordOf = (term: unknown): [number, number] | null => {
  if (!term || typeof term !== "object") return null;
  const obj = term as Record<string, unknown>;
  if (obj.$t !== "t") return null;
  const functor =
    typeof obj.functor === "string"
      ? obj.functor
      : Object.keys(obj).find((key) => key !== "$t" && key !== "functor");
  if (!functor) return null;
  const wrapped = obj[functor];
  const args = Array.isArray(wrapped) ? wrapped[0] : undefined;
  if (
    Array.isArray(args) &&
    args.length === 2 &&
    typeof args[0] === "number" &&
    typeof args[1] === "number"
  ) {
    return [args[0], args[1]];
  }
  return null;
};

/** Convert a `Walls` binding (a list of coordinate pairs) into a wall set. */
export const wallsFromBinding = (value: unknown): WallSet => {
  const walls = new Set<string>();
  if (!Array.isArray(value)) return walls;
  for (const term of value) {
    const coord = coordOf(term);
    if (coord) walls.add(cellKey(coord[0], coord[1]));
  }
  return walls;
};

/** Emit the current human attempt as `placed_wall(X, Y)` facts for the solver. */
const placedWallFacts = (placed: WallSet): string =>
  [...placed]
    .map((key) => {
      const [x, y] = key.split(",");
      return `placed_wall(${x}, ${y}).`;
    })
    .join("\n");

/** Assemble the full solving program: ingest grammar + solver + the attempt. */
export const buildSolveProgram = (level: Level, placed: WallSet): string =>
  `${buildIngestProgram(level)}\n${solverSource}\n${placedWallFacts(placed)}\n`;

/**
 * Run the Prolog solver for `level` and return its proposed walls, or null if
 * it finds no solution. `placed` is the current board state, exposed to the
 * solver as `placed_wall/2`. Rejects on a Prolog error.
 */
export const solveLevel = async (level: Level, placed: WallSet): Promise<WallSet | null> => {
  const program = buildSolveProgram(level, placed);
  const [first] = await queryProlog(program, "load_map, solve(Walls)");
  return first ? wallsFromBinding(first.Walls) : null;
};
