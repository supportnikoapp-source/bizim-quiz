"use client";

import { motion } from "framer-motion";

type Props = {
  name: string;
};

export function WelcomeOverlay({ name }: Props) {
  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#f6f1ea]/80 px-6 backdrop-blur-[6px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.28 }}
    >
      <motion.div
        initial={{ scale: 0.92, y: 12, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        className="text-center"
      >
        <div className="mb-3 text-4xl">❤️</div>
        <h2 className="font-serif text-4xl">{name} qoşuldu ❤️</h2>
      </motion.div>
    </motion.div>
  );
}
