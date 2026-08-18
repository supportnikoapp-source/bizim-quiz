"use client";

import { useRef, useState } from "react";
import { isFinaleIndex, questionAt } from "@/data/questions";
import { playerById, type PlayerId } from "@/data/players";
import { burstHearts } from "@/lib/confetti";
import { EVASIVE_MESSAGE, isEvasiveAnswer } from "@/lib/evasive";
import type { AnswerRow } from "@/lib/types";
import { FinalChests } from "@/components/finale/FinalChests";
import { PlayTable } from "./PlayTable";

type Props = {
  who: PlayerId;
};

export function SoloPlay({ who }: Props) {
  const iAmIlkin = who === "ilkin";
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [iSent, setISent] = useState(false);
  const [error, setError] = useState("");
  const [locks, setLocks] = useState<Record<string, boolean>>({});
  const advancing = useRef(false);

  const question = questionAt(index);
  const finale = isFinaleIndex(index);

  function submit(body?: string) {
    if (!question || submitted || advancing.current) return;
    const text = (body ?? draft).trim();
    if (!text) return;
    if (question.kind === "text" && isEvasiveAnswer(text)) {
      setError(EVASIVE_MESSAGE);
      return;
    }
    setError("");
    advancing.current = true;
    setSubmitted(true);
    setAnswers((prev) => ({ ...prev, [question.id]: text }));
    burstHearts();
    window.setTimeout(() => {
      setDraft("");
      setSubmitted(false);
      advancing.current = false;
      setIndex((i) => i + 1);
    }, 700);
  }

  if (finale) {
    const rows: AnswerRow[] = Object.entries(answers).map(([question_id, body]) => ({
      id: question_id,
      room_id: "solo",
      player_id: "me",
      question_id,
      body,
    }));

    return (
      <div className="relative z-10 mx-auto w-full max-w-[430px] px-5 py-10">
        <FinalChests
          myName={playerById(who).name}
          theirName={iAmIlkin ? "Fidan" : "İlkin"}
          myId="me"
          theirId={null}
          iAmHost={iAmIlkin}
          iSent={iSent}
          theySent={false}
          answers={rows}
          locks={Object.entries(locks)
            .filter(([, locked]) => locked)
            .map(([question_id]) => ({
              room_id: "solo",
              player_id: "me",
              question_id,
              created_at: "",
            }))}
          ratings={[]}
          onSend={() => setISent(true)}
          onRate={() => undefined}
          onToggleLock={(qid, locked) => setLocks((prev) => ({ ...prev, [qid]: locked }))}
        />
      </div>
    );
  }

  if (!question) return null;

  return (
    <PlayTable
      question={question}
      index={index}
      iAmHost={iAmIlkin}
      hostSubmitted={submitted}
      guestSubmitted={submitted}
      hostTyping={false}
      guestTyping={false}
      myAnswer={submitted ? answers[question.id] ?? draft : draft}
      submitting={false}
      error={error}
      locked={Boolean(question && locks[question.id])}
      onToggleLock={
        question ? () => setLocks((prev) => ({ ...prev, [question.id]: !prev[question.id] })) : undefined
      }
      onChange={(value) => {
        setError("");
        setDraft(value);
      }}
      onSubmit={submit}
    />
  );
}
