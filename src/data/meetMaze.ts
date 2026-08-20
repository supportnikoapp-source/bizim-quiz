export type Dir = "n" | "e" | "s" | "w";
export type Pos = { r: number; c: number };
export type CellWalls = Record<Dir, boolean>;

export const MEET_ROWS = 15;
export const MEET_COLS = 31;

const DIRS: { dir: Dir; dr: number; dc: number; opp: Dir }[] = [
  { dir: "n", dr: -1, dc: 0, opp: "s" },
  { dir: "e", dr: 0, dc: 1, opp: "w" },
  { dir: "s", dr: 1, dc: 0, opp: "n" },
  { dir: "w", dr: 0, dc: -1, opp: "e" },
];

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rand: () => number) {
  const next = items.slice();
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function inGrid(pos: Pos) {
  return pos.r >= 0 && pos.r < MEET_ROWS && pos.c >= 0 && pos.c < MEET_COLS;
}

function buildMeetMaze() {
  const rand = mulberry32(20260822);
  const cells: CellWalls[][] = Array.from({ length: MEET_ROWS }, () =>
    Array.from({ length: MEET_COLS }, () => ({ n: true, e: true, s: true, w: true })),
  );
  const seen = Array.from({ length: MEET_ROWS }, () => Array(MEET_COLS).fill(false));
  const midR = Math.floor(MEET_ROWS / 2);
  const start: Pos = { r: midR, c: 0 };
  seen[start.r][start.c] = true;
  const stack: Pos[] = [start];

  while (stack.length) {
    const cur = stack[stack.length - 1];
    const opts = shuffle(DIRS, rand).filter((d) => {
      const nr = cur.r + d.dr;
      const nc = cur.c + d.dc;
      return nr >= 0 && nr < MEET_ROWS && nc >= 0 && nc < MEET_COLS && !seen[nr][nc];
    });
    if (!opts.length) {
      stack.pop();
      continue;
    }
    const step = opts[0];
    const next = { r: cur.r + step.dr, c: cur.c + step.dc };
    cells[cur.r][cur.c][step.dir] = false;
    cells[next.r][next.c][step.opp] = false;
    seen[next.r][next.c] = true;
    stack.push(next);
  }

  cells[midR][0].w = false;
  cells[midR][MEET_COLS - 1].e = false;

  const ilkin = { r: midR, c: 0 };
  const fidan = { r: midR, c: MEET_COLS - 1 };
  if (!hasPath(cells, ilkin, fidan)) {
    throw new Error("Görüş xəritəsi yolu yoxdur");
  }

  return { cells, ilkin, fidan };
}

function hasPath(cells: CellWalls[][], from: Pos, to: Pos) {
  const q: Pos[] = [from];
  const seen = new Set([`${from.r},${from.c}`]);
  while (q.length) {
    const cur = q.shift()!;
    if (cur.r === to.r && cur.c === to.c) return true;
    for (const d of DIRS) {
      if (cells[cur.r][cur.c][d.dir]) continue;
      const next = { r: cur.r + d.dr, c: cur.c + d.dc };
      if (!inGrid(next)) continue;
      const key = `${next.r},${next.c}`;
      if (seen.has(key)) continue;
      seen.add(key);
      q.push(next);
    }
  }
  return false;
}

export const MEET = buildMeetMaze();

export function meetInBounds(pos: Pos) {
  return inGrid(pos);
}

export function meetSame(a: Pos, b: Pos) {
  return a.r === b.r && a.c === b.c;
}

export function meetStep(from: Pos, dir: Dir): Pos | null {
  const d = DIRS.find((item) => item.dir === dir);
  if (!d || MEET.cells[from.r][from.c][dir]) return null;
  const next = { r: from.r + d.dr, c: from.c + d.dc };
  return inGrid(next) ? next : null;
}

export function meetDirBetween(from: Pos, to: Pos): Dir | null {
  const dr = to.r - from.r;
  const dc = to.c - from.c;
  if (Math.abs(dr) + Math.abs(dc) !== 1) return null;
  if (dr === -1) return "n";
  if (dr === 1) return "s";
  if (dc === 1) return "e";
  return "w";
}

export function theyMet(a: Pos, b: Pos) {
  if (meetSame(a, b)) return true;
  const dir = meetDirBetween(a, b);
  if (!dir) return false;
  return meetStep(a, dir) !== null;
}

export function packMeetTrail(trail: Pos[]) {
  return trail.map((p) => `${p.r},${p.c}`).join(";");
}

export function unpackMeetTrail(raw: unknown): Pos[] {
  if (typeof raw !== "string" || !raw) return [];
  return raw
    .split(";")
    .map((part) => {
      const [r, c] = part.split(",").map(Number);
      return Number.isInteger(r) && Number.isInteger(c) ? { r, c } : null;
    })
    .filter((p): p is Pos => p !== null && inGrid(p));
}

export function appendMeetTrail(trail: Pos[], pos: Pos) {
  const last = trail[trail.length - 1];
  if (last && meetSame(last, pos)) return trail.slice(-100);
  return [...trail, pos].slice(-100);
}
