"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent, type TouchEvent as ReactTouchEvent } from "react";
import { PlayerPhoto } from "@/components/ui/PlayerPhoto";

export const PUZZLE_COLS = 3;
export const PUZZLE_ROWS = 4;
export const PUZZLE_TOTAL = PUZZLE_COLS * PUZZLE_ROWS;

export type PuzzleSlots = (number | null)[];

export function emptySlots(): PuzzleSlots {
  return Array.from({ length: PUZZLE_TOTAL }, () => null);
}

export function puzzleComplete(slots: PuzzleSlots) {
  return slots.length === PUZZLE_TOTAL && slots.every((piece, i) => piece === i);
}

type Props = {
  image: string;
  name: string;
  avatar: string;
  theme: "blue" | "pink";
  mine: boolean;
  slots: PuzzleSlots;
  onSlots?: (slots: PuzzleSlots) => void;
};

const THEMES = {
  blue: {
    ring: "ring-[#3b82f6]",
    name: "text-[#2563eb]",
    board: "border-[#93c5fd] bg-[#dbeafe]",
    tray: "border-[#bfdbfe] bg-[#dbeafe]/70",
    pick: "ring-[#2563eb]",
  },
  pink: {
    ring: "ring-[#f472b6]",
    name: "text-[#db2777]",
    board: "border-[#f9a8d4] bg-[#fce7f3]",
    tray: "border-[#fbcfe8] bg-[#fce7f3]/80",
    pick: "ring-[#db2777]",
  },
};

function PieceArt({
  index,
  image,
  className,
}: {
  index: number;
  image: string;
  className?: string;
}) {
  const col = index % PUZZLE_COLS;
  const row = Math.floor(index / PUZZLE_COLS);
  return (
    <div className={`pointer-events-none overflow-hidden ${className ?? ""}`} aria-hidden>
      <img
        src={image}
        alt=""
        draggable={false}
        className="block max-w-none object-cover object-center"
        style={{
          width: `${PUZZLE_COLS * 100}%`,
          height: "auto",
          aspectRatio: `${PUZZLE_COLS} / ${PUZZLE_ROWS}`,
          transform: `translate(${(-col / PUZZLE_COLS) * 100}%, ${(-row / PUZZLE_ROWS) * 100}%)`,
        }}
      />
    </div>
  );
}

