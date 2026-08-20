"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { PLAYERS, type PlayerId } from "@/data/players";
import { ensureAnonSession, getSupabase } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { LandscapeFrame } from "./LandscapeFrame";
import { emptySlots, PuzzleBoard, puzzleComplete, PUZZLE_TOTAL, type PuzzleSlots } from "./PuzzleBoard";

type Props = {
  who: PlayerId;
  onBack: () => void;
  onBothDone: () => void;
};

type WireState = {
  who: PlayerId;
  session: string;
  ready: boolean;
  board: string;
  finished: boolean;
  won?: boolean;
};

const PEEK_MAX = 3;
const CHANNEL = "yapboz-pair";

function pickPresence<T extends WireState>(rows: T[] | undefined) {
  if (!rows?.length) return undefined;
  let best = rows[rows.length - 1];
  let bestN = -1;
  for (const row of rows) {
    const slots = unpackBoard(row.board);
    const n = slots?.filter((p) => p !== null).length ?? -1;
    if (n >= bestN) {
      bestN = n;
      best = row;
    }
  }
  return best;
}

function packBoard(slots: PuzzleSlots) {
  return Array.from({ length: PUZZLE_TOTAL }, (_, i) => {
    const v = slots[i];
    return typeof v === "number" && v >= 0 ? v : -1;
  }).join(",");
}

function unpackBoard(raw: unknown): PuzzleSlots | null {
  let parts: unknown[] = [];
  if (typeof raw === "string") {
    parts = raw.split(",");
  } else if (Array.isArray(raw)) {
    parts = raw;
  } else if (raw && typeof raw === "object") {
    parts = Array.from({ length: PUZZLE_TOTAL }, (_, i) => (raw as Record<string, unknown>)[String(i)]);
  } else {
    return null;
  }
  if (parts.length === 0) return null;
  return Array.from({ length: PUZZLE_TOTAL }, (_, i) => {
    const v = Number(parts[i]);
    return Number.isInteger(v) && v >= 0 ? v : null;
  });
}

