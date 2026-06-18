import SWIPL from "swipl-wasm";

/** The resolved SWI-Prolog module (Emscripten instance + Prolog interface). */
type SwiplModule = Awaited<ReturnType<typeof SWIPL>>;

/** Safety cap so a goal with infinitely many solutions can't hang the page. */
const MAX_SOLUTIONS = 1000;

const PROGRAM_PATH = "/main.pl";

// SWI boots once for the app's lifetime (init is expensive, ~MBs of wasm); all
// runs share it. consult() reloads PROGRAM_PATH each call, and the ingest
// grammar retracts its dynamic facts on load, so consecutive runs stay clean.
let modulePromise: Promise<SwiplModule> | null = null;
const getModule = (): Promise<SwiplModule> =>
  (modulePromise ??= SWIPL({ arguments: ["-q"] }));

/** SWI's query parser expects a clause-terminated goal. */
const asClause = (goal: string): string => {
  const trimmed = goal.trim();
  return trimmed.endsWith(".") ? trimmed : `${trimmed}.`;
};

/** Render a single bound value from swipl-wasm's JS term representation. */
const renderValue = (value: unknown): string => {
  if (value === null || value === undefined) return "_";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) return `[${value.map(renderValue).join(", ")}]`;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

/** Render one solution's variable bindings; a binding-free success is `true`.
 * swipl-wasm tags solution objects with `$tag` etc.; those meta-keys are skipped. */
const renderSolution = (bindings: Record<string, unknown>): string => {
  const entries = Object.entries(bindings).filter(([name]) => !name.startsWith("$"));
  if (entries.length === 0) return "true";
  return entries.map(([name, value]) => `${name} = ${renderValue(value)}`).join(", ");
};

/**
 * Consult `program`, run `goal`, and return every solution as text (one per
 * line), `false.` when there are none. Rejects on a Prolog exception; callers
 * handle that at their boundary.
 */
export const runProlog = async (program: string, goal: string): Promise<string> => {
  const swipl = await getModule();
  swipl.FS.writeFile(PROGRAM_PATH, program);

  if (swipl.prolog.query(`consult('${PROGRAM_PATH}').`).once() === false) {
    throw new Error(`Failed to consult program`);
  }

  // With no callback, forEach resolves to an array of all solutions, each a
  // bindings object (variable name -> JS value). It rejects on a Prolog error.
  const answers = (await swipl.prolog.forEach(asClause(goal))) as Array<
    Record<string, unknown>
  >;
  const solutions = answers.slice(0, MAX_SOLUTIONS).map(renderSolution);

  return solutions.length > 0 ? solutions.join("\n") : "false.";
};
