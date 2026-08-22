"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { PLAYERS, type PlayerId } from "@/data/players";
import { PlayerPhoto } from "@/components/ui/PlayerPhoto";

const OPTIONS = [
  { id: "A", text: "100 faiz" },
  { id: "B", text: "alınmaz" },
  { id: "C", text: "olmaz" },
  { id: "D", text: "alınan deyil" },
] as const;

const CORRECT = "A";

type Props = {
  who: PlayerId;
  onBack: () => void;
  onPass: () => void;
};

export function GateQuestion({ onBack, onPass }: Props) {
  const [picked, setPicked] = useState<string>("");
  const [wrong, setWrong] = useState(false);

  function submit() {
    if (!picked) return;
    if (picked !== CORRECT) {
      setWrong(true);
      return;
    }
    setWrong(false);
    onPass();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.28 }}
      className="fixed inset-0 z-20 overflow-y-auto bg-[#f3f4f6]"
    >
      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col px-5 pb-8 pt-5">
        <header className="flex items-center">
          <button
            type="button"
            onClick={onBack}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-xl text-[#3b82f6] shadow"
            aria-label="Geri"
          >
            ‹
          </button>
        </header>

        <div className="mt-6 flex items-center justify-center gap-4">
          {PLAYERS.map((p, i) => (
            <div key={p.id} className="flex items-center gap-4">
              {i === 1 ? (
                <span className="text-[28px] font-light text-[#9ca3af]">+</span>
              ) : null}
              <figure className="flex flex-col items-center">
                <div
                  className={`h-[108px] w-[108px] overflow-hidden rounded-full border-[4px] ${
                    p.id === "ilkin" ? "border-[#60a5fa]" : "border-[#c084fc]"
                  }`}
                >
                  <PlayerPhoto
                    src={p.image}
                    alt={p.name}
                    size={108}
                    className="h-full w-full object-cover"
                    style={{ objectPosition: "50% 18%" }}
                  />
                </div>
                <figcaption className="mt-2 text-[16px] font-semibold text-[#111827]">
                  {p.name}
                </figcaption>
              </figure>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-[22px] font-bold text-[#111827]">
          Bu ikisindən nə çıxar? 😄
        </p>
        <p className="mt-2 text-center text-[14px] text-[#6b7280]">
          Oyunlara qoşulmaq üçün suala cavab verin.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {OPTIONS.map((opt) => {
            const active = picked === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setPicked(opt.id);
                  setWrong(false);
                }}
                className={`min-h-[56px] rounded-2xl bg-white px-3 text-[16px] font-semibold text-[#111827] shadow-sm ${
                  active ? "ring-2 ring-[#60a5fa]" : "ring-1 ring-black/5"
                }`}
              >
                {opt.id}) {opt.text}
              </button>
            );
          })}
        </div>

        {wrong ? (
          <p className="mt-4 text-center text-[15px] font-semibold text-[#dc2626]">
            Cavab yanlışdır
          </p>
        ) : null}

        <button
          type="button"
          disabled={!picked}
          onClick={submit}
          className="mt-5 min-h-[54px] w-full rounded-full bg-[#7dd3fc] text-[16px] font-semibold text-white shadow disabled:opacity-50"
        >
          Tamamdır
        </button>
      </div>
    </motion.div>
  );
}
