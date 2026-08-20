"use client";

import { useEffect, useRef } from "react";
import { paintStrokes, type Stroke } from "@/data/resm";

type Props = {
  strokes: Stroke[];
  className?: string;
};

export function StrokePreview({ strokes, className }: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    function paint() {
      const node = ref.current;
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
      paintStrokes(ctx, strokes, w, h);
    }

    paint();
    const obs = new ResizeObserver(paint);
    obs.observe(parent);
    return () => obs.disconnect();
  }, [strokes]);

  return <canvas ref={ref} className={className} />;
}
