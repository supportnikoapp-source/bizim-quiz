export type Stroke = {
  color: string;
  width: number;
  points: [number, number][];
};

export const RESM_PROMPTS = [
  { id: "sunset", title: "Gün batımı", hint: "Səma, günəş, rənglər" },
  { id: "forest", title: "Dağ-meşə", hint: "Dağlar, ağaclar, yol" },
] as const;

export const RESM_COLORS = [
  "#1e1b16",
  "#ffffff",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#78716c",
  "#7c2d12",
];

export const PEN_SIZES = [
  { id: "s", width: 4, label: "İncə" },
  { id: "m", width: 10, label: "Orta" },
  { id: "l", width: 18, label: "Qalın" },
];

export function packStrokes(strokes: Stroke[]) {
  return JSON.stringify(
    strokes.map((s) => ({
      color: s.color,
      width: s.width,
      points: s.points.map(([x, y]) => [Number(x.toFixed(3)), Number(y.toFixed(3))]),
    })),
  );
}

export function unpackStrokes(raw: unknown): Stroke[] {
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((s) => {
        if (!s || typeof s !== "object") return null;
        const color = typeof s.color === "string" ? s.color : "#1e1b16";
        const width = Number(s.width);
        const points = Array.isArray(s.points)
          ? s.points
              .map((p: unknown) => {
                if (!Array.isArray(p) || p.length < 2) return null;
                const x = Number(p[0]);
                const y = Number(p[1]);
                if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
                return [x, y] as [number, number];
              })
              .filter((p: [number, number] | null): p is [number, number] => p !== null)
          : [];
        if (points.length === 0) return null;
        return { color, width: Number.isFinite(width) ? width : 10, points };
      })
      .filter((s): s is Stroke => s !== null);
  } catch {
    return [];
  }
}

export function paintStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: Stroke[],
  width: number,
  height: number,
) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fffaf4";
  ctx.fillRect(0, 0, width, height);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const scale = Math.min(width, height) / 360;
  for (const stroke of strokes) {
    if (stroke.points.length === 0) continue;
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = Math.max(1.5, stroke.width * scale);
    ctx.beginPath();
    stroke.points.forEach(([x, y], i) => {
      const px = x * width;
      const py = y * height;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
  }
}
