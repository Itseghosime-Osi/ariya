import React from "react";

/** Up to two initials from a couple's names ("Tolu & Dami" -> "TD"). */
export function monogramOf(text: string): string {
  const parts = text
    .trim()
    .split(/\s*(?:&|and|\+|\/|—|–|-)\s*|\s+/i)
    .map((p) => p.trim())
    .filter((p) => p && /\p{L}/u.test(p));
  if (parts.length >= 2)
    return `${Array.from(parts[0])[0]}${Array.from(parts[1])[0]}`.toUpperCase();
  return (Array.from(parts[0] ?? "À")[0] ?? "À").toUpperCase();
}

/**
 * A wax seal with the couple's monogram pressed in gold: a slightly irregular burgundy disc with a
 * raised rim. Decorative, so it is hidden from screen readers; the names are always written nearby.
 */
export function MonogramSeal({
  text,
  size = 48,
  className = "",
}: {
  text: string;
  size?: number;
  className?: string;
}) {
  const id = React.useId().replace(/:/g, "");
  const letters = monogramOf(text);
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`wax-${id}`} cx="38%" cy="32%" r="75%">
          <stop offset="0" stopColor="#a8283f" />
          <stop offset="0.55" stopColor="#7a1a2c" />
          <stop offset="1" stopColor="#4a0d18" />
        </radialGradient>
        <linearGradient id={`foil-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6dca8" />
          <stop offset="0.5" stopColor="#e9c98a" />
          <stop offset="1" stopColor="#b8864b" />
        </linearGradient>
      </defs>
      <path
        d="M32 3c5 0 7 3 11 4s8 0 10 4 1 7 3 10 5 6 4 11-4 6-4 10 2 8-1 11-7 2-10 4-5 6-10 6-7-3-11-4-8 0-10-4-1-7-3-10-5-6-4-11 4-6 4-10-2-8 1-11 7-2 10-4 5-6 10-6Z"
        fill={`url(#wax-${id})`}
      />
      <circle
        cx="32"
        cy="32"
        r="20.5"
        fill="none"
        stroke="#3d0a14"
        strokeOpacity="0.5"
        strokeWidth="2.2"
      />
      <circle
        cx="32"
        cy="32"
        r="20.5"
        fill="none"
        stroke={`url(#foil-${id})`}
        strokeOpacity="0.55"
        strokeWidth="0.8"
      />
      <text
        x="32"
        y="33"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="var(--font-display), Georgia, serif"
        fontWeight="700"
        fontSize={letters.length > 1 ? 17 : 22}
        fill={`url(#foil-${id})`}
      >
        {letters}
      </text>
    </svg>
  );
}