export function YapbozScreen({ who, onBack, onBothDone }: Props) {
  const partnerWho: PlayerId = who === "ilkin" ? "fidan" : "ilkin";
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [mySlots, setMySlots] = useState<PuzzleSlots>(emptySlots);
  const [theirSlots, setTheirSlots] = useState<PuzzleSlots>(emptySlots);
  const [theyHere, setTheyHere] = useState(false);
  const [theyFinished, setTheyFinished] = useState(false);
  const [iFinished, setIFinished] = useState(false);
  const [peeks, setPeeks] = useState(PEEK_MAX);
  const [showPeek, setShowPeek] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const slotsRef = useRef<PuzzleSlots>(emptySlots());
  const readyRef = useRef(false);
  const theyReadyRef = useRef(false);
  const iFinishedRef = useRef(false);
  const theyFinishedRef = useRef(false);
  const sessionRef = useRef(crypto.randomUUID());
  const armedRef = useRef(false);
  const onBothDoneRef = useRef(onBothDone);
  onBothDoneRef.current = onBothDone;
  slotsRef.current = mySlots;
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
    let poll: number | null = null;

    function applyPartner(row: Partial<WireState>, fromKey?: string) {
      const id = (row.who || fromKey) as PlayerId | undefined;
      if (!id || id === who) return;
      setTheyHere(true);
      if (typeof row.ready === "boolean") {
        theyReadyRef.current = row.ready;
        if (row.ready && readyRef.current) setPlaying(true);
      }
      const nextSlots = unpackBoard(row.board);
      if (nextSlots) setTheirSlots(nextSlots);
      if (row.finished || row.won) {
        theyFinishedRef.current = true;
        setTheyFinished(true);
        if (iFinishedRef.current) onBothDoneRef.current();
      }
    }

    async function pullPartner() {
      const { data, error } = await supabase
        .from("yapboz_state")
        .select("who, board, ready, finished")
        .eq("who", partnerWho)
        .maybeSingle();
      if (error || !data) return;
      applyPartner(data as WireState);
    }

    async function connect() {
      try {
        await ensureAnonSession();
        if (cancelled) return;

        channel = supabase.channel(CHANNEL, {
          config: {
            private: false,
            presence: { key: who },
            broadcast: { ack: true, self: false },
          },
        });
        channelRef.current = channel;

        const applyPresence = () => {
          if (!channel || !armedRef.current) return;
          const state = channel.presenceState<WireState>();
          let partnerHere = false;
          for (const [key, rows] of Object.entries(state)) {
            if (key === who) continue;
            const row = pickPresence(rows);
            if (!row) continue;
            partnerHere = true;
            applyPartner({ ...row, who: (row.who || key) as PlayerId }, key);
          }
          if (partnerHere) setTheyHere(true);
        };

        channel
          .on("presence", { event: "sync" }, applyPresence)
          .on("broadcast", { event: "yapboz" }, ({ payload }) => {
            applyPartner(payload as WireState);
          })
          .on("postgres_changes", { event: "*", schema: "public", table: "yapboz_state" }, (payload) => {
            const row = payload.new as WireState | undefined;
            if (row) applyPartner(row);
          });

        channel.subscribe(async (status) => {
          if (status !== "SUBSCRIBED" || cancelled || !channel) return;
          await channel.track({
            who,
            session,
            ready: false,
            board: packBoard(emptySlots()),
            finished: false,
          } satisfies WireState);
          await supabase.from("yapboz_state").upsert({
            who,
            board: packBoard(emptySlots()),
            ready: false,
            finished: false,
            updated_at: new Date().toISOString(),
          });
          if (cancelled) return;
          armedRef.current = true;
          setConnected(true);
          applyPresence();
          void pullPartner();
        });

        poll = window.setInterval(() => {
          void pullPartner();
        }, 700);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Otaq açılmadı");
      }
    }

    void connect();

    return () => {
      cancelled = true;
      armedRef.current = false;
      channelRef.current = null;
      if (poll !== null) window.clearInterval(poll);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [who, partnerWho]);

  async function push(next: Partial<Pick<WireState, "ready" | "board" | "finished">> = {}) {
    const payload: WireState = {
      who,
      session: sessionRef.current,
      ready: next.ready ?? readyRef.current,
      board: next.board ?? packBoard(slotsRef.current),
      finished: next.finished ?? iFinishedRef.current,
    };
    const ch = channelRef.current;
    if (ch) {
      await ch.track(payload);
      await ch.send({ type: "broadcast", event: "yapboz", payload });
    }
    await getSupabase().from("yapboz_state").upsert({
      who,
      board: payload.board,
      ready: payload.ready,
      finished: payload.finished,
      updated_at: new Date().toISOString(),
    });
  }

  async function pressStart() {
    if (!theyHere || readyRef.current) return;
    readyRef.current = true;
    setReady(true);
    await push({ ready: true });
    if (theyReadyRef.current) setPlaying(true);
  }

  function updateSlots(next: PuzzleSlots) {
    if (iFinishedRef.current) return;
    slotsRef.current = next;
    setMySlots(next);
    void push({ ready: true, board: packBoard(next) });
  }

  async function pressDone() {
    if (iFinishedRef.current || !puzzleComplete(slotsRef.current)) return;
    iFinishedRef.current = true;
    setIFinished(true);
    await push({ ready: true, finished: true });
    if (theyFinishedRef.current) onBothDoneRef.current();
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
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex min-h-0 flex-1 items-center justify-center gap-6">
              {PLAYERS.map((p) => (
                <figure key={p.id} className="flex h-[90%] w-fit min-h-0 flex-col items-center">
                  <div
                    className={`flex h-full w-fit overflow-hidden rounded-2xl border-4 ${
                      p.id === "ilkin" ? "border-[#93c5fd]" : "border-[#f9a8d4]"
                    }`}
                  >
                    <img
                      src={p.id === "ilkin" ? "/puzzles/ilkin.png" : "/puzzles/fidan.png"}
                      alt={p.name}
                      className="block h-full w-auto max-w-none"
                    />
                  </div>
                  <figcaption
                    className={`mt-1 shrink-0 text-center text-sm font-bold ${
                      p.id === "ilkin" ? "text-[#2563eb]" : "text-[#db2777]"
                    }`}
                  >
                    {p.name}
                  </figcaption>
                </figure>
              ))}
            </div>
            <p className="shrink-0 px-2 py-1 text-center text-[12px] text-[#4b5563]">
              {who === "ilkin" ? "Sən Fidanın şəklini yığacaqsan." : "Sən İlkinin şəklini yığacaqsan."} Şəklə bax,
              sonra hər ikiniz Başla basanda oyun eyni vaxtda açılır.
            </p>
            {waitingPartner ? (
              <p className="shrink-0 pb-1 text-center text-sm text-[#6b7280]">
                {!connected ? "Qoşulur…" : `${partnerName} gözlənilir…`}
              </p>
            ) : (
              <button
                type="button"
                disabled={ready}
                onClick={() => void pressStart()}
                className="mx-auto mb-1 min-h-[42px] shrink-0 rounded-full bg-[#3b82f6] px-10 text-[15px] font-semibold text-white disabled:opacity-60"
              >
                {ready ? `${partnerName} Başla basmasını gözləyirik…` : "Başla"}
              </button>
            )}
          </div>
        ) : (
          <div className="relative flex min-h-0 flex-1 flex-col">
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
            {myComplete && !iFinished ? (
              <button
                type="button"
                onClick={() => void pressDone()}
                className="absolute bottom-3 left-1/2 z-40 min-h-[52px] -translate-x-1/2 rounded-full bg-[#16a34a] px-12 text-[20px] font-black text-white shadow-lg"
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

        {iFinished && !theyFinished ? (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#1b2448]/75 px-6 text-center">
            <p className="font-serif text-4xl text-white">İlk bitirdiniz</p>
            <p className="mt-3 text-[16px] text-white/85">{partnerName} bitirməsi gözlənilir…</p>
          </div>
        ) : null}
      </div>
    </LandscapeFrame>
  );
}
