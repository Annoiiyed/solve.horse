import { useState } from "react";
import { runProlog } from "./engine";
import familyProgram from "./prolog/family.pl?raw";
import "./App.css";

// The program is a real .pl file, inlined at build time via Vite's `?raw`.
const GOAL = "grandparent(tom, Grandchild)";

type RunState =
  | { readonly status: "idle" }
  | { readonly status: "running" }
  | { readonly status: "done"; readonly output: string }
  | { readonly status: "error"; readonly output: string };

const displayText = (state: RunState): string => {
  switch (state.status) {
    case "idle":
      return "Press Run to evaluate the script.";
    case "running":
      return "Running…";
    case "done":
    case "error":
      return state.output;
  }
};

export const App = () => {
  const [state, setState] = useState<RunState>({ status: "idle" });

  const run = async () => {
    setState({ status: "running" });
    try {
      const output = await runProlog(familyProgram, GOAL);
      setState({ status: "done", output });
    } catch (error) {
      setState({ status: "error", output: String(error) });
    }
  };

  return (
    <main className="app">
      <h1>solve.horse</h1>

      <button type="button" onClick={run} disabled={state.status === "running"}>
        {state.status === "running" ? "Running…" : "Run Prolog"}
      </button>

      <pre
        className={`output${state.status === "error" ? " output--error" : ""}`}
        aria-live="polite"
        aria-label="Prolog output"
      >
        {displayText(state)}
      </pre>
    </main>
  );
};
