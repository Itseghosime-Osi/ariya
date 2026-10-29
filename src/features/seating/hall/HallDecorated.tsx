"use client";

import React, { useMemo, useState } from "react";
import { RotateCcw, RotateCw, Tag } from "lucide-react";
import type { TableWithGuests } from "../types";
import {
  chairPositions,
  round2,
  tableTop,
  type ChairStyle,
  type HallLayout,
  type Zone,
} from "./model";

type Positions = Record<string, { x: number; y: number }>;
type P3 = [number, number, number];

const C30 = Math.cos(Math.PI / 6);
const WALL_H = 4.6;
const TABLE_H = 0.76;

const CHAIR_FILL: Record<ChairStyle, string> = {
  gold: "#d6b06a",
  white: "#f1ece4",
  black: "#2b2326",
  clear: "#e9e4dc",
};

const FLOOR: Record<HallLayout["decor"]["floor"], [string, string]> = {
  marble: ["#5a463b", "#2b1f1b"],
  wood: ["#5b3920", "#2a170e"],
  dark: ["#24141a", "#0d0709"],
};

function shade(hex: string, f: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) =>
    Math.round(
      Math.min(255, Math.max(0, f >= 0 ? v + (255 - v) * f : v * (1 + f)))
    )
      .toString(16)
      .padStart(2, "0");
  return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
}

/**
 * The decorated hall at night, in 2.5D: the plan projected isometrically, back walls washed with
 * uplighting, swagged drapes, a lit stage and backdrop, linens, sashed chairs and centrepieces in
 * the chosen colours. Drawn in SVG (no 3D engine), rotatable in quarter turns.
 */
