"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { QUESTIONS, isFinaleIndex, questionAt } from "@/data/questions";
import { burstChests, burstHearts } from "@/lib/confetti";
import { EVASIVE_MESSAGE, isEvasiveAnswer } from "@/lib/evasive";
import { answersUrl, normalizeCode, openWhatsAppShare } from "@/lib/codes";
import {
  iAmIlkin,
  isHost,
  myName as roomMyName,
  myReady,
  myShare,
  partnerName,
  partnerShare,
} from "@/lib/room";
import { SOLO_PREVIEW } from "@/lib/solo";
import { ensureAnonSession, getSupabase } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import type { AnswerLockRow, AnswerRow, PeekRoom, RatingRow, RoomRow, SubmissionRow } from "@/lib/types";
import { FinalChests } from "@/components/finale/FinalChests";
import { HostsIntro } from "@/components/home/HostsIntro";
import { RulesScreen } from "@/components/home/RulesScreen";
import { SetupScreen } from "@/components/home/SetupScreen";
import { PlayTable } from "@/components/play/PlayTable";
import { JoinScreen } from "@/components/room/JoinScreen";
import { ReadyPair } from "@/components/room/ReadyPair";
import { WaitingScreen } from "@/components/room/WaitingScreen";
import { WelcomeOverlay } from "@/components/room/WelcomeOverlay";
import { StatusCard } from "@/components/ui/StatusCard";

type Props = {
  code: string;
};

