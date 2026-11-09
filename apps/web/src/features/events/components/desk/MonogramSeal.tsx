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
 * A wax seal with the couple's monogram pressed in gold or contrasting foil: a slightly irregular disc
 * with a raised rim. Automatically adapts color to guarantee maximum contrast against dark backgrounds
 * (e.g. shifts to radiant champagne gold on dark velvet / deep colors, or house burgundy on light paper).
 */
export function MonogramSeal({
  text,
  size = 48,
  className = "",
  contrastWithDark = false,
  waxColor,
}: {
  text: string;
  size?: number | string;
  className?: string;
  contrastWithDark?: boolean;
  waxColor?: string | null;
}) {
  const id = React.useId().replace(/:/g, "");
  const letters = monogramOf(text);

  // Gradient stops based on background contrast or custom wax color
  const isGoldWax = contrastWithDark && (!waxColor || waxColor === "auto");
  const waxLight = isGoldWax ? "#faeccc" : waxColor ? waxColor : "#a8283f";
  const waxMid = isGoldWax ? "#dfba73" : waxColor ? waxColor : "#7a1a2c";
  const waxDark = isGoldWax ? "#966c2d" : waxColor ? waxColor : "#4a0d18";

  const letterFill = isGoldWax ? "#3d0813" : `url(#foil-${id})`;
  const rimStroke = isGoldWax ? "#75501b" : "#3d0a14";

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
          <stop offset="0" stopColor={waxLight} />
          <stop offset="0.55" stopColor={waxMid} />
          <stop offset="1" stopColor={waxDark} />
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
        stroke={rimStroke}
        strokeOpacity="0.5"
        strokeWidth="2.2"
      />
      <circle
        cx="32"
        cy="32"
        r="20.5"
        fill="none"
        stroke={isGoldWax ? "#fcf6e8" : `url(#foil-${id})`}
        strokeOpacity={isGoldWax ? "0.7" : "0.55"}
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
        fill={letterFill}
      >
        {letters}
      </text>
    </svg>
  );
}
