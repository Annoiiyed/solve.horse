import { catalogue } from "../levels";

interface LevelMenuProps {
  readonly selectedDate: string;
  readonly onSelect: (date: string) => void;
}

/** Left sidebar listing every archived level as `date - name`. */
export const LevelMenu = ({ selectedDate, onSelect }: LevelMenuProps) => (
  <nav className="menu" aria-label="Levels">
    <h2 className="menu-title">Levels</h2>
    <ul className="menu-list">
      {catalogue.map((entry) => {
        const active = entry.date === selectedDate;
        return (
          <li key={entry.date}>
            <button
              type="button"
              className={`menu-item${active ? " menu-item--active" : ""}`}
              aria-current={active ? "true" : undefined}
              onClick={() => onSelect(entry.date)}
            >
              <span className="menu-date">{entry.date}</span>
              <span className="menu-sep"> - </span>
              <span className="menu-name">{entry.name}</span>
            </button>
          </li>
        );
      })}
    </ul>
  </nav>
);
