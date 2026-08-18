"use client";

type Props = {
  hostName: string;
  guestName: string;
  hostReady: boolean;
  guestReady: boolean;
};

export function ReadyPair({ hostName, guestName, hostReady, guestReady }: Props) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2 text-[13px] font-medium">
      <p className="rounded-2xl bg-white/80 py-2 text-[#3b82f6]">
        {hostName} · {hostReady ? "hazırdı" : "gözləyir"}
      </p>
      <p className="rounded-2xl bg-white/80 py-2 text-[#8b6cf7]">
        {guestName} · {guestReady ? "hazırdı" : "gözləyir"}
      </p>
    </div>
  );
}
