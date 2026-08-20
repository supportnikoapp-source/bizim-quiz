"use client";

import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type TouchEvent as ReactTouchEvent } from "react";
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

function pieceStyle(index: number, image: string): CSSProperties {
  const col = index % PUZZLE_COLS;
  const row = Math.floor(index / PUZZLE_COLS);
  return {
    backgroundImage: `url(${image})`,
    backgroundRepeat: "no-repeat",
    backgroundSize: `${PUZZLE_COLS * 100}% ${PUZZLE_ROWS * 100}%`,
    backgroundPosition: `${(col / (PUZZLE_COLS - 1)) * 100}% ${(row / (PUZZLE_ROWS - 1)) * 100}%`,
  };
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
  return (
    <div
      className={`pointer-events-none overflow-hidden ${className ?? ""}`}
      style={pieceStyle(index, image)}
      aria-hidden
    />
  );
}

export function PuzzleBoard({ image, name, avatar, theme, mine, placed, onPlace }: Props) {
  const t = THEMES[theme];
  const [picked, setPicked] = useState<number | null>(null);
  const [drag, setDrag] = useState<{ index: number; x: number; y: number; over: number | null } | null>(null);
  const [loose, setLoose] = useState<(number | null)[]>(() => Array(PUZZLE_TOTAL).fill(null));
  const slotRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const placedRef = useRef(placed);
  placedRef.current = placed;
  const shuffleRef = useRef<number[] | null>(null);
  if (!shuffleRef.current) {
    shuffleRef.current = Array.from({ length: PUZZLE_TOTAL }, (_, i) => i).sort(() => Math.random() - 0.5);
  }

  const sitting = new Set(loose.filter((p): p is number => p !== null));
  const tray = shuffleRef.current.filter((i) => !placed.includes(i) && !sitting.has(i));
  const row1 = tray.slice(0, Math.ceil(tray.length / 2));
  const row2 = tray.slice(Math.ceil(tray.length / 2));

  function pieceInSlot(slot: number) {
    if (placed.includes(slot)) return slot;
    return loose[slot];
  }

  function nearestSlot(x: number, y: number) {
    const board = boardRef.current?.getBoundingClientRect();
    let best: number | null = null;
    let bestDist = Infinity;
    for (let i = 0; i < PUZZLE_TOTAL; i++) {
      if (placedRef.current.includes(i)) continue;
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
    if (!mine || placedRef.current.includes(slot)) return;
    if (piece === slot) {
      setLoose((prev) => prev.map((p) => (p === piece ? null : p)));
      onPlace?.(slot);
      setPicked(null);
      return;
    }
    setLoose((prev) => {
      const next = prev.map((p) => (p === piece ? null : p));
      next[slot] = piece;
      return next;
    });
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
        onTouchStart={(e) => onTrayTouch(e, i)}
        onPointerDown={(e) => onTrayPointer(e, i)}
        className={`aspect-square touch-none overflow-hidden rounded-[4px] ${
          picked === i || drag?.index === i ? `ring-2 ring-offset-1 ${t.pick} bg-white` : ""
        } ${drag?.index === i ? "opacity-25" : ""}`}
      >
        <PieceArt index={i} image={image} className="h-full w-full drop-shadow-sm" />
      </button>
    );
  }

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-1.5 px-2">
      <div className="flex items-center gap-2">
        <div className={`h-9 w-9 overflow-hidden rounded-full ring-2 ${t.ring}`}>
          <PlayerPhoto src={avatar} alt={name} size={36} className="h-full w-full object-cover" />
        </div>
        <p className={`text-[15px] font-bold ${t.name}`}>{name}</p>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div
          ref={boardRef}
          className={`grid aspect-[4/3] h-full max-h-full w-auto max-w-full grid-cols-4 grid-rows-3 gap-[2px] overflow-hidden rounded-xl border-4 ${t.board}`}
        >
          {Array.from({ length: PUZZLE_TOTAL }, (_, i) => {
            const sittingPiece = pieceInSlot(i);
            const locked = placed.includes(i);
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
                className={`relative aspect-square touch-none overflow-hidden ${
                  drag?.over === i ? "ring-2 ring-white" : picked !== null && !locked ? "bg-white/50" : "bg-white/30"
                }`}
              >
                {shown !== null ? (
                  <PieceArt index={shown} image={image} className="absolute inset-0" />
                ) : (
                  <span className="absolute inset-[12%] rounded-sm border border-dashed border-black/20" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {mine ? (
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
      ) : (
        <p className="h-8 text-center text-[12px] text-[#9ca3af]">
          {placed.length}/{PUZZLE_TOTAL}
        </p>
      )}

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
