interface PassStampProps {
  /** Printed around the lower ring, the way a dated hand stamp records when it was pressed. */
  dateLabel: string;
  className?: string;
}

const VIEW = 200;
const CENTRE = VIEW / 2;

const at = (angle: number, radius: number) =>
  `${(CENTRE + Math.cos(angle) * radius).toFixed(2)} ${(
    CENTRE +
    Math.sin(angle) * radius
  ).toFixed(2)}`;

/** Deterministic 0→1 hash, so every lobe gets the same cut on server and client. */
function jitter(seed: number) {
  const x = Math.sin(seed * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * A cast rubber stamp's outer contour is scalloped while its inner edge is a true circle. Arcs are
 * drawn lobe by lobe from a midpoint pushed out by `depth` — cheaper and smoother than a sine path.
 * Lobe heights are jittered: an evenly-toothed contour reads as a machined gear, and the irregular
 * cut of a hand-trimmed rubber is most of what makes the impression read as a stamp at all.
 */
function scallopedEdge(radius: number, lobes: number, depth: number) {
  const step = (Math.PI * 2) / lobes;
  const vertex = (i: number) => radius + depth * (0.3 + jitter(i + 40) * 0.4);
  const bulge = (i: number) => radius + depth * (0.7 + jitter(i + 1) * 0.7);

  let d = `M${at(0, vertex(0))}`;
  for (let i = 0; i < lobes; i += 1) {
    d += `Q${at(i * step + step / 2, bulge(i))} ${at(
      (i + 1) * step,
      vertex((i + 1) % lobes)
    )}`;
  }
  return `${d}Z`;
}

function circle(radius: number) {
  return `M ${CENTRE + radius} ${CENTRE} A ${radius} ${radius} 0 1 0 ${
    CENTRE - radius
  } ${CENTRE} A ${radius} ${radius} 0 1 0 ${CENTRE + radius} ${CENTRE} Z`;
}

const BAND = `${scallopedEdge(85, 28, 5)} ${circle(80)}`;

/**
 * A rubber stamp rendered as ink on paper: a scalloped outer contour with a smooth inner edge, ring
 * text on a true arc, ink that failed to transfer at two noise scales, and a displaced edge so no
 * contour is machine-straight.
 */
export function PassStamp({ dateLabel, className }: PassStampProps) {
  return (
    <svg
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      className={className}
      role="img"
      aria-label={`Paid in full, ${dateLabel}`}
    >
      <defs>
        <filter
          id="pass-stamp-warp"
          x="-12%"
          y="-12%"
          width="124%"
          height="124%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.04"
            numOctaves="4"
            seed="9"
            result="warp"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="warp"
            scale="2.2"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        {/* Ink squeezed into the paper fibres creeps a little past the rubber's edge. A blurred
            copy underneath the impression supplies that halo. */}
        <filter
          id="pass-stamp-bleed"
          x="-10%"
          y="-10%"
          width="120%"
          height="120%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur stdDeviation="1.4" />
        </filter>

        {/* Ink transfer happens at two scales. Low-frequency noise, thresholded hard, becomes the
            broad dry patches where the pad never touched; high-frequency noise becomes the paper
            tooth granulating the areas that did take. One scale alone reads as digital static. */}
        <filter
          id="pass-stamp-worn"
          x="-5%"
          y="-5%"
          width="110%"
          height="110%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.055"
            numOctaves="5"
            seed="7"
            result="patchRaw"
          />
          <feColorMatrix
            in="patchRaw"
            type="saturate"
            values="0"
            result="patchGrey"
          />
          <feComponentTransfer in="patchGrey" result="patch">
            <feFuncR type="linear" slope="18" intercept="-6.6" />
            <feFuncG type="linear" slope="18" intercept="-6.6" />
            <feFuncB type="linear" slope="18" intercept="-6.6" />
            <feFuncA type="linear" slope="0" intercept="1" />
          </feComponentTransfer>

          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.72"
            numOctaves="3"
            seed="21"
            result="grainRaw"
          />
          <feColorMatrix
            in="grainRaw"
            type="saturate"
            values="0"
            result="grainGrey"
          />
          <feComponentTransfer in="grainGrey" result="grain">
            <feFuncR type="linear" slope="1.6" intercept="0.22" />
            <feFuncG type="linear" slope="1.6" intercept="0.22" />
            <feFuncB type="linear" slope="1.6" intercept="0.22" />
            <feFuncA type="linear" slope="0" intercept="1" />
          </feComponentTransfer>

          <feBlend in="patch" in2="grain" mode="multiply" result="weathered" />
          <feGaussianBlur in="weathered" stdDeviation="0.22" result="soft" />
          <feBlend in="SourceGraphic" in2="soft" mode="multiply" />
        </filter>

        {/* A hand-pressed stamp is barely darker where the thumb bore down. Kept this close to flat
            on purpose: a visible falloff reads as a gradient overlay rather than ink on paper, so
            the unevenness is left almost entirely to the noise. Stops are grey, not translucent, so
            the values multiply cleanly into the wear. */}
        <radialGradient id="pass-stamp-pressure" cx="42%" cy="36%" r="86%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="72%" stopColor="#fbfbfb" />
          <stop offset="100%" stopColor="#f2f2f2" />
        </radialGradient>

        <mask
          id="pass-stamp-ink"
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width={VIEW}
          height={VIEW}
        >
          <rect
            width={VIEW}
            height={VIEW}
            fill="url(#pass-stamp-pressure)"
            filter="url(#pass-stamp-worn)"
          />
        </mask>

        {/* The lettering is cut from the same rubber as the band but stands proud of it, so it takes
            a fuller charge of ink and survives a dry pad that leaves the broad band patchy. A second
            mask at a lower threshold keeps the fine type legible while the plate around it breaks. */}
        <filter
          id="pass-stamp-worn-light"
          x="-5%"
          y="-5%"
          width="110%"
          height="110%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.055"
            numOctaves="5"
            seed="7"
            result="patchRaw"
          />
          <feColorMatrix
            in="patchRaw"
            type="saturate"
            values="0"
            result="patchGrey"
          />
          <feComponentTransfer in="patchGrey" result="patch">
            <feFuncR type="linear" slope="18" intercept="-4.9" />
            <feFuncG type="linear" slope="18" intercept="-4.9" />
            <feFuncB type="linear" slope="18" intercept="-4.9" />
            <feFuncA type="linear" slope="0" intercept="1" />
          </feComponentTransfer>

          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.72"
            numOctaves="3"
            seed="21"
            result="grainRaw"
          />
          <feColorMatrix
            in="grainRaw"
            type="saturate"
            values="0"
            result="grainGrey"
          />
          <feComponentTransfer in="grainGrey" result="grain">
            <feFuncR type="linear" slope="1.6" intercept="0.22" />
            <feFuncG type="linear" slope="1.6" intercept="0.22" />
            <feFuncB type="linear" slope="1.6" intercept="0.22" />
            <feFuncA type="linear" slope="0" intercept="1" />
          </feComponentTransfer>

          <feBlend in="patch" in2="grain" mode="multiply" result="weathered" />
          <feGaussianBlur in="weathered" stdDeviation="0.18" result="soft" />
          <feBlend in="SourceGraphic" in2="soft" mode="multiply" />
        </filter>

        <mask
          id="pass-stamp-ink-text"
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width={VIEW}
          height={VIEW}
        >
          <rect
            width={VIEW}
            height={VIEW}
            fill="url(#pass-stamp-pressure)"
            filter="url(#pass-stamp-worn-light)"
          />
        </mask>

        {/* Both arcs sit on the midline of the ring channel (r 60→80) so the lettering is spaced
            evenly between the inner rule and the band. */}
        <path
          id="pass-stamp-arc-top"
          d="M 32 100 A 68 68 0 0 1 168 100"
          fill="none"
        />
        <path
          id="pass-stamp-arc-bottom"
          d="M 24 100 A 76 76 0 0 0 176 100"
          fill="none"
        />
      </defs>

      <g
        transform="translate(100 100) rotate(-1.6) scale(1.014 0.988) translate(-100 -100)"
        stroke="currentColor"
        fill="currentColor"
        strokeLinecap="round"
      >
        <g mask="url(#pass-stamp-ink)" filter="url(#pass-stamp-warp)">
          <g opacity="0.1" filter="url(#pass-stamp-bleed)" stroke="none">
            <path d={BAND} fillRule="evenodd" />
            <circle cx="100" cy="100" r="59" fill="none" strokeWidth="2.4" />
          </g>

          <g opacity="0.14">
            {/* The rubber caught the paper a second time on the way down. */}
            <path
              d={BAND}
              fillRule="evenodd"
              stroke="none"
              transform="translate(1.1 0.9)"
            />
          </g>

          <path d={BAND} fillRule="evenodd" stroke="none" />
        </g>

        <g
          mask="url(#pass-stamp-ink-text)"
          filter="url(#pass-stamp-warp)"
          stroke="none"
          textAnchor="middle"
        >
          <circle
            cx="100"
            cy="100"
            r="59"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            opacity="0.95"
          />

          <text fontSize="11" fontWeight="800" letterSpacing="2">
            <textPath href="#pass-stamp-arc-top" startOffset="50%">
              CELEBRATION PASS
            </textPath>
          </text>
          <text fontSize="9" fontWeight="800" letterSpacing="1.6">
            <textPath href="#pass-stamp-arc-bottom" startOffset="50%">
              {dateLabel}
            </textPath>
          </text>

          <text
            x="100"
            y="94"
            fontFamily="var(--font-sans)"
            fontSize="26"
            fontWeight="800"
            letterSpacing="-0.6"
          >
            PAID
          </text>
          <text
            x="100"
            y="111"
            fontSize="8.6"
            fontWeight="800"
            letterSpacing="3.2"
            dx="1.6"
          >
            IN FULL
          </text>
          <text x="100" y="127" fontSize="7.6" letterSpacing="7.5" dx="3.75">
            ★ ★ ★
          </text>
        </g>
      </g>
    </svg>
  );
}
