"use client";

import { AnimatePresence, motion } from "framer-motion";
import { PLAYERS } from "@/data/players";
import { QUESTIONS, type Question } from "@/data/questions";
import { AnswerCard } from "./AnswerCard";
import { BlessingBoard } from "./BlessingBoard";
import { ChoiceBoard } from "./ChoiceBoard";

type Props = {
  question: Question;
  index: number;
  iAmHost: boolean;
  hostSubmitted: boolean;
  guestSubmitted: boolean;
  hostTyping: boolean;
  guestTyping: boolean;
  myAnswer: string;
  submitting: boolean;
  error?: string;
  locked?: boolean;
  onToggleLock?: () => void;
  onChange: (value: string) => void;
  onSubmit: (body?: string) => void;
};

export function PlayTable({
  question,
  index,
  iAmHost,
  hostSubmitted,
  guestSubmitted,
  hostTyping,
  guestTyping,
  myAnswer,
  submitting,
  error,
  locked,
  onToggleLock,
  onChange,
  onSubmit,
}: Props) {
  const total = QUESTIONS.length;
  const progress = (index + (hostSubmitted && guestSubmitted ? 1 : 0)) / total;
  const ilkin = PLAYERS[0];
  const fidan = PLAYERS[1];

  return (
    <div className="fixed inset-0 z-10 overflow-y-auto bg-[#f3f4f6]">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col px-4 py-6">
        <p className="mb-4 text-center text-[12px] font-medium tracking-[0.18em] text-[#9ca3af]">
          {index + 1} / {total}
        </p>

        <AnimatePresence mode="wait">
          <motion.div
            key={question.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.28 }}
            className="flex flex-1 flex-col"
          >
            {question.kind === "choice" && question.options ? (
              <ChoiceBoard
                question={question.ilkin}
                options={question.options}
                iAmHost={iAmHost}
                hostSubmitted={hostSubmitted}
                guestSubmitted={guestSubmitted}
                hostTyping={hostTyping}
                guestTyping={guestTyping}
                myAnswer={myAnswer}
                submitting={submitting}
                progress={progress}
                locked={locked}
                onToggleLock={onToggleLock}
                onChange={onChange}
                onSubmit={() => onSubmit()}
              />
            ) : question.kind === "message" ? (
              <BlessingBoard
                message={question.ilkin}
                iAmHost={iAmHost}
                hostSubmitted={hostSubmitted}
                guestSubmitted={guestSubmitted}
                submitting={submitting}
                onSubmit={onSubmit}
              />
            ) : (
              <div className="flex flex-col gap-4">
                <AnswerCard
                  name={ilkin.name}
                  image={ilkin.image}
                  theme="blue"
                  question={question.ilkin}
                  mine={iAmHost}
                  submitted={hostSubmitted}
                  typing={!iAmHost && hostTyping}
                  value={iAmHost ? myAnswer : ""}
                  busy={iAmHost && submitting}
                  progress={progress}
                  error={iAmHost ? error : undefined}
                  locked={iAmHost ? locked : undefined}
                  onToggleLock={iAmHost ? onToggleLock : undefined}
                  onChange={iAmHost ? onChange : undefined}
                  onSubmit={iAmHost ? () => onSubmit() : undefined}
                />
                <AnswerCard
                  name={fidan.name}
                  image={fidan.image}
                  theme="purple"
                  question={question.fidan}
                  mine={!iAmHost}
                  submitted={guestSubmitted}
                  typing={iAmHost && guestTyping}
                  value={!iAmHost ? myAnswer : ""}
                  busy={!iAmHost && submitting}
                  progress={progress}
                  error={!iAmHost ? error : undefined}
                  locked={!iAmHost ? locked : undefined}
                  onToggleLock={!iAmHost ? onToggleLock : undefined}
                  onChange={!iAmHost ? onChange : undefined}
                  onSubmit={!iAmHost ? () => onSubmit() : undefined}
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
