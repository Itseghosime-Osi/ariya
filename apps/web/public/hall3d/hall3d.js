// The 3D hall: a realistic, to-scale event hall on an endless board. The seating studio drives it
// through postMessage (see the protocol at the bottom); this page only draws the hall and reports
// what the planner does with the pointer.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import {
  CSS2DRenderer,
  CSS2DObject,
} from "three/addons/renderers/CSS2DRenderer.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import {
  arrangement,
  budGeometry,
  centrepieceGeometries,
  chairGeometries,
  curtain,
  drape,
  hash,
  leafGeometry,
  merge,
  outline,
  place,
  rng,
  rod,
  shapeOf,
  tablewareGeometries,
} from "./geo.js";
import * as T from "./textures.js";

const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;
const TABLE_H = 0.76;
const DEG = Math.PI / 180;

// ---------------------------------------------------------------- renderer

const stage = document.getElementById("stage");
let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: true,
    // By day the canvas is see-through, so the page's own background shows round the hall.
    alpha: true,
  });
} catch {
  document.body.classList.add("no-webgl");
  post({ t: "error", reason: "webgl" });
  throw new Error("WebGL is not available");
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.domElement.setAttribute("aria-hidden", "true");
stage.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.domElement.className = "labels";
stage.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 2000);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(
  new THREE.Vector2(256, 256),
  0.32,
  0.35,
  0.92
);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ---------------------------------------------------------------- endless board

const boardMat = new THREE.ShaderMaterial({
  uniforms: {
    uBg: { value: new THREE.Color("#f2f2f0") },
    uDot: { value: new THREE.Color("#c5c5c2") },
    uCam: { value: new THREE.Vector3() },
    uOpaque: { value: 0 },
  },
  transparent: true,
  depthWrite: false,
  vertexShader: /* glsl */ `
    varying vec3 vW;
    void main() {
      vec4 w = modelMatrix * vec4(position, 1.0);
      vW = w.xyz;
      gl_Position = projectionMatrix * viewMatrix * w;
    }`,
  fragmentShader: /* glsl */ `
    uniform vec3 uBg; uniform vec3 uDot; uniform vec3 uCam; uniform float uOpaque;
    varying vec3 vW;
    void main() {
      vec2 g = (fract(vW.xz + 0.5) - 0.5);
      float d = length(g);
      float fw = fwidth(d);
      float r = 0.045;
      float a = 1.0 - smoothstep(r - fw, r + fw, d);
      a *= clamp(r / (fw * 2.5), 0.0, 1.0);
      // Opaque in the evening; by day only the dots are drawn over the page.
      gl_FragColor = vec4(mix(uBg, uDot, a), max(uOpaque, a));
      #include <colorspace_fragment>
    }`,
});
const board = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), boardMat);
board.rotation.x = -Math.PI / 2;
board.position.y = -0.2;
board.renderOrder = -1;
scene.add(board);

// ---------------------------------------------------------------- lights

const hemi = new THREE.HemisphereLight("#ffffff", "#d8c8b0", 0.5);
scene.add(hemi);
const key = new THREE.DirectionalLight("#ffffff", 2);
key.castShadow = true;
key.shadow.mapSize.set(4096, 4096);
key.shadow.bias = -0.0004;
key.shadow.normalBias = 0.02;
key.shadow.radius = 3;
scene.add(key, key.target);

// ---------------------------------------------------------------- materials

const M = {
  cloth: new THREE.MeshPhysicalMaterial({
    color: "#ffffff",
    roughness: 0.82,
    sheen: 0.6,
    sheenRoughness: 0.6,
    sheenColor: new THREE.Color("#9a9a9a"),
    side: THREE.DoubleSide,
  }),
  fabric: new THREE.MeshPhysicalMaterial({
    color: "#ffffff",
    roughness: 0.7,
    sheen: 0.7,
    sheenRoughness: 0.4,
    sheenColor: new THREE.Color("#b0b0b0"),
  }),
  gold: new THREE.MeshStandardMaterial({
    color: "#d9b46c",
    metalness: 1,
    roughness: 0.27,
  }),
  silver: new THREE.MeshStandardMaterial({
    color: "#dfe3e8",
    metalness: 1,
    roughness: 0.22,
  }),
  whitePaint: new THREE.MeshStandardMaterial({
    color: "#f4f1ea",
    metalness: 0.1,
    roughness: 0.35,
  }),
  wood: new THREE.MeshStandardMaterial({ color: "#7b4f2c", roughness: 0.62 }),
  ghost: new THREE.MeshPhysicalMaterial({
    color: "#ffffff",
    transparent: true,
    opacity: 0.32,
    roughness: 0.04,
    metalness: 0,
    clearcoat: 1,
    depthWrite: false,
  }),
  cushion: new THREE.MeshStandardMaterial({
    color: "#efe6d6",
    roughness: 0.92,
  }),
  porcelain: new THREE.MeshPhysicalMaterial({
    color: "#fbfaf6",
    roughness: 0.18,
    clearcoat: 0.6,
  }),
  glass: new THREE.MeshPhysicalMaterial({
    color: "#ffffff",
    transparent: true,
    opacity: 0.28,
    roughness: 0.02,
    metalness: 0,
    clearcoat: 1,
    depthWrite: false,
  }),
  flower: new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.72 }),
  leaf: new THREE.MeshStandardMaterial({ color: "#3f5f36", roughness: 0.7 }),
  wax: new THREE.MeshStandardMaterial({
    color: "#f6efe2",
    roughness: 0.6,
    emissive: "#ffb766",
    emissiveIntensity: 0,
  }),
  flame: new THREE.MeshBasicMaterial({ color: "#ffd690", toneMapped: false }),
  glow: new THREE.MeshBasicMaterial({
    map: T.glow(),
    color: "#ffb35a",
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  }),
  ghostTable: new THREE.MeshBasicMaterial({
    color: "#c9a465",
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  }),
  hit: new THREE.MeshBasicMaterial({ visible: false }),
};

function chairFrameMaterial(type) {
  return type === "chiavari-silver"
    ? M.silver
    : type === "chiavari-white"
      ? M.whitePaint
      : type === "crossback"
        ? M.wood
        : type === "ghost"
          ? M.ghost
          : M.gold;
}

// ---------------------------------------------------------------- instanced batches

const G = {
  ...chairGeometries(),
  ...tablewareGeometries(),
  ...centrepieceGeometries(),
  bud: budGeometry(),
  leaf: leafGeometry(),
};
const instanced = new THREE.Group();
scene.add(instanced);

class Batch {
  constructor(
    geo,
    mat,
    { shadow = true, receive = false, colored = false } = {}
  ) {
    this.geo = geo;
    this.mat = mat;
    this.shadow = shadow;
    this.receive = receive;
    this.colored = colored;
    this.mesh = null;
    this.mats = [];
    this.cols = [];
  }
  reset() {
    this.mats.length = 0;
    this.cols.length = 0;
  }
  push(m, c) {
    this.mats.push(m.clone());
    if (this.colored)
      this.cols.push(
        c instanceof THREE.Color ? c : new THREE.Color(c ?? "#ffffff")
      );
  }
  commit() {
    const n = this.mats.length;
    if (!this.mesh || this.mesh.instanceMatrix.count < n) {
      if (this.mesh) {
        instanced.remove(this.mesh);
        this.mesh.dispose();
      }
      const cap = Math.max(16, Math.ceil(n * 1.5));
      this.mesh = new THREE.InstancedMesh(this.geo, this.mat, cap);
      this.mesh.castShadow = this.shadow;
      this.mesh.receiveShadow = this.receive;
      this.mesh.frustumCulled = false;
      if (this.colored)
        this.mesh.instanceColor = new THREE.InstancedBufferAttribute(
          new Float32Array(cap * 3),
          3
        );
      instanced.add(this.mesh);
    }
    for (let i = 0; i < n; i++) {
      this.mesh.setMatrixAt(i, this.mats[i]);
      if (this.colored) this.mesh.setColorAt(i, this.cols[i]);
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.colored && this.mesh.instanceColor)
      this.mesh.instanceColor.needsUpdate = true;
  }
}

const batches = new Map();
function batch(key, make) {
  if (!batches.has(key)) batches.set(key, make());
  return batches.get(key);
}

const clothGeo = new Map();
function clothFor(top, seed) {
  const k = `${top.kind}:${top.w.toFixed(2)}:${top.h.toFixed(2)}`;
  if (!clothGeo.has(k))
    clothGeo.set(
      k,
      drape({
        shape:
          top.kind === "circle"
            ? "round"
            : top.kind === "ellipse"
              ? "oval"
              : "rect",
        w: top.w,
        h: top.h,
        top: TABLE_H,
        seed,
      })
    );
  return { key: k, geo: clothGeo.get(k) };
}

// Fixed flower arrangements, reused for every centrepiece.
const ARR = {
  ball: arrangement("ball", 80, 0.26, 3),
  mound: arrangement("mound", 56, 0.24, 8),
  small: arrangement("mound", 18, 0.1, 12),
};

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpV = new THREE.Vector3();
const tmpS = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

function mat(x, y, z, ry = 0, s = 1) {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromAxisAngle(UP, ry),
    typeof s === "number" ? new THREE.Vector3(s, s, s) : s
  );
}

/** Push a flower arrangement into the bud and leaf batches. */
function pushFlowers(parent, arr, colour, scale = 1) {
  const buds = batch(
    "bud",
    () => new Batch(G.bud, M.flower, { colored: true })
  );
  const leaves = batch(
    "leaf",
    () => new Batch(G.leaf, M.leaf, { shadow: false })
  );
  const base = new THREE.Color(colour);
  for (const b of arr) {
    tmpQ.setFromUnitVectors(UP, b.nrm);
    const spin = new THREE.Quaternion().setFromAxisAngle(b.nrm, b.spin);
    tmpQ.premultiply(spin);
    tmpV.copy(b.pos).multiplyScalar(scale);
    if (b.leaf) {
      tmpS.set(b.s * 2.2, b.s * 2.2, b.s * 2.2);
      tmpM.compose(tmpV, tmpQ, tmpS);
      leaves.push(parent.clone().multiply(tmpM));
    } else {
      tmpS.set(b.s * scale, b.s * scale, b.s * scale);
      tmpM.compose(tmpV, tmpQ, tmpS);
      const c = base.clone().multiplyScalar(b.jitter);
      buds.push(parent.clone().multiply(tmpM), c);
    }
  }
}

function pushCentrepiece(tm, kind, flower, top, seed) {
  if (kind === "none") return;
  const spots = [];
  if (top.kind === "rect" && top.w > 2.3) {
    const n = Math.max(2, Math.round(top.w / 1.8));
    for (let i = 0; i < n; i++) spots.push((i / (n - 1) - 0.5) * (top.w - 1.0));
  } else spots.push(0);
  const r = rng(seed);
  for (const sx of spots) {
    const at = tm.clone().multiply(mat(sx, TABLE_H, 0, r() * Math.PI));
    if (kind === "tall") {
      batch("vase", () => new Batch(G.vase, M.glass, { shadow: false })).push(
        at
      );
      batch("tray", () => new Batch(G.tray, M.gold)).push(
        at.clone().multiply(mat(0, 0, 0, 0, 0.55))
      );
      pushFlowers(at.clone().multiply(mat(0, 0.88, 0)), ARR.ball, flower);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.4;
        const v = at
          .clone()
          .multiply(mat(Math.cos(a) * 0.2, 0, Math.sin(a) * 0.2));
        batch(
          "votive",
          () => new Batch(G.votive, M.glass, { shadow: false })
        ).push(v);
        batch(
          "flame",
          () => new Batch(G.flame, M.flame, { shadow: false })
        ).push(v.clone().multiply(mat(0, 0.035, 0)));
        batch("glow", () => new Batch(G.glow, M.glow, { shadow: false })).push(
          v.clone().multiply(mat(0, 0.05, 0, 0, 0.16))
        );
      }
    } else if (kind === "low") {
      batch("tray", () => new Batch(G.tray, M.gold)).push(at);
      pushFlowers(at.clone().multiply(mat(0, 0.03, 0)), ARR.mound, flower);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const v = at
          .clone()
          .multiply(mat(Math.cos(a) * 0.36, 0, Math.sin(a) * 0.36));
        batch(
          "votive",
          () => new Batch(G.votive, M.glass, { shadow: false })
        ).push(v);
        batch(
          "flame",
          () => new Batch(G.flame, M.flame, { shadow: false })
        ).push(v.clone().multiply(mat(0, 0.035, 0)));
        batch("glow", () => new Batch(G.glow, M.glow, { shadow: false })).push(
          v.clone().multiply(mat(0, 0.05, 0, 0, 0.16))
        );
      }
    } else if (kind === "candles") {
      batch("tray", () => new Batch(G.tray, M.gold)).push(at);
      const hs = [0.32, 0.22, 0.16, 0.26, 0.12];
      hs.forEach((h, i) => {
        const a = (i / hs.length) * Math.PI * 2;
        const rr = i === 0 ? 0 : 0.13;
        const p = mat(Math.cos(a) * rr, 0.012, Math.sin(a) * rr);
        batch("candle", () => new Batch(G.candle, M.wax)).push(
          at
            .clone()
            .multiply(p)
            .multiply(new THREE.Matrix4().makeScale(1, h, 1))
        );
        const f = at
          .clone()
          .multiply(p)
          .multiply(mat(0, h + 0.012, 0));
        batch(
          "flame",
          () => new Batch(G.flame, M.flame, { shadow: false })
        ).push(f);
        batch("glow", () => new Batch(G.glow, M.glow, { shadow: false })).push(
          f.clone().multiply(mat(0, 0.02, 0, 0, 0.22))
        );
      });
      pushFlowers(
        at.clone().multiply(mat(0, 0.02, 0)),
        ARR.small.map((b) => ({
          ...b,
          pos: b.pos.clone().multiplyScalar(2.4),
        })),
        flower
      );
    } else if (kind === "lanterns") {
      batch("lantern", () => new Batch(G.lantern, M.gold)).push(at);
      batch("candle", () => new Batch(G.candle, M.wax)).push(
        at
          .clone()
          .multiply(mat(0, 0.025, 0))
          .multiply(new THREE.Matrix4().makeScale(1.2, 0.18, 1.2))
      );
      const f = at.clone().multiply(mat(0, 0.22, 0));
      batch("flame", () => new Batch(G.flame, M.flame, { shadow: false })).push(
        f
      );
      batch("glow", () => new Batch(G.glow, M.glow, { shadow: false })).push(
        f.clone().multiply(mat(0, 0.02, 0, 0, 0.3))
      );
      pushFlowers(
        at.clone().multiply(mat(0.2, 0.02, 0.05)),
        ARR.small,
        flower,
        1.3
      );
      pushFlowers(
        at.clone().multiply(mat(-0.18, 0.02, -0.08)),
        ARR.small,
        flower,
        1.1
      );
    }
  }
}

