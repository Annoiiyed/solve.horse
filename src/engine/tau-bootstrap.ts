/**
 * Tau Prolog (v0.3.x) initializes its virtual file systems and standard streams
 * by assigning to bare, undeclared identifiers at module top level — both the
 * browser set (`tau_*`) and the Node set (`nodejs_*`), unconditionally. That
 * relies on sloppy-mode implicit globals. Once bundled as an ES module the code
 * runs in strict mode, where assigning to an unresolvable name throws
 * `ReferenceError` and aborts Tau's initialization (leaving the whole app blank).
 *
 * Pre-creating the global properties makes those identifiers resolvable, so
 * Tau's own assignments land on them instead of throwing. The `nodejs_*` stream
 * objects only touch `fs` lazily inside methods that the browser never calls
 * (Tau's runtime `nodejs_flag` is false here), so an existing binding is enough.
 *
 * This module must be imported *before* `tau-prolog`; ES modules evaluate
 * imports depth-first in source order, so importing it first in the engine
 * guarantees that ordering.
 */
declare global {
  var tau_file_system: unknown;
  var tau_user_input: unknown;
  var tau_user_output: unknown;
  var tau_user_error: unknown;
  var nodejs_file_system: unknown;
  var nodejs_user_input: unknown;
  var nodejs_user_output: unknown;
  var nodejs_user_error: unknown;
}

const IMPLICIT_GLOBALS = [
  "tau_file_system",
  "tau_user_input",
  "tau_user_output",
  "tau_user_error",
  "nodejs_file_system",
  "nodejs_user_input",
  "nodejs_user_output",
  "nodejs_user_error",
] as const;

for (const name of IMPLICIT_GLOBALS) {
  if (!(name in globalThis)) {
    (globalThis as Record<string, unknown>)[name] = undefined;
  }
}

export {};
