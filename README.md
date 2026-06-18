# solve.horse

A browser-based viewer and (in-progress) solver for enclose.horse-style grid
puzzles: enclose the horse with a limited fence, maximizing the value of the
enclosed region. Levels are rendered to a canvas; Prolog (SWI-Prolog via
WebAssembly) parses level maps into facts and will drive the solver.

## Stack

- **Prolog engine:** [SWI-Prolog](https://www.swi-prolog.org/) compiled to
  WebAssembly (`swipl-wasm`). Full ISO + `library(clpfd)`, so the enclosure
  constraint problem can be expressed declaratively. Runs entirely client-side.
- **Frontend:** Vite + React + TypeScript (strict).
- **Runtime / package manager:** Bun.

## Architecture

```
src/
  engine/
    index.ts          runProlog(program, goal): consult + collect solutions as text
  prolog/
    ingest.pl         DCG: a level map -> cell/3, grid_size/2, horse/2 facts
    ingest.ts         buildIngestProgram(level): grammar + the level's map_codes
  levels/
    index.ts          catalogue + lazy per-date level loader; default selection
    fixtures.ts       in-code test levels (date 0000-00-00), kept out of puzzles/
    grid.ts           map string -> terrain grid + horse position (for rendering)
    url.ts            ?level=<date> read/write
    types.ts
  render/
    LevelCanvas.tsx   grass / water / horse, fixed 32px tiles
  ui/
    LevelMenu.tsx     left sidebar, every level as "date - name"
  assets/horse.png    generated pixel sprite
puzzles/              archived enclose.horse dailies (see scripts/fetch-puzzles.ts)
```

The Prolog backend sits behind one function, `runProlog(program, goal)`, so the
engine is swappable without touching callers. SWI boots once (lazily) and is
reused; `runProlog` consults the program and returns each solution as text.

### Ingestion

`ingest.pl` is a DCG that reads a map (a newline-separated glyph grid) into
`cell(X, Y, Glyph)` facts plus `grid_size/2` and `horse/2`. Drive it from a goal
(asserts persist for the rest of the goal):

```
runProlog(buildIngestProgram(level), "load_map, cell(X, Y, '~')")
```

Solver logic is intentionally not here yet.

## Develop

```sh
bun install
bun run dev            # http://localhost:5173
bun run build          # typecheck + production build
bun run lint
bun run fetch-puzzles  # refresh the puzzles/ archive
```
