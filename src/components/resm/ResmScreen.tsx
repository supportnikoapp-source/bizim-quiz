"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { PLAYERS, type PlayerId } from "@/data/players";
import {
  DRAW_MS,
  formatDrawClock,
  packStrokes,
  PEN_SIZES,
  RESM_COLORS,
  RESM_PROMPTS,
  unpackStrokes,
  type Stroke,
} from "@/data/resm";
import { ensureAnonSession, getSupabase } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { LandscapeFrame } from "@/components/yapboz/LandscapeFrame";
import { DrawCanvas } from "./DrawCanvas";
import { StrokePreview } from "./StrokePreview";
import type { GameResult } from "@/lib/score";

type Props = {
  who: PlayerId;
  onBack: () => void;
  onBothDone: (result: GameResult) => void;
  onSkipLobby?: boolean;
};

type Phase = "lobby" | "draw" | "wait" | "compare" | "result";

type WireState = {
  who: PlayerId;
  session: string;
  ready: boolean;
  round: number;
  strokes: string;
  finished: boolean;
  vote: string;
  advance: boolean;
  seq: number;
};

const CHANNEL = "resm-pair";

export function ResmScreen({ who, onBack, onBothDone, onSkipLobby }: Props) {
  const partnerWho: PlayerId = who === "ilkin" ? "fidan" : "ilkin";
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<Phase>("lobby");
  const [round, setRound] = useState(0);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [theirStrokes, setTheirStrokes] = useState<Stroke[]>([]);
  const [theyHere, setTheyHere] = useState(false);
  const [color, setColor] = useState(RESM_COLORS[0]);
  const [pen, setPen] = useState(PEN_SIZES[1].width);
  const [myVote, setMyVote] = useState("");
  const [theirVote, setTheirVote] = useState("");
  const [wins, setWins] = useState({ ilkin: 0, fidan: 0 });
  const [leftMs, setLeftMs] = useState(DRAW_MS);
  const [myAdvance, setMyAdvance] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const readyRef = useRef(false);
  const theyReadyRef = useRef(false);
  const finishedRef = useRef(false);
  const theyFinishedRef = useRef(false);
  const roundRef = useRef(0);
  const phaseRef = useRef<Phase>("lobby");
  const voteRef = useRef("");
  const theyVoteRef = useRef("");
  const myAdvanceRef = useRef(false);
  const theyAdvanceRef = useRef(false);
  const winsRef = useRef({ ilkin: 0, fidan: 0 });
  const sessionRef = useRef(crypto.randomUUID());
  const armedRef = useRef(false);
  const seqRef = useRef(0);
  const partnerSeqRef = useRef(-1);
  const livePartnerRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const endAtRef = useRef(0);
  const beginPlayRef = useRef<() => void>(() => {});
  const goCompareRef = useRef<() => void>(() => {});
  const finishRoundRef = useRef<() => void>(() => {});
  const goNextRef = useRef<() => void>(() => {});
  const onBothDoneRef = useRef(onBothDone);
  onBothDoneRef.current = onBothDone;

  strokesRef.current = strokes;
  readyRef.current = ready;
  roundRef.current = round;
  phaseRef.current = phase;
  voteRef.current = myVote;
  myAdvanceRef.current = myAdvance;

  function clearTimer() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function startTimer() {
    clearTimer();
    endAtRef.current = Date.now() + DRAW_MS;
    setLeftMs(DRAW_MS);
    timerRef.current = window.setInterval(() => {
      const left = Math.max(0, endAtRef.current - Date.now());
      setLeftMs(left);
      if (left <= 0) {
        clearTimer();
        finishRoundRef.current();
      }
    }, 200);
  }

  useEffect(() => {
    return () => clearTimer();
  }, []);

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
      const seq = typeof row.seq === "number" ? row.seq : 0;
      const older = seq < partnerSeqRef.current || (stale && seq <= partnerSeqRef.current);
      if (older) return;
      partnerSeqRef.current = Math.max(partnerSeqRef.current, seq);
      const theirRound = typeof row.round === "number" ? row.round : 1;
      if (phaseRef.current === "lobby" || theirRound !== roundRef.current + 1) return;
      if (typeof row.finished === "boolean") {
        theyFinishedRef.current = row.finished;
      }
      if (typeof row.strokes === "string" && row.finished) {
        setTheirStrokes(unpackStrokes(row.strokes));
      }
      if (typeof row.vote === "string") {
        theyVoteRef.current = row.vote;
        setTheirVote(row.vote);
      }
      if (typeof row.advance === "boolean") {
        theyAdvanceRef.current = row.advance;
        if (row.advance && myAdvanceRef.current && phaseRef.current === "result") {
          goNextRef.current();
        }
      }
      if (
        theyFinishedRef.current &&
        finishedRef.current &&
        (phaseRef.current === "draw" || phaseRef.current === "wait")
      ) {
        goCompareRef.current();
      }
    }

    async function pullPartner() {
      const { data, error } = await supabase
        .from("resm_state")
        .select("who, round, strokes, ready, finished, vote, seq, advance")
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
            applyPartner({ ...row, who: (row.who || key) as PlayerId }, key, true);
          }
        };
        channel
          .on("presence", { event: "sync" }, applyPresence)
          .on("broadcast", { event: "resm" }, ({ payload }) => {
            applyPartner(payload as WireState);
          })
          .on("postgres_changes", { event: "*", schema: "public", table: "resm_state" }, (payload) => {
            const row = payload.new as WireState | undefined;
            if (row) applyPartner(row, undefined, true);
          });
        channel.subscribe(async (status) => {
          if (status !== "SUBSCRIBED" || cancelled || !channel) return;
          const payload: WireState = {
            who,
            session,
            ready: false,
            round: 1,
            strokes: "",
            finished: false,
            vote: "",
            advance: false,
            seq: 0,
          };
          await channel.track(payload);
          await supabase.from("resm_state").upsert({
            who,
            round: 1,
            strokes: "",
            ready: false,
            finished: false,
            vote: "",
            advance: false,
            seq: 0,
            updated_at: new Date().toISOString(),
          });
          if (cancelled) return;
          armedRef.current = true;
          setConnected(true);
          applyPresence();
          void pullPartner();
        });
        poll = window.setInterval(() => void pullPartner(), 500);
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

  function push(next: Partial<Omit<WireState, "who" | "session">> = {}) {
    seqRef.current += 1;
    const payload: WireState = {
      who,
      session: sessionRef.current,
      ready: next.ready ?? readyRef.current,
      round: next.round ?? roundRef.current + 1,
      strokes: next.strokes ?? packStrokes(strokesRef.current),
      finished: next.finished ?? finishedRef.current,
      vote: next.vote ?? voteRef.current,
      advance: next.advance ?? myAdvanceRef.current,
      seq: seqRef.current,
    };
    const ch = channelRef.current;
    if (ch) {
      void ch.track(payload);
      void ch.send({ type: "broadcast", event: "resm", payload });
    }
    void getSupabase().from("resm_state").upsert({
      who,
      round: payload.round,
      strokes: payload.strokes,
      ready: payload.ready,
      finished: payload.finished,
      vote: payload.vote,
      advance: payload.advance,
      seq: payload.seq,
      updated_at: new Date().toISOString(),
    });
  }

  function beginPlay() {
    if (phaseRef.current !== "lobby") return;
    startRound(0);
  }
  beginPlayRef.current = beginPlay;

  function startRound(index: number) {
    roundRef.current = index;
    finishedRef.current = false;
    theyFinishedRef.current = false;
    voteRef.current = "";
    theyVoteRef.current = "";
    myAdvanceRef.current = false;
    theyAdvanceRef.current = false;
    strokesRef.current = [];
    setRound(index);
    setStrokes([]);
    setTheirStrokes([]);
    setMyVote("");
    setTheirVote("");
    setMyAdvance(false);
    setReady(true);
    readyRef.current = true;
    phaseRef.current = "draw";
    setPhase("draw");
    startTimer();
    push({
      ready: true,
      round: index + 1,
      strokes: "",
      finished: false,
      vote: "",
      advance: false,
    });
  }

  function goCompare() {
    if (phaseRef.current === "compare" || phaseRef.current === "result") return;
    clearTimer();
    phaseRef.current = "compare";
    setPhase("compare");
  }
  goCompareRef.current = goCompare;

  function finishRound() {
    if (finishedRef.current || phaseRef.current !== "draw") return;
    finishedRef.current = true;
    clearTimer();
    setLeftMs(0);
    phaseRef.current = "wait";
    setPhase("wait");
    push({ ready: true, finished: true, advance: false, strokes: packStrokes(strokesRef.current) });
    if (theyFinishedRef.current) goCompare();
  }
  finishRoundRef.current = finishRound;

  function goNext() {
    if (phaseRef.current !== "result") return;
    if (roundRef.current >= RESM_PROMPTS.length - 1) {
      const w = winsRef.current;
      const winner: PlayerId = w.ilkin > w.fidan ? "ilkin" : "fidan";
      onBothDoneRef.current({ type: "one", winner });
      return;
    }
    startRound(roundRef.current + 1);
  }
  goNextRef.current = goNext;

  async function pressStart() {
    if (!theyHere || readyRef.current) return;
    readyRef.current = true;
    setReady(true);
    push({ ready: true });
    if (theyReadyRef.current) beginPlay();
  }

  function voteFor(id: PlayerId) {
    if (phaseRef.current !== "compare" || voteRef.current) return;
    voteRef.current = id;
    setMyVote(id);
    push({ ready: true, finished: true, vote: id, strokes: packStrokes(strokesRef.current) });
  }

  function pressAdvance() {
    if (phaseRef.current !== "result" || myAdvanceRef.current) return;
    myAdvanceRef.current = true;
    setMyAdvance(true);
    push({
      ready: true,
      finished: true,
      advance: true,
      vote: voteRef.current,
      strokes: packStrokes(strokesRef.current),
    });
    if (theyAdvanceRef.current) goNext();
  }

  useEffect(() => {
    if (phase !== "compare" || !myVote || !theirVote) return;
    const t = window.setTimeout(() => {
      setWins((w) => {
        const next =
          myVote === theirVote && (myVote === "ilkin" || myVote === "fidan")
            ? { ...w, [myVote]: w[myVote as PlayerId] + 1 }
            : w;
        winsRef.current = next;
        return next;
      });
      phaseRef.current = "result";
      setPhase("result");
    }, 600);
    return () => window.clearTimeout(t);
  }, [phase, myVote, theirVote]);

  const prompt = RESM_PROMPTS[round] ?? RESM_PROMPTS[0];
  const waitingPartner = !connected || !theyHere;
  const partnerName = who === "ilkin" ? "Fidan" : "İlkin";
  const roundWinner =
    myVote && theirVote && myVote === theirVote ? (myVote as PlayerId) : null;
  const lastRound = round >= RESM_PROMPTS.length - 1;
  const clock = formatDrawClock(leftMs);
  const clockUrgent = leftMs <= 30_000;

  return (
    <LandscapeFrame hint="Rəsm üfüqi ekranda tam görünür">
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
              <span className="text-[#3b82f6]">✎</span> RƏSM <span className="text-[#ec4899]">✎</span>
            </h1>
            <p className="text-[11px] text-[#6b7280]">
              {phase === "draw" || phase === "wait" || phase === "compare" || phase === "result"
                ? `${prompt.title} · ${round + 1}/${RESM_PROMPTS.length}`
                : "Eyni şeyi çəkirik, ən yaxşısı qazanır 💜"}
            </p>
          </div>
          {phase === "draw" || phase === "wait" ? (
            <p
              className={`min-w-[52px] text-right text-[18px] font-black tabular-nums ${
                clockUrgent ? "text-[#dc2626]" : "text-[#1e3a5f]"
              }`}
            >
              {clock}
            </p>
          ) : onSkipLobby && phase === "lobby" ? (
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

        {phase === "lobby" ? (
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
                  </figcaption>
                </figure>
              ))}
            </div>
            <p className="shrink-0 px-4 py-1 text-center text-[12px] text-[#4b5563]">
              İki şəkil: <b>Gün batımı</b> və <b>Dağ-meşə</b>. Hər birində <b>3 dəqiqə</b> var.
              Vaxt bitəndə hər iki rəsm görünür, ən yaxşısını seçirsiniz.
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
        ) : null}

        {phase === "draw" || phase === "wait" ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <p className="shrink-0 pb-1 text-center text-[15px] font-bold text-[#1e3a5f]">
              {prompt.title}
              <span className="ml-2 text-[12px] font-medium text-[#6b7280]">{prompt.hint}</span>
              {phase === "wait" ? (
                <span className="ml-2 text-[12px] font-semibold text-[#6b7280]">
                  {partnerName} gözlənilir…
                </span>
              ) : null}
            </p>
            <div className="min-h-0 flex-1 overflow-hidden rounded-xl border-2 border-[#d6d3d1] bg-[#fffaf4]">
              <DrawCanvas
                strokes={strokes}
                color={color}
                width={pen}
                disabled={phase === "wait"}
                onChange={setStrokes}
              />
            </div>
            <div className="mt-1 flex shrink-0 items-center gap-2">
              <div className="flex flex-1 flex-wrap gap-1">
                {RESM_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    disabled={phase === "wait"}
                    onClick={() => setColor(c)}
                    className={`h-7 w-7 rounded-full border ${
                      color === c ? "ring-2 ring-[#1e3a5f] ring-offset-1" : "border-black/20"
                    } disabled:opacity-40`}
                    style={{ background: c }}
                    aria-label={c}
                  />
                ))}
              </div>
              <div className="flex gap-1">
                {PEN_SIZES.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    disabled={phase === "wait"}
                    onClick={() => setPen(p.width)}
                    className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${
                      pen === p.width ? "bg-[#1e3a5f] text-white" : "bg-white text-[#1e3a5f] shadow"
                    } disabled:opacity-40`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setStrokes((s) => s.slice(0, -1))}
                disabled={phase === "wait" || strokes.length === 0}
                className="rounded-lg bg-white px-2 py-1 text-[11px] font-semibold shadow disabled:opacity-40"
              >
                Geri al
              </button>
            </div>
          </div>
        ) : null}

        {phase === "compare" || phase === "result" ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <p className="shrink-0 pb-1 text-center text-[13px] font-semibold text-[#4b5563]">
              {phase === "compare"
                ? myVote
                  ? `${partnerName} səsini gözləyirik…`
                  : "Ən yaxşı rəsmi seçin"
                : roundWinner
                  ? `${roundWinner === "ilkin" ? "İlkin" : "Fidan"} qazandı · İlkin ${wins.ilkin} – Fidan ${wins.fidan}`
                  : `Bərabərə · İlkin ${wins.ilkin} – Fidan ${wins.fidan}`}
            </p>
            <div className="flex min-h-0 flex-1 gap-2">
              {PLAYERS.map((p) => {
                const mine = p.id === who;
                const art = mine ? strokes : theirStrokes;
                const picked = myVote === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={phase !== "compare" || Boolean(myVote)}
                    onClick={() => voteFor(p.id)}
                    className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border-4 ${
                      p.id === "ilkin" ? "border-[#93c5fd]" : "border-[#f9a8d4]"
                    } ${picked ? "ring-4 ring-[#16a34a]" : ""}`}
                  >
                    <p
                      className={`shrink-0 py-0.5 text-center text-sm font-bold ${
                        p.id === "ilkin" ? "text-[#2563eb]" : "text-[#db2777]"
                      }`}
                    >
                      {p.name}
                    </p>
                    <div className="min-h-0 flex-1 bg-[#fffaf4]">
                      <StrokePreview strokes={art} className="h-full w-full" />
                    </div>
                  </button>
                );
              })}
            </div>
            {phase === "result" ? (
              <button
                type="button"
                disabled={myAdvance}
                onClick={pressAdvance}
                className="mx-auto mt-2 mb-1 min-h-[42px] rounded-full bg-[#3b82f6] px-10 text-[15px] font-semibold text-white disabled:opacity-60"
              >
                {myAdvance
                  ? `${partnerName} Davam basmasını gözləyirik…`
                  : lastRound
                    ? "Davam"
                    : "Növbəti şəkil"}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </LandscapeFrame>
  );
}
