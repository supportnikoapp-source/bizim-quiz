"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { HostsIntro } from "@/components/home/HostsIntro";
import { RulesScreen } from "@/components/home/RulesScreen";
import { WhoAreYou } from "@/components/home/WhoAreYou";
import { SoloPlay } from "@/components/play/SoloPlay";
import { type PlayerId } from "@/data/players";
import { ensureAnonSession, getSupabase } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { SOLO_PREVIEW } from "@/lib/solo";
import type { RoomRow } from "@/lib/types";
import { SetupScreen } from "./SetupScreen";

type Step = "who" | "intro" | "rules" | "play";

export function HomeScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("who");
  const [who, setWho] = useState<PlayerId | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!SOLO_PREVIEW && !hasSupabaseConfig()) {
    return (
      <SetupScreen
        steps={[
          "supabase.com-da yeni layihə aç",
          "Authentication → Anonymous sign-ins-i aç",
          "SQL Editor-də supabase/schema.sql faylını işə sal",
          "URL və anon key-i .env.local-a yaz, serveri yenidən başlat",
        ]}
      />
    );
  }

  function pick(id: PlayerId) {
    setWho(id);
    setError("");
  }

  function afterWho() {
    if (!who) return;
    setStep("intro");
  }

  function afterRules() {
    if (SOLO_PREVIEW) {
      setStep("play");
      return;
    }
    void enterRoom();
  }

  async function enterRoom() {
    if (!who) return;
    setError("");
    setBusy(true);

    try {
      await ensureAnonSession();
      const { data, error: rpcError } = await getSupabase().rpc("enter_pair_room", {
        p_who: who,
      });
      if (rpcError) throw rpcError;
      router.push(`/o/${(data as RoomRow).code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Otaq açılmadı");
      setBusy(false);
    }
  }

  if (step === "play" && who) {
    return <SoloPlay who={who} />;
  }

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
          <WhoAreYou selected={who} onSelect={pick} />

          <button className="btn mt-6" type="button" disabled={!who || busy} onClick={afterWho}>
            {busy ? "Gözlə…" : "Davam et →"}
          </button>
          {error ? <p className="mt-4 text-sm text-[#c45b6a]">{error}</p> : null}
        </motion.div>
      ) : step === "intro" && who ? (
        <HostsIntro
          key="intro"
          who={who}
          onBack={() => setStep("who")}
          onStart={() => setStep("rules")}
        />
      ) : step === "rules" && who ? (
        <RulesScreen
          key="rules"
          busy={busy}
          onBack={() => setStep("intro")}
          onStart={afterRules}
          extra={error ? <p className="mt-3 text-sm text-[#c45b6a]">{error}</p> : null}
        />
      ) : null}
    </AnimatePresence>
  );
}
