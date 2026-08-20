"use client";

import { useRef } from "react";
import { PlayerPhoto } from "@/components/ui/PlayerPhoto";
import { PLAYERS } from "@/data/players";
import {
  MEET,
  MEET_COLS,
  MEET_ROWS,
  meetDirBetween,
  type Dir,
  type Pos,
} from "@/data/meetMaze";

type Props = {
  myPos: Pos;
  theirPos: Pos;
  myTrail: Pos[];
  theirTrail: Pos[];
  who: "ilkin" | "fidan";
  onStep: (dir: Dir) => void;
};

function wallLines() {
  const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let r = 0; r < MEET_ROWS; r++) {
    for (let c = 0; c < MEET_COLS; c++) {
      const cell = MEET.cells[r][c];
      if (cell.n) lines.push({ x1: c, y1: r, x2: c + 1, y2: r });
      if (cell.w) lines.push({ x1: c, y1: r, x2: c, y2: r + 1 });
      if (c === MEET_COLS - 1 && cell.e) lines.push({ x1: c + 1, y1: r, x2: c + 1, y2: r + 1 });
      if (r === MEET_ROWS - 1 && cell.s) lines.push({ x1: c, y1: r + 1, x2: c + 1, y2: r + 1 });
    }
  }
  return lines;
}

const WALLS = wallLines();

export function MeetBoard({ myPos, theirPos, myTrail, theirTrail, who, onStep }: Props) {
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const didSwipe = useRef(false);
  const me = who === "ilkin" ? PLAYERS[0] : PLAYERS[1];
  const partner = who === "ilkin" ? PLAYERS[1] : PLAYERS[0];
  const myColor = who === "ilkin" ? "#2563eb" : "#db2777";
  const theirColor = who === "ilkin" ? "#db2777" : "#2563eb";
  const myRing = who === "ilkin" ? "ring-[#3b82f6]" : "ring-[#ec4899]";
  const theirRing = who === "ilkin" ? "ring-[#ec4899]" : "ring-[#3b82f6]";

  function tryCell(next: Pos) {
    if (didSwipe.current) {
      didSwipe.current = false;
      return;
    }
    const dir = meetDirBetween(myPos, next);
    if (dir) onStep(dir);
  }

  function swipeDir(dx: number, dy: number) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 16) return;
    if (Math.abs(dx) > Math.abs(dy)) onStep(dx > 0 ? "e" : "w");
    else onStep(dy > 0 ? "s" : "n");
  }

  function trailPath(trail: Pos[]) {
    return trail.map((p, i) => `${i === 0 ? "M" : "L"} ${p.c + 0.5} ${p.r + 0.5}`).join(" ");
  }

  return (
    <div className="flex min-h-0 w-full flex-1 items-center justify-center">
      <div
        className="relative h-full max-h-full w-auto max-w-full touch-none select-none overflow-hidden rounded-xl border-[3px] border-[#1e3a5f] bg-white"
        style={{ aspectRatio: `${MEET_COLS} / ${MEET_ROWS}` }}
        onPointerDown={(e) => {
          swipe.current = { x: e.clientX, y: e.clientY };
          didSwipe.current = false;
        }}
        onPointerUp={(e) => {
          if (!swipe.current) return;
          const dx = e.clientX - swipe.current.x;
          const dy = e.clientY - swipe.current.y;
          if (Math.max(Math.abs(dx), Math.abs(dy)) >= 16) {
            didSwipe.current = true;
            swipeDir(dx, dy);
          }
          swipe.current = null;
        }}
        onPointerCancel={() => {
          swipe.current = null;
        }}
      >
        <svg viewBox={`0 0 ${MEET_COLS} ${MEET_ROWS}`} className="absolute inset-0 h-full w-full">
          <rect width={MEET_COLS} height={MEET_ROWS} fill="#ffffff" />
          {trailPath(theirTrail) ? (
            <path
              d={trailPath(theirTrail)}
              fill="none"
              stroke={theirColor}
              strokeWidth={0.1}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="0.08 0.14"
              opacity={0.7}
            />
          ) : null}
          {trailPath(myTrail) ? (
            <path
              d={trailPath(myTrail)}
              fill="none"
              stroke={myColor}
              strokeWidth={0.1}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="0.08 0.14"
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
              stroke="#111827"
              strokeWidth={0.07}
              strokeLinecap="square"
            />
          ))}
        </svg>

        <div
          className="absolute inset-0 grid"
          style={{ gridTemplateColumns: `repeat(${MEET_COLS}, 1fr)`, gridTemplateRows: `repeat(${MEET_ROWS}, 1fr)` }}
        >
          {Array.from({ length: MEET_ROWS * MEET_COLS }, (_, i) => {
            const r = Math.floor(i / MEET_COLS);
            const c = i % MEET_COLS;
            return (
              <button
                key={i}
                type="button"
                aria-label={`${r},${c}`}
                className="h-full w-full"
                onClick={() => tryCell({ r, c })}
              />
            );
          })}
        </div>

        <Token pos={theirPos} src={partner.image} name={partner.name} ring={theirRing} />
        <Token pos={myPos} src={me.image} name={me.name} ring={myRing} mine />
      </div>
    </div>
  );
}

function Token({
  pos,
  src,
  name,
  ring,
  mine,
}: {
  pos: Pos;
  src: string;
  name: string;
  ring: string;
  mine?: boolean;
}) {
  return (
    <div
      className={`pointer-events-none absolute z-10 aspect-square overflow-hidden rounded-full bg-white shadow ring-2 ${ring} ${
        mine ? "h-[14%]" : "h-[12%]"
      }`}
      style={{
        left: `${((pos.c + 0.5) / MEET_COLS) * 100}%`,
        top: `${((pos.r + 0.5) / MEET_ROWS) * 100}%`,
        transform: "translate(-50%, -50%)",
        transition: "left 90ms linear, top 90ms linear",
      }}
    >
      <PlayerPhoto src={src} alt={name} size={40} className="h-full w-full object-cover" />
    </div>
  );
}
