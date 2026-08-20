"use client";

import { useRef, useState, type PointerEvent } from "react";
import { PlayerPhoto } from "@/components/ui/PlayerPhoto";

export const PUZZLE_COLS = 4;
export const PUZZLE_ROWS = 3;
export const PUZZLE_TOTAL = PUZZLE_COLS * PUZZLE_ROWS;

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
  },
  pink: {
    ring: "ring-[#f472b6]",
    name: "text-[#db2777]",
    board: "border-[#f9a8d4] bg-[#fdf2f8]",
    tray: "border-[#fbcfe8] bg-[#fce7f3]/80",
  },
};

export function PuzzleBoard({ image, name, avatar, theme, mine, placed, onPlace }: Props) {
  const t = THEMES[theme];
  const boardRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ index: number; x: number; y: number } | null>(null);
  const shuffleRef = useRef<number[] | null>(null);
  if (!shuffleRef.current) {
    shuffleRef.current = Array.from({ length: PUZZLE_TOTAL }, (_, i) => i).sort(() => Math.random() - 0.5);
  }
  const tray = shuffleRef.current.filter((i) => !placed.includes(i));
  const row1 = tray.slice(0, Math.ceil(tray.length / 2));
  const row2 = tray.slice(Math.ceil(tray.length / 2));

  function pos(index: number) {
    const col = index % PUZZLE_COLS;
    const row = Math.floor(index / PUZZLE_COLS);
    return {
      backgroundImage: `url(${image})`,
      backgroundSize: `${PUZZLE_COLS * 100}% ${PUZZLE_ROWS * 100}%`,
      backgroundPosition: `${(col / (PUZZLE_COLS - 1)) * 100}% ${(row / (PUZZLE_ROWS - 1)) * 100}%`,
    };
  }

  function onPointerDown(index: number, e: PointerEvent) {
    if (!mine) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ index, x: e.clientX, y: e.clientY });
  }

  function onPointerMove(e: PointerEvent) {
    if (!drag) return;
    setDrag({ ...drag, x: e.clientX, y: e.clientY });
  }

  function onPointerUp(e: PointerEvent) {
    if (!drag || !boardRef.current) {
      setDrag(null);
      return;
    }
    const rect = boardRef.current.getBoundingClientRect();
    const col = Math.floor(((e.clientX - rect.left) / rect.width) * PUZZLE_COLS);
    const row = Math.floor(((e.clientY - rect.top) / rect.height) * PUZZLE_ROWS);
    const slot = row * PUZZLE_COLS + col;
    if (row >= 0 && row < PUZZLE_ROWS && col >= 0 && col < PUZZLE_COLS && slot === drag.index) {
      onPlace?.(drag.index);
    }
    setDrag(null);
  }

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-1.5 px-2">
      <div className="flex items-center gap-2">
        <div className={`h-9 w-9 overflow-hidden rounded-full ring-2 ${t.ring}`}>
          <PlayerPhoto src={avatar} alt={name} size={36} className="h-full w-full object-cover" />
        </div>
        <p className={`text-[15px] font-bold ${t.name}`}>{name}</p>
      </div>

      <div
        ref={boardRef}
        className={`relative grid min-h-0 flex-1 grid-cols-4 grid-rows-3 overflow-hidden rounded-2xl border-4 ${t.board}`}
      >
        {Array.from({ length: PUZZLE_TOTAL }, (_, i) => (
          <div
            key={i}
            className="border border-white/70"
            style={placed.includes(i) ? pos(i) : { background: "rgba(255,255,255,0.85)" }}
          />
        ))}
      </div>

      {mine ? (
        <div className={`rounded-2xl border-2 px-1.5 py-1 ${t.tray}`}>
          <div className="grid grid-cols-6 gap-1">
            {row1.map((i) => (
              <button
                key={i}
                type="button"
                className="aspect-[3/4] overflow-hidden rounded-md border border-white shadow-sm"
                style={pos(i)}
                onPointerDown={(e) => onPointerDown(i, e)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
              />
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
                className="aspect-[3/4] overflow-hidden rounded-md border border-white shadow-sm"
                style={pos(i)}
                onPointerDown={(e) => onPointerDown(i, e)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
              />
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

      {drag ? (
        <div
          className="pointer-events-none fixed z-50 aspect-[3/4] w-16 rounded-md border-2 border-white shadow-lg"
          style={{
            left: drag.x - 32,
            top: drag.y - 40,
            ...pos(drag.index),
          }}
        />
      ) : null}
    </section>
  );
}
