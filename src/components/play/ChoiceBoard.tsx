"use client";

import { LockToggle } from "@/components/ui/LockToggle";
import { PlayerPhoto } from "@/components/ui/PlayerPhoto";
import { PLAYERS } from "@/data/players";
import type { ChoiceOption } from "@/data/questions";

type Props = {
  question: string;
  options: ChoiceOption[];
  iAmHost: boolean;
  hostSubmitted: boolean;
  guestSubmitted: boolean;
  hostTyping: boolean;
  guestTyping: boolean;
  myAnswer: string;
  submitting: boolean;
  progress: number;
  locked?: boolean;
  onToggleLock?: () => void;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export function ChoiceBoard({
  question,
  options,
  iAmHost,
  hostSubmitted,
  guestSubmitted,
  hostTyping,
  guestTyping,
  myAnswer,
  submitting,
  progress,
  locked,
  onToggleLock,
  onChange,
  onSubmit,
}: Props) {
  const mineDone = iAmHost ? hostSubmitted : guestSubmitted;
  const ilkin = PLAYERS[0];
  const fidan = PLAYERS[1];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-center gap-3 pt-2">
        <Photo name={ilkin.name} src={ilkin.image} ring="ring-[#3b82f6]" />
        <span className="text-3xl font-light text-[#9ca3af]">+</span>
        <Photo name={fidan.name} src={fidan.image} ring="ring-[#8b6cf7]" />
      </div>

      <div className="flex items-start justify-center gap-2">
        <p className="text-center text-[20px] font-bold leading-snug text-[#111827]">{question}</p>
        {onToggleLock ? <LockToggle locked={Boolean(locked)} onToggle={onToggleLock} /> : null}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {options.map((opt) => {
          const selected = myAnswer === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={mineDone}
              onClick={() => onChange(opt.id)}
              className={`min-h-[52px] rounded-2xl border-2 text-[15px] font-semibold transition ${
                selected
                  ? "border-[#3b82f6] bg-[#eff6ff] text-[#1d4ed8]"
                  : "border-[#e5e7eb] bg-white text-[#111827]"
              } disabled:opacity-60`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {!mineDone ? (
        <button
          type="button"
          disabled={submitting || !myAnswer}
          onClick={onSubmit}
          className="min-h-[48px] rounded-xl bg-[#3b82f6] text-[15px] font-semibold text-white disabled:opacity-50"
        >
          {submitting ? "Göndərilir…" : "Tamamdır"}
        </button>
      ) : (
        <p className="text-center text-sm font-medium text-[#3b82f6]">hazırdı</p>
      )}

      <div className="grid grid-cols-2 gap-2 text-center text-[13px] font-medium">
        <Status name="İlkin" done={hostSubmitted} typing={!iAmHost && hostTyping} color="text-[#3b82f6]" />
        <Status name="Fidan" done={guestSubmitted} typing={iAmHost && guestTyping} color="text-[#8b6cf7]" />
      </div>

      <div className="h-1 overflow-hidden rounded-full bg-black/5">
        <div className="h-full rounded-full bg-[#3b82f6] transition-[width] duration-300" style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
    </div>
  );
}

function Photo({ name, src, ring }: { name: string; src: string; ring: string }) {
  return (
    <div className="text-center">
      <div className={`mx-auto h-[92px] w-[92px] overflow-hidden rounded-full ring-4 ${ring}`}>
        <PlayerPhoto
          src={src}
          alt={name}
          size={92}
          className="h-full w-full object-cover"
          style={{ objectPosition: "50% 18%" }}
        />
      </div>
      <p className="mt-2 text-sm font-semibold">{name}</p>
    </div>
  );
}

function Status({
  name,
  done,
  typing,
  color,
}: {
  name: string;
  done: boolean;
  typing: boolean;
  color: string;
}) {
  return (
    <div className="rounded-2xl bg-white px-2 py-3 shadow-[0_6px_16px_rgba(30,40,80,0.06)]">
      <p className="text-[#6b7280]">{name}</p>
      <p className={color}>{done ? "hazırdı" : typing ? "yazır..." : "gözləyir"}</p>
    </div>
  );
}
