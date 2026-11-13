/**
 * A wax-seal outline: a scalloped edge round an inner ring. It is the studio's one brand motif,
 * drawn in the colour of the text around it (currentColor), so a caller sets the tone and the
 * strength with a text colour and opacity. Decorative only.
 */
export function SealOutline({
  className,
  size = 56,
}: {
  className?: string;
  size?: number;
}) {
  // 16 scallops: small circles around the rim read as a stamped edge.
  const bumps = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    return { x: 32 + Math.cos(a) * 25, y: 32 + Math.sin(a) * 25 };
  });
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={className}
    >
      {bumps.map((b, i) => (
        <circle key={i} cx={b.x} cy={b.y} r="5" />
      ))}
      <circle cx="32" cy="32" r="17" />
      <path d="M26 39 L32 24 L38 39 M28.5 34 H35.5" strokeLinecap="round" />
    </svg>
  );
}
