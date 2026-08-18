"use client";

import { Mascots } from "@/components/home/Mascots";

type Props = {
  message: string;
  iAmHost: boolean;
  hostSubmitted: boolean;
  guestSubmitted: boolean;
  submitting: boolean;
  onSubmit: (body?: string) => void;
};

export function BlessingBoard({
  message,
  iAmHost,
  hostSubmitted,
  guestSubmitted,
  submitting,
  onSubmit,
}: Props) {
  const mineDone = iAmHost ? hostSubmitted : guestSubmitted;

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-2 py-8 text-center">
      <Mascots />
      <div className="-mt-1 mb-8 flex justify-center gap-16 text-[15px] font-semibold">
        <span className="text-[#2ec4c8]">Niko</span>
        <span className="text-[#f47ca8]">Nikoya</span>
      </div>
      <p className="font-serif text-[28px] leading-snug text-[#1b2448]">{message}</p>

      {!mineDone ? (
        <button
          type="button"
          disabled={submitting}
          onClick={() => onSubmit("♥")}
          className="mt-8 min-h-[48px] w-full rounded-full bg-[#2ec4c8] text-[15px] font-semibold text-white disabled:opacity-50"
        >
          {submitting ? "Gözlə…" : "Tamamdır"}
        </button>
      ) : (
        <p className="mt-8 text-sm font-medium text-[#2ec4c8]">hazırdı</p>
      )}

      <div className="mt-5 grid w-full grid-cols-2 gap-2 text-[13px] font-medium">
        <p className="rounded-2xl bg-white py-3 text-[#3b82f6]">
          İlkin · {hostSubmitted ? "hazırdı" : "gözləyir"}
        </p>
        <p className="rounded-2xl bg-white py-3 text-[#8b6cf7]">
          Fidan · {guestSubmitted ? "hazırdı" : "gözləyir"}
        </p>
      </div>
    </div>
  );
}
