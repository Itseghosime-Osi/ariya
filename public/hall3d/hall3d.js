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
  for (const c of state.chairs) {
    const item = items.get("chair:" + c.id);
    if (!item) continue;
    const o = item.obj;
    pushChair(
      mat(o.position.x, 0, o.position.z, o.rotation.y),
      c.type,
      c.cover,
      c.sash,
      null
    );
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

function buildShell(L) {
  const { width: W, length: Ln, ceiling: H, decor, mood } = L;
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
  ]);
  if (sig === shellSig) return;
  shellSig = sig;
  disposeGroup(shell);
  walls.length = 0;
  const evening = mood === "evening";

  // Floor slab.
  const slab = new THREE.Mesh(new THREE.BoxGeometry(W + 0.6, 0.2, Ln + 0.6), [
    new THREE.MeshStandardMaterial({ color: "#d9d2c6", roughness: 0.8 }),
    new THREE.MeshStandardMaterial({ color: "#d9d2c6", roughness: 0.8 }),
    floorMaterial(decor.floor, W + 0.6, Ln + 0.6),
    new THREE.MeshStandardMaterial({ color: "#d9d2c6" }),
    new THREE.MeshStandardMaterial({ color: "#d9d2c6", roughness: 0.8 }),
    new THREE.MeshStandardMaterial({ color: "#d9d2c6", roughness: 0.8 }),
  ]);
  slab.position.set(W / 2, -0.1, Ln / 2);
  slab.receiveShadow = true;
  shell.add(slab);

  // Walls with panelling, skirting and a gold cornice.
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

  // Chandeliers.
  if (L.chandeliers) {
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
    item.obj.position.set(c.x, 0, c.y);
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

const cam = { tx: 15, tz: 10, az: 0, pol: 0.95, dist: 50 };
let goal = null;
let fitDist = 50;

/** The lowest the camera may go: down to eye level, never under the floor. */
function maxPolar(dist) {
  return Math.min(1.53, Math.acos(Math.min(1, 0.5 / Math.max(0.5, dist))));
}

function applyCamera() {
  cam.pol = Math.min(cam.pol, maxPolar(cam.dist));
  const { tx, tz, az, pol, dist } = cam;
  camera.position.set(
    tx + dist * Math.sin(pol) * Math.sin(az),
    dist * Math.cos(pol),
    tz + dist * Math.sin(pol) * Math.cos(az)
  );
  const f = new THREE.Vector3(-Math.sin(az), 0, -Math.cos(az));
  camera.up.copy(
    f
      .multiplyScalar(Math.cos(pol))
      .add(new THREE.Vector3(0, Math.sin(pol), 0))
      .normalize()
  );
  camera.lookAt(tx, 0, tz);
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
// The shift glides when panels open or close, so the hall eases into its new centre.
const offset = { x: 0, y: 0, tx: 0, ty: 0, ready: false };
function applyViewOffset(animate = true) {
  const i = state.inset || {};
  offset.tx = ((i.right || 0) - (i.left || 0)) / 2;
  offset.ty = ((i.bottom || 0) - (i.top || 0)) / 2;
  if (!animate || !offset.ready || reduceMotion) {
    offset.x = offset.tx;
    offset.y = offset.ty;
    offset.ready = true;
  }
  setOffset();
  loop();
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
function frame(now) {
  looping = false;
  if (offset.x !== offset.tx || offset.y !== offset.ty) {
    offset.x += (offset.tx - offset.x) * 0.16;
    offset.y += (offset.ty - offset.y) * 0.16;
    if (
      Math.abs(offset.tx - offset.x) < 0.5 &&
      Math.abs(offset.ty - offset.y) < 0.5
    ) {
      offset.x = offset.tx;
      offset.y = offset.ty;
    }
    setOffset();
    dirty = true;
    loop();
  }
  if (goal) {
    const k = Math.min(1, (now - goal.t0) / goal.ms);
    const e = 1 - Math.pow(1 - k, 3);
    for (const key of ["tx", "tz", "az", "pol", "dist"])
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
  boardMat.uniforms.uDot.value.set(
    evening ? EVENING_DOT : new THREE.Color(day).offsetHSL(0, -0.05, -0.16)
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
function pick(e) {
  setNdc(e);
  const targets = [
    ...selGroup.children,
    ...proxies.children,
    ...zoneGroup.children,
  ];
  const hits = ray.intersectObjects(targets, true);
  for (const h of hits) {
    let o = h.object;
    while (o && !o.userData.pick) o = o.parent;
    if (o) return o.userData.pick;
  }
  return null;
}

const snap = (v, e) => (e.altKey ? v : Math.round(v / 0.05) * 0.05);

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
  if (state.assigning) {
    if (p?.type === "table") post({ t: "tableClick", id: p.id });
    return;
  }
  if (p?.type === "rotate") {
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
    const moving = state.selection
      .map((s) => items.get(s.type + ":" + s.id))
      .filter(Boolean);
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
    // The picture gets the page colour behind it rather than a see-through background.
    scene.background = new THREE.Color(state.board || "#f7f2ea");
    boardMat.uniforms.uOpaque.value = 1;
    renderer.render(scene, camera);
    scene.background = null;
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
};
let pendingScene = null;
let first = true;

function applyScene(s) {
  const moodChanged = !state.layout || state.layout.mood !== s.layout.mood;
  const insetChanged =
    JSON.stringify(state.inset || {}) !== JSON.stringify(s.inset || {});
  Object.assign(state, s);
  buildShell(state.layout);
  // New walls start opaque; fade the ones in front of the camera again.
  applyCamera();
  applyMood();
  if (moodChanged) zoneCache.forEach((e) => (e.sig = ""));
  syncZones();
  syncTables();
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
      case "focus": {
        const item = items.get(m.key);
        if (item)
          tweenTo({
            tx: item.obj.position.x,
            tz: item.obj.position.z,
            dist: Math.min(cam.dist, 14),
          });
        break;
      }
      case "snapshot":
        snapshot();
        break;
    }
  }
});

resize();
post({ t: "ready" });