export function HallDecorated({
  layout,
  tables,
  positions,
}: {
  layout: HallLayout;
  tables: TableWithGuests[];
  positions: Positions;
}) {
  const [turn, setTurn] = useState(0);
  const [labels, setLabels] = useState(false);
  const d = layout.decor;

  const scene = useMemo(() => {
    const W0 = layout.width;
    const L0 = layout.length;
    const k = ((turn % 4) + 4) % 4;
    const W = k % 2 ? L0 : W0;
    const L = k % 2 ? W0 : L0;
    const rot = (x: number, y: number): [number, number] =>
      k === 0
        ? [x, y]
        : k === 1
          ? [L0 - y, x]
          : k === 2
            ? [W0 - x, L0 - y]
            : [y, W0 - x];
    const P = ([x, y, z]: P3): [number, number] => [
      round2((x - y) * C30),
      round2((x + y) * 0.5 - z),
    ];
    const poly = (pts: P3[]) => pts.map((p) => P(p).join(",")).join(" ");

    type Item = { depth: number; node: React.ReactNode };
    const items: Item[] = [];
    let key = 0;

    // Zones, as raised blocks or flat floor panels.
    const zoneBox = (z: Zone): React.ReactNode[] => {
      const out: React.ReactNode[] = [];
      const corners = [
        [z.x - z.w / 2, z.y - z.h / 2],
        [z.x + z.w / 2, z.y - z.h / 2],
        [z.x + z.w / 2, z.y + z.h / 2],
        [z.x - z.w / 2, z.y + z.h / 2],
      ].map(([x, y]) => rot(x, y));
      const height =
        z.kind === "stage"
          ? 0.8
          : z.kind === "pillar"
            ? WALL_H
            : z.kind === "dj"
              ? 1.05
              : z.kind === "entrance" || z.kind === "dance"
                ? 0.02
                : 0.9;
      const top =
        z.kind === "stage"
          ? "#5a1020"
          : z.kind === "bar"
            ? "#3a2518"
            : z.kind === "dj"
              ? "#1d1418"
              : z.kind === "pillar"
                ? "#cfc4b4"
                : z.kind === "dance"
                  ? "#141016"
                  : shade(d.linen, -0.05);
      // Visible side faces: those facing the viewer (+x, +y in the turned frame).
      for (let i = 0; i < 4; i++) {
        const a = corners[i];
        const b = corners[(i + 1) % 4];
        const nx = b[1] - a[1];
        const ny = a[0] - b[0];
        const cx = corners.reduce((s, c) => s + c[0], 0) / 4;
        const cy = corners.reduce((s, c) => s + c[1], 0) / 4;
        const outward = (a[0] + b[0]) / 2 - cx;
        const outwardY = (a[1] + b[1]) / 2 - cy;
        const facing = nx * outward + ny * outwardY > 0 ? nx + ny : -(nx + ny);
        if (facing > 0 && height > 0.05) {
          out.push(
            <polygon
              key={`zf${key++}`}
              points={poly([
                [a[0], a[1], 0],
                [b[0], b[1], 0],
                [b[0], b[1], height],
                [a[0], a[1], height],
              ])}
              fill={shade(top, -0.35)}
            />
          );
        }
      }
      out.push(
        <polygon
          key={`zt${key++}`}
          points={poly(corners.map(([x, y]) => [x, y, height] as P3))}
          fill={top}
          stroke="#e9c98a"
          strokeOpacity={z.kind === "dance" ? 0.5 : 0.25}
          strokeWidth={0.03}
        />
      );
      if (z.kind === "dance") {
        const [x0, y0] = [
          Math.min(...corners.map((c) => c[0])),
          Math.min(...corners.map((c) => c[1])),
        ];
        const [x1, y1] = [
          Math.max(...corners.map((c) => c[0])),
          Math.max(...corners.map((c) => c[1])),
        ];
        for (let x = x0 + 0.4; x < x1; x += 0.8)
          for (let y = y0 + 0.4; y < y1; y += 0.8) {
            const [px, py] = P([x, y, 0.03]);
            out.push(
              <circle
                key={`led${key++}`}
                cx={px}
                cy={py}
                r={0.09}
                fill={d.uplight ?? "#e9c98a"}
                opacity={((x * 7 + y * 3) % 1) * 0.5 + 0.25}
                className={
                  (Math.round(x + y) % 3 === 0 && "hall-twinkle") || undefined
                }
              />
            );
          }
      }
      if (z.kind === "stage") {
        // Backdrop along the stage edge furthest from the viewer.
        const back = [...corners].sort((p, q) => p[0] + p[1] - (q[0] + q[1]));
        const [a, b] = [back[0], back[1]];
        const panel: P3[] = [
          [a[0], a[1], 0.8],
          [b[0], b[1], 0.8],
          [b[0], b[1], 4.2],
          [a[0], a[1], 4.2],
        ];
        out.push(
          <polygon
            key={`bd${key++}`}
            points={poly(panel)}
            fill="url(#deco-backdrop)"
            stroke="#e9c98a"
            strokeWidth={0.06}
          />
        );
        const mid: P3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 2.6];
        const [mx, my] = P(mid);
        out.push(
          <circle
            key={`bg${key++}`}
            cx={mx}
            cy={my}
            r={3.2}
            fill="url(#deco-glow)"
            style={{ mixBlendMode: "screen" }}
          />
        );
        // Two spotlight cones.
        const cTop = corners.reduce(
          (s, c) => [s[0] + c[0] / 4, s[1] + c[1] / 4],
          [0, 0]
        );
        for (const off of [-1.6, 1.6]) {
          const [tx, ty] = P([cTop[0] + off, cTop[1], 7]);
          const [bx, by] = P([cTop[0] + off * 0.6, cTop[1], 0.8]);
          out.push(
            <polygon
              key={`sp${key++}`}
              points={`${tx},${ty} ${bx - 1.3},${by} ${bx + 1.3},${by}`}
              fill="url(#deco-spot)"
              style={{ mixBlendMode: "screen" }}
            />
          );
        }
      }
      if (z.kind === "entrance") {
        const [a, b] = [corners[0], corners[1]];
        for (const p of [a, b]) {
          out.push(
            <line
              key={`ep${key++}`}
              x1={P([p[0], p[1], 0])[0]}
              y1={P([p[0], p[1], 0])[1]}
              x2={P([p[0], p[1], 2.8])[0]}
              y2={P([p[0], p[1], 2.8])[1]}
              stroke="#e9c98a"
              strokeWidth={0.12}
            />
          );
        }
        const [ax, ay] = P([a[0], a[1], 2.8]);
        const [bx, by] = P([b[0], b[1], 2.8]);
        out.push(
          <path
            key={`ea${key++}`}
            d={`M${ax} ${ay} Q${(ax + bx) / 2} ${Math.min(ay, by) - 1.6} ${bx} ${by}`}
            fill="none"
            stroke={d.flower}
            strokeWidth={0.32}
            strokeLinecap="round"
            opacity={0.9}
          />
        );
      }
      return out;
    };

    for (const z of layout.zones) {
      const [cx, cy] = rot(z.x, z.y);
      const flat = z.kind === "dance" || z.kind === "entrance";
      items.push({
        depth: flat ? -1000 + cx + cy : cx + cy + Math.max(z.w, z.h) * 0.25,
        node: <g key={`z-${z.id}`}>{zoneBox(z)}</g>,
      });
    }

    // Light pools on the floor, then tables (chairs behind, table, chairs in front, centrepiece).
    const pools: React.ReactNode[] = [];
    for (const t of tables) {
      const pos = positions[t.id];
      if (!pos) continue;
      const [cx, cy] = rot(pos.x, pos.y);
      const r = (layout.rotations[t.id] ?? 0) + k * 90;
      const top = tableTop(t.shape, t.capacity);
      const rr = (r * Math.PI) / 180;
      const toHall = (lx: number, ly: number): [number, number] => [
        cx + lx * Math.cos(rr) - ly * Math.sin(rr),
        cy + lx * Math.sin(rr) + ly * Math.cos(rr),
      ];
      const [px, py] = P([cx, cy, 0]);
      pools.push(
        <ellipse
          key={`pool-${t.id}`}
          cx={px}
          cy={py}
          rx={top.w * 1.5}
          ry={top.w * 0.85}
          fill="url(#deco-pool)"
        />
      );

      // Table outline as a polygon (rounds and ovals approximated).
      const outline: [number, number][] = [];
      if (top.kind === "rect") {
        outline.push(
          ...(
            [
              [-1, -1],
              [1, -1],
              [1, 1],
              [-1, 1],
            ] as const
          ).map(([sx, sy]) => toHall((sx * top.w) / 2, (sy * top.h) / 2))
        );
      } else {
        const n = 22;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          outline.push(
            toHall((Math.cos(a) * top.w) / 2, (Math.sin(a) * top.h) / 2)
          );
        }
      }
      const chairs = chairPositions(t.shape, t.capacity).map((c) => {
        const [hx, hy] = toHall(c.x * 1.08, c.y * 1.08);
        return { hx, hy, depth: hx + hy };
      });
      const chairNode = (c: { hx: number; hy: number }, i: number) => {
        const [x1, y1] = P([c.hx, c.hy, 0.42]);
        const [x2, y2] = P([c.hx, c.hy, 1.0]);
        return (
          <g key={`c${i}`}>
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={CHAIR_FILL[d.chair]}
              strokeOpacity={d.chair === "clear" ? 0.45 : 1}
              strokeWidth={0.34}
              strokeLinecap="round"
            />
            <line
              x1={x1}
              y1={(y1 + y2) / 2 + 0.06}
              x2={x2}
              y2={(y1 + y2) / 2 - 0.06}
              stroke={d.sash}
              strokeWidth={0.36}
              strokeLinecap="butt"
              opacity={0.95}
            />
          </g>
        );
      };
      const tableDepth = cx + cy;
      const behind = chairs.filter((c) => c.depth < tableDepth);
      const front = chairs.filter((c) => c.depth >= tableDepth);
      const faces: React.ReactNode[] = [];
      for (let i = 0; i < outline.length; i++) {
        const a = outline[i];
        const b = outline[(i + 1) % outline.length];
        const ex = b[0] - a[0];
        const ey = b[1] - a[1];
        // Outward normal for a counter-clockwise outline is (ey, -ex); visible if it faces +x+y.
        if (ey - ex > 0) {
          faces.push(
            <polygon
              key={`f${i}`}
              points={poly([
                [a[0], a[1], 0.02],
                [b[0], b[1], 0.02],
                [b[0], b[1], TABLE_H],
                [a[0], a[1], TABLE_H],
              ])}
              fill={shade(d.linen, -0.22 - (i % 3) * 0.04)}
            />
          );
        }
      }
      const [tcx, tcy] = P([cx, cy, TABLE_H]);
      let piece: React.ReactNode = null;
      if (d.centrepiece === "tall") {
        const [sx, sy] = P([cx, cy, 1.75]);
        piece = (
          <g>
            <line
              x1={tcx}
              y1={tcy}
              x2={sx}
              y2={sy}
              stroke="#e9c98a"
              strokeWidth={0.06}
            />
            <circle cx={sx} cy={sy} r={0.42} fill={d.flower} />
            <circle
              cx={sx - 0.12}
              cy={sy - 0.12}
              r={0.16}
              fill="#fff"
              opacity={0.35}
            />
            <circle
              cx={sx}
              cy={sy}
              r={0.9}
              fill="url(#deco-warm)"
              style={{ mixBlendMode: "screen" }}
            />
          </g>
        );
      } else if (d.centrepiece === "low") {
        piece = (
          <g>
            <ellipse
              cx={tcx}
              cy={tcy - 0.12}
              rx={0.42}
              ry={0.24}
              fill={d.flower}
            />
            <ellipse
              cx={tcx - 0.1}
              cy={tcy - 0.2}
              rx={0.16}
              ry={0.09}
              fill="#fff"
              opacity={0.3}
            />
          </g>
        );
      } else if (d.centrepiece === "candles") {
        piece = (
          <g>
            {[-0.18, 0, 0.18].map((o, i) => (
              <g key={i}>
                <line
                  x1={tcx + o}
                  y1={tcy}
                  x2={tcx + o}
                  y2={tcy - 0.32 - i * 0.08}
                  stroke="#f6efe3"
                  strokeWidth={0.07}
                />
                <circle
                  cx={tcx + o}
                  cy={tcy - 0.38 - i * 0.08}
                  r={0.05}
                  fill="#ffd27a"
                  className="hall-flicker"
                />
              </g>
            ))}
            <circle
              cx={tcx}
              cy={tcy - 0.4}
              r={0.8}
              fill="url(#deco-warm)"
              style={{ mixBlendMode: "screen" }}
            />
          </g>
        );
      }
      const [lx, ly] = P([cx, cy, 2.3]);
      items.push({
        depth: tableDepth,
        node: (
          <g key={`t-${t.id}`}>
            {behind.map(chairNode)}
            {faces}
            <polygon
              points={poly(outline.map(([x, y]) => [x, y, TABLE_H] as P3))}
              fill={d.linen}
              stroke={shade(d.linen, 0.25)}
              strokeWidth={0.03}
            />
            {piece}
            {front.map((c, i) => chairNode(c, i + 100))}
            {labels && (
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                fontSize={0.42}
                fill="#f6efe3"
                fontWeight={700}
                stroke="#1c070d"
                strokeWidth={0.08}
                paintOrder="stroke"
              >
                {t.name}
              </text>
            )}
          </g>
        ),
      });
    }
    items.sort((a, b) => a.depth - b.depth);

    // Back walls with uplight washes and swagged drapes.
    const walls: React.ReactNode[] = [];
    const wallLeft: P3[] = [
      [0, 0, 0],
      [0, L, 0],
      [0, L, WALL_H],
      [0, 0, WALL_H],
    ];
    const wallTop: P3[] = [
      [0, 0, 0],
      [W, 0, 0],
      [W, 0, WALL_H],
      [0, 0, WALL_H],
    ];
    walls.push(
      <polygon key="wl" points={poly(wallLeft)} fill="url(#deco-wall-l)" />
    );
    walls.push(
      <polygon key="wt" points={poly(wallTop)} fill="url(#deco-wall-t)" />
    );
    const lights: React.ReactNode[] = [];
    if (d.uplight) {
      for (let s = 1.4; s < W - 0.6; s += 2.6) {
        lights.push(
          <polygon
            key={`ut${s}`}
            points={poly([
              [s - 0.35, 0, 0.05],
              [s + 0.35, 0, 0.05],
              [s + 1.1, 0, WALL_H],
              [s - 1.1, 0, WALL_H],
            ])}
            fill="url(#deco-uplight)"
            style={{ mixBlendMode: "screen" }}
            className="hall-breathe"
          />
        );
      }
      for (let s = 1.4; s < L - 0.6; s += 2.6) {
        lights.push(
          <polygon
            key={`ul${s}`}
            points={poly([
              [0, s - 0.35, 0.05],
              [0, s + 0.35, 0.05],
              [0, s + 1.1, WALL_H],
              [0, s - 1.1, WALL_H],
            ])}
            fill="url(#deco-uplight)"
            style={{ mixBlendMode: "screen" }}
            className="hall-breathe"
          />
        );
      }
    }
    const drapes: React.ReactNode[] = [];
    if (d.drape) {
      const swag = (from: P3, to: P3, i: string) => {
        const [ax, ay] = P(from);
        const [bx, by] = P(to);
        return (
          <path
            key={i}
            d={`M${ax} ${ay} Q${(ax + bx) / 2} ${(ay + by) / 2 + 0.9} ${bx} ${by}`}
            fill="none"
            stroke={d.drape!}
            strokeWidth={0.09}
            opacity={0.55}
          />
        );
      };
      for (let s = 0; s < W - 0.1; s += 2.2)
        drapes.push(
          swag(
            [s, 0, WALL_H - 0.1],
            [Math.min(W, s + 2.2), 0, WALL_H - 0.1],
            `dt${s}`
          )
        );
      for (let s = 0; s < L - 0.1; s += 2.2)
        drapes.push(
          swag(
            [0, s, WALL_H - 0.1],
            [0, Math.min(L, s + 2.2), WALL_H - 0.1],
            `dl${s}`
          )
        );
    }
    const ceiling: React.ReactNode[] = [];
    if (d.drape) {
      const [hx, hy] = P([W / 2, L / 2, WALL_H + 1.4]);
      const anchors: P3[] = [];
      for (let s = 0; s <= W; s += W / 6) anchors.push([s, 0, WALL_H]);
      for (let s = 0; s <= L; s += L / 6) anchors.push([0, s, WALL_H]);
      anchors.forEach((a, i) => {
        const [ax, ay] = P(a);
        ceiling.push(
          <path
            key={`cl${i}`}
            d={`M${hx} ${hy} Q${(hx + ax) / 2} ${(hy + ay) / 2 + 1.2} ${ax} ${ay}`}
            fill="none"
            stroke={d.drape!}
            strokeWidth={0.1}
            opacity={0.32}
          />
        );
      });
      ceiling.push(
        <circle
          key="chand"
          cx={hx}
          cy={hy + 0.4}
          r={0.5}
          fill="#ffe7b0"
          opacity={0.9}
        />,
        <circle
          key="chandg"
          cx={hx}
          cy={hy + 0.4}
          r={3}
          fill="url(#deco-warm)"
          style={{ mixBlendMode: "screen" }}
        />
      );
    }
    // Floor tiles for marble.
    const tiles: React.ReactNode[] = [];
    if (d.floor !== "dark") {
      const step = d.floor === "marble" ? 1.2 : 0.4;
      for (let s = step; s < (d.floor === "marble" ? W : 0); s += step)
        tiles.push(
          <line
            key={`tx${s}`}
            x1={P([s, 0, 0])[0]}
            y1={P([s, 0, 0])[1]}
            x2={P([s, L, 0])[0]}
            y2={P([s, L, 0])[1]}
            stroke="#000"
            strokeOpacity={0.18}
            strokeWidth={0.02}
          />
        );
      for (let s = step; s < L; s += step)
        tiles.push(
          <line
            key={`ty${s}`}
            x1={P([0, s, 0])[0]}
            y1={P([0, s, 0])[1]}
            x2={P([W, s, 0])[0]}
            y2={P([W, s, 0])[1]}
            stroke="#000"
            strokeOpacity={0.14}
            strokeWidth={0.02}
          />
        );
    }

    const pts = [
      P([0, 0, WALL_H + 2]),
      P([W, 0, WALL_H]),
      P([0, L, WALL_H]),
      P([W, L, 0]),
      P([0, L, 0]),
      P([W, 0, 0]),
    ];
    const minX = Math.min(...pts.map((p) => p[0])) - 1.5;
    const maxX = Math.max(...pts.map((p) => p[0])) + 1.5;
    const minY = Math.min(...pts.map((p) => p[1])) - 1.5;
    const maxY = Math.max(...pts.map((p) => p[1])) + 1.5;
    return {
      viewBox: `${round2(minX)} ${round2(minY)} ${round2(maxX - minX)} ${round2(maxY - minY)}`,
      bg: { x: minX, y: minY, w: maxX - minX, h: maxY - minY },
      floor: poly([
        [0, 0, 0],
        [W, 0, 0],
        [W, L, 0],
        [0, L, 0],
      ]),
      walls,
      lights,
      drapes,
      ceiling,
      tiles,
      pools,
      items: items.map((i) => i.node),
    };
  }, [layout, tables, positions, turn, labels, d]);

  const [f1, f2] = FLOOR[d.floor];
  const summary = `Decorated preview: ${d.chair} chairs with ${d.sash} sashes, ${d.linen} linens, ${d.centrepiece === "none" ? "no" : d.centrepiece} centrepieces${d.uplight ? `, ${d.uplight} uplighting` : ""}${d.drape ? ", ceiling drapes" : ""}.`;

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-[inherit] bg-[#07020a]"
      data-testid="hall-decorated"
    >
      <svg
        viewBox={scene.viewBox}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={summary}
        className="block h-full w-full"
      >
        <defs>
          <radialGradient id="deco-bg" cx="50%" cy="35%" r="80%">
            <stop offset="0" stopColor="#2a0a14" />
            <stop offset="1" stopColor="#060106" />
          </radialGradient>
          <linearGradient id="deco-floor" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={f1} />
            <stop offset="1" stopColor={f2} />
          </linearGradient>
          <linearGradient id="deco-wall-l" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1a070d" />
            <stop offset="1" stopColor="#2c0f18" />
          </linearGradient>
          <linearGradient id="deco-wall-t" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#21090f" />
            <stop offset="1" stopColor="#3a1420" />
          </linearGradient>
          <linearGradient id="deco-uplight" x1="0" y1="1" x2="0" y2="0">
            <stop
              offset="0"
              stopColor={d.uplight ?? "#000"}
              stopOpacity="0.85"
            />
            <stop
              offset="0.6"
              stopColor={d.uplight ?? "#000"}
              stopOpacity="0.22"
            />
            <stop offset="1" stopColor={d.uplight ?? "#000"} stopOpacity="0" />
          </linearGradient>
          <linearGradient id="deco-backdrop" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0"
              stopColor={d.drape ?? "#6e1426"}
              stopOpacity="0.55"
            />
            <stop offset="1" stopColor={shade(d.drape ?? "#6e1426", -0.45)} />
          </linearGradient>
          <radialGradient id="deco-glow">
            <stop offset="0" stopColor="#ffd9a0" stopOpacity="0.45" />
            <stop offset="1" stopColor="#ffd9a0" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="deco-spot" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff4dc" stopOpacity="0.5" />
            <stop offset="1" stopColor="#fff4dc" stopOpacity="0.04" />
          </linearGradient>
          <radialGradient id="deco-warm">
            <stop offset="0" stopColor="#ffcf7a" stopOpacity="0.5" />
            <stop offset="1" stopColor="#ffcf7a" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="deco-pool">
            <stop
              offset="0"
              stopColor={d.uplight ?? "#ffcf7a"}
              stopOpacity="0.22"
            />
            <stop
              offset="1"
              stopColor={d.uplight ?? "#ffcf7a"}
              stopOpacity="0"
            />
          </radialGradient>
          <radialGradient id="deco-vignette" cx="50%" cy="50%" r="70%">
            <stop offset="0.55" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.7" />
          </radialGradient>
        </defs>
        <rect
          x={scene.bg.x}
          y={scene.bg.y}
          width={scene.bg.w}
          height={scene.bg.h}
          fill="url(#deco-bg)"
        />
        {scene.walls}
        {scene.lights}
        {scene.drapes}
        <polygon points={scene.floor} fill="url(#deco-floor)" />
        {scene.tiles}
        <g style={{ mixBlendMode: "screen" }}>{scene.pools}</g>
        {scene.items}
        {scene.ceiling}
        <rect
          x={scene.bg.x}
          y={scene.bg.y}
          width={scene.bg.w}
          height={scene.bg.h}
          fill="url(#deco-vignette)"
          pointerEvents="none"
        />
      </svg>

      <div className="absolute bottom-3 right-3 flex gap-1.5">
        {[
          {
            label: "Turn the view left",
            icon: RotateCcw,
            run: () => setTurn((t) => t - 1),
          },
          {
            label: "Turn the view right",
            icon: RotateCw,
            run: () => setTurn((t) => t + 1),
          },
        ].map(({ label, icon: I, run }) => (
          <button
            key={label}
            type="button"
            onClick={run}
            aria-label={label}
            title={label}
            className="grid h-10 w-10 place-items-center rounded-full border border-[#e9c98a]/40 bg-[#1c070d]/85 text-[#f6dca8] backdrop-blur transition-colors hover:border-[#e9c98a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e9c98a]"
          >
            <I size={16} />
          </button>
        ))}
        <button
          type="button"
          onClick={() => setLabels((v) => !v)}
          aria-pressed={labels}
          className="flex h-10 items-center gap-1.5 rounded-full border border-[#e9c98a]/40 bg-[#1c070d]/85 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#f6dca8] backdrop-blur transition-colors hover:border-[#e9c98a] aria-pressed:border-[#e9c98a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e9c98a]"
        >
          <Tag size={14} /> Table names
        </button>
      </div>
    </div>
  );
}
