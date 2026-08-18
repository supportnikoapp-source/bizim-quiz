"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { WhoAreYou } from "@/components/home/WhoAreYou";
import { playerById, type PlayerId } from "@/data/players";

type Props = {
  hostName: string;
  onJoin: (name: string) => Promise<void>;
};

export function JoinScreen({ hostName, onJoin }: Props) {
  const [who, setWho] = useState<PlayerId>("fidan");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function continueJoin() {
    setBusy(true);
    setError("");
    try {
      await onJoin(playerById(who).name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Qoşulmaq olmadı");
      setBusy(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32 }}
      className="mx-auto w-full max-w-[400px] text-center"
    >
      <h1 className="font-serif text-[34px] font-semibold tracking-tight text-[#1b2448]">
        İlkin – Fidan
      </h1>
      <p className="font-script -mt-1 text-[42px] leading-none text-[#c4a574]">Quiz</p>
      <p className="mt-4 text-sm text-[#8b90a5]">{hostName} səni gözləyir.</p>
      <h2 className="mt-6 mb-5 font-serif text-[26px] text-[#1b2448]">Sən kimsən?</h2>
      <WhoAreYou selected={who} onSelect={setWho} />
      <button className="btn mt-6" type="button" disabled={busy} onClick={() => void continueJoin()}>
        {busy ? "Qoşulur…" : "Davam et →"}
      </button>
      {error ? <p className="mt-4 text-sm text-[#c45b6a]">{error}</p> : null}
    </motion.div>
  );
}
