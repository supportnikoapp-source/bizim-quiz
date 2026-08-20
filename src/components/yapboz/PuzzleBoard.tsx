"use client";

import { useId, useRef, useState } from "react";
import { PlayerPhoto } from "@/components/ui/PlayerPhoto";

export const PUZZLE_COLS = 4;
export const PUZZLE_ROWS = 3;
export const PUZZLE_TOTAL = PUZZLE_COLS * PUZZLE_ROWS;

type Tab = -1 | 0 | 1;

type Props = {
  image: string;
  name: string;
  avatar: string;
  theme: "blue" | "pink";
  mine: boolean;
  placed: number[];
  onPlace?: (index: number) => void;
};

const THEMES = {
  blue: {
    ring: "ring-[#3b82f6]",
    name: "text-[#2563eb]",
    board: "border-[#93c5fd] bg-[#eff6ff]",
    tray: "border-[#bfdbfe] bg-[#dbeafe]/70",
    pick: "ring-[#2563eb]",
  },
  pink: {
    ring: "ring-[#f472b6]",
    name: "text-[#db2777]",
    board: "border-[#f9a8d4] bg-[#fdf2f8]",
    tray: "border-[#fbcfe8] bg-[#fce7f3]/80",
    pick: "ring-[#db2777]",
  },
};

function hEdge(row: number, col: number): Tab {
  return ((row * 5 + col * 3) % 2 === 0 ? 1 : -1) as Tab;
}

function vEdge(row: number, col: number): Tab {
  return ((row * 7 + col * 2) % 2 === 0 ? 1 : -1) as Tab;
}

export function edgesFor(index: number) {
  const col = index % PUZZLE_COLS;
  const row = Math.floor(index / PUZZLE_COLS);
  return {
    left: (col === 0 ? 0 : -hEdge(row, col - 1)) as Tab,
    right: (col === PUZZLE_COLS - 1 ? 0 : hEdge(row, col)) as Tab,
    top: (row === 0 ? 0 : -vEdge(row - 1, col)) as Tab,
    bottom: (row === PUZZLE_ROWS - 1 ? 0 : vEdge(row, col)) as Tab,
  };
}

function edge(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  tab: Tab,
  nx: number,
  ny: number,
) {
  if (tab === 0) return `L ${x2} ${y2}`;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const tx = dx / len;
  const ty = dy / len;
  const n = 11;
  const h = 17 * tab;
  const ax = mx - tx * n;
  const ay = my - ty * n;
  const bx = mx + tx * n;
  const by = my + ty * n;
  const cx = mx + nx * h;
  const cy = my + ny * h;
  return [
    `L ${ax} ${ay}`,
    `C ${ax + nx * h * 0.45} ${ay + ny * h * 0.45} ${cx - tx * n * 0.9} ${cy - ty * n * 0.9} ${cx} ${cy}`,
    `C ${cx + tx * n * 0.9} ${cy + ty * n * 0.9} ${bx + nx * h * 0.45} ${by + ny * h * 0.45} ${bx} ${by}`,
    `L ${x2} ${y2}`,
  ].join(" ");
}

export function piecePath(index: number) {
  const { left, right, top, bottom } = edgesFor(index);
  return [
    "M 0 0",
    edge(0, 0, 100, 0, top, 0, -1),
    edge(100, 0, 100, 100, right, 1, 0),
    edge(100, 100, 0, 100, bottom, 0, 1),
    edge(0, 100, 0, 0, left, -1, 0),
    "Z",
  ].join(" ");
}

