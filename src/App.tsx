import { useEffect, useMemo, useState } from "react";
import { defaultDate, loadLevel, parseGrid, type Level } from "./levels";
import { LevelMenu } from "./ui/LevelMenu";
import { LevelCanvas } from "./render/LevelCanvas";
import "./App.css";

interface LoadError {
  readonly date: string;
  readonly message: string;
}

export const App = () => {
  const [selectedDate, setSelectedDate] = useState(defaultDate);
  const [level, setLevel] = useState<Level | null>(null);
  const [error, setError] = useState<LoadError | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadLevel(selectedDate)
      .then((loaded) => {
        if (cancelled) return;
        setLevel(loaded);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError({ date: selectedDate, message: String(cause) });
      });
    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  const grid = useMemo(() => (level ? parseGrid(level.map) : null), [level]);

  // Derive view state instead of clearing state in the effect: the level is
  // "ready" only once the loaded date matches the current selection.
  const ready = level && grid && level.date === selectedDate ? { level, grid } : null;
  const showError = error?.date === selectedDate ? error : null;

  return (
    <div className="layout">
      <LevelMenu selectedDate={selectedDate} onSelect={setSelectedDate} />
      <main className="stage">
        <div className="stage-inner">
          {ready ? (
            <>
              <header className="stage-head">
                <h1>{ready.level.name}</h1>
                <p className="stage-meta">
                  {ready.level.date} · {ready.grid.width}×{ready.grid.height} · budget{" "}
                  {ready.level.budget} · optimal {ready.level.optimalScore}
                </p>
              </header>
              <LevelCanvas
                grid={ready.grid}
                label={`${ready.level.name}: ${ready.grid.width} by ${ready.grid.height} level map`}
              />
            </>
          ) : showError ? (
            <p className="stage-error">{showError.message}</p>
          ) : (
            <p className="stage-loading">Loading…</p>
          )}
        </div>
      </main>
    </div>
  );
};