/** Where a chair faces: towards the table centre for rounds, straight across for banquets. */
function chairYaw(top, cx, cz, shape) {
  if (top.kind === "rect") return shape === "head" ? 0 : cz < 0 ? 0 : Math.PI;
  return Math.atan2(-cx, -cz);
}

/**
 * A couch: a seat wide enough for two, with a back and arms. Drawn from boxes rather than a new
 * geometry so it costs nothing when no couch is placed.
 */
function pushCouch(m, cover) {
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.42, 0.7), M.fabric);
  seat.position.y = 0.21;
  seat.castShadow = true;
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.55, 0.16), M.fabric);
  back.position.set(0, 0.62, -0.27);
  back.castShadow = true;
  const arm = new THREE.BoxGeometry(0.16, 0.3, 0.7);
  const left = new THREE.Mesh(arm, M.fabric);
  left.position.set(-0.67, 0.5, 0);
  const right = new THREE.Mesh(arm, M.fabric);
  right.position.set(0.67, 0.5, 0);
  const g = new THREE.Group();
  g.add(seat, back, left, right);
  g.traverse((o) => {
    if (o.isMesh) o.material = M.fabric;
  });
  const mesh = g.clone();
  mesh.applyMatrix4(m);
  // The colour is per couch, so it cannot ride the shared material.
  mesh.traverse((o) => {
    if (o.isMesh) {
      o.material = M.fabric.clone();
      o.material.color = new THREE.Color(cover || "#f4efe6");
    }
  });
  scene.add(mesh);
  couchMeshes.push(mesh);
}

function pushChair(m, type, cover, sash, settings, sashOn = true) {
  if (type === "covered") {
    batch("cover", () => new Batch(G.cover, M.fabric, { colored: true })).push(
      m,
      cover
    );
    if (sash && sashOn)
      batch(
        "coverSash",
        () => new Batch(G.coverSash, M.fabric, { colored: true })
      ).push(m, sash);
  } else {
    const frame =
      type === "crossback"
        ? G.crossback
        : type === "ghost"
          ? G.ghost
          : G.chiavari;
    batch(
      "frame:" + type,
      () => new Batch(frame, chairFrameMaterial(type))
    ).push(m);
    if (type !== "ghost")
      batch("cushion", () => new Batch(G.cushion, M.cushion)).push(m);
    if (sash && sashOn && type !== "ghost")
      batch("sash", () => new Batch(G.sash, M.fabric, { colored: true })).push(
        m,
        sash
      );
  }
  if (settings) {
    const s = m.clone().multiply(mat(0, TABLE_H, 0.47));
    batch(
      "charger",
      () => new Batch(G.charger, M.gold, { shadow: false, receive: true })
    ).push(s);
    batch(
      "plate",
      () => new Batch(G.plate, M.porcelain, { shadow: false })
    ).push(s);
    batch(
      "napkin",
      () => new Batch(G.napkin, M.fabric, { colored: true, shadow: false })
    ).push(s.clone().multiply(mat(0, 0.012, 0, 0.3)), settings);
    batch("glass", () => new Batch(G.glass, M.glass, { shadow: false })).push(
      m.clone().multiply(mat(-0.14, TABLE_H, 0.6))
    );
  }
}

function rebuildInstances() {
  for (const b of batches.values()) b.reset();
  for (const t of state.tables) {
    if (hiddenSet.has("table:" + t.id)) continue;
    const item = items.get("table:" + t.id);
    if (!item) continue;
    const o = item.obj;
    const tm = mat(o.position.x, 0, o.position.z, o.rotation.y);
    const st = t.style;
    const { key: ck, geo } = clothFor(t.top, hash(t.id));
    batch(
      "cloth:" + ck,
      () => new Batch(geo, M.cloth, { colored: true, receive: true })
    ).push(tm, st.cloth);
    for (const c of t.chairs) {
      const yaw = chairYaw(t.top, c.x, c.y, t.shape);
      const m = tm.clone().multiply(mat(c.x, 0, c.y, yaw));
      pushChair(m, st.chair, st.cover, st.sash, st.sash || st.cloth);
    }
    pushCentrepiece(tm, st.centrepiece, st.flower, t.top, hash(t.id) % 1000);
  }
  for (const mesh of couchMeshes) {
    scene.remove(mesh);
    mesh.traverse((o) => {
      if (o.isMesh) o.material.dispose();
    });
  }
  couchMeshes.length = 0;
  for (const c of state.chairs) {
    if (hiddenSet.has("chair:" + c.id)) continue;
    const item = items.get("chair:" + c.id);
    if (!item) continue;
    const o = item.obj;
    // `lift` is the deck a chair stands on, so a chair on a stage is not sunk into it.
    const m = mat(o.position.x, c.lift || 0, o.position.z, o.rotation.y);
    if (c.seat === "couch") pushCouch(m, c.cover);
    else pushChair(m, c.type, c.cover, c.sash, null);
  }
  for (const g of state.ghosts) {
    const geo = g.top.kind === "rect" ? ghostBox : ghostDisc;
    const s =
      g.top.kind === "rect"
        ? new THREE.Vector3(g.top.w + 1, 1, g.top.h + 1)
        : new THREE.Vector3(g.top.w + 1, 1, g.top.w + 1);
    batch(
      "ghost:" + g.top.kind,
      () => new Batch(geo, M.ghostTable, { shadow: false })
    ).push(mat(g.x, 0.02, g.y, -g.rot * DEG, s));
  }
  for (const b of batches.values()) b.commit();
  renderer.shadowMap.needsUpdate = true;
  requestRender();
}
const glowPlane = new THREE.PlaneGeometry(1, 1);
const ghostDisc = place(
  new THREE.CylinderGeometry(0.5, 0.5, 0.03, 40),
  0,
  0,
  0
);
const ghostBox = place(new THREE.BoxGeometry(1, 0.03, 1), 0, 0, 0);

// ---------------------------------------------------------------- hall shell

const shell = new THREE.Group();
scene.add(shell);
let shellSig = "";
const walls = [];
/** Roofs that hide the plan from above, and the height at which they start to. */
const roofs = [];

function disposeGroup(g) {
  g.traverse((o) => {
    if (o.geometry && !o.userData.sharedGeo) o.geometry.dispose();
  });
  g.clear();
}

function floorMaterial(finish, W, L) {
  let map;
  let size = 2.4;
  const m = new THREE.MeshPhysicalMaterial({ roughness: 0.3, clearcoat: 0 });
  if (finish === "wood") {
    map = T.wood();
    m.roughness = 0.45;
    m.clearcoat = 0.4;
  } else if (finish === "dark") {
    map = T.marble("#2a2427");
    m.roughness = 0.12;
    m.clearcoat = 1;
    m.color.set("#8a8487");
  } else if (finish === "carpet") {
    map = T.carpet();
    size = 1.6;
    m.roughness = 1;
  } else {
    map = T.marble();
    m.roughness = 0.2;
    m.clearcoat = 0.35;
    m.clearcoatRoughness = 0.15;
    m.color.set("#e9e4dc");
  }
  map = map.clone();
  map.needsUpdate = true;
  map.repeat.set(W / size, L / size);
  m.map = map;
  return m;
}

// ---------------------------------------------------------------- venue

/** The venue facts the app sends with the layout. Absent means a plain indoor hall. */
function venueOf(L) {
  return L.venue ?? { type: "hall", environment: "indoor" };
}

/** Venues with no roof over the tables. */
const OPEN_TYPES = new Set(["garden", "field", "beach", "rooftop"]);
/** Venues roofed by fabric on legs rather than walls. */
const TENT_TYPES = new Set(["marquee", "pole-tent", "stretch-tent"]);

function isOpen(venue) {
  return OPEN_TYPES.has(venue.type) || venue.environment === "outdoor";
}

function isTent(venue) {
  return TENT_TYPES.has(venue.type);
}

/**
 * The ground the venue stands on, or null to use the decor floor.
 *
 * The answer the host gave wins over the venue type, so a marquee on gravel draws gravel.
 */
function groundTexture(venue) {
  const floor = venue.structure?.floor;
  if (floor === "grass") return T.grass();
  if (floor === "sand") return T.sand();
  if (floor === "gravel") return T.sand("#8f8a7e");
  if (floor === "soil") return T.grass("#6b5a44");
  if (floor === "deck") return T.wood();
  if (venue.type === "beach") return T.sand();
  if (venue.type === "garden" || venue.type === "field") return T.grass();
  return null;
}

/** The leg module a tent snaps to, in metres, or 0 when the venue has no leg grid. */
function legModule(venue) {
  if (!isTent(venue)) return 0;
  const m = venue.structure?.legModule;
  return m === 3 || m === 5 ? m : 0;
}

function buildShell(L) {
  const { width: W, length: Ln, ceiling: H, decor, mood } = L;
  const venue = venueOf(L);
  const sig = JSON.stringify([
    W,
    Ln,
    H,
    decor.floor,
    decor.wall,
    decor.drape,
    decor.uplight,
    mood,
    L.chandeliers,
    venue.type,
    venue.environment,
    venue.structure?.floor,
    venue.structure?.legModule,
  ]);
  if (sig === shellSig) return;
  shellSig = sig;
  disposeGroup(shell);
  walls.length = 0;
  roofs.length = 0;
  const evening = mood === "evening";
  const open = isOpen(venue);
  const tent = isTent(venue);

  // Floor slab. An open-air venue stands on its own ground rather than a polished floor.
  const ground = groundTexture(venue);
  const top = ground
    ? (() => {
        const m = new THREE.MeshStandardMaterial({
          map: ground.clone(),
          roughness: 0.95,
        });
        m.map.needsUpdate = true;
        m.map.repeat.set((W + 0.6) / 2, (Ln + 0.6) / 2);
        return m;
      })()
    : floorMaterial(decor.floor, W + 0.6, Ln + 0.6);
  const slab = new THREE.Mesh(new THREE.BoxGeometry(W + 0.6, 0.2, Ln + 0.6), [
    new THREE.MeshStandardMaterial({ color: "#d9d2c6", roughness: 0.8 }),
    new THREE.MeshStandardMaterial({ color: "#d9d2c6", roughness: 0.8 }),
    top,
    new THREE.MeshStandardMaterial({ color: "#d9d2c6" }),
    new THREE.MeshStandardMaterial({ color: "#d9d2c6", roughness: 0.8 }),
    new THREE.MeshStandardMaterial({ color: "#d9d2c6", roughness: 0.8 }),
  ]);
  slab.position.set(W / 2, -0.1, Ln / 2);
  slab.receiveShadow = true;
  shell.add(slab);

  if (open) {
    buildOpenVenue(venue, W, Ln, evening);
  } else if (tent) {
    buildTent(venue, W, Ln, H, evening);
  } else {
    buildWalls(decor, W, Ln, H, evening);
    if (venue.type === "church") buildChurch(W, Ln, evening);
  }

  // Chandeliers.
  if (L.chandeliers && !open) {
    buildChandeliers(W, Ln, H, evening);
  }

  // Key light and shadow camera over the hall.
  key.position.set(
    W / 2 + W * 0.25,
    Math.max(W, Ln) * 0.9 + 10,
    Ln / 2 + Ln * 0.35
  );
  key.target.position.set(W / 2, 0, Ln / 2);
  const ext = Math.max(W, Ln) * 0.8 + 4;
  Object.assign(key.shadow.camera, {
    left: -ext,
    right: ext,
    top: ext,
    bottom: -ext,
    near: 1,
    far: Math.max(W, Ln) * 3 + 40,
  });
  key.shadow.camera.updateProjectionMatrix();
}

/** A terrace, garden, field or beach: a parapet or nothing, and the sky above. */
function buildOpenVenue(venue, W, Ln, evening) {
  if (venue.type === "rooftop") {
    // A low parapet, so the terrace reads as a roof rather than a floating floor.
    const mat = new THREE.MeshStandardMaterial({
      color: "#cfc7ba",
      roughness: 0.9,
    });
    const h = 1.05;
    const t = 0.18;
    for (const d of [
      { len: W + 2 * t, x: W / 2, z: -t / 2, ry: 0 },
      { len: W + 2 * t, x: W / 2, z: Ln + t / 2, ry: 0 },
      { len: Ln, x: -t / 2, z: Ln / 2, ry: Math.PI / 2 },
      { len: Ln, x: W + t / 2, z: Ln / 2, ry: Math.PI / 2 },
    ]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(d.len, h, t), mat);
      wall.position.set(d.x, h / 2, d.z);
      wall.rotation.y = d.ry;
      wall.castShadow = true;
      wall.receiveShadow = true;
      shell.add(wall);
    }
    return;
  }

  if (venue.type === "garden") {
    // A few trees around the edge, so the ground reads as a garden and not a lawn.
    const trunk = new THREE.MeshStandardMaterial({
      color: "#5a4632",
      roughness: 1,
    });
    const leaf = new THREE.MeshStandardMaterial({
      color: evening ? "#2f4a2c" : "#3f6b38",
      roughness: 1,
    });
    const spots = [
      [1.6, 1.6],
      [W - 1.6, 1.6],
      [1.6, Ln - 1.6],
      [W - 1.6, Ln - 1.6],
      [W / 2, -1.4],
    ];
    for (const [x, z] of spots) {
      const g = new THREE.Group();
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.22, 2.6, 8),
        trunk
      );
      stem.position.y = 1.3;
      stem.castShadow = true;
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5, 1), leaf);
      crown.position.y = 3.4;
      crown.castShadow = true;
      g.add(stem, crown);
      g.position.set(x, 0, z);
      shell.add(g);
    }
  }
}

