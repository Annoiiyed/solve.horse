# solve.horse

Prolog in the browser. A button runs a Prolog script through an in-page engine
and prints the answers — no server, no WASM.

## Stack

- **Engine:** [Tau Prolog](http://tau-prolog.org/) — a pure-JavaScript Prolog
  interpreter. No WebAssembly, so it loads instantly and is trivial to debug.
- **Frontend:** Vite + React + TypeScript (strict).
- **Runtime / package manager:** Bun.

## Architecture

The Prolog backend sits behind a small typed interface so the rest of the app
never touches Tau directly — swapping in a WASM engine (SWI, Trealla) later is a
single new implementation, not a rewrite.

```
src/
  engine/
    types.ts          PrologEngine interface, PrologValue + EngineError unions
    result.ts         Either-style Result<T, E>
    tau-engine.ts     Tau-backed implementation (consult + answer iteration)
    tau-term.ts       Tau term  ->  typed PrologValue
    tau-bootstrap.ts  shim for Tau's sloppy-mode implicit globals (see note)
    index.ts          public surface
  format.ts           PrologValue -> display text
  App.tsx             the button + output
```

Failures are values, not exceptions: `solve` returns `Result<Solution[], EngineError>`,
and `EngineError` distinguishes a genuine error from an exhausted search budget.

### Note on the Tau bootstrap

Tau Prolog 0.3.x assigns its virtual file system and standard streams to bare,
undeclared globals (it was written for `<script>`/CommonJS loading). Bundled as
an ES module the code is strict, where those assignments throw `ReferenceError`.
`tau-bootstrap.ts` pre-creates the bindings and is imported before `tau-prolog`.

## Develop

```sh
bun install
bun run dev      # http://localhost:5173
bun run build    # typecheck + production build
bun run lint
```
