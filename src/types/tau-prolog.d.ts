/**
 * Minimal ambient declarations for `tau-prolog` (v0.3.x), which ships as
 * untyped UMD JavaScript. Only the promise-based surface we consume is declared.
 */
declare module "tau-prolog" {
  /** An opaque computed answer; render it with {@link Session.format_answer}. */
  export interface Answer {
    toString(options?: unknown): string;
  }

  export interface Session {
    /** Load a program (facts + rules). Rejects with a Tau error term on failure. */
    promiseConsult(program: string): Promise<void>;
    /** Set the goal to solve (clause-terminated). Rejects on a parse error. */
    promiseQuery(goal: string): Promise<void>;
    /** Yield each computed answer until the goal is exhausted. */
    promiseAnswers(): AsyncIterableIterator<Answer>;
    /** Render an answer as conventional Prolog text (`X = a`, `true`, `false`). */
    format_answer(answer: Answer, options?: unknown): string;
  }

  export interface Pl {
    /** Create a session with a maximum resolution-step budget. */
    create(stepLimit?: number): Session;
  }

  const pl: Pl;
  export default pl;
}

/** The promises library is a loader that augments the `pl` prototypes in place. */
declare module "tau-prolog/modules/promises.js" {
  const load: (pl: import("tau-prolog").Pl) => void;
  export default load;
}
