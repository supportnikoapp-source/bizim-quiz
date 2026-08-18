"use client";

import { motion } from "framer-motion";

type Props = {
  fromName: string;
  onAccept: () => void;
  onDecline: () => void;
};

export function ShareToast({ fromName, onAccept, onDecline }: Props) {
  return (
    <motion.div
      initial={{ y: -28, opacity: 0, scale: 0.98 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: -16, opacity: 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
      className="fixed top-5 right-4 left-4 z-50 mx-auto max-w-md rounded-2xl border border-[var(--line)] bg-white px-4 py-4 shadow-[0_18px_50px_rgba(40,36,80,0.16)]"
    >
      <p className="text-sm text-gold">Yeni istək</p>
      <p className="mt-1 font-serif text-2xl leading-tight">
        {fromName} cavabları açmaq istəyir ❤️
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button className="btn" type="button" onClick={onAccept}>
          Qəbul et
        </button>
        <button className="btn btn-ghost" type="button" onClick={onDecline}>
          İndi yox
        </button>
      </div>
    </motion.div>
  );
}
