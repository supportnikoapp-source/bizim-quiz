export type Dir = "n" | "e" | "s" | "w";
export type Pos = { r: number; c: number };
export type CellWalls = Record<Dir, boolean>;

export const MAZE_ROWS = 11;
export const MAZE_COLS = 9;

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

function buildMaze() {
  const rand = mulberry32(20260820);
  const cells: CellWalls[][] = Array.from({ length: MAZE_ROWS }, () =>
    Array.from({ length: MAZE_COLS }, () => ({ n: true, e: true, s: true, w: true })),
  );
  const seen = Array.from({ length: MAZE_ROWS }, () => Array(MAZE_COLS).fill(false));
  const mid = Math.floor(MAZE_COLS / 2);
  const start: Pos = { r: 0, c: mid };
  seen[start.r][start.c] = true;
  const stack: Pos[] = [start];

  while (stack.length) {
    const cur = stack[stack.length - 1];
    const opts = shuffle(DIRS, rand).filter((d) => {
      const nr = cur.r + d.dr;
      const nc = cur.c + d.dc;
      return nr >= 0 && nr < MAZE_ROWS && nc >= 0 && nc < MAZE_COLS && !seen[nr][nc];
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

  cells[0][mid].n = false;
  cells[MAZE_ROWS - 1][mid].s = false;

  const ilkin = { r: 0, c: mid };
  const fidan = { r: MAZE_ROWS - 1, c: mid };
  if (!hasPath(cells, ilkin, fidan)) {
    throw new Error("Labirint yolu yoxdur");
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
      if (!inBounds(next)) continue;
      const key = `${next.r},${next.c}`;
      if (seen.has(key)) continue;
      seen.add(key);
      q.push(next);
    }
  }
  return false;
}

export const MAZE = buildMaze();

export function inBounds(pos: Pos) {
  return pos.r >= 0 && pos.r < MAZE_ROWS && pos.c >= 0 && pos.c < MAZE_COLS;
}

export function samePos(a: Pos, b: Pos) {
  return a.r === b.r && a.c === b.c;
}

export function stepPos(from: Pos, dir: Dir): Pos | null {
  const d = DIRS.find((item) => item.dir === dir);
  if (!d || MAZE.cells[from.r][from.c][dir]) return null;
  const next = { r: from.r + d.dr, c: from.c + d.dc };
  return inBounds(next) ? next : null;
}

export function dirBetween(from: Pos, to: Pos): Dir | null {
  const dr = to.r - from.r;
  const dc = to.c - from.c;
  if (Math.abs(dr) + Math.abs(dc) !== 1) return null;
  if (dr === -1) return "n";
  if (dr === 1) return "s";
  if (dc === 1) return "e";
  return "w";
}

export function packTrail(trail: Pos[]) {
  return trail.map((p) => `${p.r},${p.c}`).join(";");
}

export function unpackTrail(raw: unknown): Pos[] {
  if (typeof raw !== "string" || !raw) return [];
  return raw
    .split(";")
    .map((part) => {
      const [r, c] = part.split(",").map(Number);
      return Number.isInteger(r) && Number.isInteger(c) ? { r, c } : null;
    })
    .filter((p): p is Pos => p !== null && inBounds(p));
}

export function appendTrail(trail: Pos[], pos: Pos) {
  const last = trail[trail.length - 1];
  if (last && samePos(last, pos)) return trail.slice(-80);
  return [...trail, pos].slice(-80);
}
