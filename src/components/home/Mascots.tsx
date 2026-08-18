"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export function Mascots() {
  return (
    <motion.div
      className="mx-auto w-[300px] max-w-full"
      initial={{ opacity: 0, scale: 0.88, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 220, damping: 18 }}
    >
      <motion.div
        animate={{ y: [0, -12, 0], rotate: [-2.2, 2.2, -2.2] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
      >
        <Image
          src="/mascots/niko-nikoya.png"
          alt="Niko və Nikoya"
          width={1200}
          height={840}
          quality={100}
          unoptimized
          sizes="300px"
          priority
          className="h-auto w-full select-none drop-shadow-[0_16px_28px_rgba(46,196,200,0.28)]"
        />
      </motion.div>
    </motion.div>
  );
}
