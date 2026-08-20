"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { playerById, type PlayerId } from "@/data/players";
import { Mascots } from "./Mascots";

type Props = {
  who: PlayerId;
  onBack?: () => void;
  onStart?: () => void;
  hideBack?: boolean;
  busy?: boolean;
  startLabel?: string;
  extra?: ReactNode;
};

export function HostsIntro({ who, onBack, onStart, hideBack, busy, startLabel, extra }: Props) {
  const me = playerById(who);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.32 }}
      className="fixed inset-0 z-20 overflow-y-auto bg-[#f3f7f8]"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {["♥", "✦", "♥", "✦", "♥", "✦"].map((m, i) => (
          <span
            key={i}
            className="absolute text-[#2ec4c8]/25"
            style={{
              left: `${8 + i * 16}%`,
              top: `${12 + (i % 3) * 22}%`,
              fontSize: i % 2 === 0 ? 14 : 11,
            }}
          >
            {m}
          </span>
        ))}
      </div>
      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col px-5 pb-8 pt-5">
      <header className="flex items-center justify-between">
        {hideBack ? (
          <span className="h-11 w-11" />
        ) : (
          <button
            type="button"
            onClick={onBack}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-xl text-[#2ec4c8] shadow-[0_8px_20px_rgba(40,80,90,0.08)]"
            aria-label="Geri"
          >
            ‹
          </button>
        )}
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#2ec4c8] shadow-[0_8px_20px_rgba(40,80,90,0.08)]">
          ···
        </span>
      </header>

      <div className="mt-1">
        <Mascots />
        <div className="-mt-1 flex justify-center gap-[88px] text-[15px] font-semibold">
          <motion.span
            className="text-[#2ec4c8]"
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
          >
            Niko
          </motion.span>
          <motion.span
            className="text-[#f47ca8]"
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 2.8, delay: 0.2, repeat: Infinity, ease: "easeInOut" }}
          >
            Nikoya
          </motion.span>
        </div>
      </div>

      <article className="relative mt-5 flex-1 rounded-[28px] bg-white px-5 pb-6 pt-7 text-center shadow-[0_14px_40px_rgba(40,80,90,0.08)]">
        <div className="absolute top-0 right-6 left-6 flex -translate-y-1/2 items-center gap-3">
          <span className="h-px flex-1 bg-[#e7eef0]" />
          <span className="text-[#2ec4c8]">♥</span>
          <span className="h-px flex-1 bg-[#e7eef0]" />
        </div>

        <p className="text-[22px] font-semibold text-[#24343a]">
          Salam,{" "}
          <span className={who === "fidan" ? "text-[#f47ca8]" : "text-[#2ec4c8]"}>
            {me.name}
          </span>
          ! 👋
        </p>
        <p className="mt-2 text-[15px] leading-relaxed text-[#5b6b70]">
          Biz <span className="font-semibold text-[#2ec4c8]">Niko</span> və{" "}
          <span className="font-semibold text-[#f47ca8]">Nikoya</span>. Bu oyunu sizin üçün
          biz idarə edəcəyik.
        </p>

        <div className="my-4 flex items-center gap-3">
          <span className="h-px flex-1 bg-[#e7eef0]" />
          <span className="text-sm text-[#2ec4c8]">♥</span>
          <span className="h-px flex-1 bg-[#e7eef0]" />
        </div>

        <p className="text-[14.5px] leading-relaxed text-[#5b6b70]">
          <span className="font-semibold text-[#24343a]">
            {who === "fidan" ? "İlkinlə" : "Fidanla"}
          </span>{" "}
          birlikdə oynayacaqsınız. Biz oyunun gedişinə nəzarət edəcək və hər şeyin
          qaydasında getməsini təmin edəcəyik. 😁
        </p>
        {extra}
      </article>

      {onStart ? (
      <button
        type="button"
        disabled={busy}
        onClick={onStart}
        className="mt-5 flex min-h-[54px] w-full items-center justify-between rounded-full bg-[#2ec4c8] px-6 text-[15px] font-semibold text-white shadow-[0_12px_24px_rgba(46,196,200,0.35)] disabled:opacity-60"
      >
        <span>{busy ? "Gözlə…" : startLabel ?? "Hazırsansa, başlayaq! 🚀"}</span>
        <span className="text-xl">→</span>
      </button>
      ) : null}
      </div>
    </motion.div>
  );
}
