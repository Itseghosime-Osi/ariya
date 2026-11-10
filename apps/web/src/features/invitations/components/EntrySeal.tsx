"use client";

import React, { useMemo } from "react";
import QRCode from "qrcode";
import { entrySealColours } from "./seal-contrast";
import type { InvitationPalette } from "../types";

/** A code that opens no one's door: what the studio shows while the host is placing the seal. */
export const SAMPLE_ENTRY_CODE = "ARY-SEAL-DEMO";

interface EntrySealProps {
  /** The guest's entry code, exactly as the check-in desk reads it. */
  value: string;
  palette: InvitationPalette;
  /** A paper plate behind the pattern, for dark or picture backgrounds where the pattern needs light round it. */
  plate?: boolean;
  className?: string;
}

const QUIET = 4;

function isFinder(row: number, col: number, size: number): boolean {
  const inBox = (r: number, c: number) => r >= 0 && r < 7 && c >= 0 && c < 7;
  return (
    inBox(row, col) ||
    inBox(row, col - (size - 7)) ||
    inBox(row - (size - 7), col)
  );
}

/**
 * The guest's entry code, drawn as a piece of the invitation: round dots and three rosettes inside a
 * thin foil ring, in the card's own colours, so it reads as a crest and nothing says "scan me". The
 * door scanner reads it as the code. Error correction is at its highest so prints and screenshots survive.
 */
export function EntrySeal({
  value,
  palette,
  plate = false,
  className = "",
}: EntrySealProps) {
  const model = useMemo(() => {
    const qr = QRCode.create(value, { errorCorrectionLevel: "H" });
    const size = qr.modules.size;
    const dots: Array<[number, number]> = [];
    const marks: Array<[number, number]> = [];
    for (let r = 0; r < size; r += 1) {
      for (let c = 0; c < size; c += 1) {
        if (qr.modules.get(r, c) && !isFinder(r, c, size)) {
          (qr.modules.isReserved(r, c) ? marks : dots).push([r, c]);
        }
      }
    }
    return { size, dots, marks };
  }, [value]);

  // A complete four-module quiet zone must fit at every corner; foil sits outside it.
  const half = (model.size / 2 + QUIET) * Math.SQRT2 + 2;
  const total = half * 2;
  const offset = (total - model.size) / 2;
  const { ink, paper, forcePlate } = entrySealColours(palette);
  const finders: Array<[number, number]> = [
    [0, 0],
    [0, model.size - 7],
    [model.size - 7, 0],
  ];

  return (
    <svg
      viewBox={`0 0 ${total} ${total}`}
      role="img"
      aria-label="Invitation seal"
      className={className}
      style={{ display: "block", width: "100%", height: "100%" }}
      shapeRendering="geometricPrecision"
    >
      <circle
        data-seal-plate=""
        data-seal-plate-required={String(plate || forcePlate)}
        cx={half}
        cy={half}
        r={half - 0.1}
        fill={paper}
        style={{ display: plate || forcePlate ? undefined : "none" }}
      />
      <circle
        cx={half}
        cy={half}
        r={half - 0.5}
        fill="none"
        stroke={palette.foil}
        strokeWidth={0.28}
      />
      <circle
        cx={half}
        cy={half}
        r={half - 1.15}
        fill="none"
        stroke={palette.foil}
        strokeWidth={0.34}
        strokeLinecap="round"
        strokeDasharray="0.02 0.7"
      />
      <g transform={`translate(${offset} ${offset})`}>
        {/* Keep alignment, timing and format modules exact; decorate only data modules. */}
        {model.marks.map(([r, c]) => (
          <rect
            key={`m-${r}-${c}`}
            x={c}
            y={r}
            width={1}
            height={1}
            fill={ink}
          />
        ))}
        {model.dots.map(([r, c]) => (
          <circle
            key={`${r}-${c}`}
            cx={c + 0.5}
            cy={r + 0.5}
            r={0.47}
            fill={ink}
          />
        ))}
        {finders.map(([r, c]) => (
          <g key={`f-${r}-${c}`} transform={`translate(${c} ${r})`}>
            <circle
              cx={3.5}
              cy={3.5}
              r={3}
              fill="none"
              stroke={ink}
              strokeWidth={1}
            />
            <circle cx={3.5} cy={3.5} r={1.55} fill={ink} />
          </g>
        ))}
      </g>
    </svg>
  );
}
