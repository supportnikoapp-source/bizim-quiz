export function normalizeCode(raw: string): string {
  const t = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (!t) return "";
  if (t.startsWith("LOVE-")) return t;
  if (t.startsWith("LOVE")) return `LOVE-${t.slice(4)}`;
  return `LOVE-${t}`;
}

export function inviteUrl(code: string): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/o/${code}`;
}
