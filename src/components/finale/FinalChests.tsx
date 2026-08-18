"use client";

import { motion } from "framer-motion";
import { QUESTIONS, type Question } from "@/data/questions";
import type { AnswerLockRow, AnswerRow, RatingRow } from "@/lib/types";
import { LockToggle } from "@/components/ui/LockToggle";

type Props = {
  myName: string;
  theirName: string;
  myId: string;
  theirId: string | null;
  iAmHost: boolean;
  iSent: boolean;
  theySent: boolean;
  answers: AnswerRow[];
  locks: AnswerLockRow[];
  ratings: RatingRow[];
  sending?: boolean;
  onSend: () => void;
  onRate: (questionId: string, score: number) => void;
  onToggleLock: (questionId: string, locked: boolean) => void;
};

export function FinalChests({
  myName,
  theirName,
  myId,
  theirId,
  iAmHost,
  iSent,
  theySent,
  answers,
  locks,
  ratings,
  sending,
  onSend,
  onRate,
  onToggleLock,
}: Props) {
  function textFor(playerId: string, questionId: string) {
    return answers.find((a) => a.player_id === playerId && a.question_id === questionId)?.body ?? "—";
  }

  function promptFor(q: Question, forHost: boolean) {
    return forHost ? q.ilkin : q.fidan;
  }

  function labelFor(q: Question, value: string) {
    if (q.kind !== "choice" || !q.options) return value;
    return q.options.find((o) => o.id === value)?.label ?? value;
  }

  function isLocked(playerId: string | null, questionId: string) {
    if (!playerId) return false;
    return locks.some((l) => l.player_id === playerId && l.question_id === questionId);
  }

  function scoreBy(raterId: string, questionId: string) {
    return ratings.find((r) => r.rater_id === raterId && r.question_id === questionId)?.score ?? 0;
  }

  const visibleQuestions = QUESTIONS.filter((q) => q.kind !== "message");

  return (
    <div className="mx-auto w-full max-w-[430px] text-center">
      <p className="text-[11px] uppercase tracking-[0.28em] text-gold">final</p>
      <h1 className="mt-3 font-serif text-4xl leading-tight">Cavablar.</h1>
      <p className="mt-3 text-[15px] font-light text-muted">
        İstəsən cavablarını göndər. Kilidli cavablar qarşı tərəfə görünməz.
      </p>

      <div className="mt-8 flex items-end justify-center gap-10">
        <ChestColumn name={myName} open={iSent} />
        <span className="pulse-heart mb-10 text-3xl text-rose">♥</span>
        <ChestColumn name={theirName} open={theySent} />
      </div>

      <div className="mx-auto mt-6 max-w-sm">
        {iSent ? (
          <p className="text-sm text-[#2ec4c8]">{theirName} sənin cavablarına baxa bilər.</p>
        ) : (
          <button className="btn" type="button" disabled={sending} onClick={onSend}>
            {sending ? "Göndərilir…" : "Cavablarımı göndər"}
          </button>
        )}
        {!theySent ? (
          <p className="mt-3 text-sm text-muted">{theirName} hələ göndərməyib.</p>
        ) : null}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-8 space-y-6 text-left"
      >
        <section>
          <h2 className="mb-3 font-serif text-2xl">Mənim cavablarım</h2>
          {visibleQuestions.map((q) => {
            const locked = isLocked(myId, q.id);
            return (
            <article key={`me-${q.id}`} className="mb-3 rounded-[22px] bg-white px-4 py-3 shadow-[0_8px_20px_rgba(40,36,80,0.06)]">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 text-[13px] text-[#8b90a5]">{promptFor(q, iAmHost)}</p>
                <LockToggle
                  locked={locked}
                  onToggle={() => onToggleLock(q.id, !locked)}
                />
              </div>
              <p className="mt-1 whitespace-pre-wrap text-[15px]">{labelFor(q, textFor(myId, q.id))}</p>
              {iSent ? (
                <Stars value={scoreBy(theirId ?? "", q.id)} readOnly />
              ) : (
                <p className="mt-2 text-[12px] text-[#9ca3af]">Göndərəndən sonra qiymət gələcək.</p>
              )}
            </article>
            );
          })}
        </section>

        <section>
          <h2 className="mb-3 font-serif text-2xl">{theirName} — cavablar</h2>
          {!theySent ? (
            <p className="rounded-[22px] bg-white px-4 py-5 text-sm text-muted">
              Göndərəndə burada açılacaq.
            </p>
          ) : (
            visibleQuestions.map((q) => {
              const locked = isLocked(theirId, q.id);
              return (
              <article key={`them-${q.id}`} className="mb-3 rounded-[22px] bg-white px-4 py-3 shadow-[0_8px_20px_rgba(40,36,80,0.06)]">
                <p className="text-[13px] text-[#8b90a5]">{promptFor(q, !iAmHost)}</p>
                {locked ? (
                  <p className="mt-2 text-[15px] font-medium text-[#1b2448]">🔒 Kilidli — o açanda görünəcək</p>
                ) : (
                  <>
                    <p className="mt-1 whitespace-pre-wrap text-[15px]">
                      {theirId ? labelFor(q, textFor(theirId, q.id)) : "—"}
                    </p>
                    <Stars value={scoreBy(myId, q.id)} onPick={(n) => onRate(q.id, n)} />
                  </>
                )}
              </article>
              );
            })
          )}
        </section>
      </motion.div>
    </div>
  );
}

function Stars({
  value,
  onPick,
  readOnly,
}: {
  value: number;
  onPick?: (n: number) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="mt-2 flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => onPick?.(n)}
          className={`text-xl leading-none ${n <= value ? "text-[#f0a04b]" : "text-[#d1d5db]"} ${readOnly ? "cursor-default" : ""}`}
          aria-label={`${n}`}
        >
          ★
        </button>
      ))}
      {value > 0 ? <span className="ml-1 text-[12px] text-[#8b90a5]">{value}/5</span> : null}
    </div>
  );
}

function ChestColumn({ name, open }: { name: string; open: boolean }) {
  return (
    <div>
      <div className={`chest mx-auto ${open ? "open" : ""}`}>
        <div className="chest-glow" />
        <div className="chest-lid" />
        <div className="chest-body" />
      </div>
      <p className="mt-3 text-sm text-gold">{name}</p>
    </div>
  );
}
