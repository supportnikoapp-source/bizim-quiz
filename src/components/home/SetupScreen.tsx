"use client";

type Props = {
  steps: string[];
};

export function SetupScreen({ steps }: Props) {
  return (
    <div className="mx-auto w-full max-w-md">
      <p className="mb-3 text-[11px] uppercase tracking-[0.28em] text-gold">quraşdırma</p>
      <h1 className="font-serif text-4xl leading-tight">
        Supabase <em className="italic text-rose">açarları</em>
      </h1>
      <p className="mt-4 mb-6 text-[15px] font-light leading-relaxed text-muted">
        Oyun real-time üçün Supabase-ə bağlıdır. `env.example` faylına bax.
      </p>
      <ol className="space-y-3 text-left text-sm leading-relaxed text-muted">
        {steps.map((step, i) => (
          <li key={i} className="rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-3">
            <span className="mr-2 text-gold">{i + 1}.</span>
            {step}
          </li>
        ))}
      </ol>
    </div>
  );
}
