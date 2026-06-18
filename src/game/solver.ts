import { queryProlog } from "../engine";
import { buildIngestProgram } from "../prolog/ingest";
import rulesSource from "../prolog/rules.pl?raw";
import solverSource from "../prolog/solver.pl?raw";
import type { Level } from "../levels";
import { cellKey, type WallSet } from "./enclosure";

/**
 * Read the arguments of a compound term from swipl-wasm's JS representation. A
 * term `1-2` comes back as a PrologCompound `{ "$t": "t", functor: "-", "-":
 * [[1, 2]] }`: the functor name is in `functor`, and the arguments sit at
 * `obj[functor][0]`.
 */
const argsOf = (term: unknown): readonly unknown[] | null => {
  if (!term || typeof term !== "object") return null;
  const obj = term as Record<string, unknown>;
  if (obj.$t !== "t" || typeof obj.functor !== "string") return null;
  const wrapped = obj[obj.functor];
  return Array.isArray(wrapped) && Array.isArray(wrapped[0]) ? wrapped[0] : null;
};

/** A binary compound with two integer args (`X-Y`, `wall(X, Y)`, …) as a coord. */
const coordOf = (term: unknown): [number, number] | null => {
  const args = argsOf(term);
  if (args && args.length === 2 && typeof args[0] === "number" && typeof args[1] === "number") {
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

/**
 * Assemble the full solving program: ingest grammar + game rules + solver +
 * the budget and the current attempt as facts.
 */
export const buildSolveProgram = (level: Level, placed: WallSet): string =>
  [
    buildIngestProgram(level),
    rulesSource,
    solverSource,
    `budget(${level.budget}).`,
    placedWallFacts(placed),
  ].join("\n");

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

/** One step of the brute-force search: a candidate wall-set and its verdict. */
export interface TraceStep {
  readonly walls: WallSet;
  readonly solved: boolean;
}

/**
 * Replay the solver's search: the wall-sets it examines, in order, each tagged
 * with whether it seals the horse. Capped so a large board can't run away.
 */
export const traceSearch = async (level: Level, cap = 400): Promise<readonly TraceStep[]> => {
  const program = buildSolveProgram(level, new Set());
  const [first] = await queryProlog(program, `load_map, search_steps(${cap}, Steps)`);
  const steps = first?.Steps;
  if (!Array.isArray(steps)) return [];
  return steps.map((stepTerm) => {
    const [walls, solved] = argsOf(stepTerm) ?? [];
    return { walls: wallsFromBinding(walls), solved: solved === "true" };
  });
};
