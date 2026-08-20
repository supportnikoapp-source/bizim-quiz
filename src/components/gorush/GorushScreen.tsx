"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { PLAYERS, type PlayerId } from "@/data/players";
import {
  appendMeetTrail,
  MEET,
  meetInBounds,
  meetSame,
  meetStep,
  packMeetTrail,
  theyMet,
  unpackMeetTrail,
  type Dir,
  type Pos,
} from "@/data/meetMaze";
import { ensureAnonSession, getSupabase } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { LandscapeFrame } from "@/components/yapboz/LandscapeFrame";
import { MeetBoard } from "./MeetBoard";

type Props = {
  who: PlayerId;
  onBack: () => void;
  onBothWon: () => void;
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

const CHANNEL = "gorush-pair";

function startOf(id: PlayerId): Pos {
  return id === "ilkin" ? MEET.ilkin : MEET.fidan;
}

export function GorushScreen({ who, onBack, onBothWon, onSkipLobby }: Props) {
  const partnerWho: PlayerId = who === "ilkin" ? "fidan" : "ilkin";
  const myStart = startOf(who);
  const theirStart = startOf(partnerWho);

  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [myPos, setMyPos] = useState<Pos>(myStart);
  const [theirPos, setTheirPos] = useState<Pos>(theirStart);
  const [myTrail, setMyTrail] = useState<Pos[]>([myStart]);
  const [theirTrail, setTheirTrail] = useState<Pos[]>([theirStart]);
  const [theyHere, setTheyHere] = useState(false);
  const [won, setWon] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const posRef = useRef(myStart);
  const theirPosRef = useRef(theirStart);
  const trailRef = useRef<Pos[]>([myStart]);
  const readyRef = useRef(false);
  const theyReadyRef = useRef(false);
  const wonRef = useRef(false);
  const sessionRef = useRef(crypto.randomUUID());
  const armedRef = useRef(false);
  const holdRef = useRef<number | null>(null);
  const moveRef = useRef<(dir: Dir) => void>(() => {});
  const playingRef = useRef(false);
  const livePartnerRef = useRef(false);
  const beginPlayRef = useRef<() => void>(() => {});
  const winTimerRef = useRef<number | null>(null);
  const onBothWonRef = useRef(onBothWon);
  onBothWonRef.current = onBothWon;

  posRef.current = myPos;
  theirPosRef.current = theirPos;
  trailRef.current = myTrail;
  readyRef.current = ready;

  function celebrate() {
    if (wonRef.current) return;
    wonRef.current = true;
    setWon(true);
    void push({
      ready: true,
      r: posRef.current.r,
      c: posRef.current.c,
      trail: packMeetTrail(trailRef.current),
      finished: true,
    });
    if (winTimerRef.current !== null) window.clearTimeout(winTimerRef.current);
    winTimerRef.current = window.setTimeout(() => onBothWonRef.current(), 1800);
  }

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

    function applyPartner(row: Partial<WireState>, fromKey?: string, stale = false) {
      const id = (row.who || fromKey) as PlayerId | undefined;
      if (!id || id === who) return;
      if (!stale) livePartnerRef.current = true;
      setTheyHere(true);
      if (typeof row.ready === "boolean" && (!stale || livePartnerRef.current)) {
        theyReadyRef.current = row.ready;
        if (row.ready && readyRef.current) beginPlayRef.current();
      }
      const nextPos =
        typeof row.r === "number" && typeof row.c === "number" ? { r: row.r, c: row.c } : null;
      const posOk = nextPos && meetInBounds(nextPos);
      const leftover = stale && posOk && !meetSame(nextPos, theirStart) && !livePartnerRef.current;
      if (posOk && !leftover) {
        theirPosRef.current = nextPos;
        setTheirPos(nextPos);
        if (playingRef.current && theyMet(posRef.current, nextPos)) celebrate();
      }
      if (typeof row.trail === "string" && !leftover) {
        const next = unpackMeetTrail(row.trail);
        if (next.length) setTheirTrail(next);
      }
      if (row.finished && (!stale || livePartnerRef.current)) {
        celebrate();
      }
    }

    async function pullPartner() {
      const { data, error } = await supabase
        .from("gorush_state")
        .select("who, r, c, trail, ready, finished")
        .eq("who", partnerWho)
        .maybeSingle();
      if (error || !data) return;
      applyPartner(data as WireState, undefined, true);
    }

    async function connect() {
      try {
        await ensureAnonSession();
        if (cancelled) return;

        channel = supabase.channel(CHANNEL, {
          config: {
            private: false,
            presence: { key: who },
            broadcast: { ack: false, self: false },
          },
        });
        channelRef.current = channel;

        const applyPresence = () => {
          if (!channel || !armedRef.current) return;
          const state = channel.presenceState<WireState>();
          for (const [key, rows] of Object.entries(state)) {
            if (key === who) continue;
            const row = rows[rows.length - 1];
            if (!row) continue;
            applyPartner({ ...row, who: (row.who || key) as PlayerId }, key);
          }
        };

        channel
          .on("presence", { event: "sync" }, applyPresence)
          .on("broadcast", { event: "gorush" }, ({ payload }) => {
            applyPartner(payload as WireState);
          })
          .on("postgres_changes", { event: "*", schema: "public", table: "gorush_state" }, (payload) => {
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
            trail: packMeetTrail([myStart]),
            finished: false,
          };
          await channel.track(payload);
          await supabase.from("gorush_state").upsert({
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
        }, 400);
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
      if (winTimerRef.current !== null) window.clearTimeout(winTimerRef.current);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [who, partnerWho, myStart.c, myStart.r, theirStart]);

  async function push(next: Partial<Pick<WireState, "ready" | "r" | "c" | "trail" | "finished">> = {}) {
    const payload: WireState = {
      who,
      session: sessionRef.current,
      ready: next.ready ?? readyRef.current,
      r: next.r ?? posRef.current.r,
      c: next.c ?? posRef.current.c,
      trail: next.trail ?? packMeetTrail(trailRef.current),
      finished: next.finished ?? wonRef.current,
    };
    const ch = channelRef.current;
    if (ch) {
      void ch.track(payload);
      void ch.send({ type: "broadcast", event: "gorush", payload });
    }
    void getSupabase().from("gorush_state").upsert({
      who,
      r: payload.r,
      c: payload.c,
      trail: payload.trail,
      ready: payload.ready,
      finished: payload.finished,
      updated_at: new Date().toISOString(),
    });
  }

  function beginPlay() {
    if (playingRef.current) return;
    playingRef.current = true;
    const me = startOf(who);
    posRef.current = me;
    theirPosRef.current = theirStart;
    trailRef.current = [me];
    setMyPos(me);
    setMyTrail([me]);
    setTheirPos(theirStart);
    setTheirTrail([theirStart]);
    wonRef.current = false;
    setWon(false);
    setReady(true);
    readyRef.current = true;
    setPlaying(true);
    void push({
      ready: true,
      r: me.r,
      c: me.c,
      trail: packMeetTrail([me]),
      finished: false,
    });
  }
  beginPlayRef.current = beginPlay;

  async function pressStart() {
    if (!theyHere || readyRef.current) return;
    readyRef.current = true;
    setReady(true);
    await push({ ready: true });
    if (theyReadyRef.current) beginPlay();
  }

  function move(dir: Dir) {
    if (!playingRef.current || wonRef.current) return;
    const next = meetStep(posRef.current, dir);
    if (!next) return;
    const trail = appendMeetTrail(trailRef.current, next);
    posRef.current = next;
    trailRef.current = trail;
    setMyPos(next);
    setMyTrail(trail);
    void push({
      ready: true,
      r: next.r,
      c: next.c,
      trail: packMeetTrail(trail),
      finished: false,
    });
    if (theyMet(next, theirPosRef.current)) celebrate();
  }
  moveRef.current = move;

  function startHold(dir: Dir) {
    moveRef.current(dir);
    if (holdRef.current !== null) window.clearInterval(holdRef.current);
    holdRef.current = window.setInterval(() => moveRef.current(dir), 110);
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

  return (
    <LandscapeFrame hint="Görüş üfüqi ekranda tam görünür">
      <div className="relative flex h-full w-full flex-col px-2 py-1.5">
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
              <span className="text-[#3b82f6]">♥</span> GÖRÜŞ <span className="text-[#ec4899]">♥</span>
            </h1>
            <p className="text-[11px] text-[#6b7280]">Bir-birimizi tapıb birləşirik 💜</p>
          </div>
          {onSkipLobby && !playing ? (
            <button
              type="button"
              onClick={() => beginPlay()}
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
            <div className="flex min-h-0 flex-1 items-center justify-center gap-10">
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
                    <span className="block text-[11px] font-semibold text-[#6b7280]">
                      {p.id === "ilkin" ? "sol uc" : "sağ uc"}
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
            <p className="shrink-0 px-4 py-1 text-center text-[12px] text-[#4b5563]">
              Eyni böyük xəritədəsiniz. İlkin soldan, Fidan sağdan başlayır. Tapıb görüşəndə ikiniz də
              qazanırsınız.
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
            <MeetBoard
              who={who}
              myPos={myPos}
              theirPos={theirPos}
              myTrail={myTrail}
              theirTrail={theirTrail}
              onStep={(dir) => moveRef.current(dir)}
            />
            <div className="mt-0.5 flex shrink-0 items-center justify-center">
              <div className="grid grid-cols-3 grid-rows-3 gap-0.5">
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

        {won ? (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#1b2448]/75 px-6 text-center">
            <p className="font-serif text-4xl text-white">Qazandınız!</p>
            <p className="mt-3 text-[16px] text-white/85">Bir-birinizi tapdınız 💜</p>
            <button type="button" onClick={() => onBothWon()} className="btn mt-6 max-w-[220px]">
              Davam
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
      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sm font-bold text-[#1e3a5f] shadow"
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
