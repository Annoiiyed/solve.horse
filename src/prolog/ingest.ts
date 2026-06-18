import ingestSource from "./ingest.pl?raw";
import type { Level } from "../levels";

/** The raw ingestion grammar (the `.pl` source), exposed for reference. */
export const INGEST_SOURCE = ingestSource;

/** Escape a map into a Prolog double-quoted string (a code list, per the flag). */
const toPrologString = (map: string): string =>
  map.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");

/**
 * Build a self-contained Prolog program that ingests `level`'s map: the grammar
 * plus a `map_codes/1` fact carrying this level's glyphs. Run it through the
 * engine and drive ingestion from the goal, e.g.:
 *
 *   runProlog(buildIngestProgram(level), "load_map, cell(X, Y, '~')")
 *
 * `load_map` asserts cell/3, grid_size/2 and horse/2 for the rest of the goal.
 * (SWI autoloads list/aggregate predicates, so no import preamble is needed.)
 */
export const buildIngestProgram = (level: Level): string =>
  `${ingestSource}\nmap_codes("${toPrologString(level.map)}").\n`;