export function RoomClient({ code }: Props) {
  const roomCode = normalizeCode(code);
  const [uid, setUid] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomRow | null>(null);
  const [peek, setPeek] = useState<PeekRoom | null>(null);
  const [subs, setSubs] = useState<SubmissionRow[]>([]);
  const [answers, setAnswers] = useState<AnswerRow[]>([]);
  const [ratings, setRatings] = useState<RatingRow[]>([]);
  const [locks, setLocks] = useState<AnswerLockRow[]>([]);
  const [sending, setSending] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [draft, setDraft] = useState("");
  const [mySaved, setMySaved] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [welcome, setWelcome] = useState(false);
  const bootGuest = useRef<string | null | undefined>(undefined);
  const celebrated = useRef<string | null>(null);
  const openedBurst = useRef(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingIdle = useRef<number | null>(null);
  const [hostTyping, setHostTyping] = useState(false);
  const [guestTyping, setGuestTyping] = useState(false);
  const [soloIndex, setSoloIndex] = useState(0);
  const roomRef = useRef<RoomRow | null>(null);
  roomRef.current = room;
  const guestId = room?.guest_id;

  const playIndex = SOLO_PREVIEW ? soloIndex : (room?.question_index ?? 0);
  const question = questionAt(playIndex);

  const hostSubmitted = useMemo(() => {
    if (!room || !question) return false;
    return subs.some((s) => s.player_id === room.host_id && s.question_id === question.id);
  }, [subs, room, question]);

  const guestSubmitted = useMemo(() => {
    if (!room || !question || !room.guest_id) return false;
    return subs.some((s) => s.player_id === room.guest_id && s.question_id === question.id);
  }, [subs, room, question]);

  const mySubmitted = useMemo(() => {
    if (!uid || !question) return false;
    return subs.some((s) => s.player_id === uid && s.question_id === question.id);
  }, [subs, uid, question]);

  const theirSubmitted = useMemo(() => {
    if (!uid || !question || !room) return false;
    if (SOLO_PREVIEW) return true;
    const partnerId = uid === room.host_id ? room.guest_id : room.host_id;
    if (!partnerId) return false;
    return subs.some((s) => s.player_id === partnerId && s.question_id === question.id);
  }, [subs, uid, question, room]);

  const loadSubmissions = useCallback(async (roomId: string) => {
    const { data } = await getSupabase()
      .from("submissions")
      .select("room_id, player_id, question_id, created_at")
      .eq("room_id", roomId);
    setSubs((data as SubmissionRow[]) ?? []);
  }, []);

  const loadRatings = useCallback(async (roomId: string) => {
    const { data } = await getSupabase()
      .from("ratings")
      .select("room_id, rater_id, question_id, score")
      .eq("room_id", roomId);
    setRatings((data as RatingRow[]) ?? []);
  }, []);

  const loadLocks = useCallback(async (roomId: string) => {
    const { data } = await getSupabase()
      .from("answer_locks")
      .select("room_id, player_id, question_id, created_at")
      .eq("room_id", roomId);
    setLocks((data as AnswerLockRow[]) ?? []);
  }, []);

  const loadAnswers = useCallback(async (roomId: string) => {
    const { data, error: qErr } = await getSupabase()
      .from("answers")
      .select("id, room_id, player_id, question_id, body")
      .eq("room_id", roomId);
    if (qErr) return;
    setAnswers((data as AnswerRow[]) ?? []);
  }, []);

  const refreshRoom = useCallback(async (roomId: string) => {
    const { data, error: qErr } = await getSupabase().from("rooms").select("*").eq("id", roomId).maybeSingle();
    if (qErr) return;
    setRoom((data as RoomRow) ?? null);
  }, []);

  useEffect(() => {
    if (!hasSupabaseConfig()) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const id = await ensureAnonSession();
        if (cancelled) return;
        setUid(id);

        const supabase = getSupabase();
        const { data: mine } = await supabase
          .from("rooms")
          .select("*")
          .eq("code", roomCode)
          .maybeSingle();

        if (cancelled) return;

        if (mine) {
          const row = mine as RoomRow;
          const nav = performance.getEntriesByType("navigation")[0] as
            | PerformanceNavigationTiming
            | undefined;
          const q = questionAt(row.question_index);
          if (nav?.type === "reload" && q && row.status !== "finished") {
            await supabase.rpc("clear_my_answer", {
              p_room_id: row.id,
              p_question_id: q.id,
            });
          }
          setRoom(row);
          bootGuest.current = row.guest_id;
          await loadSubmissions(row.id);
          await loadAnswers(row.id);
          await loadRatings(row.id);
          await loadLocks(row.id);
          return;
        }

        const { data: peekData, error: peekErr } = await supabase.rpc("peek_room", {
          p_code: roomCode,
        });
        if (peekErr) throw peekErr;
        setPeek(peekData as PeekRoom);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Otaq açılmadı");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [roomCode, loadAnswers, loadSubmissions, loadRatings, loadLocks]);

  useEffect(() => {
    if (!room?.id || !uid) return;
    const roomId = room.id;
    const supabase = getSupabase();
    const channel = supabase.channel(`room-${roomId}`, {
      config: { presence: { key: uid } },
    });
    channelRef.current = channel;

    channel
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
        () => {
          void refreshRoom(roomId);
          void loadSubmissions(roomId);
          void loadAnswers(roomId);
          void loadRatings(roomId);
          void loadLocks(roomId);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "submissions",
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          void loadSubmissions(roomId);
          void refreshRoom(roomId);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ratings",
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          void loadRatings(roomId);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "answer_locks",
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          void loadLocks(roomId);
          void loadAnswers(roomId);
        },
      )
      .on("presence", { event: "sync" }, () => {
        const current = roomRef.current;
        if (!current) return;
        const state = channel.presenceState<{ typing?: boolean }>();
        setHostTyping(Boolean(state[current.host_id]?.[0]?.typing));
        setGuestTyping(Boolean(current.guest_id && state[current.guest_id]?.[0]?.typing));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ typing: false });
        }
      });

    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [room?.id, uid, refreshRoom, loadSubmissions, loadRatings, loadLocks, loadAnswers]);

  useEffect(() => {
    if (bootGuest.current === undefined) {
      bootGuest.current = guestId ?? null;
      return;
    }
    if (SOLO_PREVIEW || !guestId || guestId === bootGuest.current) {
      bootGuest.current = guestId ?? null;
      return;
    }
    bootGuest.current = guestId;
    setWelcome(true);
    const t = window.setTimeout(() => setWelcome(false), 1800);
    return () => window.clearTimeout(t);
  }, [guestId]);

  useEffect(() => {
    setDraft("");
    setMySaved("");
    void channelRef.current?.track({ typing: false });
  }, [room?.question_index, soloIndex]);

  useEffect(() => {
    if (!room?.id) return;
    const id = room.id;
    const t = window.setInterval(() => {
      void refreshRoom(id);
      const current = roomRef.current;
      if (!current || current.status === "waiting") return;
      void loadSubmissions(id);
      if (current.status === "finished" || isFinaleIndex(current.question_index)) {
        void loadAnswers(id);
        void loadRatings(id);
        void loadLocks(id);
      }
    }, 1000);
    return () => window.clearInterval(t);
  }, [room?.id, refreshRoom, loadSubmissions, loadAnswers, loadRatings, loadLocks]);

  useEffect(() => {
    if (!room || !question) return;
    if (SOLO_PREVIEW) {
      if (!mySubmitted) return;
      if (celebrated.current !== question.id) {
        celebrated.current = question.id;
        burstHearts();
      }
      const soloT = window.setTimeout(() => setSoloIndex((i) => i + 1), 700);
      return () => window.clearTimeout(soloT);
    }
    if (!room.guest_id) return;
    if (!hostSubmitted || !guestSubmitted) return;
    if (celebrated.current !== question.id) {
      celebrated.current = question.id;
      burstHearts();
    }

    const roomId = room.id;
    const questionId = question.id;
    const fromIndex = room.question_index;

    async function advance() {
      if (roomRef.current && roomRef.current.question_index !== fromIndex) return;
      const { data } = await getSupabase().rpc("try_advance", {
        p_room_id: roomId,
        p_question_id: questionId,
        p_from_index: fromIndex,
        p_total: QUESTIONS.length,
      });
      if (data) setRoom(data as RoomRow);
      else void refreshRoom(roomId);
    }

    const t = window.setTimeout(() => void advance(), 800);
    const poll = window.setInterval(() => void advance(), 1000);
    return () => {
      window.clearTimeout(t);
      window.clearInterval(poll);
    };
  }, [room, question, hostSubmitted, guestSubmitted, mySubmitted, refreshRoom]);

  useEffect(() => {
    if (!room) return;
    const done =
      room.status === "finished" ||
      isFinaleIndex(room.question_index) ||
      (SOLO_PREVIEW && isFinaleIndex(soloIndex));
    if (!done) return;
    void loadAnswers(room.id);
    void loadRatings(room.id);
    void loadLocks(room.id);
    if ((room.host_share || room.guest_share) && !openedBurst.current) {
      openedBurst.current = true;
      window.setTimeout(() => burstChests(), 280);
    }
  }, [room, loadAnswers, loadRatings, loadLocks, soloIndex]);

  function onDraftChange(value: string) {
    setDraft(value);
    const ch = channelRef.current;
    if (!ch) return;
    void ch.track({ typing: true });
    if (typingIdle.current) window.clearTimeout(typingIdle.current);
    typingIdle.current = window.setTimeout(() => {
      void ch.track({ typing: false });
    }, 1100);
  }

  async function join(name: string) {
    await ensureAnonSession();
    const { data, error: rpcError } = await getSupabase().rpc("join_room", {
      p_code: roomCode,
      p_name: name,
    });
    if (rpcError) throw rpcError;
    const row = data as RoomRow;
    setRoom(row);
    setPeek(null);
    bootGuest.current = null;
    setWelcome(true);
    window.setTimeout(() => setWelcome(false), 1800);
    await loadSubmissions(row.id);
    await loadLocks(row.id);
  }

  async function submit(explicit?: string) {
    if (!room || !uid || !question) return;
    const body = (explicit ?? draft).trim();
    if (!body) return;
    if (question.kind === "text" && isEvasiveAnswer(body)) {
      setError(EVASIVE_MESSAGE);
      return;
    }
    setSubmitting(true);
    setError("");
    if (typingIdle.current) window.clearTimeout(typingIdle.current);
    void channelRef.current?.track({ typing: false });
    try {
      const { error: rpcError } = await getSupabase().rpc("submit_answer", {
        p_room_id: room.id,
        p_question_id: question.id,
        p_body: body,
      });
      if (rpcError) throw rpcError;
      setMySaved(body);
      setSubs((prev) => [
        ...prev,
        {
          room_id: room.id,
          player_id: uid,
          question_id: question.id,
          created_at: new Date().toISOString(),
        },
      ]);
      void loadSubmissions(room.id);
      void refreshRoom(room.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cavab getmədi");
    } finally {
      setSubmitting(false);
    }
  }

  async function markReady() {
    if (!room) return;
    const { data, error: rpcError } = await getSupabase().rpc("mark_ready", {
      p_room_id: room.id,
    });
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    if (data) setRoom(data as RoomRow);
  }

  async function sendAnswers() {
    if (!room) return false;
    setSending(true);
    const { data, error: rpcError } = await getSupabase().rpc("send_answers", {
      p_room_id: room.id,
    });
    setSending(false);
    if (rpcError) {
      setError(rpcError.message);
      return false;
    }
    if (data) setRoom(data as RoomRow);
    await loadAnswers(room.id);
    await loadRatings(room.id);
    return true;
  }

  async function shareWhatsApp() {
    if (!room || !uid) return;
    setSharing(true);
    setError("");
    const alreadySent = myShare(room, uid);
    const ok = alreadySent ? true : await sendAnswers();
    if (!ok) {
      setSharing(false);
      return;
    }
    openWhatsAppShare(answersUrl(room.code));
    setSharing(false);
  }

  async function rateAnswer(questionId: string, score: number) {
    if (!room || !uid) return;
    const { error: rpcError } = await getSupabase().rpc("rate_answer", {
      p_room_id: room.id,
      p_question_id: questionId,
      p_score: score,
    });
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setRatings((prev) => {
      const rest = prev.filter((r) => !(r.rater_id === uid && r.question_id === questionId));
      return [
        ...rest,
        { room_id: room.id, rater_id: uid, question_id: questionId, score },
      ];
    });
  }

  async function setAnswerLock(questionId: string, locked: boolean) {
    if (!room || !uid) return;
    setLocks((prev) => {
      const exists = prev.some((l) => l.player_id === uid && l.question_id === questionId);
      if (locked) {
        if (exists) return prev;
        return [
          ...prev,
          {
            room_id: room.id,
            player_id: uid,
            question_id: questionId,
            created_at: new Date().toISOString(),
          },
        ];
      }
      return prev.filter((l) => !(l.player_id === uid && l.question_id === questionId));
    });
    const { error: rpcError } = await getSupabase().rpc("set_answer_lock", {
      p_room_id: room.id,
      p_question_id: questionId,
      p_locked: locked,
    });
    if (rpcError) {
      setError(rpcError.message);
      void loadLocks(room.id);
      return;
    }
    if (!locked) void loadAnswers(room.id);
  }

  if (!hasSupabaseConfig()) {
    return (
      <Shell>
        <SetupScreen
          steps={[
            "supabase.com-da yeni layihə aç",
            "Anonymous sign-ins-i aç",
            "supabase/schema.sql faylını işə sal",
            ".env.local-a açarları yaz",
          ]}
        />
      </Shell>
    );
  }

  if (loading) {
    return (
      <Shell>
        <p className="text-sm text-muted">Otaq açılır…</p>
      </Shell>
    );
  }

  if (error && !room) {
    return (
      <Shell>
        <StatusCard title="Bir şey olmadı" text={error} />
      </Shell>
    );
  }

  if (!room) {
    if (!peek?.exists) {
      return (
        <Shell>
          <StatusCard title="Otaq tapılmadı" text="Kod səhv ola bilər, ya da oyun bağlanıb." />
        </Shell>
      );
    }
    if (peek.full) {
      return (
        <Shell>
          <StatusCard
            title="Otaq doludur"
            text="Bu otaq yalnız iki nəfərlikdir. Üçüncü oyunçu daxil ola bilməz."
          />
        </Shell>
      );
    }
    return (
      <Shell>
        <JoinScreen hostName={peek.host_name ?? "Oyunçu"} onJoin={join} />
      </Shell>
    );
  }

  if (!uid) return null;

  const host = isHost(room, uid);
  const playAsIlkin = iAmIlkin(room, uid);
  const waiting = SOLO_PREVIEW ? false : !room.guest_id || room.status === "waiting";
  const intro = false;
  const rules = false;
  const playing =
    SOLO_PREVIEW ||
    room.status === "playing" ||
    room.status === "intro" ||
    room.status === "rules";
  const finale =
    SOLO_PREVIEW
      ? isFinaleIndex(soloIndex)
      : room.status === "finished" || (playing && isFinaleIndex(room.question_index));
  const iAmReady = myReady(room, uid);
  const theySent = partnerShare(room, uid);
  const iSent = myShare(room, uid);
  const theirId = host ? room.guest_id : room.host_id;
  const ilkinSubmitted = playAsIlkin ? mySubmitted : SOLO_PREVIEW ? mySubmitted : theirSubmitted;
  const fidanSubmitted = playAsIlkin ? (SOLO_PREVIEW ? mySubmitted : theirSubmitted) : mySubmitted;

  return (
    <Shell>
      <AnimatePresence>
        {!SOLO_PREVIEW && welcome && room.guest_name ? <WelcomeOverlay name={room.guest_name} /> : null}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {waiting ? (
          <motion.div key="wait" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <WaitingScreen waitingName={host ? (room.host_name === "İlkin" ? "Fidan" : "İlkin") : room.host_name} />
          </motion.div>
        ) : intro ? (
          <HostsIntro
            key="intro"
            who={playAsIlkin ? "ilkin" : "fidan"}
            hideBack
            busy={iAmReady}
            startLabel={iAmReady ? `${partnerName(room, uid)} gözləyirik…` : undefined}
            onStart={() => void markReady()}
            extra={
              <ReadyPair
                hostName={room.host_name}
                guestName={room.guest_name ?? "Fidan"}
                hostReady={Boolean(room.host_ready)}
                guestReady={Boolean(room.guest_ready)}
              />
            }
          />
        ) : rules ? (
          <RulesScreen
            key="rules"
            hideBack
            busy={iAmReady}
            startLabel={iAmReady ? `${partnerName(room, uid)} gözləyirik…` : "Oyuna başla"}
            onStart={() => void markReady()}
            extra={
              <ReadyPair
                hostName={room.host_name}
                guestName={room.guest_name ?? "Fidan"}
                hostReady={Boolean(room.host_ready)}
                guestReady={Boolean(room.guest_ready)}
              />
            }
          />
        ) : finale ? (
          <motion.div key="finale" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <FinalChests
              myName={roomMyName(room, uid)}
              theirName={
                SOLO_PREVIEW ? (playAsIlkin ? "Fidan" : "İlkin") : partnerName(room, uid)
              }
              myId={uid}
              theirId={theirId}
              iAmHost={host}
              iSent={iSent}
              theySent={theySent}
              answers={answers}
              locks={locks}
              ratings={ratings}
              sending={sending}
              sharing={sharing}
              onSend={() => void sendAnswers()}
              onWhatsApp={() => void shareWhatsApp()}
              onRate={(qid, score) => void rateAnswer(qid, score)}
              onToggleLock={(qid, locked) => void setAnswerLock(qid, locked)}
            />
          </motion.div>
        ) : question ? (
          <motion.div key="play" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <PlayTable
              question={question}
              index={playIndex}
              iAmHost={playAsIlkin}
              hostSubmitted={SOLO_PREVIEW ? ilkinSubmitted : hostSubmitted}
              guestSubmitted={SOLO_PREVIEW ? fidanSubmitted : guestSubmitted}
              hostTyping={hostTyping}
              guestTyping={guestTyping}
              myAnswer={draft}
              submitting={submitting}
              error={error}
              locked={Boolean(
                uid && question && locks.some((l) => l.player_id === uid && l.question_id === question.id),
              )}
              onToggleLock={
                question ? () => void setAnswerLock(question.id, !locks.some((l) => l.player_id === uid && l.question_id === question.id)) : undefined
              }
              onChange={(value) => {
                if (error) setError("");
                onDraftChange(value);
              }}
              onSubmit={(body) => void submit(body)}
            />
            {error ? <p className="mt-4 text-center text-sm text-rose">{error}</p> : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-5xl items-center px-5 py-10">
      <div className="w-full">{children}</div>
    </div>
  );
}
