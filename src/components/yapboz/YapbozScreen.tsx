"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { PLAYERS, playerById, type PlayerId } from "@/data/players";
import { ensureAnonSession, getSupabase } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { LandscapeFrame } from "./LandscapeFrame";
import { emptySlots, PuzzleBoard, puzzleComplete, type PuzzleSlots } from "./PuzzleBoard";

type Props = {
  who: PlayerId;
  onBack: () => void;
};

type Presence = {
  who: PlayerId;
  session: string;
  ready: boolean;
  slots: PuzzleSlots;
  won: boolean;
};

const PEEK_MAX = 3;
const CHANNEL = "yapboz-pair";

function latest<T>(rows: T[] | undefined) {
  if (!rows?.length) return undefined;
  return rows[rows.length - 1];
}

function readSlots(row: Presence): PuzzleSlots {
  const raw = row.slots;
  if (Array.isArray(raw) && raw.length === emptySlots().length) {
    return raw.map((p) => (typeof p === "number" ? p : null));
  }
  return emptySlots();
}

export function YapbozScreen({ who, onBack }: Props) {
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [mySlots, setMySlots] = useState<PuzzleSlots>(emptySlots);
  const [theirSlots, setTheirSlots] = useState<PuzzleSlots>(emptySlots);
  const [theyHere, setTheyHere] = useState(false);
  const [winner, setWinner] = useState<PlayerId | null>(null);
  const [peeks, setPeeks] = useState(PEEK_MAX);
  const [showPeek, setShowPeek] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const slotsRef = useRef<PuzzleSlots>(emptySlots());
  const readyRef = useRef(false);
  const theyReadyRef = useRef(false);
  const winnerRef = useRef<PlayerId | null>(null);
  const sessionRef = useRef(crypto.randomUUID());
  const armedRef = useRef(false);
  slotsRef.current = mySlots;
  readyRef.current = ready;
  winnerRef.current = winner;

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
          let partnerSlots = emptySlots();
          let win: PlayerId | null = null;

          for (const rows of Object.values(state)) {
            const row = latest(rows);
            if (!row || row.who === who) continue;
            partnerHere = true;
            partnerReady = Boolean(row.ready);
            partnerSlots = readSlots(row);
            if (row.won) win = row.who;
          }

          theyReadyRef.current = partnerReady;
          setTheyHere(partnerHere);
          setTheirSlots(partnerSlots);
          if (win && readyRef.current) {
            winnerRef.current = win;
            setWinner(win);
          }
          if (partnerReady && readyRef.current) setPlaying(true);
        };

        channel.on("presence", { event: "sync" }, applyPresence);

        channel.subscribe(async (status) => {
          if (status !== "SUBSCRIBED" || cancelled || !channel) return;
          await channel.track({
            who,
            session,
            ready: false,
            slots: emptySlots(),
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
      slots: slotsRef.current,
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

  function updateSlots(next: PuzzleSlots) {
    if (winnerRef.current) return;
    slotsRef.current = next;
    setMySlots(next);
    void track({ ready: true, slots: next });
  }

  async function pressDone() {
    if (winnerRef.current || !puzzleComplete(slotsRef.current)) return;
    winnerRef.current = who;
    setWinner(who);
    await track({ ready: true, won: true });
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
  const myComplete = puzzleComplete(mySlots);

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
                <figure key={p.id} className="flex h-full w-[38%] flex-col items-center">
                  <div
                    className={`flex max-h-[46vh] overflow-hidden rounded-2xl border-4 ${
                      p.id === "ilkin" ? "border-[#93c5fd]" : "border-[#f9a8d4]"
                    }`}
                  >
                    <img
                      src={p.id === "ilkin" ? "/puzzles/ilkin.png" : "/puzzles/fidan.png"}
                      alt={p.name}
                      className="h-full max-h-[46vh] w-auto object-contain"
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
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex min-h-0 flex-1 gap-2">
              <PuzzleBoard
                image="/puzzles/fidan.png"
                name="İlkin"
                avatar={PLAYERS[0].image}
                theme="blue"
                mine={who === "ilkin"}
                slots={who === "ilkin" ? mySlots : theirSlots}
                onSlots={who === "ilkin" ? updateSlots : undefined}
              />
              <PuzzleBoard
                image="/puzzles/ilkin.png"
                name="Fidan"
                avatar={PLAYERS[1].image}
                theme="pink"
                mine={who === "fidan"}
                slots={who === "fidan" ? mySlots : theirSlots}
                onSlots={who === "fidan" ? updateSlots : undefined}
              />
            </div>
            {myComplete && !winner ? (
              <button
                type="button"
                onClick={() => void pressDone()}
                className="mx-auto mt-1 min-h-[42px] rounded-full bg-[#16a34a] px-10 text-[16px] font-bold text-white shadow"
              >
                Bitdi
              </button>
            ) : null}
          </div>
        )}

        {showPeek ? (
          <button
            type="button"
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/55 p-6"
            onClick={() => setShowPeek(false)}
          >
            <img src={myPuzzleImage} alt="Orijinal" className="max-h-[82%] max-w-[40%] rounded-2xl object-contain" />
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
