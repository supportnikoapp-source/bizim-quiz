import confetti from "canvas-confetti";

export function burstHearts(): void {
  const colors = ["#b7a4e8", "#e2d0b0", "#ffffff", "#c4a574", "#f3d5d8"];
  confetti({
    particleCount: 56,
    spread: 72,
    startVelocity: 34,
    ticks: 160,
    origin: { y: 0.52, x: 0.5 },
    colors,
    scalar: 0.9,
  });
  confetti({
    particleCount: 24,
    spread: 110,
    startVelocity: 22,
    ticks: 140,
    origin: { y: 0.48, x: 0.5 },
    colors,
    scalar: 0.7,
  });
}

export function burstChests(): void {
  const colors = ["#e3c9a0", "#f6ece4", "#e8a3a8", "#d4a017"];
  confetti({
    particleCount: 80,
    spread: 86,
    startVelocity: 38,
    ticks: 180,
    origin: { y: 0.42, x: 0.5 },
    colors,
  });
}