/** A marquee, pole tent or stretch tent: legs on the module, and a fabric roof. */
function buildTent(venue, W, Ln, H, evening) {
  const module = legModule(venue) || 5;
  const legMat = new THREE.MeshStandardMaterial({
    color: "#b9b3a6",
    metalness: 0.4,
    roughness: 0.5,
  });
  const legH = Math.max(2.4, Math.min(H, 4.2));
  const legR = 0.07;

  // Legs on the module, inset half a module from each edge so the roof overhangs.
  const xs = [];
  for (let x = module / 2; x <= W; x += module) xs.push(x);
  const zs = [];
  for (let z = module / 2; z <= Ln; z += module) zs.push(z);
  for (const x of xs)
    for (const z of zs) {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(legR, legR, legH, 8),
        legMat
      );
      leg.position.set(x, legH / 2, z);
      leg.castShadow = true;
      shell.add(leg);
    }

  // The fabric roof: a shallow hip that rises to a ridge along the long axis.
  const fabric = new THREE.MeshStandardMaterial({
    color: evening ? "#e8e2d6" : "#f4efe6",
    roughness: 0.95,
    side: THREE.DoubleSide,
    transparent: true,
  });
  const overhang = 0.6;
  const ridge = legH + Math.min(1.6, Math.max(W, Ln) * 0.06);
  const roof = new THREE.BufferGeometry();
  const x0 = -overhang;
  const x1 = W + overhang;
  const z0 = -overhang;
  const z1 = Ln + overhang;
  const zm = Ln / 2;
  const verts = new Float32Array([
    // long side A
    x0,
    legH,
    z0,
    x1,
    legH,
    z0,
    x1,
    ridge,
    zm,
    x0,
    legH,
    z0,
    x1,
    ridge,
    zm,
    x0,
    ridge,
    zm,
    // long side B
    x1,
    legH,
    z1,
    x0,
    legH,
    z1,
    x0,
    ridge,
    zm,
    x1,
    legH,
    z1,
    x0,
    ridge,
    zm,
    x1,
    ridge,
    zm,
    // gable A
    x0,
    legH,
    z1,
    x0,
    legH,
    z0,
    x0,
    ridge,
    zm,
    // gable B
    x1,
    legH,
    z0,
    x1,
    legH,
    z1,
    x1,
    ridge,
    zm,
  ]);
  roof.setAttribute("position", new THREE.BufferAttribute(verts, 3));
  roof.computeVertexNormals();
  const roofMesh = new THREE.Mesh(roof, fabric);
  roofMesh.castShadow = true;
  roofMesh.receiveShadow = true;
  shell.add(roofMesh);
  // The fabric hides the plan from above, so it fades out when the camera rises over the eaves.
  roofs.push({ mats: [fabric], y: legH });

  // A valance along the eaves, so the roof edge is not a bare line.
  const valance = new THREE.MeshStandardMaterial({
    color: evening ? "#d8d1c4" : "#ece6db",
    roughness: 1,
    side: THREE.DoubleSide,
    transparent: true,
  });
  roofs[roofs.length - 1].mats.push(valance);
  for (const d of [
    { len: W + 2 * overhang, x: W / 2, z: z0, ry: 0 },
    { len: W + 2 * overhang, x: W / 2, z: z1, ry: 0 },
    { len: Ln + 2 * overhang, x: x0, z: Ln / 2, ry: Math.PI / 2 },
    { len: Ln + 2 * overhang, x: x1, z: Ln / 2, ry: Math.PI / 2 },
  ]) {
    const v = new THREE.Mesh(new THREE.PlaneGeometry(d.len, 0.35), valance);
    v.position.set(d.x, legH - 0.175, d.z);
    v.rotation.y = d.ry;
    shell.add(v);
  }
}

/** The indoor shell: panelled walls, skirting, a gold cornice, drapes and uplights. */
function buildWalls(decor, W, Ln, H, evening) {
  const t = 0.25;
  const wallTex = (len) => {
    const m = T.panels(decor.wall).clone();
    m.needsUpdate = true;
    m.repeat.set(len / 2, 1);
    return m;
  };
  const defs = [
    {
      len: W + 2 * t,
      x: W / 2,
      z: -t / 2,
      ry: 0,
      n: new THREE.Vector3(0, 0, -1),
    },
    {
      len: W + 2 * t,
      x: W / 2,
      z: Ln + t / 2,
      ry: Math.PI,
      n: new THREE.Vector3(0, 0, 1),
    },
    {
      len: Ln,
      x: -t / 2,
      z: Ln / 2,
      ry: Math.PI / 2,
      n: new THREE.Vector3(-1, 0, 0),
    },
    {
      len: Ln,
      x: W + t / 2,
      z: Ln / 2,
      ry: -Math.PI / 2,
      n: new THREE.Vector3(1, 0, 0),
    },
  ];
  for (const d of defs) {
    const g = new THREE.Group();
    g.position.set(d.x, 0, d.z);
    g.rotation.y = d.ry;
    const inner = new THREE.MeshStandardMaterial({
      map: wallTex(d.len),
      roughness: 0.75,
      transparent: true,
    });
    const plain = new THREE.MeshStandardMaterial({
      color: decor.wall,
      roughness: 0.8,
      transparent: true,
    });
    const wall = new THREE.Mesh(new THREE.BoxGeometry(d.len, H, t), [
      plain,
      plain,
      plain,
      plain,
      inner,
      plain,
    ]);
    wall.position.y = H / 2;
    wall.castShadow = false;
    wall.receiveShadow = true;
    g.add(wall);
    const trimMat = M.gold.clone();
    trimMat.transparent = true;
    const cornice = new THREE.Mesh(
      new THREE.BoxGeometry(d.len, 0.16, 0.08),
      trimMat
    );
    cornice.position.set(0, H - 0.1, t / 2 + 0.04);
    const skirting = new THREE.Mesh(
      new THREE.BoxGeometry(d.len, 0.14, 0.04),
      trimMat
    );
    skirting.position.set(0, 0.07, t / 2 + 0.02);
    g.add(cornice, skirting);
    const mats = [plain, inner, trimMat];
    if (decor.drape) {
      // Pleated drapes along the wall, gathered in swags.
      const dm = M.cloth.clone();
      dm.color.set(decor.drape);
      dm.transparent = true;
      const c = new THREE.Mesh(
        curtain(d.len - 0.4, H - 0.35, {
          fold: 0.18,
          depth: 0.06,
          seed: hash(String(d.len)),
        }),
        dm
      );
      c.position.set(0, 0.02, t / 2 + 0.12);
      c.receiveShadow = true;
      g.add(c);
      mats.push(dm);
    }
    if (decor.uplight) {
      const wm = new THREE.MeshBasicMaterial({
        map: T.wash(),
        color: decor.uplight,
        transparent: true,
        opacity: evening ? 0.75 : 0.25,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      });
      const n = Math.max(2, Math.floor(d.len / 3));
      for (let i = 0; i < n; i++) {
        const p = new THREE.Mesh(
          new THREE.PlaneGeometry(1.8, Math.min(H, 4.2)),
          wm
        );
        p.position.set(
          ((i + 0.5) / n - 0.5) * d.len,
          Math.min(H, 4.2) / 2,
          t / 2 + (decor.drape ? 0.2 : 0.03)
        );
        g.add(p);
      }
      mats.push(wm);
    }
    shell.add(g);
    walls.push({
      group: g,
      normal: d.n,
      centre: new THREE.Vector3(d.x, H / 2, d.z),
      mats,
    });
  }
}

/**
 * A church: a raised altar at the far end, a chancel rail, and a runner down the aisle.
 *
 * The pews are not drawn. In this venue the seating is what the host is arranging, so drawing
 * fixed pews underneath the tables would show two seatings at once. The architecture is what the
 * shell owes the plan: where the altar is, and where the aisle runs.
 */
function buildChurch(W, Ln, evening) {
  const stone = new THREE.MeshStandardMaterial({
    color: "#e6e0d4",
    roughness: 0.9,
  });
  const wood = new THREE.MeshStandardMaterial({
    color: "#6b4f36",
    roughness: 0.8,
  });
  const runner = new THREE.MeshStandardMaterial({
    color: evening ? "#5a1f2a" : "#7d2b3a",
    roughness: 1,
  });

  const altarW = Math.min(W * 0.42, 6);
  const altarD = 2.6;
  const stepZ = altarD / 2 + 0.4;

  // The sanctuary step, and the altar standing on it.
  const step = new THREE.Mesh(
    new THREE.BoxGeometry(altarW, 0.45, altarD),
    stone
  );
  step.position.set(W / 2, 0.225, stepZ);
  step.castShadow = true;
  step.receiveShadow = true;
  shell.add(step);

  const altar = new THREE.Mesh(
    new THREE.BoxGeometry(altarW * 0.55, 0.9, 0.7),
    wood
  );
  altar.position.set(W / 2, 0.9, stepZ);
  altar.castShadow = true;
  shell.add(altar);

  // A low rail across the chancel, so the sanctuary reads as set apart.
  const rail = new THREE.Mesh(
    new THREE.BoxGeometry(altarW + 1.2, 0.08, 0.1),
    wood
  );
  rail.position.set(W / 2, 0.72, altarD + 0.4);
  shell.add(rail);
  for (const x of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.72, 0.1), wood);
    post.position.set(W / 2 + (x * (altarW + 1.2)) / 2, 0.36, altarD + 0.4);
    shell.add(post);
  }

  // The runner, from the chancel to the back of the room.
  const aisle = 1.6;
  const runLen = Math.max(1, Ln - altarD - 0.8);
  const carpet = new THREE.Mesh(new THREE.PlaneGeometry(aisle, runLen), runner);
  carpet.rotation.x = -Math.PI / 2;
  carpet.position.set(W / 2, 0.012, altarD + 0.4 + runLen / 2);
  carpet.receiveShadow = true;
  shell.add(carpet);
}

/** Crystal chandeliers on a grid, hung from the ceiling. */
function buildChandeliers(W, Ln, H, evening) {
  {
    const nx = Math.max(1, Math.round(W / 9));
    const nz = Math.max(1, Math.round(Ln / 9));
    const crystals = new THREE.OctahedronGeometry(0.035, 0);
    const crystalMat = new THREE.MeshPhysicalMaterial({
      color: "#ffffff",
      metalness: 0,
      roughness: 0,
      clearcoat: 1,
      emissive: evening ? "#ffdca0" : "#000000",
      emissiveIntensity: evening ? 0.6 : 0,
      transparent: true,
      opacity: 0.85,
    });
    const per = 72;
    const inst = new THREE.InstancedMesh(crystals, crystalMat, nx * nz * per);
    let k = 0;
    const lights = [];
    for (let i = 0; i < nx; i++)
      for (let j = 0; j < nz; j++) {
        const x = ((i + 0.5) / nx) * W;
        const z = ((j + 0.5) / nz) * Ln;
        const y = H - 1.3;
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.55, 0.02, 8, 48),
          M.gold
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.set(x, y + 0.5, z);
        const ring2 = ring.clone();
        ring2.scale.setScalar(0.6);
        ring2.position.y = y + 0.25;
        shell.add(
          ring,
          ring2,
          new THREE.Mesh(
            rod(
              new THREE.Vector3(x, y + 0.5, z),
              new THREE.Vector3(x, H, z),
              0.012
            ),
            M.gold
          )
        );
        for (let c = 0; c < per; c++) {
          const ringR = c % 2 ? 0.55 : 0.33;
          const a = (c / per) * Math.PI * 2 * 3;
          const drop = (c % 6) * 0.08;
          inst.setMatrixAt(
            k++,
            mat(
              x + Math.cos(a) * ringR,
              y + 0.45 - drop - (ringR < 0.4 ? 0.25 : 0),
              z + Math.sin(a) * ringR,
              a
            )
          );
        }
        const g = new THREE.Mesh(glowPlane, M.glow.clone());
        g.material.opacity = evening ? 0.55 : 0.12;
        g.material.color.set("#ffd9a0");
        g.position.set(x, y + 0.2, z);
        g.scale.setScalar(2.2);
        g.userData.billboard = true;
        g.userData.sharedGeo = true;
        g.raycast = () => {};
        shell.add(g);
        lights.push({ x, y, z });
      }
    inst.count = k;
    shell.add(inst);
  }
}

// ---------------------------------------------------------------- zones

const zoneGroup = new THREE.Group();
scene.add(zoneGroup);
const zoneCache = new Map();

function finishMaterial(finish, colour, w, h) {
  const m = new THREE.MeshPhysicalMaterial({
    color: "#ffffff",
    roughness: 0.2,
  });
  const rep = (t, size) => {
    const c = t.clone();
    c.needsUpdate = true;
    // Extruded shapes carry UVs in metres, so one texture repeat covers `size` metres.
    c.repeat.set(1 / size, 1 / size);
    return c;
  };
  switch (finish) {
    case "led": {
      const t = rep(T.led(), 4);
      m.map = t;
      m.emissiveMap = t;
      m.emissive.set("#ffffff");
      m.emissiveIntensity = state.layout?.mood === "evening" ? 1.1 : 0.5;
      m.roughness = 0.1;
      m.clearcoat = 1;
      break;
    }
    case "white":
      m.color.set("#f6f3ee");
      m.roughness = 0.08;
      m.clearcoat = 1;
      break;
    case "wood":
      m.map = rep(T.parquet(), 2);
      m.roughness = 0.35;
      m.clearcoat = 0.6;
      break;
    case "checker":
      m.map = rep(T.checker(), 1.2);
      m.roughness = 0.12;
      m.clearcoat = 1;
      break;
    case "carpet":
      m.color.set(colour);
      m.roughness = 1;
      m.map = rep(T.carpet("#ffffff", "#d9c08a"), 1.6);
      break;
    case "marble":
      m.map = rep(T.marble(), 2.4);
      m.roughness = 0.1;
      m.clearcoat = 1;
      break;
    default:
      m.color.set("#0d0b0e");
      m.roughness = 0.05;
      m.metalness = 0.2;
      m.clearcoat = 1;
  }
  return m;
}

/** A flat or raised platform in any shape, with a gold edge. */
function platform(zone, height, topMat, sideMat) {
  const shape = zone.shape ?? "rect";
  const { pts } = outline(
    shape === "rect" ? "rect" : shape,
    zone.w,
    zone.h,
    200
  );
  const geo = new THREE.ExtrudeGeometry(shapeOf(pts), {
    depth: height,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.01,
    bevelSegments: 2,
  });
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, [topMat, sideMat]);
  mesh.receiveShadow = true;
  mesh.castShadow = height > 0.1;
  // ExtrudeGeometry UVs are in shape units (metres); map them onto the texture repeat.
  return { mesh, pts };
}

function goldEdge(pts, y) {
  const curve = new THREE.CatmullRomCurve3(
    pts.map((p) => new THREE.Vector3(p.x, y, p.z)),
    true
  );
  return new THREE.Mesh(
    new THREE.TubeGeometry(curve, pts.length, 0.018, 6, true),
    M.gold
  );
}

function zoneFlowers(group, arr, colour, at, scale = 1) {
  const buds = arr.filter((b) => !b.leaf);
  const leaves = arr.filter((b) => b.leaf);
  const make = (geo, material, list, colored) => {
    const im = new THREE.InstancedMesh(geo, material, list.length);
    const base = new THREE.Color(colour);
    list.forEach((b, i) => {
      const q = new THREE.Quaternion().setFromUnitVectors(UP, b.nrm);
      const s = b.s * scale * (colored ? 1 : 2.2);
      im.setMatrixAt(
        i,
        at
          .clone()
          .multiply(
            new THREE.Matrix4().compose(
              b.pos.clone().multiplyScalar(scale),
              q,
              new THREE.Vector3(s, s, s)
            )
          )
      );
      if (colored) im.setColorAt(i, base.clone().multiplyScalar(b.jitter));
    });
    im.castShadow = colored;
    im.userData.sharedGeo = true;
    group.add(im);
  };
  if (buds.length) make(G.bud, M.flower, buds, true);
  if (leaves.length) make(G.leaf, M.leaf, leaves, false);
}

function clothMat(colour) {
  const m = M.cloth.clone();
  m.color.set(colour);
  return m;
}

