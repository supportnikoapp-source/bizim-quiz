"use client";

import { PlayerPhoto } from "@/components/ui/PlayerPhoto";
import { motion } from "framer-motion";
import { PLAYERS, type PlayerId } from "@/data/players";

type Props = {
  selected: PlayerId | null;
  onSelect: (id: PlayerId) => void;
};

export function WhoAreYou({ selected, onSelect }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {PLAYERS.map((player) => {
        const active = selected === player.id;
        const isLavender = player.accent === "lavender";
        return (
          <motion.button
            key={player.id}
            type="button"
            onClick={() => onSelect(player.id)}
            whileTap={{ scale: 0.98 }}
            className={`relative rounded-[28px] bg-white px-3 pb-4 pt-5 text-center shadow-[0_10px_28px_rgba(40,36,80,0.07)] transition-shadow ${
              active
                ? "ring-[2.5px] ring-[#b7a4e8] shadow-[0_12px_30px_rgba(163,140,220,0.22)]"
                : "ring-1 ring-black/5"
            }`}
          >
            {active ? (
              <span className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-[#b7a4e8] text-white">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                  <path
                    d="M2.5 6.2 L4.8 8.5 L9.5 3.6"
                    stroke="white"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            ) : null}

            <div className="mx-auto h-[108px] w-[108px] overflow-hidden rounded-full bg-[#f3eee8] ring-4 ring-[#f7f3ee]">
              <PlayerPhoto
                src={player.image}
                alt={player.name}
                size={108}
                className="h-full w-full object-cover"
                style={{ objectPosition: "50% 18%" }}
                priority
              />
            </div>

            <p
              className={`mt-3 font-serif text-[22px] leading-none ${
                isLavender ? "text-[#1b2448]" : "text-[#8a6a3e]"
              }`}
            >
              {player.name}
            </p>
            <span
              className={`mx-auto mt-2 block h-[3px] w-10 rounded-full ${
                isLavender ? "bg-[#b7a4e8]" : "bg-[#e2d0b0]"
              }`}
            />
            <p className="mt-3 text-[12px] text-[#9aa0b4]">{player.caption}</p>
          </motion.button>
        );
      })}
    </div>
  );
}
