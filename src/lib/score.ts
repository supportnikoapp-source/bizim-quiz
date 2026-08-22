import type { PlayerId } from "@/data/players";

export type Score = { ilkin: number; fidan: number };

export type GameResult =
  | { type: "one"; winner: PlayerId }
  | { type: "both" }
  | { type: "tie" };

export function addScore(score: Score, result: GameResult): Score {
  if (result.type === "both") {
    return { ilkin: score.ilkin + 1, fidan: score.fidan + 1 };
  }
  if (result.type === "one") {
    return { ...score, [result.winner]: score[result.winner] + 1 };
  }
  return score;
}

export function resultTitle(result: GameResult) {
  if (result.type === "both") return "Hər ikiniz qazandınız";
  if (result.type === "tie") return "Bərabərə";
  return result.winner === "ilkin" ? "İlkin qazandı" : "Fidan qazandı";
}

export function overallTitle(score: Score) {
  if (score.ilkin > score.fidan) return "İlkin qazandı";
  if (score.fidan > score.ilkin) return "Fidan qazandı";
  return "Bərabərə";
}
