"use client";

import { useId } from "react";

// Fine invitation cards, drawn in SVG gold foil on coloured stock. Ported from
// public/site/assets/fine-card.js; the .fc styles live in styles/site/ariya.css.

function svgId(raw: string, prefix: string) {
  return prefix + raw.replace(/[^a-zA-Z0-9]/g, "");
}

function Foil({ id }: { id: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#9c7432" />
      <stop offset=".3" stopColor="#f3dca4" />
      <stop offset=".5" stopColor="#b98c42" />
      <stop offset=".72" stopColor="#f8e7bb" />
      <stop offset="1" stopColor="#8f6a2c" />
    </linearGradient>
  );
}

// One corner, drawn for the top-left and mirrored into the other three.
function Corner({ id }: { id: string }) {
  return (
    <g id={id} fill="none" strokeLinecap="round">
      <path d="M16 78 V30 Q16 16 30 16 H78" strokeWidth="1.1" />
      <path d="M23 62 Q23 23 62 23" strokeWidth=".6" />
      <path
        d="M78 16 c11 0 15 9 9.5 14 c-4.5 4 -10.5 0 -7.2 -4.2"
        strokeWidth=".8"
      />
      <path
        d="M16 78 c0 11 9 15 14 9.5 c4 -4.5 0 -10.5 -4.2 -7.2"
        strokeWidth=".8"
      />
      <g transform="translate(41 41)" strokeWidth=".85">
        <path d="M0 0 c2.5 -3 7 -2 7 1.5 c0 4.5 -6.5 6 -9 2.5 c-2.5 -4.5 2 -10 7.5 -9.5 c7 .8 9.5 8.5 5 13 c-5.5 5.5 -15 3 -16.5 -4.5 c-1.6 -8.5 6 -15.5 14.5 -14" />
        <path d="M-12 -1 c-2.5 -9.5 6 -16.5 15 -14.5" />
        <path d="M13 9 c4.5 6.5 -1 13 -9 11.5" />
        <path d="M-8 9 c-3 4 -1 8 3 9" />
      </g>
      <path d="M54 29 q12 -7 23 1.5 q-12 7 -23 -1.5z" strokeWidth=".7" />
      <path d="M58 29.8 h14" strokeWidth=".45" />
      <path d="M29 54 q-7 12 1.5 23 q7 -12 -1.5 -23z" strokeWidth=".7" />
      <path d="M29.8 58 v14" strokeWidth=".45" />
      <path d="M62 40 q9 -1 12 6 q-8 1 -12 -6z" strokeWidth=".6" />
      <path d="M40 62 q-1 9 6 12 q1 -8 -6 -12z" strokeWidth=".6" />
      <circle cx="86" cy="16" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="16" cy="86" r="1.3" fill="currentColor" stroke="none" />
    </g>
  );
}

function Ornament({ uid }: { uid: string }) {
  const foil = svgId(uid, "fcf");
  const corner = svgId(uid, "fcc");
  return (
    <svg
      className="fc-orn"
      viewBox="0 0 300 420"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <Foil id={foil} />
        <Corner id={corner} />
      </defs>
      <g stroke={`url(#${foil})`} color="#e7c98d" fill="none">
        <rect
          x="8.5"
          y="8.5"
          width="283"
          height="403"
          rx="1.5"
          strokeWidth="1.5"
        />
        <rect x="12.5" y="12.5" width="275" height="395" strokeWidth=".5" />
        <use href={`#${corner}`} />
        <use href={`#${corner}`} transform="translate(300 0) scale(-1 1)" />
        <use href={`#${corner}`} transform="translate(0 420) scale(1 -1)" />
        <use href={`#${corner}`} transform="translate(300 420) scale(-1 -1)" />
        <path d="M135 12.5 l15 -5 l15 5" strokeWidth=".7" />
        <path d="M135 407.5 l15 5 l15 -5" strokeWidth=".7" />
      </g>
    </svg>
  );
}

