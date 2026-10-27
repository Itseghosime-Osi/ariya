"use client";

import React from "react";
import type { EventMetrics } from "../../types";

interface RsvpTrajectoryChartProps {
  metrics: EventMetrics;
}

export function RsvpTrajectoryChart({ metrics }: RsvpTrajectoryChartProps) {
  return (
    <div className="bg-surface-container-lowest rounded-[24px] p-margin shadow-[0_2px_8px_-2px_rgba(28,7,13,0.05),0_1px_3px_0_rgba(28,7,13,0.04)] space-y-space-md border border-surface-container-high/40">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-headline-sm text-headline-sm text-primary">
            RSVP progress
          </h2>
          <p className="font-body-sm text-on-surface-variant">
            Accepted people over time · {metrics.totalAttendees} invited
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container font-label-sm text-on-surface-variant font-medium">
            <span className="w-2 h-2 rounded-full bg-wine" />
            {metrics.acceptedGuests} accepted
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container font-label-sm text-on-surface-variant font-medium">
            <span className="w-2 h-0.5 bg-mist" />
            Momentum
          </span>
        </div>
      </div>

      {/* Trajectory SVG Vector Curve */}
      <div className="w-full pt-space-xs">
        <svg
          className="w-full h-44 text-primary overflow-visible"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 540 180"
        >
          <defs>
            <linearGradient id="curveGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#6e1426" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#6e1426" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <line
            stroke="#dcc0c1"
            strokeDasharray="3 4"
            strokeWidth="1"
            x1="20"
            x2="520"
            y1="20"
            y2="20"
          />
          <text
            className="select-none"
            fill="#897172"
            fontFamily="Plus Jakarta Sans"
            fontSize="10"
            x="450"
            y="16"
          >
            {metrics.totalAttendees} Invited
          </text>
          <path
            d="M 25 155 C 80 150, 120 142, 170 125 C 220 108, 270 95, 320 74 C 345 64, 355 60, 370 60 L 370 165 L 25 165 Z"
            fill="url(#curveGradient)"
            stroke="none"
          />
          <path
            d="M 25 155 C 80 150, 120 142, 170 125 C 220 108, 270 95, 320 74 C 345 64, 355 60, 370 60"
            fill="none"
            stroke="#6e1426"
            strokeLinecap="round"
            strokeWidth="3"
          />
          <circle
            cx="25"
            cy="155"
            fill="#f4efe6"
            r="3.5"
            stroke="#6e1426"
            strokeWidth="2.5"
          />
          <circle
            cx="170"
            cy="125"
            fill="#f4efe6"
            r="3.5"
            stroke="#6e1426"
            strokeWidth="2.5"
          />
          <circle
            cx="270"
            cy="95"
            fill="#f4efe6"
            r="3.5"
            stroke="#6e1426"
            strokeWidth="2.5"
          />
          <circle
            cx="370"
            cy="60"
            fill="#e9c98a"
            r="5"
            stroke="#6e1426"
            strokeWidth="3"
          />
          <text
            className="select-none font-semibold"
            fill="#6e1426"
            fontFamily="Plus Jakarta Sans"
            fontSize="11"
            x="380"
            y="64"
          >
            {metrics.acceptedGuests} accepted
          </text>
        </svg>

        <div className="flex items-center justify-between text-on-surface-variant font-label-sm border-t-0 px-1 pt-1 text-[11px]">
          <span>
            01 Oct <br />
            <strong className="text-on-surface font-semibold">Dispatch</strong>
          </span>
          <span>
            18 Oct <br />
            <strong className="text-on-surface font-semibold">88 yes</strong>
          </span>
          <span>
            05 Nov <br />
            <strong className="text-on-surface font-semibold">194 yes</strong>
          </span>
          <span>
            Today <br />
            <strong className="text-primary font-bold">
              {metrics.acceptedGuests} yes
            </strong>
          </span>
          <span>
            Big Day <br />
            <strong className="text-on-surface-variant font-medium">
              Reception
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
}
