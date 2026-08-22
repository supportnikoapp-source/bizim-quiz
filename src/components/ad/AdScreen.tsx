"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { PLAYERS, type PlayerId } from "@/data/players";
import {
  AD_MS,
  formatAdClock,
  lettersFor,
  packWords,
  tryAddWord,
  unpackWords,
} from "@/data/ad";
import { ensureAnonSession, getSupabase } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { LandscapeFrame } from "@/components/yapboz/LandscapeFrame";

type Props = {
  who: PlayerId;
  onBack: () => void;
  onBothDone: () => void;
  onSkipLobby?: boolean;
};

type Phase = "lobby" | "play" | "wait" | "result";

type WireState = {
  who: PlayerId;
  session: string;
  ready: boolean;
  words: string;
  finished: boolean;
  advance: boolean;
  seq: number;
};

const CHANNEL = "ad-pair";

export function AdScreen({ who, onBack, onBothDone, onSkipLobby }: Props) {
  const partnerWho: PlayerId = who === "ilkin" ? "fidan" : "ilkin";
  const myLetters = lettersFor(who);
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");
  const [connected, setConnected] = useState(false);
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<Phase>("lobby");
  const [words, setWords] = useState<string[]>([]);
  const [theirWords, setTheirWords] = useState<string[]>([]);
  const [theyHere, setTheyHere] = useState(false);
  const [draft, setDraft] = useState("");
  const [leftMs, setLeftMs] = useState(AD_MS);
  const [myAdvance, setMyAdvance] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const wordsRef = useRef<string[]>([]);
  const readyRef = useRef(false);
  const theyReadyRef = useRef(false);
  const finishedRef = useRef(false);
  const theyFinishedRef = useRef(false);
  const phaseRef = useRef<Phase>("lobby");
  const myAdvanceRef = useRef(false);
  const theyAdvanceRef = useRef(false);
  const sessionRef = useRef(crypto.randomUUID());
  const armedRef = useRef(false);
  const seqRef = useRef(0);
  const partnerSeqRef = useRef(-1);
  const livePartnerRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const endAtRef = useRef(0);
  const beginPlayRef = useRef<() => void>(() => {});
  const goResultRef = useRef<() => void>(() => {});
  const finishPlayRef = useRef<() => void>(() => {});
  const goNextRef = useRef<() => void>(() => {});
  const onBothDoneRef = useRef(onBothDone);
  onBothDoneRef.current = onBothDone;

  wordsRef.current = words;
  readyRef.current = ready;
  phaseRef.current = phase;
  myAdvanceRef.current = myAdvance;

  function clearTimer() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function startTimer() {
    clearTimer();
    endAtRef.current = Date.now() + AD_MS;
    setLeftMs(AD_MS);
    timerRef.current = window.setInterval(() => {
      const left = Math.max(0, endAtRef.current - Date.now());
      setLeftMs(left);
      if (left <= 0) {
        clearTimer();
        finishPlayRef.current();
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
      if (phaseRef.current === "lobby") return;
      if (typeof row.finished === "boolean") {
        theyFinishedRef.current = row.finished;
      }
      if (typeof row.words === "string" && row.finished) {
        setTheirWords(unpackWords(row.words));
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
        (phaseRef.current === "play" || phaseRef.current === "wait")
      ) {
        goResultRef.current();
      }
    }

    async function pullPartner() {
      const { data, error } = await supabase
        .from("ad_state")
        .select("who, words, ready, finished, advance, seq")
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
          .on("broadcast", { event: "ad" }, ({ payload }) => {
            applyPartner(payload as WireState);
          })
          .on("postgres_changes", { event: "*", schema: "public", table: "ad_state" }, (payload) => {
            const row = payload.new as WireState | undefined;
            if (row) applyPartner(row, undefined, true);
          });
        channel.subscribe(async (status) => {
          if (status !== "SUBSCRIBED" || cancelled || !channel) return;
          const payload: WireState = {
            who,
            session,
            ready: false,
            words: "[]",
            finished: false,
            advance: false,
            seq: 0,
          };
          await channel.track(payload);
          await supabase.from("ad_state").upsert({
            who,
            words: "[]",
            ready: false,
            finished: false,
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
      words: next.words ?? packWords(wordsRef.current),
      finished: next.finished ?? finishedRef.current,
      advance: next.advance ?? myAdvanceRef.current,
      seq: seqRef.current,
    };
    const ch = channelRef.current;
    if (ch) {
      void ch.track(payload);
      void ch.send({ type: "broadcast", event: "ad", payload });
    }
    void getSupabase().from("ad_state").upsert({
      who,
      words: payload.words,
      ready: payload.ready,
      finished: payload.finished,
      advance: payload.advance,
      seq: payload.seq,
      updated_at: new Date().toISOString(),
    });
  }

  function beginPlay() {
    if (phaseRef.current !== "lobby") return;
    finishedRef.current = false;
    theyFinishedRef.current = false;
    myAdvanceRef.current = false;
    theyAdvanceRef.current = false;
    wordsRef.current = [];
    setWords([]);
    setTheirWords([]);
    setDraft("");
    setHint("");
    setMyAdvance(false);
    setReady(true);
    readyRef.current = true;
    phaseRef.current = "play";
    setPhase("play");
    startTimer();
    push({ ready: true, words: "[]", finished: false, advance: false });
  }
  beginPlayRef.current = beginPlay;

  function goResult() {
    if (phaseRef.current === "result") return;
    clearTimer();
    phaseRef.current = "result";
    setPhase("result");
  }
  goResultRef.current = goResult;

  function finishPlay() {
    if (finishedRef.current || phaseRef.current !== "play") return;
    finishedRef.current = true;
    clearTimer();
    setLeftMs(0);
    phaseRef.current = "wait";
    setPhase("wait");
    push({ ready: true, finished: true, advance: false, words: packWords(wordsRef.current) });
    if (theyFinishedRef.current) goResult();
  }
  finishPlayRef.current = finishPlay;

  function goNext() {
    if (phaseRef.current !== "result") return;
    onBothDoneRef.current();
  }
  goNextRef.current = goNext;

  async function pressStart() {
    if (!theyHere || readyRef.current) return;
    readyRef.current = true;
    setReady(true);
    push({ ready: true });
    if (theyReadyRef.current) beginPlay();
  }

  function addWord(e?: FormEvent) {
    e?.preventDefault();
    if (phaseRef.current !== "play") return;
    const next = tryAddWord(draft, myLetters, wordsRef.current);
    if (!next.ok) {
      setHint(next.error);
      return;
    }
    const list = [...wordsRef.current, next.word];
    wordsRef.current = list;
    setWords(list);
    setDraft("");
    setHint("");
    push({ ready: true, finished: false, words: packWords(list) });
  }

  function removeWord(index: number) {
    if (phaseRef.current !== "play") return;
    const list = wordsRef.current.filter((_, i) => i !== index);
    wordsRef.current = list;
    setWords(list);
    push({ ready: true, finished: false, words: packWords(list) });
  }

  function pressAdvance() {
    if (phaseRef.current !== "result" || myAdvanceRef.current) return;
    myAdvanceRef.current = true;
    setMyAdvance(true);
    push({
      ready: true,
      finished: true,
      advance: true,
      words: packWords(wordsRef.current),
    });
    if (theyAdvanceRef.current) goNext();
  }

  const waitingPartner = !connected || !theyHere;
  const partnerName = who === "ilkin" ? "Fidan" : "İlkin";
  const partnerLetters = lettersFor(partnerWho);
  const clock = formatAdClock(leftMs);
  const clockUrgent = leftMs <= 10_000;
  const myCount = words.length;
  const theirCount = theirWords.length;
  const winner =
    myCount === theirCount ? null : myCount > theirCount ? who : partnerWho;
  const playing = phase === "play" || phase === "wait";

  return (
    <LandscapeFrame hint="Adımdan söz tap üfüqi ekranda görünür">
      {phase === "lobby" ? (
        <div className="relative flex h-full w-full flex-col bg-[#efeae3] px-2 py-1.5">
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
                Adımdan söz tap
              </h1>
              <p className="text-[11px] text-[#6b7280]">Qarşı tərəfin adından söz yaz 💜</p>
            </div>
            {onSkipLobby ? (
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
              Fidan <b>İ L K İ N</b> hərflərindən, İlkin <b>F İ D A N</b> hərflərindən söz yazır.
              1 dəqiqə var. Vaxt bitəndə hər iki siyahı görünür, ən çox söz yazan qazanır.
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
        </div>
      ) : (
        <div className="flex h-full w-full flex-col bg-[#0b1b3a] px-3 py-2 text-white">
          <header className="mb-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onBack}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-xl text-[#1e3a5f]"
              aria-label="Geri"
            >
              ‹
            </button>
            <div className="text-center">
              <h1 className="text-[18px] font-black tracking-wide">Adımdan söz tap!</h1>
              <p className="text-[11px] text-white/70">
                Hərflərdən bacardığın qədər söz yaz. Ən çox söz yazan qalib gəlir!
              </p>
            </div>
            <span className="h-9 w-9" />
          </header>
          {playing ? (
            <div className="mb-2 flex justify-center">
              <p
                className={`rounded-full px-4 py-1 text-[16px] font-black tabular-nums ${
                  clockUrgent ? "bg-[#dc2626]" : "bg-[#152a54]"
                }`}
              >
                ⏳ {clock}
              </p>
            </div>
          ) : (
            <p className="mb-2 text-center text-[14px] font-semibold">
              {winner
                ? `${winner === "ilkin" ? "İlkin" : "Fidan"} qazandı · İlkin ${who === "ilkin" ? myCount : theirCount} – Fidan ${who === "fidan" ? myCount : theirCount}`
                : `Bərabərə · İlkin ${who === "ilkin" ? myCount : theirCount} – Fidan ${who === "fidan" ? myCount : theirCount}`}
            </p>
          )}
          {error ? <p className="text-center text-sm text-rose-300">{error}</p> : null}
          {playing ? (
            <div className="flex min-h-0 flex-1">
              <WordBoard
                id={who}
                letters={myLetters}
                words={words}
                draft={draft}
                hint={phase === "wait" ? `${partnerName} gözlənilir…` : hint}
                locked={phase === "wait"}
                onDraft={setDraft}
                onAdd={addWord}
                onRemove={removeWord}
              />
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 gap-2">
              {PLAYERS.map((p) => {
                const mine = p.id === who;
                return (
                  <WordBoard
                    key={p.id}
                    id={p.id}
                    letters={mine ? myLetters : partnerLetters}
                    words={mine ? words : theirWords}
                    locked
                  />
                );
              })}
            </div>
          )}
          {phase === "result" ? (
            <button
              type="button"
              disabled={myAdvance}
              onClick={pressAdvance}
              className="mx-auto mt-2 min-h-[42px] rounded-full bg-[#3b82f6] px-10 text-[15px] font-semibold text-white disabled:opacity-60"
            >
              {myAdvance ? `${partnerName} Davam basmasını gözləyirik…` : "Davam"}
            </button>
          ) : null}
        </div>
      )}
    </LandscapeFrame>
  );
}

function WordBoard({
  id,
  letters,
  words,
  draft = "",
  hint = "",
  locked,
  onDraft,
  onAdd,
  onRemove,
}: {
  id: PlayerId;
  letters: string[];
  words: string[];
  draft?: string;
  hint?: string;
  locked?: boolean;
  onDraft?: (v: string) => void;
  onAdd?: (e?: FormEvent) => void;
  onRemove?: (index: number) => void;
}) {
  const me = PLAYERS.find((p) => p.id === id)!;
  const pink = id === "fidan";
  return (
    <section
      className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border px-3 py-2 ${
        pink ? "border-[#f9a8d4] bg-[#fce7f3] text-[#9d174d]" : "border-[#93c5fd] bg-[#dbeafe] text-[#1e3a8a]"
      }`}
    >
      <div className="mb-1 flex shrink-0 items-center gap-2">
        <div
          className={`h-10 w-10 overflow-hidden rounded-full border-2 ${
            pink ? "border-[#f9a8d4]" : "border-[#93c5fd]"
          }`}
        >
          <img src={me.image} alt={me.name} className="h-full w-full object-cover" />
        </div>
        <p className="text-[14px] font-black">
          {id === "ilkin" ? "İlkinin oyunu 💙" : "Fidanın oyunu ❤️"}
        </p>
      </div>
      <div className="mb-1 flex shrink-0 flex-wrap gap-1">
        {letters.map((ch, i) => (
          <span
            key={`${ch}-${i}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[15px] font-black text-[#1e3a5f] shadow-sm"
          >
            {ch}
          </span>
        ))}
      </div>
      <p className={`mb-1 shrink-0 text-[11px] ${pink ? "text-[#9d174d]/70" : "text-[#1e3a8a]/70"}`}>
        Bu hərflərdən bacardığın qədər söz yaz.
      </p>
      {!locked && onAdd && onDraft ? (
        <form onSubmit={onAdd} className="mb-1 flex shrink-0 gap-1">
          <input
            value={draft}
            onChange={(e) => onDraft(e.target.value)}
            placeholder="Söz yaz..."
            className="min-h-[38px] min-w-0 flex-1 rounded-xl bg-white px-3 text-[14px] text-[#1e3a5f] outline-none"
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
          />
          <button
            type="submit"
            className={`shrink-0 rounded-xl px-3 text-[13px] font-bold text-white ${
              pink ? "bg-[#ec4899]" : "bg-[#2563eb]"
            }`}
          >
            Əlavə et
          </button>
        </form>
      ) : null}
      {hint ? <p className="mb-1 shrink-0 text-[11px] font-semibold text-[#b45309]">{hint}</p> : null}
      <p className="mb-1 shrink-0 text-[12px] font-bold">
        {id === "ilkin" ? `İlkinin sözləri (${words.length})` : `Fidanın sözləri (${words.length})`}
      </p>
      <ol className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
        {words.map((w, i) => (
          <li
            key={`${w}-${i}`}
            className={`flex items-center justify-between rounded-lg px-2 py-1 text-[13px] font-semibold ${
              pink ? "bg-[#fbcfe8]" : "bg-[#bfdbfe]"
            }`}
          >
            <span>
              {i + 1}. {w}
            </span>
            {!locked && onRemove ? (
              <button type="button" onClick={() => onRemove(i)} aria-label="Sil" className="px-1 text-[14px]">
                🗑
              </button>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
