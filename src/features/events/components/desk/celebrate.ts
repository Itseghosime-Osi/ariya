/**
 * A burst of rings, glasses and gold leaf, once per real milestone. canvas-confetti loads only on the
 * first celebration, runs in a worker, and stays still for anyone who prefers reduced motion.
 * Never naira: spraying money is an offence under the CBN Act, so the celebration is gold, not cash.
 */
const KEY = "ariya-celebrated";

function seen(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) || "[]") as string[]);
  } catch {
    return new Set();
  }
}

/** Returns true the first time a milestone is reached (and remembers it); false after that. */
export function claimMilestone(id: string): boolean {
  const s = seen();
  if (s.has(id)) return false;
  s.add(id);
  try {
    localStorage.setItem(KEY, JSON.stringify([...s].slice(-200)));
  } catch {
    /* celebrate anyway, just not remembered */
  }
  return true;
}

export async function celebrate(
  origin: { x: number; y: number } = { x: 0.5, y: 0.35 }
) {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  try {
    const confetti = (await import("canvas-confetti")).default;
    const shapes = ["💍", "🥂", "✨"].map((text) =>
      confetti.shapeFromText({ text, scalar: 2 })
    );
    const shared = { origin, disableForReducedMotion: true, zIndex: 80 };
    confetti({
      ...shared,
      particleCount: 70,
      spread: 75,
      startVelocity: 38,
      colors: ["#e9c98a", "#f6dca8", "#c1283d", "#6e1426", "#f4efe6"],
      ticks: 220,
    });
    confetti({
      ...shared,
      particleCount: 18,
      spread: 100,
      startVelocity: 30,
      shapes,
      scalar: 2,
      flat: true,
      ticks: 240,
    });
  } catch {
    /* a missed celebration is fine */
  }
}
