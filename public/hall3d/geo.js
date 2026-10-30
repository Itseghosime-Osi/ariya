// Geometry for the 3D hall: pleated table cloths and stage skirts, chairs, place settings,
// flowers, and the outlines of zones. Everything is built in metres, with y up; a hall point
// (x, y) on the plan sits at (x, 0, y) in the scene.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/** A small seeded random generator, so arrangements look the same on every render. */
export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

export function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Move, turn and scale a geometry in place. */
export function place(g, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1) {
  const m = new THREE.Matrix4().compose(
    V(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
    typeof s === "number" ? V(s, s, s) : V(s[0], s[1], s[2])
  );
  g.applyMatrix4(m);
  return g;
}

/** Merge geometries that may differ in index and attributes, keeping position and normal. */
export function merge(list) {
  const gs = list.map((g) => {
    const n = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(n.attributes))
      if (k !== "position" && k !== "normal") n.deleteAttribute(k);
    return n;
  });
  return mergeGeometries(gs);
}

/** A cylinder from point a to point b. */
export function rod(a, b, r, seg = 8) {
  const d = new THREE.Vector3().subVectors(b, a);
  const g = new THREE.CylinderGeometry(r, r, d.length(), seg, 1);
  const q = new THREE.Quaternion().setFromUnitVectors(
    V(0, 1, 0),
    d.clone().normalize()
  );
  const m = new THREE.Matrix4().compose(
    a.clone().add(b).multiplyScalar(0.5),
    q,
    V(1, 1, 1)
  );
  g.applyMatrix4(m);
  return g;
}

// ---------------------------------------------------------------- outlines

function resample(pts, n) {
  const len = [0];
  for (let i = 1; i <= pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i % pts.length];
    len.push(len[i - 1] + Math.hypot(b.x - a.x, b.z - a.z));
  }
  const total = len[len.length - 1];
  const out = [];
  let j = 0;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * total;
    while (len[j + 1] < t) j++;
    const a = pts[j];
    const b = pts[(j + 1) % pts.length];
    const f = (t - len[j]) / Math.max(1e-9, len[j + 1] - len[j]);
    out.push({ x: a.x + (b.x - a.x) * f, z: a.z + (b.z - a.z) * f });
  }
  return { pts: out, total };
}

/**
 * The outline of a shape w wide (x) and h deep (z), centred on the origin, as evenly spaced
 * points going round it, plus the total length.
 */
export function outline(shape, w, h, n = 160) {
  const pts = [];
  const raw = 360;
  if (
    shape === "round" ||
    shape === "oval" ||
    shape === "circle" ||
    shape === "ellipse"
  ) {
    for (let i = 0; i < raw; i++) {
      const t = (i / raw) * Math.PI * 2;
      pts.push({ x: (Math.cos(t) * w) / 2, z: (Math.sin(t) * h) / 2 });
    }
  } else if (shape === "hexagon" || shape === "octagon") {
    const k = shape === "hexagon" ? 6 : 8;
    for (let i = 0; i < k; i++) {
      const t = (i / k) * Math.PI * 2 + (shape === "octagon" ? Math.PI / 8 : 0);
      pts.push({ x: (Math.cos(t) * w) / 2, z: (Math.sin(t) * h) / 2 });
    }
    // Scale so the polygon fills the box.
    const xs = pts.map((p) => p.x);
    const zs = pts.map((p) => p.z);
    const sx = w / (Math.max(...xs) - Math.min(...xs));
    const sz = h / (Math.max(...zs) - Math.min(...zs));
    for (const p of pts) {
      p.x *= sx;
      p.z *= sz;
    }
  } else if (shape === "heart") {
    for (let i = 0; i < raw; i++) {
      const t = (i / raw) * Math.PI * 2;
      const x = 16 * Math.sin(t) ** 3;
      const y =
        13 * Math.cos(t) -
        5 * Math.cos(2 * t) -
        2 * Math.cos(3 * t) -
        Math.cos(4 * t);
      pts.push({ x: (x / 34) * w, z: (-(y - 2.5) / 30) * h });
    }
  } else {
    // Rounded rectangle.
    const r = Math.min(0.05, w / 4, h / 4);
    const corner = (cx, cz, a0) => {
      for (let i = 0; i <= 8; i++) {
        const t = a0 + (i / 8) * (Math.PI / 2);
        pts.push({ x: cx + Math.cos(t) * r, z: cz + Math.sin(t) * r });
      }
    };
    corner(w / 2 - r, h / 2 - r, 0);
    corner(-w / 2 + r, h / 2 - r, Math.PI / 2);
    corner(-w / 2 + r, -h / 2 + r, Math.PI);
    corner(w / 2 - r, -h / 2 + r, Math.PI * 1.5);
  }
  // Wind counter-clockwise when seen from above (x right, z towards the viewer).
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    area += a.x * b.z - b.x * a.z;
  }
  if (area < 0) pts.reverse();
  return resample(pts, n);
}

