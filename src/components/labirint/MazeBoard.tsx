"use client";

import { useRef } from "react";
import { PlayerPhoto } from "@/components/ui/PlayerPhoto";
import {
  dirBetween,
  MAZE,
  MAZE_COLS,
  MAZE_ROWS,
  type Dir,
  type Pos,
} from "@/data/maze";

type Props = {
  name: string;
  avatar: string;
  theme: "blue" | "pink";
  mine: boolean;
  pos: Pos;
  trail: Pos[];
  goal: Pos;
  goalAvatar: string;
  footer: string;
  onStep?: (dir: Dir) => void;
};

const THEMES = {
  blue: {
    ring: "ring-[#3b82f6]",
    name: "text-[#2563eb]",
    board: "border-[#93c5fd] bg-[#dbeafe]",
    trail: "#2563eb",
    token: "ring-[#2563eb]",
  },
  pink: {
    ring: "ring-[#f472b6]",
    name: "text-[#db2777]",
    board: "border-[#f9a8d4] bg-[#fce7f3]",
    trail: "#db2777",
    token: "ring-[#db2777]",
  },
};

function wallLines() {
  const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let r = 0; r < MAZE_ROWS; r++) {
    for (let c = 0; c < MAZE_COLS; c++) {
      const cell = MAZE.cells[r][c];
      if (cell.n) lines.push({ x1: c, y1: r, x2: c + 1, y2: r });
      if (cell.w) lines.push({ x1: c, y1: r, x2: c, y2: r + 1 });
      if (c === MAZE_COLS - 1 && cell.e) lines.push({ x1: c + 1, y1: r, x2: c + 1, y2: r + 1 });
      if (r === MAZE_ROWS - 1 && cell.s) lines.push({ x1: c, y1: r + 1, x2: c + 1, y2: r + 1 });
    }
  }
  return lines;
}

const WALLS = wallLines();

export function MazeBoard({
  name,
  avatar,
  theme,
  mine,
  pos,
  trail,
  goal,
  goalAvatar,
  footer,
  onStep,
}: Props) {
  const t = THEMES[theme];
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const didSwipe = useRef(false);

  function tryCell(next: Pos) {
    if (!onStep) return;
    if (didSwipe.current) {
      didSwipe.current = false;
      return;
    }
    const dir = dirBetween(pos, next);
    if (dir) onStep(dir);
  }

  function swipeDir(dx: number, dy: number) {
    if (!onStep || Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
    if (Math.abs(dx) > Math.abs(dy)) onStep(dx > 0 ? "e" : "w");
    else onStep(dy > 0 ? "s" : "n");
  }

  const trailD = trail
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.c + 0.5} ${p.r + 0.5}`)
    .join(" ");

  return (
    <section className={`flex h-full min-h-0 min-w-0 flex-1 flex-col ${mine ? "opacity-100" : "opacity-95"}`}>
      <div className="mb-1 flex items-center justify-center gap-1.5">
        <div className={`h-7 w-7 overflow-hidden rounded-full ring-2 ${t.ring}`}>
          <PlayerPhoto src={avatar} alt={name} size={28} className="h-full w-full object-cover" />
        </div>
        <p className={`text-sm font-bold ${t.name}`}>{name}</p>
      </div>

      <div className={`flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-2xl border-4 ${t.board}`}>
        <div
          className="relative h-full w-auto max-w-full touch-none select-none"
          style={{ aspectRatio: `${MAZE_COLS} / ${MAZE_ROWS}` }}
          onPointerDown={(e) => {
            if (!onStep) return;
            swipe.current = { x: e.clientX, y: e.clientY };
            didSwipe.current = false;
          }}
          onPointerUp={(e) => {
            if (!onStep || !swipe.current) return;
            const dx = e.clientX - swipe.current.x;
            const dy = e.clientY - swipe.current.y;
            if (Math.max(Math.abs(dx), Math.abs(dy)) >= 18) {
              didSwipe.current = true;
              swipeDir(dx, dy);
            }
            swipe.current = null;
          }}
          onPointerCancel={() => {
            swipe.current = null;
          }}
        >
          <svg viewBox={`0 0 ${MAZE_COLS} ${MAZE_ROWS}`} className="absolute inset-0 h-full w-full">
            <rect width={MAZE_COLS} height={MAZE_ROWS} fill="#fffaf4" />
            <rect x={goal.c + 0.12} y={goal.r + 0.12} width={0.76} height={0.76} rx={0.18} fill={t.trail} opacity={0.16} />
            {trailD ? (
              <path
                d={trailD}
                fill="none"
                stroke={t.trail}
                strokeWidth={0.12}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="0.1 0.16"
                opacity={0.85}
              />
            ) : null}
            {WALLS.map((line, i) => (
              <line
                key={i}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke="#1e293b"
                strokeWidth={0.1}
                strokeLinecap="square"
              />
            ))}
          </svg>

          <div
            className="absolute inset-0 grid"
            style={{ gridTemplateColumns: `repeat(${MAZE_COLS}, 1fr)`, gridTemplateRows: `repeat(${MAZE_ROWS}, 1fr)` }}
          >
            {Array.from({ length: MAZE_ROWS * MAZE_COLS }, (_, i) => {
              const r = Math.floor(i / MAZE_COLS);
              const c = i % MAZE_COLS;
              return (
                <button
                  key={i}
                  type="button"
                  tabIndex={mine ? 0 : -1}
                  aria-label={`${r},${c}`}
                  className="h-full w-full"
                  onClick={() => tryCell({ r, c })}
                />
              );
            })}
          </div>

          <div
            className="pointer-events-none absolute aspect-square h-[9%] overflow-hidden rounded-full opacity-80 ring-2 ring-white"
            style={{
              left: `${((goal.c + 0.5) / MAZE_COLS) * 100}%`,
              top: `${((goal.r + 0.5) / MAZE_ROWS) * 100}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <PlayerPhoto src={goalAvatar} alt="" size={24} className="h-full w-full object-cover" />
          </div>

          <div
            className={`pointer-events-none absolute z-10 aspect-square h-[14%] overflow-hidden rounded-full bg-white shadow ring-2 ${t.token}`}
            style={{
              left: `${((pos.c + 0.5) / MAZE_COLS) * 100}%`,
              top: `${((pos.r + 0.5) / MAZE_ROWS) * 100}%`,
              transform: "translate(-50%, -50%)",
              transition: "left 120ms ease, top 120ms ease",
            }}
          >
            <PlayerPhoto src={avatar} alt={name} size={36} className="h-full w-full object-cover" />
          </div>
        </div>
      </div>

      <p className="mt-1 shrink-0 text-center text-[11px] font-semibold text-[#4b5563]">{footer}</p>
    </section>
  );
}