function PieceArt({
  index,
  image,
  className,
}: {
  index: number;
  image: string;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const clip = `p${uid}-${index}`;
  const col = index % PUZZLE_COLS;
  const row = Math.floor(index / PUZZLE_COLS);
  return (
    <svg viewBox="-22 -22 144 144" className={className} aria-hidden>
      <defs>
        <clipPath id={clip}>
          <path d={piecePath(index)} />
        </clipPath>
      </defs>
      <image
        href={image}
        x={-col * 100}
        y={-row * 100}
        width={PUZZLE_COLS * 100}
        height={PUZZLE_ROWS * 100}
        preserveAspectRatio="xMidYMid slice"
        clipPath={`url(#${clip})`}
      />
      <path d={piecePath(index)} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2.2" />
    </svg>
  );
}

export function PuzzleBoard({ image, name, avatar, theme, mine, placed, onPlace }: Props) {
  const t = THEMES[theme];
  const [picked, setPicked] = useState<number | null>(null);
  const [shake, setShake] = useState<number | null>(null);
  const shuffleRef = useRef<number[] | null>(null);
  if (!shuffleRef.current) {
    shuffleRef.current = Array.from({ length: PUZZLE_TOTAL }, (_, i) => i).sort(() => Math.random() - 0.5);
  }
  const tray = shuffleRef.current.filter((i) => !placed.includes(i));
  const row1 = tray.slice(0, Math.ceil(tray.length / 2));
  const row2 = tray.slice(Math.ceil(tray.length / 2));

  function pickPiece(index: number) {
    if (!mine) return;
    setPicked((cur) => (cur === index ? null : index));
  }

  function dropOnSlot(slot: number) {
    if (!mine || picked === null || placed.includes(slot)) return;
    if (picked === slot) {
      onPlace?.(slot);
      setPicked(null);
      return;
    }
    setShake(slot);
    window.setTimeout(() => setShake(null), 280);
  }

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-1.5 px-2">
      <div className="flex items-center gap-2">
        <div className={`h-9 w-9 overflow-hidden rounded-full ring-2 ${t.ring}`}>
          <PlayerPhoto src={avatar} alt={name} size={36} className="h-full w-full object-cover" />
        </div>
        <p className={`text-[15px] font-bold ${t.name}`}>{name}</p>
      </div>

      <div className={`relative grid min-h-0 flex-1 grid-cols-4 grid-rows-3 overflow-visible rounded-2xl border-4 ${t.board}`}>
        {Array.from({ length: PUZZLE_TOTAL }, (_, i) => (
          <button
            key={i}
            type="button"
            disabled={!mine || placed.includes(i)}
            onClick={() => dropOnSlot(i)}
            className={`relative min-h-0 ${shake === i ? "animate-pulse bg-rose-100" : ""}`}
          >
            {placed.includes(i) ? (
              <PieceArt index={i} image={image} className="absolute inset-[-22%] h-[144%] w-[144%] drop-shadow" />
            ) : (
              <svg viewBox="-22 -22 144 144" className="absolute inset-[-22%] h-[144%] w-[144%] opacity-35">
                <path d={piecePath(i)} fill="white" stroke="#9ca3af" strokeWidth="2" strokeDasharray="5 4" />
              </svg>
            )}
          </button>
        ))}
      </div>

      {mine ? (
        <div className={`rounded-2xl border-2 px-1.5 py-1 ${t.tray}`}>
          <div className="grid grid-cols-6 gap-1">
            {row1.map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => pickPiece(i)}
                className={`aspect-[3/4] overflow-visible rounded-md ${
                  picked === i ? `ring-2 ring-offset-1 ${t.pick} bg-white` : ""
                }`}
              >
                <PieceArt index={i} image={image} className="h-full w-full drop-shadow-sm" />
              </button>
            ))}
            {Array.from({ length: Math.max(0, 6 - row1.length) }, (_, k) => (
              <div key={`e1-${k}`} className="aspect-[3/4]" />
            ))}
          </div>
          <div className="mt-1 grid grid-cols-6 gap-1">
            {row2.map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => pickPiece(i)}
                className={`aspect-[3/4] overflow-visible rounded-md ${
                  picked === i ? `ring-2 ring-offset-1 ${t.pick} bg-white` : ""
                }`}
              >
                <PieceArt index={i} image={image} className="h-full w-full drop-shadow-sm" />
              </button>
            ))}
            {Array.from({ length: Math.max(0, 6 - row2.length) }, (_, k) => (
              <div key={`e2-${k}`} className="aspect-[3/4]" />
            ))}
          </div>
        </div>
      ) : (
        <p className="h-8 text-center text-[12px] text-[#9ca3af]">
          {placed.length}/{PUZZLE_TOTAL}
        </p>
      )}
    </section>
  );
}
