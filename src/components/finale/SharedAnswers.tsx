"use client";

import { useEffect, useState } from "react";
import { QUESTIONS, type Question } from "@/data/questions";
import { normalizeCode } from "@/lib/codes";
import { ensureAnonSession, getSupabase } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import type { SharedAnswersView } from "@/lib/types";
import { StatusCard } from "@/components/ui/StatusCard";

type Props = {
  code: string;
};

export function SharedAnswers({ code }: Props) {
  const roomCode = normalizeCode(code);
  const [data, setData] = useState<SharedAnswersView | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasSupabaseConfig()) {
      setError("Supabase açarı yoxdur");
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        await ensureAnonSession();
        const { data: row, error: rpcError } = await getSupabase().rpc("view_shared_answers", {
          p_code: roomCode,
        });
        if (rpcError) throw rpcError;
        if (!cancelled) setData(row as SharedAnswersView);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Cavablar açılmadı");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [roomCode]);

  if (loading) {
    return <p className="text-center text-sm text-muted">Cavablar açılır…</p>;
  }

  if (error) {
    return <StatusCard title="Bir şey olmadı" text={error} />;
  }

  if (!data?.exists) {
    return <StatusCard title="Tapılmadı" text="Bu linkdə cavab yoxdur." />;
  }

  const questions = QUESTIONS.filter((q) => q.kind !== "message");
  const hostName = data.host_name ?? "İlkin";
  const guestName = data.guest_name ?? "Fidan";
  const ilkinIsHost = hostName === "İlkin";

  return (
    <div className="mx-auto w-full max-w-[430px] px-4 py-10 text-left">
      <p className="text-center text-[11px] uppercase tracking-[0.28em] text-gold">final</p>
      <h1 className="mt-3 text-center font-serif text-4xl leading-tight">Cavablar.</h1>
      <p className="mt-3 text-center text-[15px] font-light text-muted">
        {hostName} və {guestName}
      </p>

      <PlayerSection
        name="İlkin"
        sent={ilkinIsHost ? Boolean(data.host_share) : Boolean(data.guest_share)}
        questions={questions}
        forIlkin
        answers={data.answers ?? []}
      />
      <PlayerSection
        name="Fidan"
        sent={ilkinIsHost ? Boolean(data.guest_share) : Boolean(data.host_share)}
        questions={questions}
        forIlkin={false}
        answers={data.answers ?? []}
      />
    </div>
  );
}

function PlayerSection({
  name,
  sent,
  questions,
  forIlkin,
  answers,
}: {
  name: string;
  sent: boolean;
  questions: Question[];
  forIlkin: boolean;
  answers: NonNullable<SharedAnswersView["answers"]>;
}) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 font-serif text-2xl">{name} — cavablar</h2>
      {!sent ? (
        <p className="rounded-[22px] bg-white px-4 py-5 text-sm text-muted">Hələ göndərilməyib.</p>
      ) : (
        questions.map((q) => {
          const row = answers.find((a) => a.question_id === q.id && a.player_name === name);
          const prompt = forIlkin ? q.ilkin : q.fidan;
          const body = labelFor(q, row?.body ?? "");
          return (
            <article
              key={`${name}-${q.id}`}
              className="mb-3 rounded-[22px] bg-white px-4 py-3 shadow-[0_8px_20px_rgba(40,36,80,0.06)]"
            >
              <p className="text-[13px] text-[#8b90a5]">{prompt}</p>
              {row?.locked ? (
                <p className="mt-2 text-[15px] font-medium text-[#1b2448]">🔒 Kilidli</p>
              ) : (
                <p className="mt-1 whitespace-pre-wrap text-[15px]">{body || "—"}</p>
              )}
            </article>
          );
        })
      )}
    </section>
  );
}

function labelFor(q: Question, value: string) {
  if (!value) return "";
  if (q.kind !== "choice" || !q.options) return value;
  return q.options.find((o) => o.id === value)?.label ?? value;
}