function Wreath({ uid, initials }: { uid: string; initials?: string }) {
  const foil = svgId(uid, "fcw");
  const leaves: React.ReactElement[] = [];
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + Math.PI / 26;
    // a small gap at the bottom, like a real laurel
    if (Math.abs(Math.sin(a)) > 0.97 && Math.cos(a) < 0.3 && Math.sin(a) > 0) {
      continue;
    }
    const x = Math.cos(a) * 26;
    const y = Math.sin(a) * 26;
    const deg = (a * 180) / Math.PI + 90 + (i % 2 ? 28 : -28);
    leaves.push(
      <ellipse
        key={i}
        cx={x.toFixed(2)}
        cy={y.toFixed(2)}
        rx="4.4"
        ry="1.5"
        transform={`rotate(${deg.toFixed(1)} ${x.toFixed(2)} ${y.toFixed(2)})`}
      />
    );
  }
  const parts = (initials || "C T").split(" ");
  return (
    <svg
      className="fc-wreath"
      viewBox="-34 -34 68 68"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <Foil id={foil} />
      </defs>
      <g fill="none" stroke={`url(#${foil})`} strokeWidth=".7">
        {leaves}
        <circle r="19.5" strokeWidth=".5" />
      </g>
      <g
        fill={`url(#${foil})`}
        fontFamily="Cinzel, Georgia, serif"
        fontSize="13"
        textAnchor="middle"
      >
        <text x="-7.5" y="4.6">
          {parts[0]}
        </text>
        <text x="7.5" y="4.6">
          {parts[1] || ""}
        </text>
      </g>
      <path d="M0 -8 V8" stroke={`url(#${foil})`} strokeWidth=".6" />
    </svg>
  );
}

function Rule({ uid }: { uid: string }) {
  const foil = svgId(uid, "fcr");
  return (
    <svg
      className="fc-rule"
      viewBox="0 0 120 10"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <Foil id={foil} />
      </defs>
      <g stroke={`url(#${foil})`} fill="none" strokeWidth=".7">
        <path d="M4 5 H50 M70 5 H116" />
        <path d="M60 1 l4 4 l-4 4 l-4 -4z" fill={`url(#${foil})`} />
        <circle cx="52.5" cy="5" r=".9" fill={`url(#${foil})`} />
        <circle cx="67.5" cy="5" r=".9" fill={`url(#${foil})`} />
      </g>
    </svg>
  );
}

function TableChart({
  uid,
  used,
  cap,
  mine,
}: {
  uid: string;
  used: number;
  cap: number;
  mine?: boolean;
}) {
  const foil = svgId(uid, "fct");
  const seats: React.ReactElement[] = [];
  for (let i = 0; i < cap; i++) {
    const a = -Math.PI / 2 + (i / cap) * Math.PI * 2;
    const x = Math.cos(a) * 44;
    const y = Math.sin(a) * 44;
    const taken = i < used;
    const me = !!mine && i === used - 1;
    seats.push(
      <circle
        key={i}
        cx={x.toFixed(1)}
        cy={y.toFixed(1)}
        r={me ? 9 : 7.5}
        fill={me ? `url(#${foil})` : taken ? "rgba(233,201,138,.35)" : "none"}
        stroke={`url(#${foil})`}
        strokeWidth={taken ? 1 : 0.7}
        strokeDasharray={taken ? undefined : "2 2"}
      />
    );
  }
  return (
    <svg
      className="fc-table"
      viewBox="-60 -60 120 120"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <Foil id={foil} />
      </defs>
      <circle r="27" fill="none" stroke={`url(#${foil})`} strokeWidth="1.2" />
      <circle r="23" fill="none" stroke={`url(#${foil})`} strokeWidth=".5" />
      {seats}
    </svg>
  );
}

const DEFAULT_COTD: ReadonlyArray<readonly [string, string]> = [
  ["#5a1428", "Burgundy"],
  ["#a3402a", "Coral"],
  ["#f3ead8", "Ivory"],
];

export type InvitationVariant = "wine" | "ivory" | "ruby" | "coral" | "auto";

export type InvitationCardProps = {
  variant?: InvitationVariant;
  a?: string;
  b?: string;
  aSub?: string;
  bSub?: string;
  guest?: string;
  date?: string;
  venue?: ReadonlyArray<string>;
  initials?: string;
  cotd?: ReadonlyArray<readonly [string, string]>;
  noCotd?: boolean;
  label?: string;
  className?: string;
};

