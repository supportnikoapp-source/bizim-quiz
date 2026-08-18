"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { inviteUrl } from "@/lib/codes";

type Props = {
  code: string;
  hostName: string;
};

export function WaitingScreen({ code, hostName }: Props) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    const url = inviteUrl(code);
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function inviteFidan() {
    const url = inviteUrl(code);
    const text = `${hostName} səni xüsusi bir oyuna dəvət edir ❤️\nKod: ${code}\n${url}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Fidanı dəvət et", text, url });
        return;
      } catch {
        /* user cancelled */
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32 }}
      className="mx-auto w-full max-w-md text-center"
    >
      <div className="pulse-heart mb-5 text-5xl">💕</div>
      <h1 className="font-serif text-4xl leading-tight">Xüsusi birini gözləyirik…</h1>
      <p className="mt-3 text-[15px] font-light text-muted">
        İkinci oyunçu qoşulduqda oyun başlayacaq.
      </p>

      <div className="mt-8 rounded-[22px] border border-[var(--line)] bg-[var(--card)] px-5 py-5">
        <p className="text-[11px] uppercase tracking-[0.28em] text-gold">oyun kodu</p>
        <p className="mt-2 font-serif text-3xl tracking-[0.14em] text-ink">{code}</p>
      </div>

      <div className="mt-5 space-y-3">
        <button className="btn" type="button" onClick={inviteFidan}>
          Fidanı dəvət et ❤️
        </button>
        <button className="btn btn-ghost" type="button" onClick={copyLink}>
          {copied ? "Kopyalandı" : "Dəvət linkini kopyala"}
        </button>
      </div>
    </motion.div>
  );
}
