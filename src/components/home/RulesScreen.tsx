"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

type Rule = {
  title: string;
  text: string;
  icon: ReactNode;
  badge: string;
};

const RULES: Rule[] = [
  {
    title: "Müəyyən sayda sual olacaq.",
    text: "Oyunda müəyyən sayda sual olacaq.",
    badge: "#7b6cff",
    icon: <ClipboardIcon />,
  },
  {
    title: "Sualları bir-biriniz görəcəksiniz.",
    text: "Sualları hər iki tərəf də görəcək, amma cavabınızı bilməyəcək.",
    badge: "#f07189",
    icon: <EyeIcon color="#f07189" />,
  },
  {
    title: "Cavablarınız gizli qalacaq.",
    text: "Cavab verdiyiniz sualların cavablarını oyun boyunca bir-biriniz görə bilməyəcəksiniz.",
    badge: "#7b6cff",
    icon: <LockIcon />,
  },
  {
    title: "Bəzi suallar yalnız birinizə veriləcək.",
    text: "Bəzi suallar hər ikinizə, bəzi suallar isə yalnız birinizə veriləcək.",
    badge: "#f0a04b",
    icon: <PeopleIcon />,
  },
  {
    title: "Hər ikiniz cavab vermədən irəlilənməyəcək.",
    text: "Verilmiş suallarda hər iki tərəf cavab verdikdən sonra növbəti suala keçiləcək.",
    badge: "#f07189",
    icon: <BubblesIcon />,
  },
  {
    title: "Oyun bitənə qədər cavablar gizlidir.",
    text: "Bütün suallar bitənə qədər heç bir cavabı görə bilməyəcəksiniz.",
    badge: "#7b6cff",
    icon: <EyeOffIcon />,
  },
  {
    title: "Sonda cavabları qarşılıqlı paylaşa bilərsiniz.",
    text: "Oyun bitdikdən sonra hər ikiniz razılaşmayla bir-birinizin cavablarına baxa bilərsiniz.",
    badge: "#f0a04b",
    icon: <HandshakeIcon />,
  },
  {
    title: "Dürüst olmayan cavab yazmaq qadağandır.",
    text: "«Bilmirəm», yayınmaq və ya doğru olmayan cavab yazmaq olmaz. Hər suala real, dürüst cavab verilməlidir.",
    badge: "#e0566b",
    icon: <BanIcon />,
  },
];

type Props = {
  onBack?: () => void;
  onStart: () => void;
  hideBack?: boolean;
  busy?: boolean;
  extra?: ReactNode;
  startLabel?: string;
};