export function PuzzleBoard({ image, name, avatar, theme, mine, slots, onSlots }: Props) {
  const t = THEMES[theme];
  const [picked, setPicked] = useState<number | null>(null);
  const [drag, setDrag] = useState<{ index: number; x: number; y: number; over: number | null } | null>(null);
  const slotRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const slotsRef = useRef(slots);
  slotsRef.current = slots;
  const shuffleRef = useRef<number[] | null>(null);
  if (!shuffleRef.current) {
    shuffleRef.current = Array.from({ length: PUZZLE_TOTAL }, (_, i) => i).sort(() => Math.random() - 0.5);
  }

  const sitting = new Set(slots.filter((p): p is number => p !== null));
  const tray = shuffleRef.current.filter((i) => !sitting.has(i));
  const row1 = tray.slice(0, Math.ceil(tray.length / 2));
  const row2 = tray.slice(Math.ceil(tray.length / 2));

  function lockedSlot(slot: number) {
    return slotsRef.current[slot] === slot;
  }

  function nearestSlot(x: number, y: number) {
    const board = boardRef.current?.getBoundingClientRect();
    let best: number | null = null;
    let bestDist = Infinity;
    for (let i = 0; i < PUZZLE_TOTAL; i++) {
      if (lockedSlot(i)) continue;
      const el = slotRefs.current[i];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return i;
      const dist = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    if (!board) return bestDist < 90 ? best : null;
    const inside =
      x >= board.left - 12 && x <= board.right + 12 && y >= board.top - 12 && y <= board.bottom + 12;
    if (inside) return best;
    return bestDist < 90 ? best : null;
  }

  function dropOn(piece: number, slot: number) {
    if (!mine || !onSlots || lockedSlot(slot)) return;
    const next = slotsRef.current.map((p) => (p === piece ? null : p));
    next[slot] = piece;
    onSlots(next);
    setPicked(null);
  }

  function pickPiece(index: number) {
    if (!mine) return;
    setPicked((cur) => (cur === index ? null : index));
  }

  function beginDrag(index: number, startX: number, startY: number, pointerId: number, kind: "touch" | "pointer") {
    if (!mine) return;
    let moved = false;
    let lastX = startX;
    let lastY = startY;

    const onMove = (x: number, y: number) => {
      lastX = x;
      lastY = y;
      if (!moved && Math.hypot(x - startX, y - startY) < 6) return;
      moved = true;
      setPicked(index);
      setDrag({ index, x, y, over: nearestSlot(x, y) });
    };

    const finish = () => {
      setDrag(null);
      if (!moved) {
        pickPiece(index);
        return;
      }
      const slot = nearestSlot(lastX, lastY);
      if (slot !== null) dropOn(index, slot);
    };

    if (kind === "touch") {
      const move = (ev: TouchEvent) => {
        const t = Array.from(ev.touches).find((item) => item.identifier === pointerId);
        if (!t) return;
        ev.preventDefault();
        onMove(t.clientX, t.clientY);
      };
      const up = (ev: TouchEvent) => {
        const t = Array.from(ev.changedTouches).find((item) => item.identifier === pointerId);
        if (t) {
          lastX = t.clientX;
          lastY = t.clientY;
        }
        window.removeEventListener("touchmove", move);
        window.removeEventListener("touchend", up);
        window.removeEventListener("touchcancel", up);
        finish();
      };
      window.addEventListener("touchmove", move, { passive: false });
      window.addEventListener("touchend", up);
      window.addEventListener("touchcancel", up);
      return;
    }

    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      ev.preventDefault();
      onMove(ev.clientX, ev.clientY);
    };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      lastX = ev.clientX;
      lastY = ev.clientY;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      finish();
    };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  function onTrayTouch(e: ReactTouchEvent<HTMLButtonElement>, index: number) {
    const t = e.changedTouches[0];
    if (!t) return;
    e.preventDefault();
    e.stopPropagation();
    beginDrag(index, t.clientX, t.clientY, t.identifier, "touch");
  }

  function onTrayPointer(e: ReactPointerEvent<HTMLButtonElement>, index: number) {
    if (e.pointerType === "touch") return;
    e.preventDefault();
    e.stopPropagation();
    beginDrag(index, e.clientX, e.clientY, e.pointerId, "pointer");
  }

  function trayButton(i: number) {
    return (
      <button
        key={i}
        type="button"
        disabled={!mine}
        onTouchStart={mine ? (e) => onTrayTouch(e, i) : undefined}
        onPointerDown={mine ? (e) => onTrayPointer(e, i) : undefined}
        className={`aspect-square overflow-hidden rounded-[4px] ${mine ? "touch-none" : ""} ${
          picked === i || drag?.index === i ? `ring-2 ring-offset-1 ${t.pick} bg-white` : ""
        } ${drag?.index === i ? "opacity-25" : ""}`}
      >
        <PieceArt index={i} image={image} className="h-full w-full" />
      </button>
    );
  }

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-1 px-1.5">
      <div className="flex items-center gap-2">
        <div className={`h-8 w-8 overflow-hidden rounded-full ring-2 ${t.ring}`}>
          <PlayerPhoto src={avatar} alt={name} size={32} className="h-full w-full object-cover" />
        </div>
        <p className={`text-[14px] font-bold ${t.name}`}>{name}</p>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div
          ref={boardRef}
          className={`grid aspect-[3/4] h-full max-h-full w-auto max-w-full grid-cols-3 grid-rows-4 gap-0 overflow-hidden rounded-xl border-4 ${t.board}`}
        >
          {Array.from({ length: PUZZLE_TOTAL }, (_, i) => {
            const sittingPiece = slots[i];
            const locked = sittingPiece === i;
            const shown = drag?.index === sittingPiece ? null : sittingPiece;
            return (
              <button
                key={i}
                ref={(el) => {
                  slotRefs.current[i] = el;
                }}
                type="button"
                disabled={!mine || locked}
                onTouchStart={(e) => {
                  if (!mine || locked) return;
                  const touch = e.changedTouches[0];
                  if (!touch) return;
                  e.preventDefault();
                  if (picked !== null) {
                    dropOn(picked, i);
                    return;
                  }
                  if (sittingPiece !== null) {
                    beginDrag(sittingPiece, touch.clientX, touch.clientY, touch.identifier, "touch");
                  }
                }}
                onPointerDown={(e) => {
                  if (!mine || locked || e.pointerType === "touch") return;
                  if (picked !== null) {
                    dropOn(picked, i);
                    return;
                  }
                  if (sittingPiece !== null) {
                    beginDrag(sittingPiece, e.clientX, e.clientY, e.pointerId, "pointer");
                  }
                }}
                onClick={() => {
                  if (!mine || locked) return;
                  if (picked !== null) dropOn(picked, i);
                }}
                className={`relative h-full min-h-0 w-full overflow-hidden ${mine ? "touch-none" : ""} ${
                  drag?.over === i ? "ring-2 ring-inset ring-white/80" : shown === null ? "bg-black/5" : ""
                }`}
              >
                {shown !== null ? (
                  <PieceArt index={shown} image={image} className="h-full w-full" />
                ) : (
                  <span className="absolute inset-[12%] rounded-sm border border-dashed border-black/20" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className={`select-none rounded-2xl border-2 px-1.5 py-1 ${t.tray}`}>
        <div className="grid grid-cols-6 gap-1">
          {row1.map(trayButton)}
          {Array.from({ length: Math.max(0, 6 - row1.length) }, (_, k) => (
            <div key={`e1-${k}`} className="aspect-square" />
          ))}
        </div>
        <div className="mt-1 grid grid-cols-6 gap-1">
          {row2.map(trayButton)}
          {Array.from({ length: Math.max(0, 6 - row2.length) }, (_, k) => (
            <div key={`e2-${k}`} className="aspect-square" />
          ))}
        </div>
      </div>

      {drag ? (
        <div
          className="pointer-events-none fixed z-[80] h-16 w-16 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-md drop-shadow-2xl"
          style={{ left: drag.x, top: drag.y }}
        >
          <PieceArt index={drag.index} image={image} className="h-full w-full" />
        </div>
      ) : null}
    </section>
  );
}
