export const EVASIVE_MESSAGE = "Bu cavab qəbul olunmur.";

const FORBIDDEN = [
  "bilmirem",
  "bilmiram",
  "bilmyrem",
  "bilmiremki",
  "nebilim",
  "nebileyim",
  "nebilem",
  "dusunmemisem",
  "dusunmemishem",
  "dusunmemisem",
];

function foldAz(text: string): string {
  return text
    .replace(/İ/g, "i")
    .replace(/I/g, "i")
    .toLocaleLowerCase("az")
    .replace(/ə/g, "e")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ğ/g, "g")
    .replace(/ş/g, "s")
    .replace(/ç/g, "c");
}

function stripQuoted(text: string): string {
  return text
    .replace(/"[^"]*"/g, " ")
    .replace(/'[^']*'/g, " ")
    .replace(/«[^»]*»/g, " ")
    .replace(/“[^”]*”/g, " ")
    .replace(/„[^”]*”/g, " ");
}

function compactLetters(text: string): string {
  return foldAz(text)
    .replace(/[^a-z]+/g, "")
    .replace(/(.)\1+/g, "$1");
}

export function isEvasiveAnswer(raw: string): boolean {
  const leftover = stripQuoted(raw);
  const compact = compactLetters(leftover);
  if (!compact) return false;
  return FORBIDDEN.some((phrase) => compact.includes(compactLetters(phrase)));
}
