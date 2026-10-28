import React, { useId } from "react";
import { pluralise } from "@/lib/metrics";
import type { EventMetrics } from "../../types";

interface RsvpStackedBarProps {
  metrics: Pick<
    EventMetrics,
    | "totalParties"
    | "acceptedParties"
    | "awaitingParties"
    | "declinedParties"
    | "acceptedGuests"
  >;
  height?: number;
  className?: string;
}

/**
 * Hand-rolled 3-segment SVG stacked bar:
 * - Accepted (#1F6B4A solid)
 * - Awaiting (#B88728 diagonal hatch so segments never rely on color alone, WCAG 1.4.1)
 * - Declined (#9E2A2B solid)
 * Includes 2px gaps between active segments and an sr-only summary.
 */
export function RsvpStackedBar({
  metrics,
  height = 10,
  className = "",
}: RsvpStackedBarProps) {
  const patternId = useId();
  const {
    totalParties,
    acceptedParties,
    awaitingParties,
    declinedParties,
    acceptedGuests,
  } = metrics;

  const summaryText =
    totalParties > 0
      ? `RSVP summary: ${acceptedParties} of ${pluralise(totalParties, "party", "parties")} accepted (${pluralise(acceptedGuests, "person", "people")} attending), ${awaitingParties} awaiting, ${declinedParties} declined.`
      : "No guest parties added yet.";

  if (totalParties <= 0) {
    return (
      <div className={className}>
        <span className="sr-only">{summaryText}</span>
        <div
          aria-hidden="true"
          className="w-full rounded-full bg-night/8"
          style={{ height }}
        />
      </div>
    );
  }

  const segments = [
    {
      key: "accepted",
      count: acceptedParties,
      fill: "var(--rsvp-accepted)",
    },
    {
      key: "awaiting",
      count: awaitingParties,
      fill: `url(#${patternId})`,
    },
    {
      key: "declined",
      count: declinedParties,
      fill: "var(--rsvp-declined)",
    },
  ].filter((s) => s.count > 0);

  return (
    <div className={className}>
      <span className="sr-only">{summaryText}</span>
      <div
        aria-hidden="true"
        className="flex w-full items-center gap-[2px] overflow-hidden rounded-full bg-night/8"
        style={{ height }}
      >
        <svg width="0" height="0" className="absolute">
          <defs>
            <pattern
              id={patternId}
              width="6"
              height="6"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <rect width="6" height="6" fill="#E8D2A6" />
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="6"
                stroke="var(--rsvp-awaiting)"
                strokeWidth="3.5"
              />
            </pattern>
          </defs>
        </svg>

        {segments.map((seg) => {
          const flexBasis = `${(seg.count / totalParties) * 100}%`;
          return (
            <svg
              key={seg.key}
              className="h-full first:rounded-l-full last:rounded-r-full"
              style={{ width: flexBasis, minWidth: 4 }}
              preserveAspectRatio="none"
            >
              <rect width="100%" height="100%" fill={seg.fill} />
            </svg>
          );
        })}
      </div>
    </div>
  );
}