function buildZone(z) {
  const L = state.layout;
  const g = new THREE.Group();
  const colour = z.color ?? defaultZoneColour(z.kind);
  const evening = L.mood === "evening";
  const flower = L.decor.flower;
  const r = rng(hash(z.id));
  switch (z.kind) {
    case "stage": {
      const h = z.height ?? 0.8;
      const top = finishMaterial(z.finish ?? "white", colour, z.w, z.h);
      const side = clothMat(colour);
      const { mesh, pts } = platform(z, h, top, side);
      g.add(mesh);
      const skirt = new THREE.Mesh(
        drape({
          shape: z.shape === "rect" || !z.shape ? "rect" : z.shape,
          w: z.w + 0.04,
          h: z.h + 0.04,
          top: h + 0.012,
          cap: false,
          fold: 0.14,
          depth: 0.03,
          flare: 0.01,
          seed: hash(z.id),
        }),
        side
      );
      skirt.castShadow = true;
      g.add(skirt, goldEdge(pts, h + 0.02));
      // Steps at the front.
      const stepMat = clothMat(colour);
      const steps = Math.max(1, Math.round(h / 0.2));
      for (let i = 0; i < steps; i++) {
        const sh = (h * (steps - i)) / (steps + 1);
        const s = new THREE.Mesh(
          new RoundedBoxGeometry(1.6, sh, 0.32, 2, 0.02),
          stepMat
        );
        s.position.set(0, sh / 2, z.h / 2 + 0.16 + i * 0.32);
        s.castShadow = s.receiveShadow = true;
        g.add(s);
      }
      // Draped backdrop with a floral garland and arrangements at each end.
      const bw = Math.min(z.w, 12);
      const bh = Math.min(L.ceiling - h - 0.3, 4);
      const back = new THREE.Mesh(
        curtain(bw, bh, {
          bow: Math.min(1, z.h * 0.25),
          fold: 0.2,
          depth: 0.06,
          seed: hash(z.id),
        }),
        clothMat(L.decor.drape ?? "#f4efe6")
      );
      back.position.set(0, h, -z.h / 2 + Math.min(1, z.h * 0.25) + 0.15);
      back.receiveShadow = true;
      g.add(back);
      const frame = new THREE.Mesh(
        new THREE.TorusGeometry(bw / 2, 0.04, 8, 64, Math.PI),
        M.gold
      );
      frame.position.set(
        0,
        h,
        back.position.z - Math.min(1, z.h * 0.25) - 0.05
      );
      frame.scale.set(1, (bh * 0.95) / (bw / 2), 1);
      g.add(frame);
      const garland = arrangement(
        "garland",
        Math.round(bw * 14),
        bw * 0.9,
        hash(z.id) % 97
      );
      zoneFlowers(
        g,
        garland,
        flower,
        mat(0, h + bh - 0.1, back.position.z + 0.05),
        1.2
      );
      for (const sx of [-bw / 2 + 0.3, bw / 2 - 0.3]) {
        const stand = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.12, 1.2, 16),
          M.gold
        );
        stand.position.set(sx, h + 0.6, back.position.z + 0.3);
        stand.castShadow = true;
        g.add(stand);
        zoneFlowers(
          g,
          ARR.ball,
          flower,
          mat(sx, h + 1.45, back.position.z + 0.3),
          1.6
        );
      }
      if (evening) {
        const beamMat = new THREE.MeshBasicMaterial({
          map: T.beam(),
          color: "#ffe2b0",
          transparent: true,
          opacity: 0.35,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
          toneMapped: false,
        });
        for (const sx of [-z.w * 0.3, 0, z.w * 0.3]) {
          const len = L.ceiling - h;
          const cone = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 1.3, len, 24, 1, true),
            beamMat
          );
          cone.position.set(sx, h + len / 2, 0.3);
          cone.raycast = () => {};
          g.add(cone);
        }
      }
      break;
    }
    case "dance": {
      const top = finishMaterial(z.finish ?? "gloss", colour, z.w, z.h);
      const { mesh, pts } = platform(z, 0.035, top, M.gold);
      g.add(mesh, goldEdge(pts, 0.04));
      break;
    }
    case "buffet":
    case "gifts":
    case "cake": {
      const round = z.kind === "cake";
      const tw = round ? Math.min(z.w, z.h) * 0.75 : Math.max(0.6, z.w - 0.2);
      const th = round ? tw : Math.max(0.5, z.h - 0.4);
      const cloth = new THREE.Mesh(
        drape({
          shape: round ? "round" : "rect",
          w: tw,
          h: th,
          top: TABLE_H,
          seed: hash(z.id),
        }),
        clothMat(colour)
      );
      cloth.castShadow = cloth.receiveShadow = true;
      g.add(cloth);
      if (z.kind === "buffet") {
        const along = tw >= th;
        const len = along ? tw : th;
        const n = Math.max(1, Math.floor(len / 0.75));
        for (let i = 0; i < n; i++) {
          const o = ((i + 0.5) / n - 0.5) * len;
          const dish = new THREE.Group();
          const base = new THREE.Mesh(
            new RoundedBoxGeometry(0.5, 0.12, 0.32, 2, 0.02),
            M.silver
          );
          base.position.y = 0.06;
          const lid = new THREE.Mesh(
            new THREE.CylinderGeometry(
              0.16,
              0.16,
              0.48,
              24,
              1,
              false,
              0,
              Math.PI
            ),
            M.silver
          );
          lid.rotation.z = Math.PI / 2;
          lid.position.y = 0.12;
          dish.add(base, lid);
          dish.position.set(along ? o : 0, TABLE_H, along ? 0 : o);
          if (!along) dish.rotation.y = Math.PI / 2;
          dish.traverse((m) => (m.castShadow = true));
          g.add(dish);
        }
        zoneFlowers(
          g,
          ARR.mound,
          flower,
          mat(
            along ? -len / 2 + 0.3 : 0,
            TABLE_H + 0.02,
            along ? 0 : -len / 2 + 0.3
          ),
          0.9
        );
      } else if (z.kind === "gifts") {
        const n = Math.max(3, Math.round(tw * 3));
        for (let i = 0; i < n; i++) {
          const s = 0.18 + r() * 0.2;
          const box = new THREE.Mesh(
            new THREE.BoxGeometry(s, s * (0.7 + r() * 0.6), s),
            new THREE.MeshStandardMaterial({
              color: new THREE.Color().setHSL(r(), 0.45, 0.55),
              roughness: 0.5,
            })
          );
          box.position.set(
            (r() - 0.5) * (tw - 0.3),
            TABLE_H + box.geometry.parameters.height / 2,
            (r() - 0.5) * (th - 0.3)
          );
          box.rotation.y = r() * Math.PI;
          box.castShadow = true;
          const ribbon = new THREE.Mesh(
            new THREE.BoxGeometry(
              s + 0.004,
              box.geometry.parameters.height + 0.004,
              0.03
            ),
            M.gold
          );
          box.add(ribbon);
          g.add(box);
        }
      } else {
        // A three-tier cake.
        let y = TABLE_H;
        const stand = new THREE.Mesh(
          new THREE.CylinderGeometry(0.22, 0.12, 0.12, 32),
          M.gold
        );
        stand.position.y = y + 0.06;
        g.add(stand);
        y += 0.12;
        const icing = new THREE.MeshPhysicalMaterial({
          color: "#fbf7ef",
          roughness: 0.45,
          sheen: 0.5,
        });
        for (const [rad, hh] of [
          [0.2, 0.18],
          [0.15, 0.16],
          [0.1, 0.14],
        ]) {
          const tier = new THREE.Mesh(
            new THREE.CylinderGeometry(rad, rad, hh, 40),
            icing
          );
          tier.position.y = y + hh / 2;
          tier.castShadow = true;
          const band = new THREE.Mesh(
            new THREE.CylinderGeometry(rad + 0.003, rad + 0.003, 0.02, 40),
            M.gold
          );
          band.position.y = y + 0.02;
          g.add(tier, band);
          y += hh;
        }
        zoneFlowers(g, ARR.small, flower, mat(0, y, 0), 1);
      }
      break;
    }
    case "bar": {
      const w = Math.max(z.w, z.h);
      const d = Math.min(z.w, z.h);
      const along = z.w >= z.h;
      const body = new THREE.Group();
      const counter = new THREE.Mesh(
        new RoundedBoxGeometry(w, 1.05, Math.min(0.7, d), 3, 0.03),
        new THREE.MeshStandardMaterial({ color: "#1d1a1e", roughness: 0.4 })
      );
      counter.position.y = 0.525;
      counter.castShadow = counter.receiveShadow = true;
      const front = new THREE.Mesh(
        new THREE.PlaneGeometry(w - 0.1, 0.85),
        new THREE.MeshStandardMaterial({
          color: colour,
          emissive: colour,
          emissiveIntensity: evening ? 1.4 : 0.5,
          roughness: 0.3,
        })
      );
      front.position.set(0, 0.5, Math.min(0.7, d) / 2 + 0.003);
      const topSlab = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.08, 0.04, Math.min(0.7, d) + 0.08),
        floorMaterial("dark", 1, 1)
      );
      topSlab.position.y = 1.07;
      body.add(counter, front, topSlab);
      // Bottles on a back shelf.
      if (d > 0.9) {
        const shelf = new THREE.Mesh(
          new THREE.BoxGeometry(w, 1.6, 0.3),
          new THREE.MeshStandardMaterial({ color: "#2a2326", roughness: 0.6 })
        );
        shelf.position.set(0, 0.8, -d / 2 + 0.15);
        shelf.castShadow = true;
        body.add(shelf);
        const n = Math.floor(w / 0.12);
        for (let i = 0; i < n; i++) {
          const b = new THREE.Mesh(
            new THREE.CylinderGeometry(0.035, 0.035, 0.3, 10),
            new THREE.MeshPhysicalMaterial({
              color: ["#3b6b35", "#8a4b12", "#e7d9b0", "#5a1220"][i % 4],
              roughness: 0.05,
              transparent: true,
              opacity: 0.85,
            })
          );
          b.position.set(((i + 0.5) / n - 0.5) * w, 1.75, -d / 2 + 0.15);
          body.add(b);
        }
      }
      if (!along) body.rotation.y = Math.PI / 2;
      g.add(body);
      break;
    }
    case "dj": {
      const booth = new THREE.Mesh(
        new RoundedBoxGeometry(Math.min(z.w, 2.4), 1.05, 0.7, 3, 0.03),
        new THREE.MeshStandardMaterial({ color: "#121114", roughness: 0.3 })
      );
      booth.position.y = 0.525;
      booth.castShadow = true;
      const panel = new THREE.Mesh(
        new THREE.PlaneGeometry(Math.min(z.w, 2.4) - 0.2, 0.7),
        new THREE.MeshStandardMaterial({
          color: colour,
          emissive: "#e9c98a",
          emissiveIntensity: evening ? 0.9 : 0.3,
        })
      );
      panel.position.set(0, 0.55, 0.352);
      g.add(booth, panel);
      for (const sx of [-0.45, 0.45]) {
        const deck = new THREE.Mesh(
          new THREE.CylinderGeometry(0.15, 0.15, 0.03, 24),
          new THREE.MeshStandardMaterial({
            color: "#2a2a2e",
            metalness: 0.6,
            roughness: 0.3,
          })
        );
        deck.position.set(sx, 1.07, 0);
        g.add(deck);
      }
      for (const sx of [-z.w / 2 + 0.25, z.w / 2 - 0.25]) {
        const sp = new THREE.Mesh(
          new RoundedBoxGeometry(0.45, 1.3, 0.4, 2, 0.03),
          new THREE.MeshStandardMaterial({ color: "#151417", roughness: 0.5 })
        );
        sp.position.set(sx, 0.95, -z.h / 2 + 0.3);
        sp.castShadow = true;
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8),
          M.silver
        );
        pole.position.set(sx, 0.15, -z.h / 2 + 0.3);
        g.add(sp, pole);
      }
      break;
    }
    case "entrance": {
      const aw = Math.max(1.6, z.w * 0.8);
      const ah = Math.min(L.ceiling - 0.4, 2.9);
      const arch = new THREE.Mesh(
        new THREE.TorusGeometry(aw / 2, 0.05, 8, 48, Math.PI),
        M.gold
      );
      arch.scale.set(1, (ah - 1.2) / (aw / 2), 1);
      arch.position.y = 1.2;
      g.add(arch);
      for (const sx of [-aw / 2, aw / 2]) {
        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05, 0.05, 1.2, 12),
          M.gold
        );
        post.position.set(sx, 0.6, 0);
        post.castShadow = true;
        g.add(post);
        zoneFlowers(g, ARR.ball, flower, mat(sx, 0.35, 0), 1.3);
      }
      // Flowers climbing the arch.
      const n = 26;
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI;
        const x = Math.cos(a) * (aw / 2);
        const y = 1.2 + Math.sin(a) * (ah - 1.2);
        if (i % 2 === 0) zoneFlowers(g, ARR.small, flower, mat(x, y, 0), 1.4);
      }
      // Runner into the hall.
      const runLen = Math.min(10, L.length * 0.35);
      const runner = new THREE.Mesh(
        new THREE.PlaneGeometry(1.4, runLen),
        new THREE.MeshStandardMaterial({ color: colour, roughness: 0.95 })
      );
      runner.rotation.x = -Math.PI / 2;
      runner.position.set(0, 0.006, -runLen / 2 + z.h / 2);
      runner.receiveShadow = true;
      g.add(runner);
      for (const sx of [-0.72, 0.72]) {
        const edge = new THREE.Mesh(
          new THREE.BoxGeometry(0.03, 0.01, runLen),
          M.gold
        );
        edge.position.set(sx, 0.008, -runLen / 2 + z.h / 2);
        g.add(edge);
      }
      break;
    }
    case "photo": {
      const ww = Math.max(z.w, 1.5);
      const wh = Math.min(2.6, L.ceiling - 0.5);
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(ww, wh, 0.12),
        new THREE.MeshStandardMaterial({ color: "#3f5f36", roughness: 0.9 })
      );
      panel.position.set(0, wh / 2, -z.h / 2 + 0.1);
      panel.castShadow = true;
      g.add(panel);
      const count = Math.min(900, Math.round(ww * wh * 110));
      zoneFlowers(
        g,
        arrangement(
          "wall",
          count,
          { w: ww - 0.05, h: wh - 0.05 },
          hash(z.id) % 89
        ),
        colour,
        mat(0, 0.02, -z.h / 2 + 0.18),
        1.4
      );
      const plinth = new THREE.Mesh(
        new THREE.BoxGeometry(ww * 0.7, 0.12, 0.9),
        M.whitePaint
      );
      plinth.position.set(0, 0.06, -z.h / 2 + 0.75);
      plinth.receiveShadow = true;
      g.add(plinth);
      break;
    }
    case "custom": {
      const h = z.height ?? (z.variant === "block" ? 1 : TABLE_H);
      const shape = z.shape ?? "rect";
      if (z.variant === "block") {
        const m = new THREE.MeshPhysicalMaterial({
          color: colour,
          roughness: 0.45,
          clearcoat: 0.3,
        });
        const { mesh, pts } = platform(z, h, m, m);
        mesh.castShadow = true;
        g.add(mesh, goldEdge(pts, h + 0.01));
      } else {
        const cloth = new THREE.Mesh(
          drape({
            shape: shape === "rect" ? "rect" : shape,
            w: z.w,
            h: z.h,
            top: h,
            seed: hash(z.id),
          }),
          clothMat(colour)
        );
        cloth.castShadow = cloth.receiveShadow = true;
        g.add(cloth);
        zoneFlowers(g, ARR.small, flower, mat(0, h + 0.02, 0), 1.2);
      }
      break;
    }
    case "pillar": {
      const rad = Math.min(z.w, z.h) / 2;
      const H = L.ceiling;
      const col = new THREE.Mesh(
        new THREE.CylinderGeometry(rad * 0.85, rad * 0.85, H, 32),
        new THREE.MeshPhysicalMaterial({
          color: colour,
          roughness: 0.25,
          clearcoat: 0.5,
        })
      );
      col.position.y = H / 2;
      col.castShadow = true;
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(rad * 2.1, 0.3, rad * 2.1),
        M.gold
      );
      base.position.y = 0.15;
      const cap = base.clone();
      cap.position.y = H - 0.15;
      g.add(col, base, cap);
      break;
    }
  }
  return g;
}

