import { useMemo, useState } from "react";
import type { Coord, Grid, Level } from "../levels";
import { LevelCanvas } from "../render/LevelCanvas";
import { analyzeEnclosure, cellKey } from "../game/enclosure";
import { solveLevel } from "../game/solver";

interface BoardProps {
  readonly level: Level;
  readonly grid: Grid;
}

/**
 * Interactive board: place wall cells (within the level's budget) to seal the
 * horse off from the board edge. Owns wall + cursor state; mount with a `key`
 * per level so switching levels resets it.
 */
export const Board = ({ level, grid }: BoardProps) => {
  const [walls, setWalls] = useState<ReadonlySet<string>>(() => new Set());
  const [cursor, setCursor] = useState<Coord | null>(null);
  const [solving, setSolving] = useState(false);
  const [solveError, setSolveError] = useState<string | null>(null);

  const enclosure = useMemo(() => analyzeEnclosure(grid, walls), [grid, walls]);
  const budget = level.budget;
  const used = walls.size;

  const isHorse = (x: number, y: number): boolean =>
    grid.horse?.x === x && grid.horse?.y === y;

  // Only grass cells (not water, not the horse) can become walls.
  const isWallable = (x: number, y: number): boolean =>
    grid.terrain[y]?.[x] === "grass" && !isHorse(x, y);

  const toggle = (x: number, y: number): void => {
    if (!isWallable(x, y)) return;
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
    setSolveError(null);
    try {
      const solution = await solveLevel(level, walls);
      if (solution) setWalls(solution);
      else setSolveError("Solver found no solution");
    } catch (cause) {
      setSolveError(String(cause));
    } finally {
      setSolving(false);
    }
  };

  const status = enclosure.enclosed
    ? `Horse enclosed — ${enclosure.region.size} ${enclosure.region.size === 1 ? "cell" : "cells"} sealed`
    : "Horse not enclosed yet";
  const atBudget = used >= budget;

  return (
    <div className="board">
      <LevelCanvas
        grid={grid}
        label={`${level.name}: ${grid.width} by ${grid.height} board. Arrow keys move, space toggles a wall.`}
        walls={walls}
        region={enclosure.region}
        sealed={enclosure.enclosed}
        cursor={cursor}
        onToggle={toggle}
        onMoveCursor={(x, y) => setCursor({ x, y })}
      />
      <div className="board-bar">
        <p
          className={`board-status${enclosure.enclosed ? " board-status--ok" : ""}`}
          aria-live="polite"
        >
          {enclosure.enclosed ? "✓ " : ""}
          {status}
        </p>
        <p className={`board-budget${atBudget ? " board-budget--full" : ""}`}>
          Walls {used} / {budget}
        </p>
        <button type="button" onClick={solve} disabled={solving}>
          {solving ? "Solving…" : "Solve"}
        </button>
        <button type="button" onClick={() => setWalls(new Set())} disabled={used === 0}>
          Clear
        </button>
      </div>
      {solveError && (
        <p className="board-error" role="alert">
          {solveError}
        </p>
      )}
    </div>
  );
};