export function InvitationCard({
  variant = "wine",
  a = "Chidinma",
  b = "Tunde",
  aSub,
  bSub,
  guest,
  date = "Saturday, 12 December 2026",
  venue = ["The Grand Pavilion", "Victoria Island, Lagos"],
  initials,
  cotd = DEFAULT_COTD,
  noCotd,
  label,
  className,
}: InvitationCardProps) {
  const uid = useId();
  return (
    <div
      className={`fc fc--${variant}${className ? ` ${className}` : ""}`}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      <Ornament uid={uid} />
      <div className="fc-body" aria-hidden={label ? "true" : undefined}>
        <Wreath uid={svgId(uid, "w")} initials={initials} />
        <p className="fc-caps">Together with their families</p>
        <p className="fc-script fc-foil">{a}</p>
        {aSub ? <p className="fc-sub">{aSub}</p> : null}
        <p className="fc-amp fc-foil">&amp;</p>
        <p className="fc-script fc-foil">{b}</p>
        {bSub ? <p className="fc-sub">{bSub}</p> : null}
        {guest ? (
          <p className="fc-line">
            joyfully invite <span className="fc-guest fc-foil">{guest}</span>to
            celebrate their wedding
          </p>
        ) : (
          <p className="fc-line">
            joyfully invite you to celebrate their wedding
          </p>
        )}
        <Rule uid={svgId(uid, "r")} />
        <p className="fc-date">{date}</p>
        <p className="fc-venue">
          {venue.map((line, i) => (
            <span key={line}>
              {i > 0 ? <br /> : null}
              {line}
            </span>
          ))}
        </p>
        {noCotd ? null : (
          <>
            <p className="fc-caps" style={{ marginTop: "1.4cqw" }}>
              Colour of the day
            </p>
            <div className="fc-cotd">
              {cotd.map(([colour, name]) => (
                <i
                  key={name}
                  style={{ "--c": colour } as React.CSSProperties}
                  title={name}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function PlaceCard({
  variant = "ivory",
  name,
  table,
  used,
  cap,
  initials,
}: {
  variant?: InvitationVariant;
  name: string;
  table: string;
  used: number;
  cap: number;
  initials?: string;
}) {
  const uid = useId();
  return (
    <div className={`fc fc--${variant} fc-place`}>
      <Ornament uid={svgId(uid, "o")} />
      <div className="fc-body">
        <Wreath uid={svgId(uid, "w")} initials={initials} />
        <p className="fc-caps">Your seat</p>
        <p className="fc-script fc-foil">{name}</p>
        <Rule uid={svgId(uid, "r")} />
        <p className="fc-date fc-tablename">{table}</p>
        <TableChart uid={svgId(uid, "t")} used={used} cap={cap} mine />
        <p className="fc-venue">
          {used} of {cap} seats filled{used >= cap ? " · table complete" : ""}
        </p>
      </div>
    </div>
  );
}

// The crack runs top to bottom; each half is the same seal clipped to one side.
const CRACK = [
  [3, -66],
  [-2, -44],
  [5, -30],
  [-3, -16],
  [4, -3],
  [-4, 9],
  [3, 22],
  [-3, 36],
  [2, 50],
  [-1, 66],
] as const;

const CRACK_LINE = CRACK.map(([x, y]) => `${x} ${y}`).join(" L");
const CRACK_LEFT = `M-70 -70 L${CRACK_LINE} L-70 70Z`;
const CRACK_RIGHT = `M70 -70 L${CRACK_LINE} L70 70Z`;

// A glossy poured wax seal: a scalloped edge, a thick shiny rim, a smooth
// pressed centre with a thin raised ring, and a faint engraved monogram.
// With breakable it is drawn as two halves along a crack so it can be broken.
export function WaxSeal({
  initials = "C T",
  breakable,
  mono = true,
}: {
  initials?: string;
  breakable?: boolean;
  mono?: boolean;
}) {
  const uid = useId();
  const id = svgId(uid, "ws");
  const pts: string[] = [];
  for (let i = 0; i < 120; i++) {
    const a = (i / 120) * Math.PI * 2;
    const r =
      51 +
      3.4 * Math.sin(10 * a + 0.3) +
      0.9 * Math.sin(3 * a + 1.1) +
      0.5 * Math.sin(17 * a + 0.4);
    pts.push(`${(Math.cos(a) * r).toFixed(2)} ${(Math.sin(a) * r).toFixed(2)}`);
  }
  const blob = "M" + pts.join(" L") + "Z";
  const monoParts = initials.split(" ");

  const body = (
    <>
      <path d={blob} fill={`url(#${id}g)`} filter={`url(#${id}b)`} />
      <path
        d={blob}
        fill="none"
        style={{ stroke: "var(--wax-lo,#42050f)" }}
        strokeWidth="1"
        opacity=".6"
      />
      <circle r="35.5" fill={`url(#${id}c)`} />
      <circle r="35.5" fill="none" stroke={`url(#${id}r)`} strokeWidth="3.2" />
      <circle
        r="31"
        fill="none"
        style={{ stroke: "var(--wax-hi,#c2283c)" }}
        strokeWidth="1.6"
        filter={`url(#${id}e)`}
      />
      {mono ? (
        <g
          fontFamily="Pinyon Script, Snell Roundhand, cursive"
          textAnchor="middle"
          filter={`url(#${id}i)`}
          fill="#000"
        >
          <text x="-5" y="9" fontSize="28">
            {monoParts[0]}
          </text>
          <text x="8" y="13" fontSize="24">
            {monoParts[1] || ""}
          </text>
        </g>
      ) : null}
      <ellipse
        cx="-14"
        cy="-20"
        rx="22"
        ry="13"
        transform="rotate(-28 -14 -20)"
        fill={`url(#${id}s)`}
      />
    </>
  );

  return (
    <svg
      className={breakable ? "wax wax-breakable" : "wax"}
      viewBox="-62 -62 124 124"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id={`${id}g`} cx="42%" cy="38%" r="70%">
          <stop offset="0" style={{ stopColor: "var(--wax-hi,#c2283c)" }} />
          <stop offset=".6" style={{ stopColor: "var(--wax,#8e1022)" }} />
          <stop offset="1" style={{ stopColor: "var(--wax-lo,#4a0612)" }} />
        </radialGradient>
        <radialGradient id={`${id}c`} cx="40%" cy="36%" r="72%">
          <stop offset="0" style={{ stopColor: "var(--wax-hi,#c2283c)" }} />
          <stop offset="1" style={{ stopColor: "var(--wax,#8e1022)" }} />
        </radialGradient>
        <linearGradient id={`${id}r`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity=".55" />
          <stop offset=".5" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#fff" stopOpacity=".35" />
        </linearGradient>
        <radialGradient id={`${id}s`} cx="34%" cy="26%" r="40%">
          <stop offset="0" stopColor="#fff" stopOpacity=".5" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        {/* Wet-looking wax: a tight, bright specular on a soft bevel. */}
        <filter id={`${id}b`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2.6" result="bl" />
          <feSpecularLighting
            in="bl"
            surfaceScale="7"
            specularConstant="1"
            specularExponent="60"
            lightingColor="#fff"
            result="sp"
          >
            <feDistantLight azimuth="230" elevation="48" />
          </feSpecularLighting>
          <feComposite in="sp" in2="SourceAlpha" operator="in" result="spi" />
          <feDiffuseLighting
            in="bl"
            surfaceScale="4"
            diffuseConstant="1.1"
            lightingColor="#fff"
            result="df"
          >
            <feDistantLight azimuth="230" elevation="60" />
          </feDiffuseLighting>
          <feComposite in="df" in2="SourceAlpha" operator="in" result="dfi" />
          <feBlend in="SourceGraphic" in2="dfi" mode="multiply" result="sh" />
          <feComposite
            in="sh"
            in2="spi"
            operator="arithmetic"
            k1="0"
            k2="1.15"
            k3=".8"
            k4="0"
          />
        </filter>
        <filter id={`${id}e`} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur in="SourceAlpha" stdDeviation=".9" result="bl" />
          <feSpecularLighting
            in="bl"
            surfaceScale="2.4"
            specularConstant="1.1"
            specularExponent="30"
            lightingColor="#fff"
            result="sp"
          >
            <feDistantLight azimuth="230" elevation="40" />
          </feSpecularLighting>
          <feComposite in="sp" in2="SourceAlpha" operator="in" result="spi" />
          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="spi" />
          </feMerge>
        </filter>
        <filter id={`${id}i`}>
          <feOffset dx="-.8" dy="-1" in="SourceAlpha" result="o1" />
          <feFlood floodColor="#000" floodOpacity=".5" />
          <feComposite in2="o1" operator="in" result="d" />
          <feOffset dx=".8" dy="1" in="SourceAlpha" result="o2" />
          <feFlood floodColor="#fff" floodOpacity=".22" />
          <feComposite in2="o2" operator="in" result="l" />
          <feMerge>
            <feMergeNode in="d" />
            <feMergeNode in="l" />
          </feMerge>
        </filter>
        {breakable ? (
          <>
            <g id={`${id}body`}>{body}</g>
            <clipPath id={`${id}L`}>
              <path d={CRACK_LEFT} />
            </clipPath>
            <clipPath id={`${id}R`}>
              <path d={CRACK_RIGHT} />
            </clipPath>
            <clipPath id={`${id}B`}>
              <path d={blob} />
            </clipPath>
          </>
        ) : null}
      </defs>
      {breakable ? (
        <>
          <g className="half half-l">
            <g clipPath={`url(#${id}L)`}>
              <use href={`#${id}body`} />
            </g>
          </g>
          <g className="half half-r">
            <g clipPath={`url(#${id}R)`}>
              <use href={`#${id}body`} />
            </g>
          </g>
          <g clipPath={`url(#${id}B)`}>
            <path
              className="crack"
              d={`M${CRACK_LINE}`}
              fill="none"
              stroke="#120104"
              strokeWidth="1.8"
              strokeLinejoin="round"
              pathLength="1"
            />
            <path
              className="crack"
              d={`M${CRACK_LINE}`}
              fill="none"
              stroke="#ffd4da"
              strokeOpacity=".45"
              strokeWidth=".6"
              strokeLinejoin="round"
              pathLength="1"
              transform="translate(1.2 .6)"
            />
          </g>
        </>
      ) : (
        body
      )}
    </svg>
  );
}
