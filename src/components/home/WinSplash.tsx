"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { resultTitle, type GameResult, type Score } from "@/lib/score";

type Props = {
  result: GameResult;
  score: Score;
  last?: boolean;
  onDone: () => void;
};

export function WinSplash({ result, score, last, onDone }: Props) {
  useEffect(() => {
    void confetti({
      particleCount: 140,
      spread: 90,
      origin: { y: 0.55 },
      colors: ["#60a5fa", "#f9a8d4", "#fde68a", "#ffffff"],
    });
    const t = window.setTimeout(onDone, 2400);
    return () => window.clearTimeout(t);
    // Fire once when the splash opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-[#1b2448]/80 px-6 text-center"
    >
      <motion.p
        initial={{ scale: 0.7, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 16 }}
        className="font-serif text-[40px] text-white"
      >
        {resultTitle(result)}
      </motion.p>
      <p className="mt-4 text-[22px] font-black tabular-nums text-white">
        İlkin {score.ilkin} – Fidan {score.fidan}
      </p>
      <p className="mt-3 text-[15px] text-white/75">
        {last ? "Oyunlar bitdi 💜" : "Növbəti oyun…"}
      </p>
    </motion.div>
  );
}
