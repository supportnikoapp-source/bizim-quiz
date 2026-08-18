"use client";

export function Ambient() {
  return (
    <>
      <div className="glow glow-a" />
      <div className="glow glow-b" />
      <div className="dots-grid" />
      <div className="grain" />
      <div className="pointer-events-none fixed inset-0 z-[2] overflow-hidden" aria-hidden>
        {Array.from({ length: 10 }).map((_, i) => (
          <span
            key={i}
            className="float-heart"
            style={{
              left: `${8 + i * 9}%`,
              animationDuration: `${7 + (i % 5)}s`,
              animationDelay: `${i * 0.35}s`,
              fontSize: `${11 + (i % 4) * 4}px`,
            }}
          >
            {i % 3 === 0 ? "✦" : "♥"}
          </span>
        ))}
      </div>
    </>
  );
}
