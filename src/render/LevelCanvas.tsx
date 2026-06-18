import { useEffect, useRef, useState } from "react";
import type { Coord, Grid } from "../levels";
import type { WallSet } from "../game/enclosure";
import horseUrl from "../assets/horse.png";

/** Fixed on-screen size of one grid cell, in CSS pixels. Squares are identical
 * across every level; larger boards scroll rather than scaling down. */
const TILE = 32;

const PALETTE = {
  grassA: "#6f9e57",
  grassB: "#688f52",
  water: "#2f5275",
  waterBank: "#1f3a55",
  wall: "#9c5a37",
  wallMortar: "#6f3f25",
  regionOpen: "rgba(242, 242, 242, 0.16)",
  regionSealed: "rgba(247, 208, 96, 0.34)",
  regionOptimal: "rgba(122, 224, 134, 0.42)",
  cursor: "#f2f2f2",
} as const;

/** Horse source aspect, from the generated sprite. */
const HORSE_ASPECT = 18 / 16;

// Load the sprite once for the whole app; the browser caches the decode.
let horsePromise: Promise<HTMLImageElement> | null = null;
const loadHorse = (): Promise<HTMLImageElement> =>
  (horsePromise ??= new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = horseUrl;
  }));

const drawTerrain = (ctx: CanvasRenderingContext2D, grid: Grid): void => {
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const cell = grid.terrain[y]?.[x] ?? "grass";
      ctx.fillStyle =
        cell === "water" ? PALETTE.water : (x + y) % 2 === 0 ? PALETTE.grassA : PALETTE.grassB;
      ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
    }
  }

  // Stroke each water edge meeting grass/border so pools read as pools.
  ctx.strokeStyle = PALETTE.waterBank;
  ctx.lineWidth = 2;
  const isWater = (x: number, y: number): boolean => grid.terrain[y]?.[x] === "water";
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      if (!isWater(x, y)) continue;
      const left = x * TILE;
      const top = y * TILE;
      ctx.beginPath();
      if (!isWater(x, y - 1)) { ctx.moveTo(left, top); ctx.lineTo(left + TILE, top); }
      if (!isWater(x, y + 1)) { ctx.moveTo(left, top + TILE); ctx.lineTo(left + TILE, top + TILE); }
      if (!isWater(x - 1, y)) { ctx.moveTo(left, top); ctx.lineTo(left, top + TILE); }
      if (!isWater(x + 1, y)) { ctx.moveTo(left + TILE, top); ctx.lineTo(left + TILE, top + TILE); }
      ctx.stroke();
    }
  }
};

/** Tint the horse's reachable pen: faint while it leaks, gold once sealed,
 * green when the sealed area hits the level's optimum. */
const drawRegion = (
  ctx: CanvasRenderingContext2D,
  region: ReadonlySet<string>,
  sealed: boolean,
  optimal: boolean,
): void => {
  ctx.fillStyle = optimal
    ? PALETTE.regionOptimal
    : sealed
      ? PALETTE.regionSealed
      : PALETTE.regionOpen;
  for (const key of region) {
    const [x, y] = key.split(",").map(Number);
    if (x !== undefined && y !== undefined) ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
  }
};

const drawWalls = (ctx: CanvasRenderingContext2D, walls: WallSet): void => {
  for (const key of walls) {
    const [x, y] = key.split(",").map(Number);
    if (x === undefined || y === undefined) continue;
    const left = x * TILE;
    const top = y * TILE;
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(left, top, TILE, TILE);
    // Simple brick courses: horizontal mortar plus offset vertical joints.
    ctx.strokeStyle = PALETTE.wallMortar;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let row = 1; row < 3; row++) {
      const ly = top + (row * TILE) / 3;
      ctx.moveTo(left, ly);
      ctx.lineTo(left + TILE, ly);
    }
    ctx.moveTo(left + TILE / 2, top);
    ctx.lineTo(left + TILE / 2, top + TILE / 3);
    ctx.moveTo(left + TILE / 4, top + TILE / 3);
    ctx.lineTo(left + TILE / 4, top + (2 * TILE) / 3);
    ctx.moveTo(left + (3 * TILE) / 4, top + TILE / 3);
    ctx.lineTo(left + (3 * TILE) / 4, top + (2 * TILE) / 3);
    ctx.moveTo(left + TILE / 2, top + (2 * TILE) / 3);
    ctx.lineTo(left + TILE / 2, top + TILE);
    ctx.stroke();
  }
};

