"use client";

type Props = {
  locked: boolean;
  onToggle: () => void;
  label?: string;
};

export function LockToggle({ locked, onToggle, label }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        locked ? "bg-[#1b2448] text-white" : "bg-white text-[#8b90a5] ring-1 ring-black/10"
      }`}
      aria-pressed={locked}
      aria-label={locked ? "Kilidi aç" : "Kilidlə"}
    >
      <LockIcon locked={locked} />
      <span>{label ?? (locked ? "Kilidli" : "Kilidlə")}</span>
    </button>
  );
}

function LockIcon({ locked }: { locked: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
      <path
        d={locked ? "M8 11V8a4 4 0 0 1 8 0v3" : "M8 11V8a4 4 0 0 1 7.2-2.4"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
