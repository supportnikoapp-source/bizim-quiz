"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GateQuestion } from "@/components/home/GateQuestion";
import { HostsIntro } from "@/components/home/HostsIntro";
import { NextGameScreen } from "@/components/home/NextGameScreen";
import { WhoAreYou } from "@/components/home/WhoAreYou";
import { AdScreen } from "@/components/ad/AdScreen";
import { GorushScreen } from "@/components/gorush/GorushScreen";
import { LabirintScreen } from "@/components/labirint/LabirintScreen";
import { ResmScreen } from "@/components/resm/ResmScreen";
import { YapbozScreen } from "@/components/yapboz/YapbozScreen";
import { type PlayerId } from "@/data/players";

type Step = "who" | "intro" | "gate" | "yapboz" | "labirint" | "gorush" | "resm" | "ad" | "next";

/** Müvəqqəti yoxlama keçidi — oyunlar bitəndə sil. */
const DEV_SKIP = true;

function SkipBtn({ onClick, label = "Keç →" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full bg-white/90 px-4 py-2 text-[13px] font-semibold text-[#6b7280] shadow"
    >
      {label}
    </button>
  );
}

export function HomeScreen() {
  const [step, setStep] = useState<Step>("who");
  const [who, setWho] = useState<PlayerId | null>(null);

  return (
    <AnimatePresence mode="wait">
      {step === "who" ? (
        <motion.div
          key="who"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.28 }}
          className="mx-auto w-full max-w-[400px] text-center"
        >
          <h1 className="font-serif text-[34px] font-semibold tracking-tight text-[#1b2448]">
            İlkin – Fidan
          </h1>
          <p className="font-script -mt-1 text-[42px] leading-none text-[#c4a574]">Quiz</p>
          <div className="mx-auto mt-4 mb-8 flex h-[10px] items-center justify-center gap-2">
            <span className="h-px w-16 bg-[#1b2448]/15" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#1b2448]/30" />
            <span className="h-px w-16 bg-[#1b2448]/15" />
          </div>

          <h2 className="mb-5 font-serif text-[26px] text-[#1b2448]">Sən kimsən?</h2>
          <WhoAreYou selected={who} onSelect={setWho} />

          <button className="btn mt-6" type="button" disabled={!who} onClick={() => setStep("intro")}>
            Davam et →
          </button>
          {DEV_SKIP && who ? (
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <SkipBtn onClick={() => setStep("yapboz")} label="Yapboza keç" />
              <SkipBtn onClick={() => setStep("labirint")} label="Labirintə keç" />
              <SkipBtn onClick={() => setStep("gorush")} label="Görüşə keç" />
              <SkipBtn onClick={() => setStep("resm")} label="Rəsmə keç" />
              <SkipBtn onClick={() => setStep("ad")} label="Söz tap keç" />
            </div>
          ) : null}
        </motion.div>
      ) : step === "gate" && who ? (
        <GateQuestion
          key="gate"
          who={who}
          onBack={() => setStep("intro")}
          onPass={() => setStep("yapboz")}
        />
      ) : step === "yapboz" && who ? (
        <YapbozScreen
          key="yapboz"
          who={who}
          onBack={() => setStep("intro")}
          onBothDone={() => setStep("labirint")}
          onSkip={DEV_SKIP ? () => setStep("labirint") : undefined}
        />
      ) : step === "labirint" && who ? (
        <LabirintScreen
          key="labirint"
          who={who}
          onBack={() => setStep("intro")}
          onBothDone={() => setStep("gorush")}
          onSkipLobby={DEV_SKIP ? true : undefined}
        />
      ) : step === "gorush" && who ? (
        <GorushScreen
          key="gorush"
          who={who}
          onBack={() => setStep("intro")}
          onBothWon={() => setStep("resm")}
          onSkipLobby={DEV_SKIP ? true : undefined}
        />
      ) : step === "resm" && who ? (
        <ResmScreen
          key="resm"
          who={who}
          onBack={() => setStep("intro")}
          onBothDone={() => setStep("ad")}
          onSkipLobby={DEV_SKIP ? true : undefined}
        />
      ) : step === "ad" && who ? (
        <AdScreen
          key="ad"
          who={who}
          onBack={() => setStep("intro")}
          onBothDone={() => setStep("next")}
          onSkipLobby={DEV_SKIP ? true : undefined}
        />
      ) : step === "next" && who ? (
        <NextGameScreen key="next" who={who} onBack={() => setStep("intro")} />
      ) : who ? (
        <HostsIntro
          key="intro"
          who={who}
          onBack={() => setStep("who")}
          onStart={() => setStep("gate")}
          extra={
            DEV_SKIP ? (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <SkipBtn onClick={() => setStep("yapboz")} label="Yapboza keç" />
                <SkipBtn onClick={() => setStep("labirint")} label="Labirintə keç" />
                <SkipBtn onClick={() => setStep("gorush")} label="Görüşə keç" />
                <SkipBtn onClick={() => setStep("resm")} label="Rəsmə keç" />
                <SkipBtn onClick={() => setStep("ad")} label="Söz tap keç" />
              </div>
            ) : null
          }
        />
      ) : null}
    </AnimatePresence>
  );
}
