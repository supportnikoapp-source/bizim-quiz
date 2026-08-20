"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { PLAYERS, type PlayerId } from "@/data/players";
import {
  appendTrail,
  MAZE,
  packTrail,
  samePos,
  stepPos,
  unpackTrail,
  type Dir,
  type Pos,
} from "@/data/maze";
import { ensureAnonSession, getSupabase } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { LandscapeFrame } from "@/components/yapboz/LandscapeFrame";
import { MazeBoard } from "./MazeBoard";

type Props = {
  who: PlayerId;
  onBack: () => void;
  onSkipLobby?: boolean;
};

type WireState = {
  who: PlayerId;
  session: string;
  ready: boolean;
  r: number;
  c: number;
  trail: string;
  finished: boolean;
};

const CHANNEL = "labirint-pair";

function startOf(id: PlayerId): Pos {
  return id === "ilkin" ? MAZE.ilkin : MAZE.fidan;
}

function goalOf(id: PlayerId): Pos {
  return id === "ilkin" ? MAZE.fidan : MAZE.ilkin;
}

export function LabirintScreen({ who, onBack, onSkipLobby }: Props) {
  const partnerWho: PlayerId = who === "ilkin" ? "fidan" : "ilkin";
  const myStart = startOf(who);
  const theirStart = startOf(partnerWho);
  const myGoal = goalOf(who);

  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [myPos, setMyPos] = useState<Pos>(myStart);
  const [theirPos, setTheirPos] = useState<Pos>(theirStart);
  const [myTrail, setMyTrail] = useState<Pos[]>([myStart]);
  const [theirTrail, setTheirTrail] = useState<Pos[]>([theirStart]);
  const [theyHere, setTheyHere] = useState(false);
  const [winner, setWinner] = useState<PlayerId | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const posRef = useRef(myStart);
  const trailRef = useRef<Pos[]>([myStart]);
  const readyRef = useRef(false);
  const theyReadyRef = useRef(false);
  const winnerRef = useRef<PlayerId | null>(null);
  const iFinishedRef = useRef(false);
  const theyFinishedRef = useRef(false);
  const sessionRef = useRef(crypto.randomUUID());
  const armedRef = useRef(false);
  const holdRef = useRef<number | null>(null);
  const moveRef = useRef<(dir: Dir) => void>(() => {});

  posRef.current = myPos;
  trailRef.current = myTrail;
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
    let poll: number | null = null;

    function applyPartner(row: Partial<WireState>, fromKey?: string) {
      const id = (row.who || fromKey) as PlayerId | undefined;
      if (!id || id === who) return;
      setTheyHere(true);
      if (typeof row.ready === "boolean") {
        theyReadyRef.current = row.ready;
        if (row.ready && readyRef.current) setPlaying(true);
      }
      if (typeof row.r === "number" && typeof row.c === "number") {
        setTheirPos({ r: row.r, c: row.c });
      }
      if (typeof row.trail === "string") {
        const next = unpackTrail(row.trail);
        if (next.length) setTheirTrail(next);
      }
      if (row.finished) {
        theyFinishedRef.current = true;
        if (!iFinishedRef.current && !winnerRef.current) {
          winnerRef.current = partnerWho;
          setWinner(partnerWho);
        }
      }
    }

    async function pullPartner() {
      const { data, error } = await supabase
        .from("labirint_state")
        .select("who, r, c, trail, ready, finished")
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
            const row = rows[rows.length - 1];
            if (!row) continue;
            partnerHere = true;
            applyPartner({ ...row, who: (row.who || key) as PlayerId }, key);
          }
          if (partnerHere) setTheyHere(true);
        };

        channel
          .on("presence", { event: "sync" }, applyPresence)
          .on("broadcast", { event: "labirint" }, ({ payload }) => {
            applyPartner(payload as WireState);
          })
          .on("postgres_changes", { event: "*", schema: "public", table: "labirint_state" }, (payload) => {
            const row = payload.new as WireState | undefined;
            if (row) applyPartner(row);
          });

        channel.subscribe(async (status) => {
          if (status !== "SUBSCRIBED" || cancelled || !channel) return;
          const payload: WireState = {
            who,
            session,
            ready: false,
            r: myStart.r,
            c: myStart.c,
            trail: packTrail([myStart]),
            finished: false,
          };
          await channel.track(payload);
          await supabase.from("labirint_state").upsert({
            who,
            r: myStart.r,
            c: myStart.c,
            trail: payload.trail,
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
  }, [who, partnerWho, myStart.c, myStart.r]);

  async function push(next: Partial<Pick<WireState, "ready" | "r" | "c" | "trail" | "finished">> = {}) {
    const payload: WireState = {
      who,
      session: sessionRef.current,
      ready: next.ready ?? readyRef.current,
      r: next.r ?? posRef.current.r,
      c: next.c ?? posRef.current.c,
      trail: next.trail ?? packTrail(trailRef.current),
      finished: next.finished ?? iFinishedRef.current,
    };
    const ch = channelRef.current;
    if (ch) {
      await ch.track(payload);
      await ch.send({ type: "broadcast", event: "labirint", payload });
    }
    await getSupabase().from("labirint_state").upsert({
      who,
      r: payload.r,
      c: payload.c,
      trail: payload.trail,
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

  function move(dir: Dir) {
    if (!playing || winnerRef.current || iFinishedRef.current) return;
    const next = stepPos(posRef.current, dir);
    if (!next) return;
    const trail = appendTrail(trailRef.current, next);
    posRef.current = next;
    trailRef.current = trail;
    setMyPos(next);
    setMyTrail(trail);
    const done = samePos(next, myGoal);
    if (done) {
      if (theyFinishedRef.current) return;
      iFinishedRef.current = true;
      winnerRef.current = who;
      setWinner(who);
    }
    void push({
      ready: true,
      r: next.r,
      c: next.c,
      trail: packTrail(trail),
      finished: done,
    });
  }
  moveRef.current = move;

  function startHold(dir: Dir) {
    moveRef.current(dir);
    if (holdRef.current !== null) window.clearInterval(holdRef.current);
    holdRef.current = window.setInterval(() => moveRef.current(dir), 140);
  }

  function endHold() {
    if (holdRef.current !== null) {
      window.clearInterval(holdRef.current);
      holdRef.current = null;
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const map: Record<string, Dir> = {
        ArrowUp: "n",
        ArrowDown: "s",
        ArrowLeft: "w",
        ArrowRight: "e",
      };
      const dir = map[e.key];
      if (!dir) return;
      e.preventDefault();
      moveRef.current(dir);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (holdRef.current !== null) window.clearInterval(holdRef.current);
    };
  }, []);

  const waitingPartner = !connected || !theyHere;
  const partnerName = who === "ilkin" ? "Fidan" : "İlkin";
  const iWon = winner === who;

  return (
    <LandscapeFrame hint="Labirint üfüqi ekranda tam görünür">
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
              <span className="text-[#3b82f6]">▣</span> LABİRİNT <span className="text-[#ec4899]">▣</span>
            </h1>
            <p className="text-[11px] text-[#6b7280]">Bir-birimizə çatmağa çalışırıq 💜</p>
          </div>
          {onSkipLobby && !playing ? (
            <button
              type="button"
              onClick={() => {
                readyRef.current = true;
                setReady(true);
                setPlaying(true);
                void push({ ready: true });
              }}
              className="rounded-xl bg-white px-2 py-1 text-[11px] font-semibold text-[#6b7280] shadow"
            >
              Keç →
            </button>
          ) : (
            <span className="h-9 w-9" />
          )}
        </header>

        {error ? <p className="text-center text-sm text-rose-500">{error}</p> : null}

        {!playing ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex min-h-0 flex-1 items-center justify-center gap-8">
              {PLAYERS.map((p) => (
                <figure key={p.id} className="flex w-fit flex-col items-center">
                  <div
                    className={`h-28 w-28 overflow-hidden rounded-full border-4 ${
                      p.id === "ilkin" ? "border-[#93c5fd]" : "border-[#f9a8d4]"
                    }`}
                  >
                    <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                  </div>
                  <figcaption
                    className={`mt-2 text-sm font-bold ${
                      p.id === "ilkin" ? "text-[#2563eb]" : "text-[#db2777]"
                    }`}
                  >
                    {p.name}
                  </figcaption>
                </figure>
              ))}
            </div>
            <p className="shrink-0 px-4 py-1 text-center text-[12px] text-[#4b5563]">
              {who === "ilkin"
                ? "Sən yuxarıdan başlayıb Fidanın başına çatacaqsan."
                : "Sən aşağıdan başlayıb İlkinin başına çatacaqsan."}{" "}
              Xəritə eynidir. İlk çatan qazanır.
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
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex min-h-0 flex-1 gap-3">
              <MazeBoard
                name="İlkin"
                avatar={PLAYERS[0].image}
                theme="blue"
                mine={who === "ilkin"}
                pos={who === "ilkin" ? myPos : theirPos}
                trail={who === "ilkin" ? myTrail : theirTrail}
                goal={goalOf("ilkin")}
                goalAvatar={PLAYERS[1].image}
                footer="🏁 İlkin → Fidan"
                onStep={who === "ilkin" ? (dir) => moveRef.current(dir) : undefined}
              />
              <MazeBoard
                name="Fidan"
                avatar={PLAYERS[1].image}
                theme="pink"
                mine={who === "fidan"}
                pos={who === "fidan" ? myPos : theirPos}
                trail={who === "fidan" ? myTrail : theirTrail}
                goal={goalOf("fidan")}
                goalAvatar={PLAYERS[0].image}
                footer="🏁 Fidan → İlkin"
                onStep={who === "fidan" ? (dir) => moveRef.current(dir) : undefined}
              />
            </div>
            <div className="mt-1 flex shrink-0 items-center justify-center pb-1">
              <div className="grid grid-cols-3 grid-rows-3 gap-1">
                <span />
                <Pad label="▲" onPress={() => startHold("n")} onRelease={endHold} />
                <span />
                <Pad label="◀" onPress={() => startHold("w")} onRelease={endHold} />
                <span />
                <Pad label="▶" onPress={() => startHold("e")} onRelease={endHold} />
                <span />
                <Pad label="▼" onPress={() => startHold("s")} onRelease={endHold} />
                <span />
              </div>
            </div>
          </div>
        )}

        {winner ? (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#1b2448]/75 px-6 text-center">
            <p className="font-serif text-4xl text-white">{iWon ? "Qazandın!" : `${partnerName} qazandı`}</p>
            <p className="mt-3 text-[16px] text-white/85">
              {iWon ? "İlk siz çatdınız 💜" : "O biri birinci finişə çatdı"}
            </p>
            <button type="button" onClick={onBack} className="btn mt-6 max-w-[220px]">
              Geri
            </button>
          </div>
        ) : null}
      </div>
    </LandscapeFrame>
  );
}

function Pad({
  label,
  onPress,
  onRelease,
}: {
  label: string;
  onPress: () => void;
  onRelease: () => void;
}) {
  return (
    <button
      type="button"
      className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-lg font-bold text-[#1e3a5f] shadow"
      onPointerDown={(e) => {
        e.preventDefault();
        onPress();
      }}
      onPointerUp={onRelease}
      onPointerCancel={onRelease}
      onPointerLeave={onRelease}
    >
      {label}
    </button>
  );
}