const drawHorse = (ctx: CanvasRenderingContext2D, grid: Grid, image: HTMLImageElement): void => {
  if (!grid.horse) return;
  ctx.imageSmoothingEnabled = false; // keep the pixel art crisp
  const width = TILE * 1.3;
  const height = width / HORSE_ASPECT;
  const x = grid.horse.x * TILE + (TILE - width) / 2;
  const y = grid.horse.y * TILE + TILE - height - TILE * 0.05; // feet near cell floor
  ctx.drawImage(image, x, y, width, height);
};

const drawCursor = (ctx: CanvasRenderingContext2D, cursor: Coord): void => {
  ctx.strokeStyle = PALETTE.cursor;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(cursor.x * TILE + 2, cursor.y * TILE + 2, TILE - 4, TILE - 4);
};

interface LevelCanvasProps {
  readonly grid: Grid;
  readonly label: string;
  readonly walls: WallSet;
  readonly region: ReadonlySet<string>;
  /** Whether the region is sealed (drives the region tint colour). */
  readonly sealed: boolean;
  /** Whether the sealed area reaches the level's optimum. */
  readonly optimal: boolean;
  /** Highlighted keyboard cursor cell, or null when not focused. */
  readonly cursor: Coord | null;
  readonly onToggle: (x: number, y: number) => void;
  readonly onMoveCursor: (x: number, y: number) => void;
}

/**
 * Render a level (terrain, walls, enclosed region, horse) and accept input:
 * click a cell to toggle a wall, or focus the board and use arrow keys + space.
 */
export const LevelCanvas = ({
  grid,
  label,
  walls,
  region,
  sealed,
  optimal,
  cursor,
  onToggle,
  onMoveCursor,
}: LevelCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [horse, setHorse] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadHorse()
      .then((image) => !cancelled && setHorse(image))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = grid.width * TILE * dpr;
    canvas.height = grid.height * TILE * dpr;
    canvas.style.width = `${grid.width * TILE}px`;
    canvas.style.height = `${grid.height * TILE}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    drawTerrain(ctx, grid);
    drawRegion(ctx, region, sealed, optimal);
    drawWalls(ctx, walls);
    if (horse) drawHorse(ctx, grid, horse);
    if (cursor) drawCursor(ctx, cursor);
  }, [grid, walls, region, sealed, optimal, cursor, horse]);

  const cellFromEvent = (event: React.MouseEvent): Coord | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / TILE);
    const y = Math.floor((event.clientY - rect.top) / TILE);
    if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) return null;
    return { x, y };
  };

  const handleKeyDown = (event: React.KeyboardEvent): void => {
    const base = cursor ?? grid.horse ?? { x: 0, y: 0 };
    const clamp = (x: number, y: number) =>
      onMoveCursor(
        Math.max(0, Math.min(grid.width - 1, x)),
        Math.max(0, Math.min(grid.height - 1, y)),
      );
    switch (event.key) {
      case "ArrowLeft": event.preventDefault(); return clamp(base.x - 1, base.y);
      case "ArrowRight": event.preventDefault(); return clamp(base.x + 1, base.y);
      case "ArrowUp": event.preventDefault(); return clamp(base.x, base.y - 1);
      case "ArrowDown": event.preventDefault(); return clamp(base.x, base.y + 1);
      case " ":
      case "Enter":
        event.preventDefault();
        return onToggle(base.x, base.y);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      className="level-canvas"
      role="img"
      aria-label={label}
      tabIndex={0}
      onClick={(event) => {
        const cell = cellFromEvent(event);
        if (cell) {
          onMoveCursor(cell.x, cell.y);
          onToggle(cell.x, cell.y);
        }
      }}
      onKeyDown={handleKeyDown}
      onFocus={() => !cursor && onMoveCursor(grid.horse?.x ?? 0, grid.horse?.y ?? 0)}
    />
  );
};
