/**
 * Archive every enclose.horse daily puzzle (and its bonus round, when present)
 * to `puzzles/<date>.json`, skipping dates already on disk.
 *
 * Two upstream sources are combined because each only holds half the story:
 *
 *   1. The daily *index* — `window.__DAILY_LEVELS__`, server-rendered inline on
 *      any `/play/<date>` page. It lists every daily (date, day number, level
 *      id, bonus id, optimal scores) but carries no maps.
 *   2. The level *maps* — `GET /api/levels/<id>`, which returns the grid, budget
 *      and metadata for any level id, daily or bonus.
 *
 * The API rejects requests without a same-origin `Origin`/`Referer` (it answers
 * "This is not the official site"), so every API call carries those headers.
 *
 * Run: `bun run scripts/fetch-puzzles.ts [--all] [--force]`
 *   --all    also archive future-dated puzzles present in the index
 *            (default cutoff is today, per the archive's intent)
 *   --force  re-fetch and overwrite dates already stored
 */

import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

const ORIGIN = "https://enclose.horse";
const PUZZLES_DIR = join(dirname(import.meta.dir), "puzzles");

/** Same-origin headers that satisfy the API's anti-mirror gate. */
const API_HEADERS: Readonly<Record<string, string>> = {
  Origin: ORIGIN,
  Referer: `${ORIGIN}/`,
  "User-Agent": "solve.horse-archiver",
};

/** One level as returned by `/api/levels/<id>` — daily or bonus, same shape. */
interface Level {
  readonly id: string;
  readonly map: string;
  readonly budget: number;
  readonly name: string;
  readonly description: string | null;
  readonly creatorName: string;
  readonly playCount: number;
  readonly createdAt: number;
}

/** One entry in `window.__DAILY_LEVELS__`. Bonus fields are null on plain days. */
interface DailyIndexEntry {
  readonly id: string;
  readonly date: string;
  readonly dayNumber: number;
  readonly optimalScore: number;
  readonly name: string;
  readonly bonusType: string | null;
  readonly bonusId: string | null;
  readonly bonusOptimalScore: number | null;
}

/** The bonus round attached to a day, once its map is resolved. */
interface StoredBonus {
  readonly type: string;
  readonly optimalScore: number;
  readonly level: Level;
}

/** The self-contained record written to `puzzles/<date>.json`. */
interface StoredPuzzle {
  readonly date: string;
  readonly dayNumber: number;
  readonly optimalScore: number;
  readonly level: Level;
  readonly bonus: StoredBonus | null;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetch with a few retries on transient failure (network error or 5xx). A 4xx
 * is a definite answer — a missing or renamed resource — so we surface it at
 * once rather than hammering the server.
 */
const fetchWithRetry = async (
  url: string,
  attempts = 3,
): Promise<Response> => {
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(url, { headers: API_HEADERS });
      if (response.ok) return response;
      if (response.status < 500 || attempt >= attempts) {
        throw new Error(`GET ${url} -> ${response.status} ${response.statusText}`);
      }
    } catch (cause) {
      if (attempt >= attempts) throw cause;
    }
    await sleep(250 * attempt);
  }
};

/**
 * Slice out the JSON literal a page assigns to `window.<globalName>`. Brackets
 * are balanced while skipping string contents so a `]` or `}` inside a level
 * name can't end the match early; a plain regex can't make that distinction.
 * Returns `"null"` when the global is explicitly null (e.g. a date with no
 * puzzle), or null when the assignment isn't found at all.
 */