function defaultZoneColour(kind) {
  return (
    {
      custom: "#e9c98a",
      stage: "#6e1426",
      dance: "#141014",
      buffet: "#f4efe6",
      bar: "#c9a465",
      dj: "#1b1b1f",
      entrance: "#6e1426",
      gifts: "#f4efe6",
      photo: "#f4d7dc",
      pillar: "#f4efe6",
      cake: "#f4efe6",
    }[kind] ?? "#f4efe6"
  );
}

function syncZones() {
  const L = state.layout;
  const seen = new Set();
  for (const z of L.zones) {
    seen.add(z.id);
    const sig = JSON.stringify([
      z.kind,
      z.w,
      z.h,
      z.shape,
      z.color,
      z.finish,
      z.height,
      z.variant,
      L.decor.drape,
      L.decor.flower,
      L.mood,
      L.ceiling,
      L.length,
    ]);
    let entry = zoneCache.get(z.id);
    if (!entry || entry.sig !== sig) {
      if (entry) {
        zoneGroup.remove(entry.obj);
        disposeGroup(entry.obj);
      }
      const obj = new THREE.Group();
      obj.userData.pick = { type: "zone", id: z.id };
      obj.add(buildZone(z));
      obj.traverse((o) => {
        if (o.isMesh && o.castShadow === undefined) o.castShadow = true;
      });
      const hit = new THREE.Mesh(
        new THREE.BoxGeometry(
          z.w,
          Math.max(0.3, z.kind === "stage" ? (z.height ?? 0.8) : 0.3),
          z.h
        ),
        M.hit
      );
      hit.position.y = 0.15;
      hit.userData.pick = { type: "zone", id: z.id };
      obj.add(hit);
      entry = { sig, obj };
      zoneCache.set(z.id, entry);
      zoneGroup.add(obj);
    }
    entry.obj.position.set(z.x, 0, z.y);
    entry.obj.rotation.y = -(z.rot ?? 0) * DEG;
    items.set("zone:" + z.id, {
      type: "zone",
      id: z.id,
      obj: entry.obj,
      w: z.w,
      h: z.h,
      label: z.label,
    });
    setLabel(
      entry.obj,
      "zone:" + z.id,
      z.label,
      null,
      z.kind === "stage" ? (z.height ?? 0.8) + 0.4 : 1.4
    );
  }
  for (const [id, entry] of zoneCache)
    if (!seen.has(id)) {
      zoneGroup.remove(entry.obj);
      disposeGroup(entry.obj);
      zoneCache.delete(id);
      items.delete("zone:" + id);
    }
}

// ---------------------------------------------------------------- stage items

/**
 * Podiums, lecterns and arches belong to a stage: they are stored as a share of the stage's width
 * and depth, so moving or resizing the stage carries them with it rather than leaving them behind.
 */
const stageGroup = new THREE.Group();
scene.add(stageGroup);
const stageCache = new Map();
/** Couches are drawn one by one, so they are tracked to be cleared on the next rebuild. */
const couchMeshes = [];

function buildStageItem(item, stage) {
  const g = new THREE.Group();
  const top = stage.height ?? 0.8;
  if (item.kind === "arch") {
    const w = Math.min(stage.w * 0.5, 3.2);
    const h = 2.6;
    const post = new THREE.BoxGeometry(0.16, h, 0.16);
    for (const side of [-1, 1]) {
      const m = new THREE.Mesh(post, M.gold);
      m.position.set((side * w) / 2, h / 2, 0);
      m.castShadow = true;
      g.add(m);
    }
    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.16, 0.16, 0.16),
      M.gold
    );
    beam.position.y = h;
    beam.castShadow = true;
    g.add(beam);
    // Flowers along the top, so an arch reads as an arch and not a goalpost.
    for (let i = 0; i <= 6; i++) {
      const f = new THREE.Mesh(G.bud, M.flower);
      f.position.set(-w / 2 + (w * i) / 6, h + 0.12, 0);
      f.scale.setScalar(1.6);
      g.add(f);
    }
  } else if (item.kind === "couch") {
    // The couple's sofa: a seat, a back and two arms, in the room's cover colour.
    const w = Math.min(stage.w * 0.4, 2.2);
    const seatH = 0.42;
    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(w, seatH, 0.85),
      M.fabric.clone()
    );
    seat.position.y = seatH / 2;
    seat.castShadow = true;
    g.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(w, 0.55, 0.18), M.fabric);
    back.position.set(0, seatH + 0.275, -0.335);
    g.add(back);
    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.3, 0.85),
        M.fabric
      );
      arm.position.set((side * (w - 0.18)) / 2, seatH + 0.15, 0);
      g.add(arm);
    }
  } else if (item.kind === "table" || item.kind === "cake") {
    const round = item.kind === "cake";
    const r = round ? 0.5 : 0.75;
    const top = new THREE.Mesh(
      round
        ? new THREE.CylinderGeometry(r, r, 0.06, 24)
        : new THREE.BoxGeometry(r * 2, 0.06, r * 2),
      M.fabric.clone()
    );
    top.position.y = 0.75;
    top.castShadow = true;
    g.add(top);
    for (const [sx, sz] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.75, 0.05),
        M.wood
      );
      leg.position.set((sx * r) / 1.4, 0.375, (sz * r) / 1.4);
      g.add(leg);
    }
    if (round) {
      const cake = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 0.3, 20),
        M.porcelain
      );
      cake.position.y = 0.93;
      g.add(cake);
    }
  } else if (item.kind === "screen") {
    const w = Math.min(stage.w * 0.5, 3);
    const h = 1.7;
    const panel = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.06), M.hit);
    panel.position.set(0, h / 2 + 0.1, -0.1);
    panel.castShadow = true;
    g.add(panel);
  } else {
    const w = item.kind === "podium" ? 0.7 : 0.5;
    const h = item.kind === "podium" ? 1.1 : 1.15;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.5), M.wood);
    body.position.y = h / 2;
    body.castShadow = true;
    g.add(body);
    const topSlab = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.08, 0.06, 0.58),
      M.gold
    );
    topSlab.position.y = h + 0.03;
    g.add(topSlab);
    if (item.kind === "lectern") {
      const slope = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, 0.4), M.wood);
      slope.position.set(0, h + 0.12, 0.02);
      slope.rotation.x = -0.35;
      g.add(slope);
    }
  }
  g.position.y = top;
  return g;
}

function syncStageItems() {
  const L = state.layout;
  const seen = new Set();
  // Where each one stands comes from the studio (stageItemPlacement in model.ts), the same
  // maths the plan and the tests use. This only draws them there.
  for (const item of state.stageItems || []) {
    const stage = L.zones.find((z) => z.id === item.stageId);
    if (!stage) continue;
    seen.add(item.id);
    const sig = JSON.stringify([
      item.kind,
      stage.w,
      stage.h,
      stage.height,
      L.decor.flower,
    ]);
    let entry = stageCache.get(item.id);
    if (!entry || entry.sig !== sig) {
      if (entry) {
        stageGroup.remove(entry.obj);
        disposeGroup(entry.obj);
      }
      const obj = new THREE.Group();
      obj.add(buildStageItem(item, stage));
      entry = { sig, obj };
      stageCache.set(item.id, entry);
      stageGroup.add(obj);
    }
    entry.obj.position.set(item.x, 0, item.y);
    entry.obj.rotation.y = -(item.yaw || 0) * DEG;
  }
  for (const [id, entry] of stageCache)
    if (!seen.has(id)) {
      stageGroup.remove(entry.obj);
      disposeGroup(entry.obj);
      stageCache.delete(id);
    }
}

// ---------------------------------------------------------------- tables, chairs, labels

const proxies = new THREE.Group();
scene.add(proxies);
const items = new Map();
const labels = new Map();

function setLabel(parent, key, name, count, y) {
  let l = labels.get(key);
  if (!l) {
    const el = document.createElement("div");
    el.className = "lbl";
    el.innerHTML = "<b></b><span></span>";
    l = { obj: new CSS2DObject(el), el };
    labels.set(key, l);
  }
  if (l.obj.parent !== parent) parent.add(l.obj);
  l.obj.position.set(0, y, 0);
  l.el.querySelector("b").textContent = name;
  const span = l.el.querySelector("span");
  span.textContent = count ?? "";
  span.style.display = count ? "" : "none";
  l.el.classList.toggle("zone", key.startsWith("zone:"));
  l.el.classList.toggle("full", !!count && /^(\d+)\/\1$/.test(count));
}

function syncTables() {
  const seen = new Set();
  for (const t of state.tables) {
    const k = "table:" + t.id;
    seen.add(k);
    let item = items.get(k);
    const sig = `${t.top.kind}:${t.top.w}:${t.top.h}`;
    if (!item || item.sig !== sig) {
      if (item) proxies.remove(item.obj);
      const obj = new THREE.Group();
      const r =
        t.top.kind === "rect" ? null : Math.max(t.top.w, t.top.h) / 2 + 0.5;
      const hit = new THREE.Mesh(
        r
          ? new THREE.CylinderGeometry(r, r, 1.2, 24)
          : new THREE.BoxGeometry(t.top.w + 0.4, 1.2, t.top.h + 1.0),
        M.hit
      );
      hit.position.y = 0.6;
      hit.userData.pick = { type: "table", id: t.id };
      obj.add(hit);
      proxies.add(obj);
      item = { type: "table", id: t.id, obj, sig };
      items.set(k, item);
    }
    item.top = t.top;
    item.name = t.name;
    item.obj.position.set(t.x, 0, t.y);
    item.obj.rotation.y = -t.rot * DEG;
    const tall = t.style.centrepiece === "tall" ? 2.0 : 1.35;
    setLabel(item.obj, k, t.name, `${t.occupied}/${t.capacity}`, tall);
  }
  for (const c of state.chairs) {
    const k = "chair:" + c.id;
    seen.add(k);
    let item = items.get(k);
    if (!item) {
      const obj = new THREE.Group();
      const hit = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1, 0.5), M.hit);
      hit.position.y = 0.5;
      hit.userData.pick = { type: "chair", id: c.id };
      obj.add(hit);
      proxies.add(obj);
      item = { type: "chair", id: c.id, obj };
      items.set(k, item);
    }
    // The pick box rises with the chair, or a chair on a stage is unclickable from above the deck.
    item.obj.position.set(c.x, c.lift || 0, c.y);
    item.obj.rotation.y = -c.rot * DEG;
  }
  for (const [k, item] of items)
    if ((item.type === "table" || item.type === "chair") && !seen.has(k)) {
      proxies.remove(item.obj);
      items.delete(k);
      const l = labels.get(k);
      if (l) {
        l.obj.removeFromParent();
        labels.delete(k);
      }
    }
  for (const [k, l] of labels)
    if (k.startsWith("zone:") && !items.has(k))
      (l.obj.removeFromParent(), labels.delete(k));
}

// ---------------------------------------------------------------- air conditioners

const acGroup = new THREE.Group();
scene.add(acGroup);
const acCache = new Map();

const AC_MOUNT_COLOUR = {
  wall: "#e8e4dc",
  cassette: "#dcd6cc",
  floor: "#cfc8bc",
};

/** One unit, drawn where it sits. The shape says how it is fixed, which is what decides its throw. */
function buildUnit(u) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: AC_MOUNT_COLOUR[u.mount] ?? "#e8e4dc",
    roughness: 0.55,
    metalness: 0.15,
  });
  const ceiling = state.layout ? state.layout.ceiling : 5;
  let body;
  if (u.mount === "cassette") {
    body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.14, 0.7), mat);
    body.position.y = ceiling - 0.2;
  } else if (u.mount === "floor") {
    body = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.6, 0.32), mat);
    body.position.y = 0.8;
  } else {
    body = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.3, 0.26), mat);
    body.position.y = 2.4;
  }
  body.castShadow = true;
  g.add(body);
  // A small grille, so the unit reads as a machine rather than a box.
  const grille = new THREE.Mesh(
    new THREE.BoxGeometry(
      u.mount === "floor" ? 0.3 : 0.6,
      u.mount === "floor" ? 0.5 : 0.12,
      0.02
    ),
    new THREE.MeshStandardMaterial({ color: "#8f8a82", roughness: 0.8 })
  );
  grille.position.copy(body.position);
  grille.position.z += u.mount === "floor" ? 0.17 : 0.14;
  g.add(grille);
  const hit = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 1.2), M.hit);
  hit.position.y = 1.1;
  hit.userData.pick = { type: "ac", id: u.id };
  g.add(hit);
  return g;
}

function syncUnits() {
  const units = state.units || [];
  const seen = new Set();
  for (const u of units) {
    seen.add(u.id);
    const sig = `${u.mount}:${u.hp}:${u.inverter}`;
    let entry = acCache.get(u.id);
    if (!entry || entry.sig !== sig) {
      if (entry) {
        acGroup.remove(entry.obj);
        disposeGroup(entry.obj);
      }
      const obj = buildUnit(u);
      entry = { sig, obj };
      acCache.set(u.id, entry);
      acGroup.add(obj);
    }
    entry.obj.position.set(u.x, 0, u.y);
    items.set("ac:" + u.id, { type: "ac", id: u.id, obj: entry.obj });
  }
  for (const [id, entry] of acCache)
    if (!seen.has(id)) {
      acGroup.remove(entry.obj);
      disposeGroup(entry.obj);
      acCache.delete(id);
      items.delete("ac:" + id);
    }
}

// ---------------------------------------------------------------- heat map

const HEAT_STOPS = ["#2c7bb6", "#abd9e9", "#ffffbf", "#fdae61", "#d7191c"];
const heatGroup = new THREE.Group();
scene.add(heatGroup);
let heatMesh = null;
let heatSig = "";

function heatColour(t) {
  const x = Math.min(0.9999, Math.max(0, t)) * (HEAT_STOPS.length - 1);
  const i = Math.floor(x);
  const f = x - i;
  const a = new THREE.Color(HEAT_STOPS[i]);
  const b = new THREE.Color(HEAT_STOPS[i + 1]);
  return a.lerp(b, f);
}

