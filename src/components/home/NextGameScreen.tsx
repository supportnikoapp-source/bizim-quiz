"use client";

import { playerById, type PlayerId } from "@/data/players";
import { Mascots } from "@/components/home/Mascots";
import { overallTitle, type Score } from "@/lib/score";

type Props = {
  who: PlayerId;
  score: Score;
  onBack: () => void;
};

export function NextGameScreen({ who, score, onBack }: Props) {
  const me = playerById(who);
  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-[#efeae3] px-6 text-center">
      <Mascots />
      <p className="mt-4 font-serif text-[32px] text-[#1b2448]">{overallTitle(score)}</p>
      <p className="mt-3 text-[28px] font-black tabular-nums text-[#1e3a5f]">
        İlkin {score.ilkin} – Fidan {score.fidan}
      </p>
      <p className="mt-2 text-[16px] text-[#6b7280]">{me.name}, oyunlar bitdi 💜</p>
      <button type="button" onClick={onBack} className="btn mt-8 max-w-xs">
        Geri
      </button>
    </div>
  );
}
