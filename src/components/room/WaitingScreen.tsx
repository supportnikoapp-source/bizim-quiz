"use client";

import { motion } from "framer-motion";

type Props = {
  waitingName: string;
};

export function WaitingScreen({ waitingName }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32 }}
      className="mx-auto w-full max-w-md text-center"
    >
      <div className="pulse-heart mb-5 text-5xl">💕</div>
      <h1 className="font-serif text-4xl leading-tight">{waitingName} gözləyirik…</h1>
      <p className="mt-3 text-[15px] font-light text-muted">
        O da eyni sayta girib öz adını seçəndə oyun başlayacaq.
      </p>
    </motion.div>
  );
}
