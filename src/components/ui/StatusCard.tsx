"use client";

type Props = {
  title: string;
  text: string;
};

export function StatusCard({ title, text }: Props) {
  return (
    <div className="mx-auto w-full max-w-md text-center">
      <p className="mb-3 text-[11px] uppercase tracking-[0.28em] text-gold">
        bizim otaq
      </p>
      <h1 className="font-serif text-4xl leading-tight">{title}</h1>
      <p className="mt-4 text-[15.5px] font-light leading-relaxed text-muted">{text}</p>
    </div>
  );
}