/** Paint the field onto a canvas and lay it on the floor. */
function syncHeat() {
  const f = state.field;
  const show = !!(f && state.heat);
  if (!show) {
    if (heatMesh) heatMesh.visible = false;
    return;
  }
  const sum = f.temps.reduce((a, b) => a + b, 0);
  const sig = `${f.cols}:${f.rows}:${f.minC}:${f.maxC}:${sum.toFixed(3)}`;
  if (!heatMesh || heatSig !== sig) {
    const canvas = document.createElement("canvas");
    canvas.width = f.cols;
    canvas.height = f.rows;
    const ctx = canvas.getContext("2d");
    const span = Math.max(0.001, f.maxC - f.minC);
    for (let r = 0; r < f.rows; r++) {
      for (let c = 0; c < f.cols; c++) {
        const t = (f.temps[r * f.cols + c] - f.minC) / span;
        const col = heatColour(t);
        ctx.fillStyle = `rgb(${Math.round(col.r * 255)},${Math.round(
          col.g * 255
        )},${Math.round(col.b * 255)})`;
        ctx.fillRect(c, r, 1, 1);
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    if (heatMesh) {
      heatGroup.remove(heatMesh);
      heatMesh.geometry.dispose();
      heatMesh.material.map?.dispose();
      heatMesh.material.dispose();
    }
    const W = state.layout.width;
    const L = state.layout.length;
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      toneMapped: false,
    });
    heatMesh = new THREE.Mesh(new THREE.PlaneGeometry(W, L), mat);
    heatMesh.rotation.x = -Math.PI / 2;
    heatMesh.position.set(W / 2, 0.03, L / 2);
    heatMesh.renderOrder = 1;
    heatGroup.add(heatMesh);
    heatSig = sig;
  }
  heatMesh.visible = true;
}

// ---------------------------------------------------------------- selection visuals

const selGroup = new THREE.Group();
scene.add(selGroup);
const ringMat = new THREE.MeshBasicMaterial({
  color: "#c9a465",
  transparent: true,
  opacity: 0.95,
  depthWrite: false,
  toneMapped: false,
});
const warnMat = new THREE.MeshBasicMaterial({
  color: "#d4444f",
  transparent: true,
  opacity: 0.9,
  depthWrite: false,
  toneMapped: false,
});
const hoverMat = new THREE.MeshBasicMaterial({
  color: "#6e1426",
  transparent: true,
  opacity: 0.75,
  depthWrite: false,
  toneMapped: false,
});
const knobMat = new THREE.MeshBasicMaterial({
  color: "#6e1426",
  toneMapped: false,
});

function ringFor(item, material, pad = 0.15) {
  let geo;
  if (item.type === "table" && item.top.kind !== "rect") {
    const r = Math.max(item.top.w, item.top.h) / 2 + 0.55 + pad;
    geo = new THREE.RingGeometry(r - 0.05, r, 72);
    geo.rotateX(-Math.PI / 2);
  } else {
    const w =
      item.type === "table"
        ? item.top.w + 0.5 + pad * 2
        : item.type === "chair"
          ? 0.7
          : item.w + pad * 2;
    const h =
      item.type === "table"
        ? item.top.h + 1.1 + pad * 2
        : item.type === "chair"
          ? 0.7
          : item.h + pad * 2;
    const s = new THREE.Shape();
    s.moveTo(-w / 2, -h / 2);
    s.lineTo(w / 2, -h / 2);
    s.lineTo(w / 2, h / 2);
    s.lineTo(-w / 2, h / 2);
    const hole = new THREE.Path();
    const t = 0.05;
    hole.moveTo(-w / 2 + t, -h / 2 + t);
    hole.lineTo(-w / 2 + t, h / 2 - t);
    hole.lineTo(w / 2 - t, h / 2 - t);
    hole.lineTo(w / 2 - t, -h / 2 + t);
    s.holes.push(hole);
    geo = new THREE.ShapeGeometry(s);
    geo.rotateX(-Math.PI / 2);
  }
  const m = new THREE.Mesh(geo, material);
  m.position.y = 0.05;
  m.renderOrder = 5;
  return m;
}

function syncSelection() {
  disposeGroup(selGroup);
  for (const [id, kind] of Object.entries(state.warnings || {})) {
    const item = items.get("table:" + id);
    if (!item || kind === "tight") continue;
    const r = ringFor(item, warnMat, 0.05);
    r.position.add(item.obj.position);
    r.rotation.y = item.obj.rotation.y;
    selGroup.add(r);
  }
  if (hover && !state.selection.some((s) => s.type + ":" + s.id === hover)) {
    const item = items.get(hover);
    if (item) {
      const r = ringFor(item, hoverMat, 0.1);
      r.position.add(item.obj.position);
      r.rotation.y = item.obj.rotation.y;
      selGroup.add(r);
    }
  }
  for (const s of state.selection) {
    const item = items.get(s.type + ":" + s.id);
    if (!item) continue;
    const ring = ringFor(item, ringMat);
    const holder = new THREE.Group();
    holder.position.copy(item.obj.position);
    holder.rotation.y = item.obj.rotation.y;
    holder.add(ring);
    if (state.selection.length === 1) {
      // Rotation knob above the item.
      const depth =
        item.type === "table"
          ? item.top.kind === "rect"
            ? item.top.h / 2 + 0.75
            : Math.max(item.top.w, item.top.h) / 2 + 0.85
          : item.type === "chair"
            ? 0.55
            : item.h / 2 + 0.35;
      const stem = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.01, 0.45),
        ringMat
      );
      stem.position.set(0, 0.06, -depth - 0.1);
      const knob = new THREE.Mesh(
        new THREE.SphereGeometry(0.17, 20, 12),
        knobMat
      );
      knob.position.set(0, 0.2, -depth - 0.45);
      knob.userData.pick = { type: "rotate", id: s.id, kind: s.type };
      const knobRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.17, 0.035, 8, 24),
        ringMat
      );
      knobRing.rotation.x = Math.PI / 2;
      knobRing.position.copy(knob.position);
      holder.add(stem, knob, knobRing);
    }
    holder.userData.follow = s.type + ":" + s.id;
    selGroup.add(holder);
  }
  for (const [k, l] of labels)
    l.el.classList.toggle(
      "sel",
      state.selection.some((s) => s.type + ":" + s.id === k)
    );
  requestRender();
}

// ---------------------------------------------------------------- camera

const cam = { tx: 15, ty: 0, tz: 10, az: 0, pol: 0.95, dist: 50 };
let goal = null;
let fitDist = 50;

/** The lowest the camera may go: down to eye level, never under the floor. */
function maxPolar(dist) {
  return Math.min(1.53, Math.acos(Math.min(1, 0.5 / Math.max(0.5, dist))));
}

function applyCamera() {
  cam.pol = Math.min(cam.pol, maxPolar(cam.dist));
  const { tx, ty, tz, az, pol, dist } = cam;
  camera.position.set(
    tx + dist * Math.sin(pol) * Math.sin(az),
    ty + dist * Math.cos(pol),
    tz + dist * Math.sin(pol) * Math.cos(az)
  );
  const f = new THREE.Vector3(-Math.sin(az), 0, -Math.cos(az));
  camera.up.copy(
    f
      .multiplyScalar(Math.cos(pol))
      .add(new THREE.Vector3(0, Math.sin(pol), 0))
      .normalize()
  );
  camera.lookAt(tx, ty, tz);
  camera.near = Math.max(0.05, dist / 200);
  camera.far = dist * 20 + 200;
  camera.updateProjectionMatrix();
  boardMat.uniforms.uCam.value.copy(camera.position);
  // Fade the walls between the camera and the hall so the room stays visible.
  for (const w of walls) {
    const toCam = new THREE.Vector3().subVectors(camera.position, w.centre);
    const near = pol > 0.2 && toCam.dot(w.normal) > 0;
    const o = near ? 0.08 : 1;
    for (const m of w.mats) {
      m.userData.base ??= m.opacity;
      m.opacity =
        m.blending === THREE.AdditiveBlending
          ? near
            ? 0
            : m.userData.base
          : o;
      m.depthWrite = !near && m.blending !== THREE.AdditiveBlending;
    }
  }
  // A roof over the tables fades as soon as the camera rises above its eaves, so the plan stays
  // readable from above. Unlike a wall this does not depend on the polar angle: looking straight
  // down is exactly when the roof is most in the way.
  for (const r of roofs) {
    const above = camera.position.y > r.y;
    for (const m of r.mats) {
      m.userData.base ??= m.opacity;
      m.opacity = above ? 0.06 : m.userData.base;
      m.depthWrite = !above;
    }
  }
  // Glow sprites face the camera.
  shell.traverse(
    (o) => o.userData.billboard && o.quaternion.copy(camera.quaternion)
  );
  post({
    t: "camera",
    pct: Math.round((fitDist / dist) * 100),
    view: pol < 0.1 ? "top" : "3d",
  });
  requestRender();
}

/** Shift the picture so the hall centres in the part not covered by the floating panels. */
// The shift glides when panels open or close, so the hall eases into its new centre. The glide
// is timed, not counted in frames, so a slow machine draws only a frame or two of it.
const offset = { x: 0, y: 0, fx: 0, fy: 0, tx: 0, ty: 0, t0: 0, ready: false };
const OFFSET_MS = 420;
function applyViewOffset(animate = true) {
  const i = state.inset || {};
  const tx = ((i.right || 0) - (i.left || 0)) / 2;
  const ty = ((i.bottom || 0) - (i.top || 0)) / 2;
  if (offset.ready && tx === offset.tx && ty === offset.ty) return setOffset();
  offset.tx = tx;
  offset.ty = ty;
  if (!animate || !offset.ready || reduceMotion) {
    offset.x = tx;
    offset.y = ty;
    offset.ready = true;
  } else {
    offset.fx = offset.x;
    offset.fy = offset.y;
    offset.t0 = performance.now();
  }
  setOffset();
  requestRender();
}
function setOffset() {
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  if (offset.x || offset.y)
    camera.setViewOffset(w, h, offset.x, offset.y, w, h);
  else camera.clearViewOffset();
  camera.updateProjectionMatrix();
}

function hallFitDistance(pol) {
  const L = state.layout;
  if (!L) return 50;
  const W = stage.clientWidth;
  const H = Math.max(1, stage.clientHeight);
  // Only the part of the hall not under the floating panels counts.
  const i = state.inset || {};
  const fx = Math.max(0.25, (W - (i.left || 0) - (i.right || 0)) / W);
  const fy = Math.max(0.25, (H - (i.top || 0) - (i.bottom || 0)) / H);
  const aspect = W / H;
  const half = Math.tan((camera.fov * DEG) / 2);
  const w = L.width + 3;
  const l = L.length + 3;
  const d = Math.max(l / 2 / (half * fy), w / 2 / (half * aspect * fx));
  return d * (pol < 0.1 ? 1.05 : 1.12) + (pol < 0.1 ? L.ceiling : 0);
}

function tweenTo(next, ms = 520) {
  if (reduceMotion) {
    Object.assign(cam, next);
    goal = null;
    applyCamera();
    return;
  }
  goal = {
    from: { ...cam },
    to: { ...cam, ...next },
    t0: performance.now(),
    ms,
  };
  loop();
}

function fitView(pol = cam.pol) {
  const L = state.layout;
  fitDist = hallFitDistance(pol);
  tweenTo({
    tx: L.width / 2,
    ty: 0,
    tz: L.length / 2 + (pol < 0.1 ? 0 : 0.6),
    pol,
    dist: fitDist,
    az: pol < 0.1 ? 0 : cam.az,
  });
}

function zoomBy(f) {
  tweenTo({ dist: THREE.MathUtils.clamp(cam.dist * f, 2.5, 600) }, 280);
}

// ---------------------------------------------------------------- rendering

let dirty = true;
let looping = false;
function requestRender() {
  dirty = true;
  loop();
}
function loop() {
  if (looping) return;
  looping = true;
  requestAnimationFrame(frame);
}
let lastFrame = 0;
function frame(now) {
  looping = false;
  const dt = lastFrame ? Math.min(0.05, (now - lastFrame) / 1000) : 0.016;
  lastFrame = now;
  if (rainOn && stepRain(dt)) {
    dirty = true;
    loop();
  }
  if (offset.x !== offset.tx || offset.y !== offset.ty) {
    const k = Math.min(1, (now - offset.t0) / OFFSET_MS);
    const e = 1 - Math.pow(1 - k, 3);
    offset.x = k >= 1 ? offset.tx : offset.fx + (offset.tx - offset.fx) * e;
    offset.y = k >= 1 ? offset.ty : offset.fy + (offset.ty - offset.fy) * e;
    setOffset();
    dirty = true;
    if (k < 1) loop();
  }
  if (goal) {
    const k = Math.min(1, (now - goal.t0) / goal.ms);
    const e = 1 - Math.pow(1 - k, 3);
    for (const key of ["tx", "ty", "tz", "az", "pol", "dist"])
      cam[key] = goal.from[key] + (goal.to[key] - goal.from[key]) * e;
    applyCamera();
    if (k >= 1) goal = null;
    dirty = true;
  }
  if (dirty) {
    dirty = false;
    for (const s of selGroup.children) {
      const f = s.userData.follow && items.get(s.userData.follow);
      if (f) {
        s.position.copy(f.obj.position);
        s.rotation.y = f.obj.rotation.y;
      }
    }
    if (state.layout?.mood === "evening") composer.render();
    else renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
    declutter();
  }
  if (goal) loop();
}

/**
 * Hide labels that would sit on top of another: the selected item first, then areas, then the
 * tables nearest the camera. Zooming in brings the hidden ones back.
 */
function declutter() {
  if (!state.labels) return;
  const list = [];
  for (const [k, l] of labels) {
    if (l.el.style.display === "none") continue;
    const sel = l.el.classList.contains("sel");
    const d = l.obj.getWorldPosition(tmpV).distanceTo(camera.position);
    list.push({ l, rank: sel ? -1e9 : (k.startsWith("zone:") ? -1e6 : 0) + d });
  }
  list.sort((a, b) => a.rank - b.rank);
  const placed = [];
  for (const { l } of list) {
    const r = l.el.getBoundingClientRect();
    const hit = placed.some(
      (p) =>
        r.left < p.right + 2 &&
        r.right > p.left - 2 &&
        r.top < p.bottom + 1 &&
        r.bottom > p.top - 1
    );
    l.el.classList.toggle("muted", hit);
    if (!hit) placed.push(r);
  }
}

function resize() {
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  renderer.setSize(w, h);
  composer.setSize(w, h);
  bloom.resolution.set(w / 2, h / 2);
  labelRenderer.setSize(w, h);
  camera.aspect = w / Math.max(1, h);
  applyViewOffset(false);
  camera.updateProjectionMatrix();
  if (state.layout) fitDist = hallFitDistance(cam.pol);
  applyCamera();
}
new ResizeObserver(resize).observe(stage);

