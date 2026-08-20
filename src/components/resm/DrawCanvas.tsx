"use client";

import { useEffect, useRef } from "react";
import { paintStrokes, type Stroke } from "@/data/resm";

type Props = {
  strokes: Stroke[];
  color: string;
  width: number;
  disabled?: boolean;
  onChange: (strokes: Stroke[]) => void;
};

export function DrawCanvas({ strokes, color, width, disabled, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef(strokes);
  const colorRef = useRef(color);
  const widthRef = useRef(width);
  const onChangeRef = useRef(onChange);
  const drawing = useRef(false);
  const disabledRef = useRef(Boolean(disabled));
  strokesRef.current = strokes;
  colorRef.current = color;
  widthRef.current = width;
  onChangeRef.current = onChange;
  disabledRef.current = Boolean(disabled);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    function size() {
      const node = canvasRef.current;
      const box = parent;
      if (!node || !box) return;
      const w = Math.max(1, box.clientWidth);
      const h = Math.max(1, box.clientHeight);
      const dpr = window.devicePixelRatio || 1;
      node.width = Math.floor(w * dpr);
      node.height = Math.floor(h * dpr);
      node.style.width = `${w}px`;
      node.style.height = `${h}px`;
      const ctx = node.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paintStrokes(ctx, strokesRef.current, w, h);
    }

    function point(e: PointerEvent): [number, number] | null {
      const node = canvasRef.current;
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return null;
      return [(e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height];
    }

    function paint() {
      const node = canvasRef.current;
      if (!node) return;
      const ctx = node.getContext("2d");
      if (!ctx) return;
      const rect = node.getBoundingClientRect();
      paintStrokes(ctx, strokesRef.current, rect.width, rect.height);
    }

    function down(e: PointerEvent) {
      if (disabledRef.current) return;
      const p = point(e);
      if (!p) return;
      const target = canvasRef.current;
      if (!target) return;
      e.preventDefault();
      drawing.current = true;
      target.setPointerCapture(e.pointerId);
      const next = [...strokesRef.current, { color: colorRef.current, width: widthRef.current, points: [p] }];
      strokesRef.current = next;
      onChangeRef.current(next);
      paint();
    }

    function move(e: PointerEvent) {
      if (!drawing.current || disabledRef.current) return;
      const p = point(e);
      if (!p) return;
      const list = strokesRef.current;
      const last = list[list.length - 1];
      if (!last) return;
      const prev = last.points[last.points.length - 1];
      if (prev) {
        const dx = p[0] - prev[0];
        const dy = p[1] - prev[1];
        if (dx * dx + dy * dy < 0.00012) return;
      }
      last.points.push(p);
      const next = [...list.slice(0, -1), { ...last, points: last.points.slice() }];
      strokesRef.current = next;
      onChangeRef.current(next);
      paint();
    }

    function up() {
      drawing.current = false;
    }

    const node = canvas;
    size();
    const obs = new ResizeObserver(size);
    obs.observe(parent);
    node.addEventListener("pointerdown", down, { passive: false });
    node.addEventListener("pointermove", move);
    node.addEventListener("pointerup", up);
    node.addEventListener("pointercancel", up);
    return () => {
      obs.disconnect();
      node.removeEventListener("pointerdown", down);
      node.removeEventListener("pointermove", move);
      node.removeEventListener("pointerup", up);
      node.removeEventListener("pointercancel", up);
    };
  }, []);

  useEffect(() => {
    const node = canvasRef.current;
    if (!node) return;
    const ctx = node.getContext("2d");
    if (!ctx) return;
    const rect = node.getBoundingClientRect();
    paintStrokes(ctx, strokes, rect.width, rect.height);
  }, [strokes]);

  return <canvas ref={canvasRef} className="h-full w-full touch-none" />;
}
