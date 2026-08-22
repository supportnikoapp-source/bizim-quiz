import type { PlayerId } from "@/data/players";

export const AD_MS = 60_000;

export const NAME_LETTERS: Record<PlayerId, string[]> = {
  ilkin: ["İ", "L", "K", "İ", "N"],
  fidan: ["F", "İ", "D", "A", "N"],
};

export function lettersFor(who: PlayerId): string[] {
  return NAME_LETTERS[who === "ilkin" ? "fidan" : "ilkin"];
}

export function azUpper(raw: string) {
  return raw
    .trim()
    .replace(/i/g, "İ")
    .replace(/ı/g, "I")
    .toLocaleUpperCase("az-AZ")
    .replace(/\s+/g, "");
}

export function formatAdClock(ms: number) {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(sec / 60);
  const r = sec % 60;
  return `${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
}

function canMake(word: string, bank: string[]) {
  const left = new Map<string, number>();
  for (const ch of bank) left.set(ch, (left.get(ch) ?? 0) + 1);
  for (const ch of word) {
    const n = left.get(ch) ?? 0;
    if (n < 1) return false;
    left.set(ch, n - 1);
  }
  return true;
}

export function tryAddWord(
  raw: string,
  bank: string[],
  existing: string[],
): { ok: true; word: string } | { ok: false; error: string } {
  const word = azUpper(raw);
  if (word.length < 2) return { ok: false, error: "Ən az 2 hərf yaz" };
  if (existing.includes(word)) return { ok: false, error: "Bu söz artıq var" };
  if (!canMake(word, bank)) return { ok: false, error: "Bu hərflərdən yoxdur" };
  return { ok: true, word };
}

export function packWords(words: string[]) {
  return JSON.stringify(words);
}

export function unpackWords(raw: unknown): string[] {
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((w) => (typeof w === "string" ? azUpper(w) : ""))
      .filter((w) => w.length >= 2);
  } catch {
    return [];
  }
}