// ---------------------------------------------------------------- mood

// Figma-style dark grey board for evening (set a touch lighter than shown, since the evening
// pass tone-maps the whole frame).
const EVENING_BG = "#3f3f3f";
const EVENING_DOT = "#666666";

function applyMood() {
  const evening = state.layout.mood === "evening";
  // By day the board is the page's own background, with dots a shade darker.
  const day = state.board || "#f2f2f0";
  boardMat.uniforms.uBg.value.set(evening ? EVENING_BG : day);
  // A dark page (the dark interface) gets a lighter grid of dots, a light page a darker one.
  const dayColor = new THREE.Color(day);
  const dayHsl = { h: 0, s: 0, l: 0 };
  dayColor.getHSL(dayHsl);
  boardMat.uniforms.uDot.value.set(
    evening
      ? EVENING_DOT
      : dayHsl.l < 0.3
        ? dayColor.clone().offsetHSL(0, 0, 0.14)
        : dayColor.clone().offsetHSL(0, -0.05, -0.16)
  );
  boardMat.uniforms.uOpaque.value = evening ? 1 : 0;
  scene.background = evening ? new THREE.Color(EVENING_BG) : null;
  renderer.setClearColor(0x000000, 0);
  document.body.style.background = evening ? "#2c2c2c" : "transparent";
  document.body.classList.toggle("evening", evening);
  renderer.toneMappingExposure = evening ? 0.85 : 0.92;
  hemi.intensity = evening ? 0.12 : 0.55;
  hemi.color.set(evening ? "#ffd9b0" : "#ffffff");
  key.intensity = evening ? 0.75 : 1.9;
  key.color.set(evening ? "#ffd2a0" : "#fffaf2");
  scene.environmentIntensity = evening ? 0.3 : 0.9;
  M.wax.emissiveIntensity = evening ? 0.35 : 0;
  M.glow.opacity = evening ? 0.85 : 0.25;
  M.flame.color.set(evening ? "#ffd690" : "#ffe7bf");
}

// ---------------------------------------------------------------- environment

const envGroup = new THREE.Group();
scene.add(envGroup);
let envSig = "";
let rainOn = false;
let rain = null;

/**
 * Where the sun is, in degrees: azimuth clockwise from north, elevation above the horizon.
 *
 * The host's answer wins. Without one, a seasonal arc from the month keeps an unanswered venue
 * from being lit from a direction that could never happen.
 */
function sunAngles(venue) {
  const az = venue.sun?.azimuth;
  const el = venue.sun?.elevation;
  if (typeof az === "number" && typeof el === "number") {
    return { az, el: Math.max(2, Math.min(88, el)) };
  }
  const month = venue.climate?.month ?? 6;
  return {
    az: 135,
    el: Math.max(8, 35 + 25 * Math.sin(((month - 3) / 12) * Math.PI * 2)),
  };
}

/** A bearing in degrees to a direction on the floor, with north along -Z. */
function bearing(deg) {
  const r = (deg * Math.PI) / 180;
  return { x: Math.sin(r), z: -Math.cos(r) };
}

function applyEnvironment() {
  const L = state.layout;
  if (!L) return;
  const venue = venueOf(L);
  const open = isOpen(venue);
  const evening = L.mood === "evening";
  // Sky: an open venue gets a gradient behind it instead of the page board. This is set on every
  // pass, not behind the signature guard, because the mood pass just before it resets the
  // background to the board colour. The texture is cached, so re-setting it costs nothing.
  if (open) scene.background = T.sky(evening);

  const sig = JSON.stringify([
    venue.type,
    venue.environment,
    venue.sun,
    venue.wind,
    venue.climate?.month,
    evening,
    L.width,
    L.length,
  ]);
  if (sig === envSig) return;
  envSig = sig;
  disposeGroup(envGroup);

  const W = L.width;
  const Ln = L.length;

  // Sun: the key light is placed on the arc the host described.
  const { az, el } = sunAngles(venue);
  const dir = bearing(az);
  const reach = Math.max(W, Ln) * 1.4 + 14;
  const flat = Math.cos((el * Math.PI) / 180) * reach;
  key.position.set(
    W / 2 + dir.x * flat,
    Math.max(3, Math.sin((el * Math.PI) / 180) * reach),
    Ln / 2 + dir.z * flat
  );
  key.target.position.set(W / 2, 0, Ln / 2);
  key.target.updateMatrixWorld();

  // Wind: an arrow on the upwind edge, pointing the way the wind blows.
  const wind = venue.wind;
  if (wind && typeof wind.direction === "number") {
    const from = bearing(wind.direction);
    const mat = new THREE.MeshBasicMaterial({
      color: evening ? "#9fc4e8" : "#3f6f9e",
      toneMapped: false,
    });
    const arrow = new THREE.Group();
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 2.2, 8),
      mat
    );
    shaft.rotation.z = Math.PI / 2;
    shaft.position.x = 1.1;
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 12), mat);
    head.rotation.z = -Math.PI / 2;
    head.position.x = 2.5;
    arrow.add(shaft, head);
    const rad = Math.min(W, Ln) / 2 + 1.6;
    arrow.position.set(W / 2 + from.x * rad, 0.08, Ln / 2 + from.z * rad);
    // The arrow is modelled along +X; turn it to point back across the room.
    arrow.rotation.y = Math.PI / 2 - ((wind.direction + 180) * Math.PI) / 180;
    envGroup.add(arrow);
  }

  requestRender();
}

/** Rain: a column of falling streaks over the room, toggled from the studio. */
function setRain(on) {
  rainOn = on;
  if (rain) {
    scene.remove(rain);
    rain.geometry.dispose();
    rain.material.dispose();
    rain = null;
  }
  if (!on || !state.layout) {
    requestRender();
    return;
  }
  const W = state.layout.width;
  const Ln = state.layout.length;
  const count = 900;
  const streak = 0.45;
  // Two vertices a drop: the head and the tail above it, so the rain reads as streaks rather
  // than as dots falling.
  const pos = new Float32Array(count * 6);
  const speed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const x = Math.random() * (W + 8) - 4;
    const y = Math.random() * 14;
    const z = Math.random() * (Ln + 8) - 4;
    pos[i * 6] = x;
    pos[i * 6 + 1] = y;
    pos[i * 6 + 2] = z;
    pos[i * 6 + 3] = x;
    pos[i * 6 + 4] = y + streak;
    pos[i * 6 + 5] = z;
    speed[i] = 9 + Math.random() * 7;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.LineBasicMaterial({
    color: "#7fa8cc",
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    toneMapped: false,
  });
  rain = new THREE.LineSegments(geo, mat);
  rain.userData.speed = speed;
  rain.userData.streak = streak;
  rain.frustumCulled = false;
  scene.add(rain);
  requestRender();
}

/** Fall the rain one frame. Returns true while it is still moving. */
function stepRain(dt) {
  if (!rain) return false;
  const p = rain.geometry.attributes.position;
  const speed = rain.userData.speed;
  const streak = rain.userData.streak;
  for (let i = 0; i < speed.length; i++) {
    const head = i * 2;
    let y = p.getY(head) - speed[i] * dt;
    if (y < 0) y += 14;
    p.setY(head, y);
    p.setY(head + 1, y + streak);
  }
  p.needsUpdate = true;
  return true;
}

// ---------------------------------------------------------------- pointer

const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const marquee = document.getElementById("marquee");
let drag = null;
let hover = null;
const pointers = new Map();

function setNdc(e) {
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set(
    ((e.clientX - r.left) / r.width) * 2 - 1,
    -((e.clientY - r.top) / r.height) * 2 + 1
  );
  ray.setFromCamera(ndc, camera);
}
function floorPoint(e) {
  setNdc(e);
  const p = new THREE.Vector3();
  return ray.ray.intersectPlane(floorPlane, p) ? p : null;
}
/** What the layers panel hid and locked, as `kind:id` keys. Refreshed with every scene. */
let hiddenSet = new Set();
let lockedSet = new Set();

function pick(e) {
  setNdc(e);
  const targets = [
    ...selGroup.children,
    ...proxies.children,
    ...zoneGroup.children,
    ...acGroup.children,
  ];
  const hits = ray.intersectObjects(targets, true);
  for (const h of hits) {
    let o = h.object;
    while (o && !o.userData.pick) o = o.parent;
    // A hidden layer is not there to click: the pointer goes through to whatever is behind it.
    if (o && !hiddenSet.has(o.userData.pick.type + ":" + o.userData.pick.id))
      return o.userData.pick;
  }
  return null;
}

/**
 * Snap a dragged coordinate. A tent snaps to its leg module, so a table never lands on a leg;
 * every other venue snaps to 5 cm. Holding Alt turns snapping off.
 *
 * This is the input transform, not a second model: the app stores the value the renderer reports,
 * so what is drawn and what is saved stay the same number.
 */
function snap(v, e) {
  if (e.altKey) return v;
  const module = state.layout ? legModule(venueOf(state.layout)) : 0;
  const step = module || 0.05;
  return Math.round(v / step) * step;
}

renderer.domElement.addEventListener("contextmenu", (e) => e.preventDefault());

renderer.domElement.addEventListener("pointerdown", (e) => {
  renderer.domElement.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    // Two fingers: pinch to zoom, move both to pan, the point between them stays put.
    goal = null;
    drag = {
      kind: "pinch",
      d0: Math.hypot(a.x - b.x, a.y - b.y),
      dist0: cam.dist,
      p0: floorPoint({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 }),
    };
    return;
  }
  goal = null;
  const orbit = e.button === 0 && e.altKey;
  const pan =
    e.button === 1 || e.button === 2 || state.tool === "hand" || spaceDown;
  if (orbit) {
    drag = {
      kind: "orbit",
      x: e.clientX,
      y: e.clientY,
      az: cam.az,
      pol: cam.pol,
    };
    return;
  }
  if (pan) {
    drag = { kind: "pan", p0: floorPoint(e) };
    document.body.classList.add("grabbing");
    return;
  }
  const p = pick(e);
  if (state.placing) {
    const f = floorPoint(e);
    if (f) post({ t: "placeAc", x: round2(f.x), y: round2(f.z) });
    return;
  }
  if (state.assigning) {
    if (p?.type === "table") post({ t: "tableClick", id: p.id });
    return;
  }
  // A unit is dragged, never selected: it has no inspector, and selecting it would empty the deck.
  if (p?.type === "ac") {
    const item = items.get("ac:" + p.id);
    if (item && !lockedSet.has("ac:" + p.id)) {
      drag = {
        kind: "move",
        p0: floorPoint(e),
        start: [{ i: item, x: item.obj.position.x, z: item.obj.position.z }],
        moved: false,
        clicked: p,
        toggle: false,
      };
    }
    return;
  }
  if (p?.type === "rotate") {
    // A locked layer keeps its handle for show but will not turn.
    if (lockedSet.has(p.kind + ":" + p.id)) return;
    const item = items.get(p.kind + ":" + p.id);
    drag = { kind: "rotate", item, moved: false };
    return;
  }
  if (p) {
    const k = p.type + ":" + p.id;
    const selected = state.selection.some((s) => s.type + ":" + s.id === k);
    if (!selected) {
      state.selection = e.shiftKey ? [...state.selection, p] : [p];
      post({ t: "select", items: state.selection });
      syncSelection();
    }
    // Ctrl (or Cmd) on an item copies it. Alt is already the orbit gesture, so it cannot be this.
    if (e.ctrlKey || e.metaKey) {
      post({ t: "duplicate", items: state.selection });
      return;
    }
    // A locked layer can be picked but not dragged.
    const moving = state.selection
      .filter((s) => !lockedSet.has(s.type + ":" + s.id))
      .map((s) => items.get(s.type + ":" + s.id))
      .filter(Boolean);
    // A chair set on a stage travels with it, so dragging the stage does not leave it behind.
    const staged = new Set(
      state.selection.filter((s) => s.type === "zone").map((s) => s.id)
    );
    if (staged.size) {
      for (const c of state.chairs) {
        if (!c.stageId || !staged.has(c.stageId)) continue;
        const item = items.get("chair:" + c.id);
        if (item && !lockedSet.has("chair:" + c.id) && !moving.includes(item))
          moving.push(item);
      }
    }
    drag = {
      kind: "move",
      p0: floorPoint(e),
      start: moving.map((i) => ({
        i,
        x: i.obj.position.x,
        z: i.obj.position.z,
      })),
      moved: false,
      clicked: p,
      toggle: e.shiftKey && selected,
    };
    document.body.classList.add("grabbing");
    return;
  }
  // Dragging empty space turns the hall; Shift-drag draws a selection box instead.
  if (!e.shiftKey) {
    drag = {
      kind: "orbit",
      x: e.clientX,
      y: e.clientY,
      az: cam.az,
      pol: cam.pol,
      empty: true,
      moved: false,
    };
    document.body.classList.add("grabbing");
    return;
  }
  drag = {
    kind: "marquee",
    x: e.clientX,
    y: e.clientY,
    shift: e.shiftKey,
    moved: false,
  };
});

renderer.domElement.addEventListener("pointermove", (e) => {
  if (pointers.has(e.pointerId))
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (!drag) {
    const p = state.tool === "hand" ? null : pick(e);
    const k = p && p.type !== "rotate" ? p.type + ":" + p.id : null;
    const want = state.assigning
      ? p?.type === "table"
        ? "copy"
        : "not-allowed"
      : p?.type === "rotate"
        ? "alias"
        : p
          ? "grab"
          : state.tool === "hand"
            ? "grab"
            : "default";
    renderer.domElement.style.cursor = want;
    if (k !== hover && (state.assigning ? p?.type === "table" || !k : true)) {
      hover = k;
      syncSelection();
    }
    return;
  }
  if (drag.kind === "pinch") {
    const [a, b] = [...pointers.values()];
    if (!a || !b) return;
    cam.dist = THREE.MathUtils.clamp(
      (drag.dist0 * drag.d0) / Math.max(10, Math.hypot(a.x - b.x, a.y - b.y)),
      2.5,
      600
    );
    applyCamera();
    const p = floorPoint({
      clientX: (a.x + b.x) / 2,
      clientY: (a.y + b.y) / 2,
    });
    if (drag.p0 && p) {
      cam.tx += drag.p0.x - p.x;
      cam.tz += drag.p0.z - p.z;
      applyCamera();
    }
  } else if (drag.kind === "orbit") {
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 4)
      drag.moved = true;
    if (!drag.moved) return;
    goal = null;
    cam.az = drag.az - (e.clientX - drag.x) * 0.006;
    cam.pol = THREE.MathUtils.clamp(
      drag.pol - (e.clientY - drag.y) * 0.005,
      0.0001,
      maxPolar(cam.dist)
    );
    applyCamera();
  } else if (drag.kind === "pan" && drag.p0) {
    const p = floorPoint(e);
    if (!p) return;
    cam.tx += drag.p0.x - p.x;
    cam.tz += drag.p0.z - p.z;
    applyCamera();
  } else if (drag.kind === "move" && drag.p0) {
    const p = floorPoint(e);
    if (!p) return;
    const dx = snap(p.x - drag.p0.x, e);
    const dz = snap(p.z - drag.p0.z, e);
    if (!drag.moved && Math.hypot(dx, dz) < 0.04) return;
    drag.moved = true;
    // Keep everything inside the room.
    const W = state.layout.width;
    const L = state.layout.length;
    for (const s of drag.start)
      s.i.obj.position.set(
        THREE.MathUtils.clamp(s.x + dx, 0, W),
        0,
        THREE.MathUtils.clamp(s.z + dz, 0, L)
      );
    if (drag.start.some((s) => s.i.type !== "zone")) rebuildInstances();
    renderer.shadowMap.needsUpdate = true;
    requestRender();
  } else if (drag.kind === "rotate") {
    const p = floorPoint(e);
    if (!p) return;
    const o = drag.item.obj.position;
    // The knob sits at -z, so pointing straight "up" the plan is no rotation.
    let deg = Math.atan2(p.x - o.x, -(p.z - o.z)) / DEG;
    if (!e.shiftKey) deg = Math.round(deg / 15) * 15;
    drag.item.obj.rotation.y = -deg * DEG;
    drag.deg = ((deg % 360) + 360) % 360;
    drag.moved = true;
    if (drag.item.type !== "zone") rebuildInstances();
    renderer.shadowMap.needsUpdate = true;
    requestRender();
  } else if (drag.kind === "marquee") {
    const x0 = Math.min(drag.x, e.clientX);
    const y0 = Math.min(drag.y, e.clientY);
    const w = Math.abs(e.clientX - drag.x);
    const h = Math.abs(e.clientY - drag.y);
    if (w + h > 6) drag.moved = true;
    Object.assign(marquee.style, {
      display: drag.moved ? "block" : "none",
      left: x0 + "px",
      top: y0 + "px",
      width: w + "px",
      height: h + "px",
    });
    drag.rect = { x0, y0, x1: x0 + w, y1: y0 + h };
  }
});