function normals2d(pts) {
  return pts.map((p, i) => {
    const a = pts[(i - 1 + pts.length) % pts.length];
    const b = pts[(i + 1) % pts.length];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const l = Math.hypot(dx, dz) || 1;
    return { x: dz / l, z: -dx / l };
  });
}

/** A flat shape (for ExtrudeGeometry and caps) from an outline; shape y maps to scene -z. */
export function shapeOf(pts) {
  const s = new THREE.Shape();
  pts.forEach((p, i) => (i ? s.lineTo(p.x, -p.z) : s.moveTo(p.x, -p.z)));
  s.closePath();
  return s;
}

/**
 * A floor-length cloth over an outline: the top, a rounded edge, then a skirt whose folds deepen
 * towards the floor. Used for table cloths, stage skirts and buffet tables.
 */
export function drape({
  shape,
  w,
  h,
  top,
  bottom = 0.005,
  cap = true,
  fold = 0.11,
  depth = 0.018,
  flare = 0.03,
  seed = 1,
}) {
  const { pts, total } = outline(shape, w, h, 0);
  const n = Math.max(48, Math.round(total / (fold / 6)));
  const { pts: ring } = outline(shape, w, h, n);
  const nor = normals2d(ring);
  const rand = rng(seed);
  const phase = ring.map(() => rand() * 0.6);
  const rows = 14;
  const edge = 0.025;
  const pos = [];
  const idx = [];
  // Edge rows: a quarter circle from the top surface down to the skirt.
  const profile = [];
  for (let i = 0; i <= 4; i++) {
    const a = (i / 4) * (Math.PI / 2);
    profile.push({
      out: Math.sin(a) * edge,
      y: top - edge + Math.cos(a) * edge,
      t: 0,
    });
  }
  for (let i = 1; i <= rows; i++) {
    const t = i / rows;
    profile.push({ out: edge, y: top - edge - (top - edge - bottom) * t, t });
  }
  let s = 0;
  const cum = ring.map((p, i) => {
    if (i) s += Math.hypot(p.x - ring[i - 1].x, p.z - ring[i - 1].z);
    return s;
  });
  for (const row of profile) {
    for (let j = 0; j < n; j++) {
      const p = ring[j];
      const q = nor[j];
      const k = row.t;
      const wave =
        Math.sin((cum[j] / fold) * Math.PI * 2 + phase[j] * k) *
        depth *
        Math.pow(k, 0.8);
      const out =
        row.out + flare * k * k + Math.max(0, wave) * 1.0 + wave * 0.6;
      pos.push(p.x + q.x * out, row.y, p.z + q.z * out);
    }
  }
  const cols = n;
  for (let r = 0; r < profile.length - 1; r++) {
    for (let j = 0; j < cols; j++) {
      const a = r * cols + j;
      const b = r * cols + ((j + 1) % cols);
      const c = (r + 1) * cols + j;
      const d = (r + 1) * cols + ((j + 1) % cols);
      idx.push(a, b, c, b, d, c);
    }
  }
  if (cap) {
    const base = pos.length / 3;
    pos.push(0, top, 0);
    for (let j = 0; j < cols; j++) idx.push(base, (j + 1) % cols, j);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** A pleated curtain w wide and h tall along x, curving back by `bow` metres. */
export function curtain(
  w,
  h,
  { bow = 0, fold = 0.16, depth = 0.05, seed = 3 } = {}
) {
  const cols = Math.max(24, Math.round(w / (fold / 6)));
  const rows = 10;
  const rand = rng(seed);
  const ph = Array.from({ length: cols + 1 }, () => rand() * 0.8);
  const pos = [];
  const idx = [];
  for (let r = 0; r <= rows; r++) {
    const y = (r / rows) * h;
    const k = 1 - r / rows;
    for (let c = 0; c <= cols; c++) {
      const u = c / cols;
      const x = (u - 0.5) * w;
      const arc = bow ? -bow * (1 - Math.pow((u - 0.5) * 2, 2)) : 0;
      const z =
        arc +
        Math.sin((x / fold) * Math.PI * 2 + ph[c] * k) *
          depth *
          (0.6 + 0.4 * k);
      pos.push(x, y, z);
    }
  }
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const a = r * (cols + 1) + c;
      const b = a + 1;
      const d = a + cols + 1;
      const e = d + 1;
      idx.push(a, b, d, b, e, d);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------- chairs

const SEAT = 0.46;

function chiavariFrame() {
  const parts = [];
  const fx = 0.19;
  const fz = 0.19;
  const bz = -0.19;
  // Legs, the back pair carrying on up into the back posts.
  parts.push(rod(V(fx, 0, fz), V(fx - 0.01, SEAT, fz - 0.01), 0.013));
  parts.push(rod(V(-fx, 0, fz), V(-fx + 0.01, SEAT, fz - 0.01), 0.013));
  parts.push(rod(V(fx, 0, bz - 0.03), V(fx - 0.01, 0.94, bz - 0.06), 0.013));
  parts.push(rod(V(-fx, 0, bz - 0.03), V(-fx + 0.01, 0.94, bz - 0.06), 0.013));
  // Seat rails and stretchers.
  for (const y of [SEAT - 0.02, 0.2]) {
    parts.push(rod(V(fx, y, fz), V(-fx, y, fz), 0.009));
    parts.push(rod(V(fx, y, fz), V(fx, y, bz - 0.035), 0.009));
    parts.push(rod(V(-fx, y, fz), V(-fx, y, bz - 0.035), 0.009));
    parts.push(rod(V(fx, y, bz - 0.04), V(-fx, y, bz - 0.04), 0.009));
  }
  // Back: three bars and a row of spindles.
  for (const y of [0.6, 0.76, 0.93]) {
    const z = bz - 0.035 - (y - SEAT) * 0.05;
    parts.push(rod(V(fx - 0.01, y, z), V(-fx + 0.01, y, z), 0.011));
  }
  for (let i = 0; i < 5; i++) {
    const x = -0.12 + i * 0.06;
    parts.push(rod(V(x, SEAT, bz - 0.04), V(x, 0.6, bz - 0.042), 0.006, 6));
  }
  return merge(parts);
}

function crossbackFrame() {
  const parts = [];
  const fx = 0.2;
  const fz = 0.2;
  const bz = -0.2;
  const leg = (x, z, h) =>
    place(new THREE.BoxGeometry(0.035, h, 0.035), x, h / 2, z);
  parts.push(leg(fx, fz, SEAT), leg(-fx, fz, SEAT));
  parts.push(
    place(new THREE.BoxGeometry(0.035, 0.92, 0.035), fx, 0.46, bz, -0.05)
  );
  parts.push(
    place(new THREE.BoxGeometry(0.035, 0.92, 0.035), -fx, 0.46, bz, -0.05)
  );
  parts.push(place(new THREE.BoxGeometry(0.44, 0.04, 0.44), 0, SEAT - 0.02, 0));
  parts.push(place(new THREE.BoxGeometry(0.4, 0.05, 0.03), 0, 0.88, bz - 0.02));
  parts.push(
    place(new THREE.BoxGeometry(0.4, 0.03, 0.025), 0, SEAT + 0.07, bz - 0.005)
  );
  // The cross.
  const len = Math.hypot(0.36, 0.3);
  const ang = Math.atan2(0.3, 0.36);
  parts.push(
    place(
      new THREE.BoxGeometry(len, 0.022, 0.018),
      0,
      0.71,
      bz - 0.012,
      0,
      0,
      ang
    )
  );
  parts.push(
    place(
      new THREE.BoxGeometry(len, 0.022, 0.018),
      0,
      0.71,
      bz - 0.012,
      0,
      0,
      -ang
    )
  );
  parts.push(place(new THREE.BoxGeometry(0.4, 0.02, 0.02), 0, 0.15, fz - 0.01));
  return merge(parts);
}

function ghostFrame() {
  const parts = [];
  const seat = new RoundedBoxGeometry(0.42, 0.04, 0.42, 3, 0.03);
  parts.push(place(seat, 0, SEAT - 0.02, 0));
  // Medallion back.
  const back = new THREE.CylinderGeometry(0.2, 0.2, 0.025, 32, 1);
  parts.push(
    place(back, 0, 0.73, -0.2, Math.PI / 2 - 0.12, 0, 0, [1, 1, 1.25])
  );
  const ring = new THREE.TorusGeometry(0.2, 0.016, 8, 40);
  parts.push(place(ring, 0, 0.73, -0.2, -0.12, 0, 0, [1, 1.25, 1]));
  for (const x of [-0.18, 0.18]) {
    parts.push(rod(V(x, 0, 0.19), V(x * 0.95, SEAT - 0.02, 0.17), 0.016));
    parts.push(rod(V(x, 0, -0.22), V(x * 0.95, SEAT - 0.02, -0.18), 0.016));
    parts.push(
      rod(V(x * 0.95, SEAT - 0.02, -0.19), V(x * 0.7, 0.62, -0.21), 0.015)
    );
  }
  return merge(parts);
}

function coverBody() {
  const parts = [];
  // A spandex cover: a box to the floor with a softly rounded top, and a tall rounded back.
  parts.push(
    place(
      new RoundedBoxGeometry(0.46, SEAT + 0.04, 0.48, 4, 0.05),
      0,
      (SEAT + 0.04) / 2,
      0
    )
  );
  parts.push(
    place(
      new RoundedBoxGeometry(0.46, 0.5, 0.09, 4, 0.04),
      0,
      SEAT + 0.24,
      -0.205,
      -0.05
    )
  );
  return merge(parts);
}

/** Chair frames (front facing +z), cushions, sashes and covers. */
export function chairGeometries() {
  const cushion = place(
    new RoundedBoxGeometry(0.38, 0.05, 0.38, 3, 0.022),
    0,
    SEAT + 0.02,
    0.005
  );
  // A sash: a band round the back posts and a bow behind.
  const band = place(
    new RoundedBoxGeometry(0.43, 0.075, 0.07, 2, 0.02),
    0,
    0.68,
    -0.23
  );
  const bowL = place(
    new THREE.SphereGeometry(0.05, 12, 8),
    -0.05,
    0.68,
    -0.28,
    0,
    0,
    0.5,
    [1.3, 0.7, 0.45]
  );
  const bowR = place(
    new THREE.SphereGeometry(0.05, 12, 8),
    0.05,
    0.68,
    -0.28,
    0,
    0,
    -0.5,
    [1.3, 0.7, 0.45]
  );
  const knot = place(new THREE.SphereGeometry(0.022, 10, 8), 0, 0.68, -0.285);
  const tail1 = place(
    new THREE.BoxGeometry(0.05, 0.3, 0.008),
    -0.025,
    0.52,
    -0.28,
    0.05,
    0,
    0.1
  );
  const tail2 = place(
    new THREE.BoxGeometry(0.05, 0.28, 0.008),
    0.03,
    0.53,
    -0.282,
    0.05,
    0,
    -0.12
  );
  const sash = merge([band, bowL, bowR, knot, tail1, tail2]);
  const coverSash = merge([
    place(new RoundedBoxGeometry(0.48, 0.09, 0.12, 2, 0.03), 0, 0.62, -0.205),
    place(
      new THREE.SphereGeometry(0.06, 12, 8),
      -0.06,
      0.62,
      -0.28,
      0,
      0,
      0.5,
      [1.3, 0.7, 0.45]
    ),
    place(
      new THREE.SphereGeometry(0.06, 12, 8),
      0.06,
      0.62,
      -0.28,
      0,
      0,
      -0.5,
      [1.3, 0.7, 0.45]
    ),
    place(
      new THREE.BoxGeometry(0.06, 0.34, 0.008),
      -0.03,
      0.44,
      -0.282,
      0.04,
      0,
      0.1
    ),
    place(
      new THREE.BoxGeometry(0.06, 0.32, 0.008),
      0.035,
      0.45,
      -0.284,
      0.04,
      0,
      -0.1
    ),
  ]);
  return {
    chiavari: chiavariFrame(),
    crossback: crossbackFrame(),
    ghost: ghostFrame(),
    cover: coverBody(),
    cushion,
    sash,
    coverSash,
  };
}

// ---------------------------------------------------------------- tableware

export function tablewareGeometries() {
  const charger = new THREE.CylinderGeometry(0.165, 0.165, 0.008, 40);
  place(charger, 0, 0.004, 0);
  const plateProfile = [
    new THREE.Vector2(0, 0.009),
    new THREE.Vector2(0.09, 0.009),
    new THREE.Vector2(0.12, 0.016),
    new THREE.Vector2(0.135, 0.022),
    new THREE.Vector2(0.13, 0.024),
    new THREE.Vector2(0.11, 0.019),
    new THREE.Vector2(0.0, 0.017),
  ];
  const plate = new THREE.LatheGeometry(plateProfile, 36);
  const napkin = merge([
    place(
      new RoundedBoxGeometry(0.09, 0.03, 0.15, 2, 0.012),
      0,
      0.04,
      0,
      0,
      0.6,
      0
    ),
    place(new THREE.ConeGeometry(0.03, 0.09, 12), 0.0, 0.075, 0.0, 0, 0, 0),
  ]);
  const glassProfile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.035, 0.0),
    new THREE.Vector2(0.035, 0.003),
    new THREE.Vector2(0.005, 0.008),
    new THREE.Vector2(0.004, 0.09),
    new THREE.Vector2(0.03, 0.11),
    new THREE.Vector2(0.04, 0.15),
    new THREE.Vector2(0.034, 0.2),
    new THREE.Vector2(0.032, 0.2),
    new THREE.Vector2(0.037, 0.15),
    new THREE.Vector2(0.0, 0.115),
  ];
  const glass = merge([
    new THREE.LatheGeometry(glassProfile, 20),
    place(
      new THREE.LatheGeometry(glassProfile, 20),
      0.075,
      0,
      0.02,
      0,
      0,
      0,
      [0.85, 0.8, 0.85]
    ),
  ]);
  return { charger, plate, napkin, glass };
}

// ---------------------------------------------------------------- flowers

/** One flower head: a squashed, slightly ruffled sphere. */
export function budGeometry() {
  const g = new THREE.IcosahedronGeometry(1, 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const v = V(p.getX(i), p.getY(i), p.getZ(i));
    const ruffle = 1 + 0.12 * Math.sin(v.x * 9) * Math.sin(v.y * 7 + v.z * 5);
    v.multiplyScalar(ruffle);
    v.y *= 0.72;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

export function leafGeometry() {
  const g = new THREE.SphereGeometry(1, 8, 6);
  place(g, 0, 0, 0.6, 0, 0, 0, [0.35, 0.08, 1]);
  return g;
}

/**
 * Local transforms (position, scale, colour jitter) for flower heads arranged as a ball, a low
 * mound, a garland line or a flat wall.
 */
export function arrangement(kind, count, size, seed = 7) {
  const r = rng(seed);
  const out = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    let pos;
    let nrm;
    if (kind === "ball" || kind === "mound") {
      const yy =
        kind === "ball"
          ? 1 - (i / (count - 1)) * 1.7
          : 1 - (i / (count - 1)) * 0.95;
      const rad = Math.sqrt(Math.max(0, 1 - yy * yy));
      const th = golden * i;
      nrm = V(Math.cos(th) * rad, yy, Math.sin(th) * rad);
      pos = nrm.clone().multiplyScalar(size * (0.95 + r() * 0.1));
      if (kind === "mound") pos.y *= 0.55;
    } else if (kind === "wall") {
      const cols = Math.ceil(Math.sqrt(count * (size.w / size.h)));
      const c = i % cols;
      const rr = Math.floor(i / cols);
      const rowsN = Math.ceil(count / cols);
      pos = V(
        ((c + 0.5 + (r() - 0.5) * 0.6) / cols - 0.5) * size.w,
        ((rr + 0.5 + (r() - 0.5) * 0.6) / rowsN) * size.h,
        (r() - 0.5) * 0.04
      );
      nrm = V(0, 0, 1);
    } else {
      // garland along x from -size/2 to size/2
      pos = V(
        (i / Math.max(1, count - 1) - 0.5) * size,
        (r() - 0.5) * 0.08,
        (r() - 0.5) * 0.1
      );
      nrm = V(0, 1, 0.3).normalize();
    }
    const s = 0.045 + r() * 0.025;
    out.push({
      pos,
      nrm,
      s,
      jitter: 0.82 + r() * 0.3,
      leaf: r() < 0.22,
      spin: r() * Math.PI * 2,
    });
  }
  return out;
}

// ---------------------------------------------------------------- centrepieces

export function centrepieceGeometries() {
  const vaseProfile = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.09, 0),
    new THREE.Vector2(0.09, 0.012),
    new THREE.Vector2(0.025, 0.04),
    new THREE.Vector2(0.018, 0.4),
    new THREE.Vector2(0.06, 0.58),
    new THREE.Vector2(0.12, 0.64),
    new THREE.Vector2(0.115, 0.645),
    new THREE.Vector2(0.0, 0.6),
  ];
  const vase = new THREE.LatheGeometry(vaseProfile, 28);
  const tray = new THREE.CylinderGeometry(0.28, 0.28, 0.012, 40);
  place(tray, 0, 0.006, 0);
  const candle = new THREE.CylinderGeometry(0.035, 0.035, 1, 20);
  place(candle, 0, 0.5, 0);
  const flame = new THREE.SphereGeometry(0.012, 10, 8);
  place(flame, 0, 0.015, 0, 0, 0, 0, [1, 2.2, 1]);
  const votive = new THREE.CylinderGeometry(0.03, 0.028, 0.06, 16, 1, true);
  place(votive, 0, 0.03, 0);
  const lanternParts = [];
  const lw = 0.11;
  for (const [x, z] of [
    [lw, lw],
    [-lw, lw],
    [lw, -lw],
    [-lw, -lw],
  ])
    lanternParts.push(rod(V(x, 0.02, z), V(x, 0.42, z), 0.008, 6));
  lanternParts.push(
    place(new THREE.BoxGeometry(0.26, 0.025, 0.26), 0, 0.012, 0)
  );
  lanternParts.push(
    place(new THREE.ConeGeometry(0.17, 0.12, 4), 0, 0.48, 0, 0, Math.PI / 4, 0)
  );
  lanternParts.push(
    place(new THREE.TorusGeometry(0.035, 0.007, 6, 16), 0, 0.57, 0)
  );
  const lantern = merge(lanternParts);
  // Crossed planes, so a candle glow reads from any angle without billboarding each instance.
  const glow = merge([
    place(new THREE.PlaneGeometry(1, 1), 0, 0, 0, -Math.PI / 2),
    new THREE.PlaneGeometry(1, 1),
    place(new THREE.PlaneGeometry(1, 1), 0, 0, 0, 0, Math.PI / 3),
    place(new THREE.PlaneGeometry(1, 1), 0, 0, 0, 0, -Math.PI / 3),
  ]);
  return { vase, tray, candle, flame, votive, lantern, glow };
}
