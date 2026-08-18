"use client";

import { LockToggle } from "@/components/ui/LockToggle";
import { PlayerPhoto } from "@/components/ui/PlayerPhoto";

type Theme = "blue" | "purple";

const THEMES: Record<
  Theme,
  { bar: string; icon: string; border: string; button: string; soft: string }
> = {
  blue: {
    bar: "bg-[#3b82f6]",
    icon: "bg-[#3b82f6]",
    border: "border-[#bfdbfe]",
    button: "bg-[#3b82f6]",
    soft: "bg-[#eff6ff]",
  },
  purple: {
    bar: "bg-[#8b6cf7]",
    icon: "bg-[#8b6cf7]",
    border: "border-[#ddd6fe]",
    button: "bg-[#8b6cf7]",
    soft: "bg-[#f5f3ff]",
  },
};

type Props = {
  name: string;
  image: string;
  theme: Theme;
  question: string;
  mine: boolean;
  submitted: boolean;
  typing: boolean;
  value: string;
  busy?: boolean;
  progress: number;
  error?: string;
  locked?: boolean;
  onToggleLock?: () => void;
  onChange?: (value: string) => void;
  onSubmit?: () => void;
};

export function AnswerCard({
  name,
  image,
  theme,
  question,
  mine,
  submitted,
  typing,
  value,
  busy,
  progress,
  error,
  locked,
  onToggleLock,
  onChange,
  onSubmit,
}: Props) {
  const t = THEMES[theme];
  const status = submitted ? "hazırdı" : typing ? "yazır..." : null;

  return (
    <article className={`rounded-[26px] bg-white p-4 shadow-[0_10px_28px_rgba(30,40,80,0.07)] ${t.soft}`}>
      <div className="mb-3 flex items-center gap-3">
        <div className="h-12 w-12 overflow-hidden rounded-full ring-2 ring-white">
          <PlayerPhoto
            src={image}
            alt={name}
            size={48}
            className="h-full w-full object-cover"
            style={{ objectPosition: "50% 18%" }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h2 className="truncate text-[22px] font-bold text-[#111827]">{name}</h2>
            <span className={`h-1 w-16 rounded-full ${t.bar} opacity-80`} />
          </div>
          {status ? (
            <p className={`text-[13px] font-medium ${theme === "blue" ? "text-[#3b82f6]" : "text-[#8b6cf7]"}`}>
              {status}
              {status === "yazır..." ? <span className="typing-dots" /> : null}
            </p>
          ) : (
            <p className="text-[13px] text-[#9ca3af]">&nbsp;</p>
          )}
        </div>
      </div>

      <div className="mb-3 flex items-start gap-2">
        <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white ${t.icon}`}>
          ?
        </span>
        <p className="min-w-0 flex-1 text-[15px] font-semibold leading-snug text-[#111827]">{question}</p>
        {mine && onToggleLock ? (
          <LockToggle locked={Boolean(locked)} onToggle={onToggleLock} />
        ) : null}
      </div>

      {mine && !submitted ? (
        <>
          <div className="relative">
            <textarea
              className={`min-h-[110px] w-full resize-none rounded-2xl border-2 bg-white px-3 py-3 text-[15px] leading-relaxed text-[#111827] outline-none ${t.border}`}
              value={value}
              maxLength={500}
              placeholder="Cavabını buraya yaz..."
              onChange={(e) => onChange?.(e.target.value)}
            />
            <span className="pointer-events-none absolute right-3 bottom-3 text-[11px] text-[#9ca3af]">
              {value.length}/500
            </span>
          </div>
          <button
            type="button"
            disabled={busy || !value.trim()}
            onClick={onSubmit}
            className={`mt-3 min-h-[46px] w-full rounded-xl text-[15px] font-semibold text-white disabled:opacity-50 ${t.button}`}
          >
            {busy ? "Göndərilir…" : "Tamamdır"}
          </button>
          {error ? <p className="mt-2 text-[13px] font-medium leading-snug text-[#e0566b]">{error}</p> : null}
        </>
      ) : (
        <div className={`flex min-h-[110px] items-center justify-center rounded-2xl border-2 border-dashed bg-white ${t.border}`}>
          <p className={`text-[15px] font-medium ${theme === "blue" ? "text-[#3b82f6]" : "text-[#8b6cf7]"}`}>
            {submitted ? "hazırdı" : typing ? "yazır..." : "Cavab gizlidir"}
          </p>
        </div>
      )}

      <div className="mt-3 h-1 overflow-hidden rounded-full bg-black/5">
        <div
          className={`h-full rounded-full ${t.bar} transition-[width] duration-300`}
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
    </article>
  );
}