function endDrag(e) {
  pointers.delete(e.pointerId);
  if (!drag) return;
  document.body.classList.remove("grabbing");
  const d = drag;
  drag = null;
  if (d.kind === "orbit" && d.empty && !d.moved && state.selection.length) {
    state.selection = [];
    post({ t: "select", items: [] });
    syncSelection();
  }
  if (d.kind === "move") {
    if (d.moved) {
      post({
        t: "move",
        items: d.start.map((s) => ({
          type: s.i.type,
          id: s.i.id,
          x: round2(s.i.obj.position.x),
          y: round2(s.i.obj.position.z),
        })),
      });
    } else if (d.toggle) {
      state.selection = state.selection.filter(
        (s) => !(s.type === d.clicked.type && s.id === d.clicked.id)
      );
      post({ t: "select", items: state.selection });
      syncSelection();
    }
  } else if (d.kind === "rotate" && d.moved) {
    post({ t: "rotate", type: d.item.type, id: d.item.id, rot: d.deg });
  } else if (d.kind === "marquee") {
    marquee.style.display = "none";
    if (!d.moved) {
      if (!d.shift && state.selection.length) {
        state.selection = [];
        post({ t: "select", items: [] });
        syncSelection();
      }
      return;
    }
    const r = renderer.domElement.getBoundingClientRect();
    const picked = [];
    for (const item of items.values()) {
      if (hiddenSet.has(item.type + ":" + item.id)) continue;
      const v = item.obj.position.clone().project(camera);
      const sx = r.left + ((v.x + 1) / 2) * r.width;
      const sy = r.top + ((1 - v.y) / 2) * r.height;
      if (
        sx >= d.rect.x0 &&
        sx <= d.rect.x1 &&
        sy >= d.rect.y0 &&
        sy <= d.rect.y1
      )
        picked.push({ type: item.type, id: item.id });
    }
    state.selection = d.shift
      ? [
          ...state.selection,
          ...picked.filter((p) => !state.selection.some((s) => s.id === p.id)),
        ]
      : picked;
    post({ t: "select", items: state.selection });
    syncSelection();
  }
  if (pendingScene) {
    const s = pendingScene;
    pendingScene = null;
    applyScene(s);
  }
}
renderer.domElement.addEventListener("pointerup", endDrag);
renderer.domElement.addEventListener("pointercancel", endDrag);
renderer.domElement.addEventListener("pointerleave", () => {
  if (hover && !drag) {
    hover = null;
    syncSelection();
  }
});

/** Zoom by a factor, keeping the floor point under the pointer where it is. */
function zoomAt(x, y, f) {
  goal = null;
  const before = floorPoint({ clientX: x, clientY: y });
  cam.dist = THREE.MathUtils.clamp(cam.dist * f, 2.5, 600);
  applyCamera();
  const after = floorPoint({ clientX: x, clientY: y });
  if (before && after) {
    cam.tx += before.x - after.x;
    cam.tz += before.z - after.z;
    applyCamera();
  }
}

// Safari reports trackpad pinches as gesture events instead.
let gestureScale = 1;
window.addEventListener("gesturestart", (e) => {
  e.preventDefault();
  gestureScale = 1;
});
window.addEventListener("gesturechange", (e) => {
  e.preventDefault();
  // A finger pinch on a touch screen is already handled through its two pointers.
  if (pointers.size >= 2) return;
  const f = gestureScale / e.scale;
  gestureScale = e.scale;
  zoomAt(e.clientX, e.clientY, f);
});
window.addEventListener("gestureend", (e) => e.preventDefault());

// Scrolling never zooms: plain wheel movement goes to the page instead.
window.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    // A two-finger pinch on a trackpad arrives as a wheel event with ctrlKey: zoom towards the
    // pointer. Ordinary scrolling never zooms.
    if (e.ctrlKey) {
      zoomAt(
        e.clientX,
        e.clientY,
        Math.exp(THREE.MathUtils.clamp(e.deltaY, -30, 30) * 0.01)
      );
      return;
    }
    post({
      t: "wheel",
      dx: e.deltaX,
      dy: e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1),
    });
  },
  { passive: false }
);

let spaceDown = false;
window.addEventListener("keydown", (e) => {
  if (e.key === " ") {
    spaceDown = true;
    e.preventDefault();
    return;
  }
  post({
    t: "key",
    key: e.key,
    shift: e.shiftKey,
    ctrl: e.ctrlKey,
    meta: e.metaKey,
    alt: e.altKey,
  });
  if (
    [
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "Delete",
      "Backspace",
    ].includes(e.key) ||
    ((e.ctrlKey || e.metaKey) && /^[zyd]$/i.test(e.key))
  )
    e.preventDefault();
});
window.addEventListener("keyup", (e) => {
  if (e.key === " ") spaceDown = false;
});

const round2 = (n) => Math.round(n * 100) / 100;

// ---------------------------------------------------------------- snapshot

function snapshot() {
  const prev = renderer.getPixelRatio();
  renderer.setPixelRatio(Math.min(3, prev * 1.5));
  resize();
  if (state.layout.mood === "evening") composer.render();
  else {
    // The picture gets the page colour behind it rather than a see-through background. An open
    // venue already has a sky, so it keeps it.
    const open = isOpen(venueOf(state.layout));
    const prevBg = scene.background;
    if (!open) scene.background = new THREE.Color(state.board || "#f7f2ea");
    boardMat.uniforms.uOpaque.value = 1;
    renderer.render(scene, camera);
    scene.background = prevBg;
    boardMat.uniforms.uOpaque.value = 0;
  }
  const url = renderer.domElement.toDataURL("image/png");
  renderer.setPixelRatio(prev);
  resize();
  const a = document.createElement("a");
  a.href = url;
  a.download = "ariya-hall.png";
  document.body.appendChild(a);
  a.click();
  a.remove();
  post({ t: "snapshot" });
}

// ---------------------------------------------------------------- protocol

const state = {
  layout: null,
  tables: [],
  chairs: [],
  selection: [],
  tool: "select",
  labels: true,
  warnings: {},
  ghosts: [],
  assigning: false,
  units: [],
  field: null,
  heat: false,
  placing: false,
};
let pendingScene = null;
let first = true;

/**
 * Show or hide what the layers panel switched off. Tables and chairs are instanced, so they are
 * left out of `rebuildInstances` instead; everything else is a group that is simply turned off,
 * along with its label.
 */
function applyVisibility() {
  for (const [id, entry] of zoneCache)
    entry.obj.visible = !hiddenSet.has("zone:" + id);
  const stageOf = new Map(
    (state.stageItems || []).map((i) => [i.id, i.stageId])
  );
  for (const [id, entry] of stageCache)
    entry.obj.visible =
      !hiddenSet.has("stageItem:" + id) &&
      !hiddenSet.has("zone:" + stageOf.get(id));
  for (const [id, entry] of acCache)
    entry.obj.visible = !hiddenSet.has("ac:" + id);
  for (const [key, l] of labels) l.obj.visible = !hiddenSet.has(key);
}

function applyScene(s) {
  const moodChanged = !state.layout || state.layout.mood !== s.layout.mood;
  const insetChanged =
    JSON.stringify(state.inset || {}) !== JSON.stringify(s.inset || {});
  Object.assign(state, s);
  const layers = state.layout.layers || {};
  hiddenSet = new Set(layers.hidden || []);
  lockedSet = new Set(layers.locked || []);
  buildShell(state.layout);
  // New walls start opaque; fade the ones in front of the camera again.
  applyCamera();
  applyMood();
  // After the mood, which sets the board colour the sky replaces for an open venue.
  applyEnvironment();
  if (moodChanged) zoneCache.forEach((e) => (e.sig = ""));
  syncZones();
  syncStageItems();
  syncTables();
  syncUnits();
  syncHeat();
  applyVisibility();
  rebuildInstances();
  syncSelection();
  labelRenderer.domElement.style.display = state.labels ? "" : "none";
  document.body.classList.toggle("assigning", !!state.assigning);
  if (insetChanged) {
    applyViewOffset();
    fitDist = hallFitDistance(cam.pol);
    applyCamera();
  }
  if (first) {
    first = false;
    fitDist = hallFitDistance(cam.pol);
    Object.assign(cam, {
      tx: state.layout.width / 2,
      tz: state.layout.length / 2 + 0.6,
      dist: fitDist * 1.6,
      az: -0.35,
    });
    applyCamera();
    tweenTo({ dist: fitDist, az: 0 }, 1100);
  }
  requestRender();
}

function post(msg) {
  if (window.parent !== window)
    window.parent.postMessage(
      { source: "ariya-hall3d", ...msg },
      location.origin
    );
}

window.addEventListener("message", (e) => {
  if (e.origin !== location.origin || e.source !== window.parent) return;
  const m = e.data;
  if (!m || m.source !== "ariya-studio") return;
  if (m.t === "hello") {
    post({ t: "ready" });
  } else if (m.t === "scene") {
    if (drag && (drag.kind === "move" || drag.kind === "rotate"))
      pendingScene = m;
    else applyScene(m);
  } else if (m.t === "cmd") {
    if (!state.layout) return;
    switch (m.cmd) {
      case "zoomIn":
        zoomBy(0.8);
        break;
      case "zoomOut":
        zoomBy(1.25);
        break;
      case "fit":
        fitView();
        break;
      case "top":
        fitView(0.0001);
        break;
      case "perspective":
        fitView(0.95);
        break;
      case "rotateLeft":
        tweenTo({ az: cam.az + Math.PI / 4 }, 420);
        break;
      case "rotateRight":
        tweenTo({ az: cam.az - Math.PI / 4 }, 420);
        break;
      case "tiltUp":
        tweenTo({ pol: Math.max(0.0001, cam.pol - 0.2) }, 360);
        break;
      case "tiltDown":
        tweenTo({ pol: Math.min(maxPolar(cam.dist), cam.pol + 0.2) }, 360);
        break;
      case "hover": {
        // The layers panel pointing at something lights it up in the hall, the way a design
        // program does, so a row is never a name with no place.
        const key = m.key || null;
        if (key !== hover) {
          hover = key;
          syncSelection();
        }
        break;
      }
      case "focus": {
        const item = items.get(m.key);
        if (item)
          tweenTo({
            tx: item.obj.position.x,
            ty: item.obj.position.y || 0,
            tz: item.obj.position.z,
            dist: Math.min(cam.dist, 14),
          });
        break;
      }
      case "frame": {
        // Look at the top of an area rather than the floor, so a stage's furniture is in view.
        const at = m.at;
        if (!at) break;
        const span = Math.max(at.w, at.h);
        tweenTo({
          tx: at.x,
          tz: at.y,
          ty: at.height || 0,
          dist: Math.max(6, span * 2.6),
        });
        break;
      }
      case "rain":
        setRain(!rainOn);
        post({ t: "rain", on: rainOn });
        break;
      case "snapshot":
        snapshot();
        break;
      case "inspect": {
        // Where things really are in the scene, in metres, so a test can read the drawn room
        // instead of judging a picture of it.
        const r = (n) => Math.round(n * 100) / 100;
        // Where a point of the room lands on the page, so a test can aim a real pointer at it.
        const rect = renderer.domElement.getBoundingClientRect();
        const onScreen = (x, y, z) => {
          const v = new THREE.Vector3(x, y, z).project(camera);
          return {
            sx: Math.round(rect.left + ((v.x + 1) / 2) * rect.width),
            sy: Math.round(rect.top + ((1 - v.y) / 2) * rect.height),
          };
        };
        let clothDrawn = 0;
        for (const [k, b] of batches)
          if (k.startsWith("cloth:") && b.mesh) clothDrawn += b.mesh.count;
        post({
          t: "inspect",
          // How many table cloths are on screen, which zones and labels are showing, and what
          // is locked: what a test needs to tell "hidden" from "gone".
          drawn: {
            tables: clothDrawn,
            zones: [...zoneCache].map(([id, e]) => ({
              id,
              visible: e.obj.visible,
            })),
            labels: [...labels].map(([key, l]) => ({
              key,
              visible: l.obj.visible,
            })),
            acs: [...acCache].map(([id, e]) => ({
              id,
              visible: e.obj.visible,
            })),
          },
          locked: [...lockedSet],
          points: (m.points || []).map((p) => ({
            ...p,
            ...onScreen(p.x, p.y || 0, p.z),
          })),
          stageItems: [...stageCache].map(([id, e]) => ({
            id,
            x: r(e.obj.position.x),
            y: r(e.obj.children[0]?.position.y ?? 0),
            z: r(e.obj.position.z),
            yaw: r(e.obj.rotation.y / DEG),
          })),
          chairs: [...items.values()]
            .filter((i) => i.type === "chair")
            .map((i) => ({
              id: i.id,
              x: r(i.obj.position.x),
              y: r(i.obj.position.y),
              z: r(i.obj.position.z),
              // The middle of its pick box, which is what a pointer has to land on.
              ...onScreen(
                i.obj.position.x,
                i.obj.position.y + 0.5,
                i.obj.position.z
              ),
            })),
        });
        break;
      }
    }
  }
});

resize();
post({ t: "ready" });