const extractAssignedJson = (html: string, globalName: string): string | null => {
  const marker = `window.${globalName}`;
  const markerAt = html.indexOf(marker);
  if (markerAt < 0) return null;

  const equalsAt = html.indexOf("=", markerAt + marker.length);
  if (equalsAt < 0) return null;

  let cursor = equalsAt + 1;
  while (cursor < html.length && /\s/.test(html[cursor]!)) cursor++;
  if (html.startsWith("null", cursor)) return "null";

  const opener = html[cursor];
  if (opener !== "[" && opener !== "{") return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = cursor; index < html.length; index++) {
    const char = html[index]!;
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{" || char === "[") depth++;
    else if (char === "}" || char === "]") {
      depth--;
      if (depth === 0) return html.slice(cursor, index + 1);
    }
  }
  return null;
};

/**
 * Read the daily index off any `/play/*` page. The index is identical on every
 * such page (it backs the date picker), so the chosen date need not have a
 * puzzle — we just need a page that renders the global.
 */
const fetchDailyIndex = async (): Promise<readonly DailyIndexEntry[]> => {
  const response = await fetchWithRetry(`${ORIGIN}/play/${todayIso()}`);
  const html = await response.text();
  const json = extractAssignedJson(html, "__DAILY_LEVELS__");
  if (!json || json === "null") {
    throw new Error("Could not locate window.__DAILY_LEVELS__ in the play page");
  }
  return JSON.parse(json) as DailyIndexEntry[];
};

const fetchLevel = async (id: string): Promise<Level> => {
  const response = await fetchWithRetry(`${ORIGIN}/api/levels/${id}`);
  return (await response.json()) as Level;
};

/** Assemble the full stored record for one index entry, maps included. */
const buildPuzzle = async (entry: DailyIndexEntry): Promise<StoredPuzzle> => {
  const level = await fetchLevel(entry.id);
  const bonus =
    entry.bonusId && entry.bonusType
      ? {
          type: entry.bonusType,
          optimalScore: entry.bonusOptimalScore ?? 0,
          level: await fetchLevel(entry.bonusId),
        }
      : null;
  return {
    date: entry.date,
    dayNumber: entry.dayNumber,
    optimalScore: entry.optimalScore,
    level,
    bonus,
  };
};

/** Today as an ISO calendar date (UTC), used as the default archive cutoff. */
const todayIso = (): string => new Date().toISOString().slice(0, 10);

/** Run `worker` over `items` with bounded concurrency to stay a polite client. */
const mapWithConcurrency = async <T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> => {
  const results = new Array<R>(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index]!);
    }
  });
  await Promise.all(runners);
  return results;
};

const stableStringify = (puzzle: StoredPuzzle): string => `${JSON.stringify(puzzle, null, 2)}\n`;

const main = async (): Promise<void> => {
  const force = Bun.argv.includes("--force");
  const includeFuture = Bun.argv.includes("--all");
  const cutoff = todayIso();

  await mkdir(PUZZLES_DIR, { recursive: true });

  const index = await fetchDailyIndex();
  const eligible = index
    .filter((entry) => includeFuture || entry.date <= cutoff)
    .sort((a, b) => a.dayNumber - b.dayNumber);

  const pending: DailyIndexEntry[] = [];
  for (const entry of eligible) {
    const exists = await Bun.file(join(PUZZLES_DIR, `${entry.date}.json`)).exists();
    if (force || !exists) pending.push(entry);
  }

  console.log(
    `Index: ${index.length} dailies, ${eligible.length} within cutoff (${cutoff}), ` +
      `${pending.length} to fetch${force ? " (forced)" : ""}.`,
  );

  let done = 0;
  await mapWithConcurrency(pending, 5, async (entry) => {
    const puzzle = await buildPuzzle(entry);
    await Bun.write(join(PUZZLES_DIR, `${entry.date}.json`), stableStringify(puzzle));
    done++;
    const bonusNote = puzzle.bonus ? ` +bonus(${puzzle.bonus.type})` : "";
    console.log(`  [${done}/${pending.length}] ${entry.date} day ${entry.dayNumber} — ${entry.name}${bonusNote}`);
  });

  // Refresh a lightweight catalogue so consumers can enumerate the archive
  // without opening every per-date file. Maps are intentionally omitted here.
  const catalogue = eligible.map(({ date, dayNumber, name, optimalScore, bonusType }) => ({
    date,
    dayNumber,
    name,
    optimalScore,
    hasBonus: bonusType !== null,
  }));
  await Bun.write(join(PUZZLES_DIR, "index.json"), `${JSON.stringify(catalogue, null, 2)}\n`);

  console.log(`Done. ${pending.length} new, ${eligible.length} total archived.`);
};

await main();
