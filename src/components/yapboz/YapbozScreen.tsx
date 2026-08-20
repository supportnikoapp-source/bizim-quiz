"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { PLAYERS, playerById, type PlayerId } from "@/data/players";
import { ensureAnonSession, getSupabase } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { LandscapeFrame } from "./LandscapeFrame";
import { PuzzleBoard, PUZZLE_TOTAL } from "./PuzzleBoard";

type Props = {
  who: PlayerId;
  onBack: () => void;
};

type Presence = {
  who: PlayerId;
  session: string;
  ready: boolean;
  placed: number[];
  won: boolean;
};

const PEEK_MAX = 3;
const CHANNEL = "yapboz-pair";

function latest<T>(rows: T[] | undefined) {
  if (!rows?.length) return undefined;
  return rows[rows.length - 1];
}

export function YapbozScreen({ who, onBack }: Props) {
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [placed, setPlaced] = useState<number[]>([]);
  const [theirPlaced, setTheirPlaced] = useState<number[]>([]);
  const [theyHere, setTheyHere] = useState(false);
  const [winner, setWinner] = useState<PlayerId | null>(null);
  const [peeks, setPeeks] = useState(PEEK_MAX);
  const [showPeek, setShowPeek] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const placedRef = useRef<number[]>([]);
  const readyRef = useRef(false);
  const theyReadyRef = useRef(false);
  const sessionRef = useRef(crypto.randomUUID());
  const armedRef = useRef(false);
  placedRef.current = placed;
  readyRef.current = ready;

  useEffect(() => {
    if (!hasSupabaseConfig()) {
      setError("Supabase yoxdur");
      return;
    }

    let cancelled = false;
    const session = crypto.randomUUID();
    sessionRef.current = session;
    armedRef.current = false;
    const supabase = getSupabase();
    let channel: RealtimeChannel | null = null;

    async function connect() {
      try {
        await ensureAnonSession();
        if (cancelled) return;

        channel = supabase.channel(CHANNEL, {
          config: { presence: { key: who } },
        });
        channelRef.current = channel;

        const applyPresence = () => {
          if (!channel || !armedRef.current) return;
          const state = channel.presenceState<Presence>();
          let partnerHere = false;
          let partnerReady = false;
          let partnerPlaced: number[] = [];
          let win: PlayerId | null = null;

          for (const rows of Object.values(state)) {
            const row = latest(rows);
            if (!row || row.who === who) continue;
            partnerHere = true;
            partnerReady = Boolean(row.ready);
            partnerPlaced = row.placed ?? [];
            if (row.won) win = row.who;
          }

          theyReadyRef.current = partnerReady;
          setTheyHere(partnerHere);
          setTheirPlaced(partnerPlaced);
          if (win && readyRef.current) setWinner(win);
          if (partnerReady && readyRef.current) setPlaying(true);
        };

        channel.on("presence", { event: "sync" }, applyPresence);

        channel.subscribe(async (status) => {
          if (status !== "SUBSCRIBED" || cancelled || !channel) return;
          await channel.track({
            who,
            session,
            ready: false,
            placed: [],
            won: false,
          } satisfies Presence);
          if (cancelled) return;
          armedRef.current = true;
          setConnected(true);
          applyPresence();
        });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Otaq açılmadı");
      }
    }

    void connect();

    return () => {
      cancelled = true;
      armedRef.current = false;
      channelRef.current = null;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [who]);

  async function track(next: Partial<Presence>) {
    await channelRef.current?.track({
      who,
      session: sessionRef.current,
      ready,
      placed: placedRef.current,
      won: false,
      ...next,
    } satisfies Presence);
  }

  async function pressStart() {
    if (!theyHere || readyRef.current) return;
    readyRef.current = true;
    setReady(true);
    await track({ ready: true });
    if (theyReadyRef.current) setPlaying(true);
  }

  async function placePiece(index: number) {
    if (winner || placed.includes(index)) return;
    const next = [...placed, index];
    setPlaced(next);
    const won = next.length >= PUZZLE_TOTAL;
    await track({ ready: true, placed: next, won });
    if (won) setWinner(who);
  }

  function peek() {
    if (peeks <= 0 || showPeek) return;
    setPeeks((n) => n - 1);
    setShowPeek(true);
    window.setTimeout(() => setShowPeek(false), 2200);
  }

  const waitingPartner = !connected || !theyHere;
  const myPuzzleImage = who === "ilkin" ? "/puzzles/fidan.png" : "/puzzles/ilkin.png";
  const partnerName = who === "ilkin" ? "Fidan" : "İlkin";

  return (
    <LandscapeFrame>
      <div className="relative flex h-full w-full flex-col px-3 py-2">
        <header className="mb-1 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-xl shadow"
            aria-label="Geri"
          >
            ‹
          </button>
          <div className="text-center">
            <h1 className="text-[22px] font-black tracking-wide text-[#1e3a5f]">
              <span className="text-[#3b82f6]">♟</span> YAPBOZ <span className="text-[#ec4899]">♟</span>
            </h1>
            <p className="text-[11px] text-[#6b7280]">Bir-birimizin şəklini tamamlayırıq 💜</p>
          </div>
          {playing ? (
            <button
              type="button"
              onClick={peek}
              disabled={peeks <= 0}
              className="rounded-xl bg-white px-2 py-1 text-[11px] font-semibold shadow disabled:opacity-40"
            >
              Bax ({peeks})
            </button>
          ) : (
            <span className="h-9 w-9" />
          )}
        </header>

        {error ? <p className="text-center text-sm text-rose-500">{error}</p> : null}

        {!playing ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3">
            <div className="flex max-h-[58%] w-full justify-center gap-4">
              {PLAYERS.map((p) => (
                <figure key={p.id} className="flex w-[38%] flex-col items-center">
                  <div
                    className={`overflow-hidden rounded-2xl border-4 ${
                      p.id === "ilkin" ? "border-[#93c5fd]" : "border-[#f9a8d4]"
                    }`}
                  >
                    <img
                      src={p.id === "ilkin" ? "/puzzles/ilkin.png" : "/puzzles/fidan.png"}
                      alt={p.name}
                      className="h-full max-h-[46vh] w-full object-cover"
                    />
                  </div>
                  <figcaption className="mt-1 text-sm font-bold">{p.name}</figcaption>
                </figure>
              ))}
            </div>
            <p className="text-center text-[13px] text-[#4b5563]">
              {who === "ilkin" ? "Sən Fidanın şəklini yığacaqsan." : "Sən İlkinin şəklini yığacaqsan."} Şəklə bax,
              sonra hər ikiniz Başla basanda oyun eyni vaxtda açılır.
            </p>
            {waitingPartner ? (
              <p className="text-sm text-[#6b7280]">
                {!connected ? "Qoşulur…" : `${partnerName} gözlənilir…`}
              </p>
            ) : (
              <button
                type="button"
                disabled={ready}
                onClick={() => void pressStart()}
                className="min-h-[46px] rounded-full bg-[#3b82f6] px-10 text-[15px] font-semibold text-white disabled:opacity-60"
              >
                {ready ? `${partnerName} Başla basmasını gözləyirik…` : "Başla"}
              </button>
            )}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 gap-2">
            <PuzzleBoard
              image="/puzzles/fidan.png"
              name="İlkin"
              avatar={PLAYERS[0].image}
              theme="blue"
              mine={who === "ilkin"}
              placed={who === "ilkin" ? placed : theirPlaced}
              onPlace={who === "ilkin" ? placePiece : undefined}
            />
            <PuzzleBoard
              image="/puzzles/ilkin.png"
              name="Fidan"
              avatar={PLAYERS[1].image}
              theme="pink"
              mine={who === "fidan"}
              placed={who === "fidan" ? placed : theirPlaced}
              onPlace={who === "fidan" ? placePiece : undefined}
            />
          </div>
        )}

        {showPeek ? (
          <button
            type="button"
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/55 p-6"
            onClick={() => setShowPeek(false)}
          >
            <img src={myPuzzleImage} alt="Orijinal" className="max-h-[82%] max-w-[55%] rounded-2xl object-contain" />
          </button>
        ) : null}

        {winner ? (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#1b2448]/70">
            <p className="font-serif text-4xl text-white">
              {winner === who ? "Qazandın! 💜" : `${playerById(winner).name} qazandı`}
            </p>
            <button type="button" onClick={onBack} className="btn mt-6 max-w-xs">
              Geri
            </button>
          </div>
        ) : null}
      </div>
    </LandscapeFrame>
  );
}