export function RulesScreen({ onBack, onStart, hideBack, busy, extra, startLabel }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.32 }}
      className="fixed inset-0 z-20 overflow-y-auto bg-[#f6f2fc]"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <span className="absolute top-8 right-8 text-2xl text-[#cbb6f4]/80">✦</span>
        <span className="absolute top-24 right-16 text-sm text-[#d7c6f8]">✦</span>
        <span className="absolute top-14 right-28 text-[#d7c6f8]">✧</span>
      </div>

      <div className="relative mx-auto w-full max-w-[430px] px-5 pb-8 pt-5">
        <header className="relative mb-2">
          {hideBack ? (
            <div className="h-10" />
          ) : (
            <button
              type="button"
              onClick={onBack}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-lg text-[#6b7288] shadow-[0_8px_20px_rgba(80,60,140,0.08)]"
              aria-label="Geri"
            >
              ‹
            </button>
          )}
          <div className="mt-3 flex flex-col items-center text-center">
            <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#ece4ff] text-[#7b6cff] shadow-inner">
              <ChatIcon />
            </span>
            <h1 className="text-[28px] font-bold tracking-tight text-[#1b2448]">Oyun qaydaları</h1>
            <span className="mt-1 h-[3px] w-16 rounded-full bg-[#cbb6f4]" />
          </div>
        </header>

        <ol className="mt-6 space-y-3">
          {RULES.map((rule, i) => (
            <li
              key={rule.title}
              className="flex gap-3 rounded-[22px] bg-white px-3 py-3.5 shadow-[0_8px_24px_rgba(80,60,140,0.06)]"
            >
              <div className="relative mt-0.5 shrink-0">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f7f3ff]">
                  {rule.icon}
                </span>
                <span
                  className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ background: rule.badge }}
                >
                  {i + 1}
                </span>
              </div>
              <div className="min-w-0 pt-0.5">
                <h2 className="text-[14.5px] font-bold leading-snug text-[#1b2448]">{rule.title}</h2>
                <p className="mt-1 text-[13px] leading-relaxed text-[#8b90a5]">{rule.text}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-6 rounded-[24px] bg-[#efe8ff] px-5 py-5 text-center">
          <p className="text-2xl">🙌</p>
          <p className="mt-1 text-[18px] font-bold text-[#1b2448]">Hazırsınız?</p>
          <p className="mt-1 text-[13px] text-[#8b90a5]">
            Qaydalar sadədir, amma oyunumuz xüsusi olacaq.
          </p>
          {extra}
          <button
            type="button"
            disabled={busy}
            onClick={onStart}
            className="mt-4 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#8a6cff] to-[#e07aa8] text-[15px] font-semibold text-white shadow-[0_12px_24px_rgba(138,108,255,0.28)] disabled:opacity-60"
          >
            {busy ? "Gözlə…" : startLabel ?? "Oyuna başla"}
            <span>→</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function ChatIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 6.5A3.5 3.5 0 0 1 8.5 3h7A3.5 3.5 0 0 1 19 6.5v6A3.5 3.5 0 0 1 15.5 16H10l-4.2 3.2A.8.8 0 0 1 4.5 18.6V6.5Z"
        stroke="#7b6cff"
        strokeWidth="1.8"
      />
      <path d="M8 8h8M8 11.5h5" stroke="#7b6cff" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="6" y="5" width="12" height="15" rx="2" stroke="#7b6cff" strokeWidth="1.8" />
      <rect x="9" y="3" width="6" height="4" rx="1.2" stroke="#7b6cff" strokeWidth="1.8" />
      <path d="M9 11h6M9 14.5h4" stroke="#7b6cff" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function EyeIcon({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z"
        stroke={color}
        strokeWidth="1.8"
      />
      <circle cx="12" cy="12" r="2.4" fill={color} />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="6" y="10" width="12" height="10" rx="2" stroke="#7b6cff" strokeWidth="1.8" />
      <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" stroke="#7b6cff" strokeWidth="1.8" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="8" r="2.3" fill="#f0a04b" />
      <circle cx="15.5" cy="8.5" r="2" fill="#f0a04b" />
      <path d="M4.5 18c.4-3 2.4-4.6 4.6-4.6S13.8 15 14.2 18" stroke="#f0a04b" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M14 17.4c.5-2.2 2-3.4 3.6-3.4 1.7 0 3.2 1.2 3.6 3.4" stroke="#f0a04b" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function BubblesIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3.5" y="4" width="11" height="9" rx="3" fill="#f07189" />
      <rect x="9.5" y="10" width="11" height="9" rx="3" fill="#ff9bb3" />
      <circle cx="7.2" cy="8.2" r="0.9" fill="white" />
      <circle cx="9.3" cy="8.2" r="0.9" fill="white" />
      <circle cx="13.4" cy="14.4" r="0.9" fill="white" />
      <circle cx="15.5" cy="14.4" r="0.9" fill="white" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 12s3.5-6 9-6c2 0 3.8.7 5.3 1.7M21 12s-1.2 2-3.2 3.6" stroke="#7b6cff" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="12" r="2.3" stroke="#7b6cff" strokeWidth="1.8" />
      <path d="M4 5l16 14" stroke="#7b6cff" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function HandshakeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 4.5 9.2 7.8 12 21l2.8-13.2L12 4.5Z"
        stroke="#f07189"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M7 12.5h10" stroke="#f0a04b" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8.2 12.5c0 1.4.8 2.4 2 3M15.8 12.5c0 1.4-.8 2.4-2 3" stroke="#f0a04b" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function BanIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8" stroke="#e0566b" strokeWidth="1.8" />
      <path d="M7.2 16.8 16.8 7.2" stroke="#e0566b" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
