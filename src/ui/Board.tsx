import { useEffect, useMemo, useState } from "react";
import type { Coord, Grid, Level } from "../levels";
import { LevelCanvas } from "../render/LevelCanvas";
import { analyzeEnclosure, cellKey } from "../game/enclosure";
import { solveLevel, traceSearch, type TraceStep } from "../game/solver";

interface BoardProps {
  readonly level: Level;
  readonly grid: Grid;
}

const NO_WALLS: ReadonlySet<string> = new Set();
const STEP_MS = 80;

/**
 * Interactive board: place wall cells (within the level's budget) to seal the
 * horse off from the board edge. Owns wall + cursor state; mount with a `key`
 * per level so switching levels resets it.
 *
 * "Trace" replays the brute-force search step by step, swapping the displayed
 * walls to each candidate so you can watch Prolog hunt for a seal.
 */
export const Board = ({ level, grid }: BoardProps) => {
  const [walls, setWalls] = useState<ReadonlySet<string>>(() => new Set());
  const [cursor, setCursor] = useState<Coord | null>(null);
  const [solving, setSolving] = useState(false);
  const [busyError, setBusyError] = useState<string | null>(null);

  const [trace, setTrace] = useState<readonly TraceStep[] | null>(null);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [tracing, setTracing] = useState(false);

  // In trace mode the board shows the current search step; otherwise the walls
  // the player (or the solver) placed.
  const activeWalls = trace ? (trace[step]?.walls ?? NO_WALLS) : walls;
  const enclosure = useMemo(() => analyzeEnclosure(grid, activeWalls), [grid, activeWalls]);

  const budget = level.budget;
  const used = activeWalls.size;

  const isHorse = (x: number, y: number): boolean =>
    grid.horse?.x === x && grid.horse?.y === y;

  // Only grass cells (not water, not the horse) can become walls.
  const isWallable = (x: number, y: number): boolean =>
    grid.terrain[y]?.[x] === "grass" && !isHorse(x, y);

  const toggle = (x: number, y: number): void => {
    if (trace || !isWallable(x, y)) return; // editing is disabled while tracing
    const key = cellKey(x, y);
    setWalls((prev) => {
      if (prev.has(key)) {
        const next = new Set(prev);
        next.delete(key);
        return next;
      }
      if (prev.size >= budget) return prev; // budget reached; placement blocked
      return new Set(prev).add(key);
    });
  };

  const solve = async (): Promise<void> => {
    setSolving(true);
    setBusyError(null);
    try {
      const solution = await solveLevel(level, walls);
      if (solution) setWalls(solution);
      else setBusyError("Solver found no solution");
    } catch (cause) {
      setBusyError(String(cause));
    } finally {
      setSolving(false);
    }
  };

  const startTrace = async (): Promise<void> => {
    setTracing(true);
    setBusyError(null);
    try {
      const steps = await traceSearch(level);
      if (steps.length === 0) {
        setBusyError("Nothing to trace");
        return;
      }
      setTrace(steps);
      setStep(0);
      setPlaying(true);
    } catch (cause) {
      setBusyError(String(cause));
    } finally {
      setTracing(false);
    }
  };

  const exitTrace = (): void => {
    setTrace(null);
    setPlaying(false);
    setStep(0);
  };

  // The first step that reaches the level's optimum — where playback halts.
  const optimalStep = useMemo(() => {
    if (!trace) return -1;
    return trace.findIndex((candidate) => {
      const result = analyzeEnclosure(grid, candidate.walls);
      return result.enclosed && result.region.size >= level.optimalScore;
    });
  }, [trace, grid, level.optimalScore]);

  // Advance one step per tick while playing; stop on the optimal step (or the
  // last step if the search never reaches the optimum).
  useEffect(() => {
    if (!playing || !trace) return;
    const stopAt = optimalStep >= 0 ? optimalStep : trace.length - 1;
    if (step >= stopAt) return;
    const id = window.setTimeout(() => {
      if (step + 1 >= stopAt) setPlaying(false);
      setStep(step + 1);
    }, STEP_MS);
    return () => window.clearTimeout(id);
  }, [playing, trace, step, optimalStep]);

  // Score is the enclosed-cell count for now; once value tiles are scored this
  // is where that calculation will live.
  const score = enclosure.enclosed ? enclosure.region.size : null;
  const optimal = score !== null && score >= level.optimalScore;

  const status =
    score === null
      ? "Horse not enclosed yet"
      : optimal
        ? `★ Optimal — ${score} / ${level.optimalScore}`
        : `✓ Enclosed — ${score} / ${level.optimalScore}`;

  return (
    <div className="board">
      <LevelCanvas
        grid={grid}
        label={`${level.name}: ${grid.width} by ${grid.height} board. Arrow keys move, space toggles a wall.`}
        walls={activeWalls}
        region={enclosure.region}
        sealed={enclosure.enclosed}
        optimal={optimal}
        cursor={trace ? null : cursor}
        onToggle={toggle}
        onMoveCursor={(x, y) => setCursor({ x, y })}
      />

      <div className="board-bar">
        <p
          className={`board-status${enclosure.enclosed ? " board-status--ok" : ""}${optimal ? " board-status--optimal" : ""}`}
          aria-live="polite"
        >
          {status}
        </p>
        <p className={`board-budget${used >= budget ? " board-budget--full" : ""}`}>
          Walls {used} / {budget}
        </p>
        {trace ? (
          <button type="button" onClick={exitTrace}>
            Exit trace
          </button>
        ) : (
          <>
            <button type="button" onClick={solve} disabled={solving || tracing}>
              {solving ? "Solving…" : "Solve"}
            </button>
            <button type="button" onClick={startTrace} disabled={solving || tracing}>
              {tracing ? "Tracing…" : "Trace"}
            </button>
            <button type="button" onClick={() => setWalls(new Set())} disabled={used === 0}>
              Clear
            </button>
          </>
        )}
      </div>

      {trace && (
        <div className="board-trace">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? "❚❚" : "▶"}
          </button>
          <input
            type="range"
            min={0}
            max={trace.length - 1}
            value={step}
            aria-label="Search step"
            onChange={(event) => {
              setPlaying(false);
              setStep(Number(event.target.value));
            }}
          />
          <span className="board-trace-info">
            step {step + 1} / {trace.length}
            {trace[step]?.solved ? " · sealed" : " · searching"}
          </span>
        </div>
      )}

      {busyError && (
        <p className="board-error" role="alert">
          {busyError}
        </p>
      )}
    </div>
  );
};
