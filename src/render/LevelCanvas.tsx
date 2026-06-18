import { useEffect, useRef } from "react";
import type { Grid } from "../levels";
import horseUrl from "../assets/horse.png";

/** Fixed on-screen size of one grid cell, in CSS pixels. Squares are identical
 * across every level; larger boards scroll rather than scaling down. */
const TILE = 32;

const PALETTE = {
  grassA: "#6f9e57",
  grassB: "#688f52",
  water: "#2f5275",
  waterBank: "#1f3a55",
} as const;

/** Horse source aspect, from the generated sprite. */
const HORSE_ASPECT = 18 / 16;

// Load the sprite once for the whole app; the browser caches the decode.
let horseImage: Promise<HTMLImageElement> | null = null;
const loadHorse = (): Promise<HTMLImageElement> =>
  (horseImage ??= new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = horseUrl;
  }));

const drawTerrain = (ctx: CanvasRenderingContext2D, grid: Grid, tile: number): void => {
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const cell = grid.terrain[y]?.[x] ?? "grass";
      if (cell === "water") {
        ctx.fillStyle = PALETTE.water;
      } else {
        ctx.fillStyle = (x + y) % 2 === 0 ? PALETTE.grassA : PALETTE.grassB;
      }
      ctx.fillRect(x * tile, y * tile, tile, tile);
    }
  }

  // Bank: stroke each water edge that meets grass or the border, so contiguous
  // water reads as a single pool rather than a grid of blue squares.
  ctx.strokeStyle = PALETTE.waterBank;
  ctx.lineWidth = 2;
  const isWater = (x: number, y: number): boolean => grid.terrain[y]?.[x] === "water";
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      if (!isWater(x, y)) continue;
      const left = x * tile;
      const top = y * tile;
      ctx.beginPath();
      if (!isWater(x, y - 1)) { ctx.moveTo(left, top); ctx.lineTo(left + tile, top); }
      if (!isWater(x, y + 1)) { ctx.moveTo(left, top + tile); ctx.lineTo(left + tile, top + tile); }
      if (!isWater(x - 1, y)) { ctx.moveTo(left, top); ctx.lineTo(left, top + tile); }
      if (!isWater(x + 1, y)) { ctx.moveTo(left + tile, top); ctx.lineTo(left + tile, top + tile); }
      ctx.stroke();
    }
  }
};

const drawHorse = (
  ctx: CanvasRenderingContext2D,
  grid: Grid,
  tile: number,
  image: HTMLImageElement,
): void => {
  if (!grid.horse) return;
  ctx.imageSmoothingEnabled = false; // keep the pixel art crisp
  const width = tile * 1.3;
  const height = width / HORSE_ASPECT;
  const x = grid.horse.x * tile + (tile - width) / 2;
  const y = grid.horse.y * tile + tile - height - tile * 0.05; // feet near cell floor
  ctx.drawImage(image, x, y, width, height);
};

interface LevelCanvasProps {
  readonly grid: Grid;
  readonly label: string;
}

/**
 * Render a level's base layer (grass, water, horse) to a canvas. Crisp on
 * high-DPI displays; value tiles are intentionally not drawn yet.
 */
export const LevelCanvas = ({ grid, label }: LevelCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

    drawTerrain(ctx, grid, TILE);

    let cancelled = false;
    loadHorse()
      .then((image) => {
        if (!cancelled) drawHorse(ctx, grid, TILE, image);
      })
      .catch(() => {
        /* terrain already drawn; horse sprite is non-essential */
      });

    return () => {
      cancelled = true;
    };
  }, [grid]);

  return <canvas ref={canvasRef} className="level-canvas" role="img" aria-label={label} />;
};
