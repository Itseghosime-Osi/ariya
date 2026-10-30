
/* The camera. Everything is rendered into a linear HDR buffer, then treated like light hitting a sensor:
   physically based materials lit by a real ballroom HDRI, a ray-traced brilliant-cut diamond with dispersion,
   lens depth of field with a moving focus plane, bloom, chromatic aberration, vignette and film grain. */
import * as THREE from "three";
import { EXRLoader } from "three/addons/loaders/EXRLoader.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { ConvexGeometry } from "three/addons/geometries/ConvexGeometry.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { SMAAPass } from "three/addons/postprocessing/SMAAPass.js";
import { FullScreenQuad } from "three/addons/postprocessing/Pass.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { Reflector } from "three/addons/objects/Reflector.js";

const OP = window.OP;
const { seg, bump, smooth, clamp } = OP;
const lerp = (a, b, t) => a + (b - a) * t;
const motion = OP.reduceMotion ? 0 : 1;
const canvas = document.getElementById("gl");
const mobile = Math.min(window.innerWidth, window.innerHeight) < 700 || window.matchMedia("(pointer: coarse)").matches;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
  if (!renderer.capabilities.isWebGL2) throw new Error("webgl2");
} catch (e) {
  renderer = null;
  canvas.style.display = "none";
  OP.failed = true;
  if (OP.embed) parent.postMessage({ type: "ariya-stage-failed", mode: OP.embed }, location.origin);
}
if (renderer) await start();

async function start() {
  try { await Promise.race([Promise.all([document.fonts.load('400 20px "Figtree"'), document.fonts.load('64px "Pinyon Script"'), document.fonts.load('italic 92px "Bodoni Moda"')]), new Promise((r) => setTimeout(r, 2500))]); } catch (e) { /* draw with fallbacks */ }
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.toneMapping = THREE.NoToneMapping;
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.05, 120);
  const setA = new THREE.Group(); // the proposal: a ring box on a linen table, 1 unit is about 3 cm
  const setB = new THREE.Group(); // the reception hall, 1 unit is 1 m
  scene.add(setA, setB);

  /* ---------- Environment: a real ballroom with chandeliers (Poly Haven, CC0) ---------- */
  // Fetch independent lighting assets together; keep the same textures and fallback.
  const [envTex, roomTexture, nightTexture] = await Promise.all([
    new EXRLoader().loadAsync("assets/hall.exr"),
    new EXRLoader().loadAsync("assets/apartment.exr").catch(() => null),
    new EXRLoader().loadAsync("assets/night.exr").catch(() => null)
  ]);
  envTex.mapping = THREE.EquirectangularReflectionMapping;
  OP.loaded = 0.35;
  const envEuler = new THREE.Euler(0, 2.2, 0);
  scene.environment = envTex;
  // Each place gets light from a real place: a lived-in apartment for the two rooms, a night sky for the lagoon (Poly Haven, CC0).
  const envRoom = roomTexture || envTex, envNight = nightTexture || envTex;
  envRoom.mapping = envNight.mapping = THREE.EquirectangularReflectionMapping;
  scene.environmentRotation.copy(envEuler);
  scene.backgroundRotation.copy(envEuler);
  scene.backgroundBlurriness = 0.32;
  const hallColor = new THREE.Color(0x0b0503);
  scene.fog = new THREE.FogExp2(0x0d0604, 0);

  /* ---------- Procedural textures ---------- */
  function canvasTex(w, h, draw, opts) {
    opts = opts || {};
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c);
    if (opts.srgb !== false) t.colorSpace = THREE.SRGBColorSpace;
    if (opts.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(opts.repeat[0], opts.repeat[1]); }
    t.anisotropy = maxAniso;
    return t;
  }
  function heightToNormal(heights, w, h, strength, repeat) {
    return canvasTex(w, h, (g) => {
      const img = g.createImageData(w, h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const hx = heights[y * w + (x + 1) % w] - heights[y * w + (x - 1 + w) % w];
        const hy = heights[((y + 1) % h) * w + x] - heights[((y - 1 + h) % h) * w + x];
        let nx = -hx * strength, ny = hy * strength, nz = 1;
        const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
        const i = (y * w + x) * 4;
        img.data[i] = (nx * 0.5 + 0.5) * 255; img.data[i + 1] = (ny * 0.5 + 0.5) * 255; img.data[i + 2] = (nz * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    }, { srgb: false, repeat });
  }
  const rand = (() => { let s = 11; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })();

  // Linen weave
  const linenNormal = (() => {
    const w = 256, h = 256, H = new Float32Array(w * h), T = 4;
    const rowR = Array.from({ length: h / T }, () => 0.7 + rand() * 0.6), colR = Array.from({ length: w / T }, () => 0.7 + rand() * 0.6);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const cx = Math.floor(x / T), cy = Math.floor(y / T), over = (cx + cy) & 1;
      const v = over ? Math.sin(Math.PI * (y % T + 0.5) / T) * rowR[cy] : Math.sin(Math.PI * (x % T + 0.5) / T) * colR[cx];
      H[y * w + x] = v + (rand() - 0.5) * 0.25;
    }
    return heightToNormal(H, w, h, 1.4, [26, 26]);
  })();
  // Crushed velvet pile
  const velvetNormal = (() => {
    const w = 128, h = 128, H = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const a = x / w * Math.PI * 2, b = y / h * Math.PI * 2;
      H[y * w + x] = 0.5 * Math.sin(a * 3 + Math.sin(b * 2) * 1.5) + 0.35 * Math.sin(b * 5 + Math.cos(a * 4)) + (rand() - 0.5) * 0.6;
    }
    return heightToNormal(H, w, h, 0.9, [2, 2]);
  })();

  async function fontsReady() {
    try {
      await Promise.race([
        Promise.all([document.fonts.load('italic 400 120px "Bodoni Moda"'), document.fonts.load('400 40px "Figtree"')]),
        new Promise((r) => setTimeout(r, 1500))
      ]);
    } catch (e) { /* fall back to Georgia */ }
  }
  await fontsReady();

  /* ---------- Lights ---------- */
  const key = new THREE.SpotLight(0xffdcb8, 95, 0, 0.42, 0.85, 2);
  key.position.set(2.8, 6.2, 3.6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 2; key.shadow.camera.far = 16;
  key.shadow.radius = 7; key.shadow.blurSamples = 16; key.shadow.bias = -0.0004;
  key.target.position.set(0, 0, 0);
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0xe8dcd0, 0.6);
  rim.position.set(-3, 3, -5);
  scene.add(rim);

  const hallKey = new THREE.DirectionalLight(0xffd3a1, 0);
  hallKey.position.set(7, 20, 9);
  hallKey.castShadow = true;
  hallKey.shadow.mapSize.set(2048, 2048);
  const sc = hallKey.shadow.camera; sc.left = -17; sc.right = 17; sc.top = 17; sc.bottom = -17; sc.near = 4; sc.far = 45;
  hallKey.shadow.radius = 3; hallKey.shadow.blurSamples = 12; hallKey.shadow.bias = -0.0006;
  hallKey.shadow.autoUpdate = false;
  scene.add(hallKey);

  /* ---------- Set A: the table, the box, the ring ---------- */
  const TABLE_Y = -0.8;
  // Polished walnut: dark, glossy, reflects the box and the candles.
  const walnutMap = canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = "#2a160d"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      const y = rand() * h, l = 8 + rand() * 16, a = 0.15 + rand() * 0.35;
      g.strokeStyle = `hsla(${20 + rand() * 10},${45 + rand() * 15}%,${l}%,${a})`; g.lineWidth = 0.5 + rand() * 2.5;
      g.beginPath(); g.moveTo(0, y);
      for (let x = 0; x <= w; x += 64) g.lineTo(x, y + Math.sin(x * 0.004 + i) * 6 + Math.sin(x * 0.013 + i * 0.3) * 2);
      g.stroke();
    }
    for (let i = 0; i < 6; i++) { // a few darker figure bands
      const y = rand() * h; const gr = g.createLinearGradient(0, y - 40, 0, y + 40);
      gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(0.5, "rgba(10,4,2,.35)"); gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr; g.fillRect(0, y - 40, w, 80);
    }
  }, { repeat: [3, 3] });
  const walnut = new THREE.MeshPhysicalMaterial({ map: walnutMap, roughness: 0.4, clearcoat: 0.8, clearcoatRoughness: 0.16, envMapIntensity: 0.32, sheen: 0.15, sheenColor: 0xffc8a0 });
  // The big table top seen at a grazing angle: a softer coat, so the room does not wash it out grey.
  const walnutTop = walnut.clone(); walnutTop.clearcoat = 0.35; walnutTop.clearcoatRoughness = 0.32; walnutTop.envMapIntensity = 0.14;
  const tableTop = new THREE.Mesh(new THREE.CircleGeometry(30, 96), walnutTop);
  tableTop.rotation.x = -Math.PI / 2; tableTop.position.y = TABLE_Y; tableTop.receiveShadow = true;
  setA.add(tableTop);
  // A length of champagne satin thrown across the walnut: flat where the box sits, rising into soft folds away from it,
  // its far edges tucked down below the table line.
  const SAT_W = 15, SAT_D = 9, SAT_Z = -0.4;
  function satinH(x, z) {
    const d = Math.hypot(x * 0.8, (z - 0.1) * 1.05), rise = smooth((d - 1.45) / 3.2);
    const f = 0.5 + 0.5 * Math.sin(1.15 * x + 1.5 * Math.sin(0.45 * z + 0.4) + 0.7 * z);
    const g = 0.5 + 0.5 * Math.sin(1.9 * x - 0.8 * z + 1.3 * Math.sin(0.5 * x));
    const ex = Math.max(Math.abs(x) / (SAT_W / 2), Math.abs(z - SAT_Z) / (SAT_D / 2)), edge = smooth((ex - 0.8) / 0.2);
    return 0.012 + rise * (0.5 * Math.pow(f, 2.2) + 0.1 * g) - edge * 0.9;
  }
  const satinGeo = new THREE.PlaneGeometry(SAT_W, SAT_D, mobile ? 150 : 240, mobile ? 90 : 140);
  satinGeo.rotateX(-Math.PI / 2); satinGeo.translate(0, 0, SAT_Z);
  { const pa = satinGeo.attributes.position; for (let i = 0; i < pa.count; i++) pa.setY(i, TABLE_Y + satinH(pa.getX(i), pa.getZ(i))); satinGeo.computeVertexNormals(); }
  const satinMat = new THREE.MeshPhysicalMaterial({ color: 0xe6d6ba, roughness: 0.17, sheen: 0.6, sheenColor: 0xfff2da, sheenRoughness: 0.2, anisotropy: 0.9, envMapIntensity: 0.9, normalMap: linenNormal, normalScale: new THREE.Vector2(0.04, 0.04) });
  const satinCloth = new THREE.Mesh(satinGeo, satinMat); satinCloth.receiveShadow = true; satinCloth.castShadow = true; setA.add(satinCloth);

  // Burgundy velvet, deep pile with a warm sheen at grazing angles. The pile is never perfectly even: a soft mottle,
  // the way suede-covered jewellery boxes read in a studio photograph.
  const suedeMottle = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = "#e6e6e6"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) {
      const x = rand() * w, y = rand() * h, r = 4 + rand() * 22, l = 200 + rand() * 55;
      const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${l},${l},${l},.35)`); gr.addColorStop(1, `rgba(${l},${l},${l},0)`);
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }, { repeat: [1.6, 1.6] });
  const velvet = new THREE.MeshPhysicalMaterial({
    map: suedeMottle, color: 0x3d0715, roughness: 0.95, sheen: 1, sheenRoughness: 0.45, sheenColor: 0xff9cb0,
    normalMap: velvetNormal, normalScale: new THREE.Vector2(0.4, 0.4)
  });
  const velvetDeep = new THREE.MeshPhysicalMaterial({ map: suedeMottle, color: 0x24030b, roughness: 0.95, sheen: 1, sheenRoughness: 0.5, sheenColor: 0xd8627c, normalMap: velvetNormal, normalScale: new THREE.Vector2(0.35, 0.35) });
  // Colour of the day: the box can be re-covered in burgundy, ruby or coral velvet.
  const VELVETS = {
    burgundy: [0x3d0715, 0xff9cb0, 0x24030b, 0xc75a72],
    ruby: [0x6a0716, 0xff8fa0, 0x3a030b, 0xe0465e],
    coral: [0x7a2414, 0xffc0a6, 0x431208, 0xe2775a],
    blue: [0x0b1d5c, 0xa8c0ff, 0x050f33, 0x6a8ae6],
    green: [0x1b3b2a, 0xd6efc6, 0x0d2117, 0x86b896]
  };
  // The rest of the design follows the colour too: the aso-oke, the gele, the napkins.
  const PAL = {
    burgundy: { aso: "#5a0a1e", napkin: 0xc98d8a, napSheen: 0xffd6d2, gele: 0x6a1428 },
    blue: { aso: "#14296e", napkin: 0x9fb0d4, napSheen: 0xe2eaff, gele: 0x1c2f78 },
    green: { aso: "#1d4a35", napkin: 0xc2cdae, napSheen: 0xf2f8e2, gele: 0x24533c }
  };
  let velvetNow = "";
  function applyVelvet(name) {
    const v = VELVETS[name] || VELVETS.burgundy; velvetNow = name;
    velvet.color.setHex(v[0]); velvet.sheenColor.setHex(v[1]); velvetDeep.color.setHex(v[2]); velvetDeep.sheenColor.setHex(v[3]);
    const P = PAL[name] || PAL.burgundy;
    napkins.material.color.setHex(P.napkin); napkins.material.sheenColor.setHex(P.napSheen);
    blushVelvet.color.setHex(P.napkin); blushVelvet.sheenColor.setHex(P.napSheen);
    geleCloth.color.setHex(P.gele);
    if (ASO.wine.base !== P.aso) {
      ASO.wine = wineway(P.aso);
      [["flat", true], ["roll", false]].forEach(([k, along]) => { const old = MAT.wine[k].map; MAT.wine[k].map = asoTex(ASO.wine, along); old.dispose(); });
      const oe = MAT.wine.end.map; MAT.wine.end.map = spiralTex(ASO.wine); oe.dispose();
    }
  }
  const brass = new THREE.MeshPhysicalMaterial({ color: 0xebc27c, metalness: 1, roughness: 0.2, clearcoat: 0.3 });

  function rrPath(w, d, r, path) {
    const x = -w / 2, y = -d / 2;
    path.moveTo(x + r, y); path.lineTo(x + w - r, y); path.quadraticCurveTo(x + w, y, x + w, y + r);
    path.lineTo(x + w, y + d - r); path.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
    path.lineTo(x + r, y + d); path.quadraticCurveTo(x, y + d, x, y + d - r);
    path.lineTo(x, y + r); path.quadraticCurveTo(x, y, x + r, y);
    return path;
  }
  // A flat rounded-rectangle frame of height h, lying in the xz plane from y = 0 to y = h.
  function frameGeo(ow, od, or, iw, id, ir, h, bevel) {
    const sh = rrPath(ow, od, or, new THREE.Shape());
    sh.holes.push(rrPath(iw, id, ir, new THREE.Path()));
    const g = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, curveSegments: 14 });
    g.rotateX(-Math.PI / 2);
    return g;
  }
  function edgePiping(w, d, r, y, radius) {
    const pts = rrPath(w, d, r, new THREE.Path()).getSpacedPoints(160).map((q) => new THREE.Vector3(q.x, y, -q.y));
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 320, radius, 10, true);
  }

  const BW = 1.6, BD = 1.45, BH = 0.78, LH = 0.56, BR = 0.14;
  const baseTop = TABLE_Y + BH;
  const box = new THREE.Group(); setA.add(box);
  const shadowAll = (o) => o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  const base = new THREE.Mesh(new RoundedBoxGeometry(BW, BH, BD, 8, BR), velvet);
  base.position.y = TABLE_Y + BH / 2; box.add(base);
  // An inner gold lip the lid closes over, and a dark velvet tray.
  // Lid and base are two soft pillows of velvet meeting at a shadowed seam, no metal band: the gold is kept for the lip,
  // the clasp and the foil.
  const lip = new THREE.Mesh(frameGeo(BW - 0.11, BD - 0.11, 0.06, BW - 0.17, BD - 0.17, 0.035, 0.075, 0.004), brass);
  lip.position.y = baseTop; box.add(lip);
  const trayShape = rrPath(BW - 0.17, BD - 0.17, 0.035, new THREE.Shape());
  const tray = new THREE.Mesh(new THREE.ShapeGeometry(trayShape, 12).rotateX(-Math.PI / 2), velvetDeep);
  tray.position.y = baseTop + 0.003; box.add(tray);
  const cushGeo = new THREE.CapsuleGeometry(0.15, BW - 0.52, 10, 28); cushGeo.rotateZ(Math.PI / 2);
  [-0.152, 0.152].forEach((z) => { const c = new THREE.Mesh(cushGeo, velvetDeep); c.position.set(0, baseTop + 0.03, z); c.scale.set(1, 0.92, 1); box.add(c); });
  // Front clasp with a push button, and a three-knuckle hinge at the back.
  const clasp = new THREE.Mesh(new RoundedBoxGeometry(0.28, 0.1, 0.05, 3, 0.016), brass);
  clasp.position.set(0, baseTop - 0.085, BD / 2 + 0.006); box.add(clasp);
  const button = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.032, 0.02, 24), brass);
  button.rotation.x = Math.PI / 2; button.position.set(0, baseTop - 0.085, BD / 2 + 0.039); box.add(button);
  [-0.28, 0, 0.28].forEach((x, i) => {
    const k = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.17, 20), brass);
    k.rotation.z = Math.PI / 2; k.position.set(x, baseTop + 0.002, -BD / 2 + BR * 0.62); box.add(k);
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.12, 0.012), brass);
    leaf.position.set(x, baseTop + (i === 1 ? 0.06 : -0.058), -BD / 2 + BR * 0.66); box.add(leaf);
  });

  const lidPivot = new THREE.Group(); lidPivot.position.set(0, baseTop, -BD / 2); box.add(lidPivot);
  const lid = new THREE.Mesh(new RoundedBoxGeometry(BW, LH, BD, 8, BR), velvet);
  lid.position.set(0, LH / 2 + 0.004, BD / 2); lidPivot.add(lid);
    const piping = new THREE.Mesh(edgePiping(BW - 0.05, BD - 0.05, BR - 0.02, LH - 0.022, 0.017), velvetDeep);
  piping.position.z = BD / 2; lidPivot.add(piping);
  // Gold foil monogram on the lid.
  const monoAlpha = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = "#000"; g.fillRect(0, 0, w, h); g.strokeStyle = g.fillStyle = "#fff";
    g.lineWidth = 9; g.beginPath(); g.arc(w / 2, h / 2, 228, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 3; g.beginPath(); g.arc(w / 2, h / 2, 206, 0, Math.PI * 2); g.stroke();
    g.textAlign = "center"; g.textBaseline = "middle"; g.font = 'italic 400 250px "Bodoni Moda", Georgia, serif'; g.fillText("À", w / 2, h / 2 + 22);
  }, { srgb: false });
  const mono = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.46), new THREE.MeshPhysicalMaterial({ color: 0xf0c983, metalness: 1, roughness: 0.24, alphaMap: monoAlpha, alphaTest: 0.5 }));
  mono.rotation.x = -Math.PI / 2; mono.position.set(0, LH + 0.0055, BD / 2); lidPivot.add(mono);
  // Satin pillow in the lid, foil-stamped with the brand in the centre: design printed onto a real surface.
  const liningStamp = (g, w, h) => {
    g.font = 'italic 400 92px "Bodoni Moda", Georgia, serif'; g.fillText("Àríyá", w / 2, h * 0.465);
    g.font = '400 20px "Figtree", Arial, sans-serif'; g.letterSpacing = "9px"; g.fillText("LAGOS · BENIN · ABUJA", w / 2, h * 0.565);
    g.fillRect(w / 2 - 110, h * 0.385, 220, 2); g.fillRect(w / 2 - 110, h * 0.615, 220, 2);
  };
  const liningMap = canvasTex(1024, 920, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, "#efe6d6"); gr.addColorStop(0.35, "#fdf8ef"); gr.addColorStop(0.55, "#e7dac6"); gr.addColorStop(0.8, "#f8f0e4"); gr.addColorStop(1, "#e4d5c0");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = "#b8894a"; g.textAlign = "center"; g.textBaseline = "middle";
    liningStamp(g, w, h);
  });
  const liningRM = canvasTex(1024, 920, (g, w, h) => {
    g.fillStyle = "rgb(0,100,0)"; g.fillRect(0, 0, w, h);
    g.fillStyle = "rgb(0,55,255)"; g.textAlign = "center"; g.textBaseline = "middle";
    liningStamp(g, w, h);
  }, { srgb: false });
  const pillowGeo = (() => {
    const g = new THREE.PlaneGeometry(BW - 0.19, BD - 0.19, 48, 48), p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) p.setZ(i, 0.055 * Math.pow(Math.sin(Math.PI * uv.getX(i)) * Math.sin(Math.PI * uv.getY(i)), 0.35));
    g.computeVertexNormals();
    return g;
  })();
  const lining = new THREE.Mesh(pillowGeo, new THREE.MeshPhysicalMaterial({
    map: liningMap, roughnessMap: liningRM, metalnessMap: liningRM, roughness: 1, metalness: 1, sheen: 0.7, sheenRoughness: 0.28, sheenColor: 0xffffff
  }));
  lining.rotation.x = Math.PI / 2; lining.position.set(0, 0.0, BD / 2); lidPivot.add(lining);
  const liningFrame = new THREE.Mesh(frameGeo(BW - 0.12, BD - 0.12, 0.06, BW - 0.19, BD - 0.19, 0.035, 0.014, 0.003), brass);
  liningFrame.position.set(0, -0.012, BD / 2); lidPivot.add(liningFrame);
  shadowAll(box);

  // Ring: platinum band, six-claw setting, brilliant-cut diamond.
  const R = 0.42;
  const platinum = new THREE.MeshPhysicalMaterial({ color: 0xeeebe6, metalness: 1, roughness: 0.08, clearcoat: 0.4, clearcoatRoughness: 0.05, envMapIntensity: 3.4 });
  const ring = new THREE.Group(); setA.add(ring);
  const bandGeo = new THREE.TorusGeometry(R, 0.048, 40, 200); bandGeo.scale(1, 1, 1.75);
  const band = new THREE.Mesh(bandGeo, platinum); band.castShadow = true; ring.add(band);
  const G = 0.15, gemC = R + 0.205;
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + Math.PI / 6, c = Math.cos(a), s = Math.sin(a);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(c * 0.05, R + 0.03, s * 0.05),
      new THREE.Vector3(c * G * 0.7, gemC - 0.09, s * G * 0.7),
      new THREE.Vector3(c * G * 1.04, gemC, s * G * 1.04),
      new THREE.Vector3(c * G * 0.86, gemC + 0.05, s * G * 0.86)
    ]);
    const prong = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.0115, 10), platinum);
    prong.castShadow = true; ring.add(prong);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.0125, 12, 10), platinum);
    tip.position.copy(curve.points[3]); ring.add(tip);
  }
  const basket = new THREE.Mesh(new THREE.TorusGeometry(G * 0.72, 0.009, 10, 64), platinum);
  basket.rotation.x = Math.PI / 2; basket.position.y = gemC - 0.07; ring.add(basket);

  // Round brilliant: a convex hull of the classic proportions (girdle radius 1).
  const gemPts = [];
  const P = (r, y, a) => gemPts.push(new THREE.Vector3(r * Math.cos(a), y, r * Math.sin(a)));
  for (let k = 0; k < 8; k++) P(0.57, 0.324, k * Math.PI / 4);                     // table
  for (let k = 0; k < 8; k++) P(0.83, 0.17, k * Math.PI / 4 + Math.PI / 8);        // crown mains
  for (let k = 0; k < 16; k++) { P(1, 0.014, k * Math.PI / 8); P(1, -0.014, k * Math.PI / 8); } // girdle
  for (let k = 0; k < 8; k++) P(0.58, -0.39, k * Math.PI / 4 + Math.PI / 8);       // pavilion mains
  gemPts.push(new THREE.Vector3(0, -0.862, 0));                                       // culet
  const gemGeo = new ConvexGeometry(gemPts);
  const planes = [];
  {
    const pos = gemGeo.attributes.position, a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    for (let i = 0; i < pos.count; i += 3) {
      a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
      const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
      const d = n.dot(a);
      if (!planes.some((q) => q.x * n.x + q.y * n.y + q.z * n.z > 0.99995 && Math.abs(q.w - d) < 1e-4)) planes.push(new THREE.Vector4(n.x, n.y, n.z, d));
    }
  }
  const sparkDirs = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const gemMat = new THREE.ShaderMaterial({
    defines: { NP: planes.length, BOUNCES: mobile ? 4 : 6 },
    uniforms: {
      envMap: { value: envTex }, envRot: { value: new THREE.Matrix3() }, envIntensity: { value: 1 },
      camObj: { value: new THREE.Vector3() }, model3: { value: new THREE.Matrix3() },
      planes: { value: planes }, sparkDirs: { value: sparkDirs }, sparkle: { value: 1 },
      iors: { value: new THREE.Vector3(2.402, 2.418, 2.438) } // diamond's real spread: white light with flashes of fire
    },
    vertexShader: /* glsl */`
      varying vec3 vPos; varying vec3 vNrm;
      void main() { vPos = position; vNrm = normal; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform sampler2D envMap; uniform mat3 envRot; uniform float envIntensity; uniform vec3 camObj; uniform mat3 model3;
      uniform vec4 planes[NP]; uniform vec3 sparkDirs[3]; uniform float sparkle; uniform vec3 iors;
      varying vec3 vPos; varying vec3 vNrm;
      vec3 envSample(vec3 dObj) {
        vec3 w = normalize(model3 * dObj);
        vec3 d = envRot * w;
        vec2 uv = vec2(atan(d.z, d.x) * 0.15915494 + 0.5, asin(clamp(d.y, -1.0, 1.0)) * 0.31830989 + 0.5);
        vec3 c = textureLod(envMap, uv, 0.0).rgb;
        // The real lights in the scene (key, candles) as tight specular lobes: this is where the sparkle comes from.
        for (int i = 0; i < 3; i++) { float k = max(dot(w, sparkDirs[i]), 0.0); c += vec3(1.0, 0.9, 0.78) * pow(k, 1400.0) * 160.0 * sparkle; }
        return c * envIntensity;
      }
      float fresnel(float c, float n) { float f0 = (n - 1.0) / (n + 1.0); f0 *= f0; return f0 + (1.0 - f0) * pow(1.0 - clamp(c, 0.0, 1.0), 5.0); }
      vec3 trace(vec3 p, vec3 dir, float ior) {
        vec3 acc = vec3(0.0); float thr = 1.0;
        for (int b = 0; b < BOUNCES; b++) {
          float tmin = 1e9; vec3 nh = vec3(0.0, 1.0, 0.0);
          for (int i = 0; i < NP; i++) {
            vec3 n = planes[i].xyz; float den = dot(n, dir);
            if (den > 1e-5) { float t = (planes[i].w - dot(n, p)) / den; if (t < tmin) { tmin = t; nh = n; } }
          }
          p += dir * tmin;
          vec3 o = refract(dir, -nh, ior);
          if (dot(o, o) < 1e-6) { dir = reflect(dir, -nh); continue; }
          float F = fresnel(dot(dir, nh), ior);
          acc += thr * (1.0 - F) * envSample(o);
          thr *= F; dir = reflect(dir, -nh);
        }
        return acc + thr * envSample(dir) * 0.6;
      }
      void main() {
        vec3 n = normalize(vNrm);
        vec3 v = normalize(vPos - camObj);
        float ci = dot(-v, n);
        float Fr = fresnel(ci, iors.y);
        vec3 col = Fr * envSample(reflect(v, n));
        vec3 t;
        t.r = trace(vPos, refract(v, n, 1.0 / iors.r), iors.r).r;
        t.g = trace(vPos, refract(v, n, 1.0 / iors.g), iors.g).g;
        t.b = trace(vPos, refract(v, n, 1.0 / iors.b), iors.b).b;
        col += (1.0 - Fr) * t;
        gl_FragColor = vec4(col, 1.0);
      }`
  });
  const gem = new THREE.Mesh(gemGeo, gemMat);
  gem.scale.setScalar(G); gem.position.y = gemC; gem.castShadow = true;
  ring.add(gem);
  // Tapered baguettes on the shoulders, step-cut, held in a platinum channel: the three-stone look of a studio solitaire.
  const bagGeo = (() => {
    // Wide end (Wd) toward the centre stone at -x, narrow end (Ws) at +x; each step is one ring of the step cut.
    const pts = [], L = 0.11, Wd = 0.062, Ws = 0.046;
    const rect = (l, k, y) => { const a = Wd * k / 2, c = Ws * k / 2; pts.push(new THREE.Vector3(-l / 2, y, -a), new THREE.Vector3(-l / 2, y, a), new THREE.Vector3(l / 2, y, -c), new THREE.Vector3(l / 2, y, c)); };
    rect(L * 0.72, 0.62, 0.026); rect(L * 0.9, 0.86, 0.016); rect(L, 1, 0.0);
    rect(L * 0.84, 0.6, -0.022); rect(L * 0.6, 0.14, -0.04);
    return new ConvexGeometry(pts);
  })();
  // Each baguette is traced through its own facets, exactly like the centre stone, so it flashes the same way.
  function planesOf(geo) {
    const out = [], pos = geo.attributes.position, a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    for (let i = 0; i < pos.count; i += 3) {
      a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
      const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize(), d = n.dot(a);
      if (!out.some((q) => q.x * n.x + q.y * n.y + q.z * n.z > 0.99995 && Math.abs(q.w - d) < 1e-5)) out.push(new THREE.Vector4(n.x, n.y, n.z, d));
    }
    return out;
  }
  const bagPlanes = planesOf(bagGeo);
  const bagStones = [];
  const bagMat = () => new THREE.ShaderMaterial({
    defines: { NP: bagPlanes.length, BOUNCES: mobile ? 3 : 5 },
    uniforms: { envMap: gemMat.uniforms.envMap, envRot: gemMat.uniforms.envRot, envIntensity: gemMat.uniforms.envIntensity, camObj: { value: new THREE.Vector3() }, model3: { value: new THREE.Matrix3() },
      planes: { value: bagPlanes }, sparkDirs: gemMat.uniforms.sparkDirs, sparkle: gemMat.uniforms.sparkle, iors: gemMat.uniforms.iors },
    vertexShader: gemMat.vertexShader, fragmentShader: gemMat.fragmentShader
  });
  [-1, 1].forEach((sd) => {
    const th = 0.5, rr = R + 0.082, b = new THREE.Group();
    b.position.set(sd * Math.sin(th) * rr, Math.cos(th) * rr, 0); b.rotation.z = -sd * th; ring.add(b);
    const st = new THREE.Mesh(bagGeo, bagMat()); st.rotation.y = sd > 0 ? 0 : Math.PI; st.castShadow = true; b.add(st); bagStones.push(st);
    [-1, 1].forEach((k) => { const rail = new THREE.Mesh(new THREE.BoxGeometry(0.118, 0.034, 0.008), platinum); rail.position.set(0, -0.006, k * 0.036); b.add(rail); });
  });
  const RING_REST = baseTop - 0.13, RING_UP = 1.25;
  ring.position.y = RING_REST;

  // Rose petals scattered on the linen
  const petalGeo = (() => {
    const g = new THREE.PlaneGeometry(1, 1, 10, 10), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i) + 0.5;
      const wdt = Math.pow(Math.sin(Math.PI * Math.min(1, y * 0.95 + 0.04)), 0.7) * (0.55 + 0.45 * y);
      const X = x * wdt;
      p.setXYZ(i, X, y - 0.5, 0.55 * X * X + 0.22 * (y - 0.3) * (y - 0.3) - 0.05 * Math.sin(y * 9) * y);
    }
    g.rotateX(-Math.PI / 2); g.computeVertexNormals();
    return g;
  })();
  const petalMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.5, sheen: 1, sheenRoughness: 0.4, sheenColor: 0xffffff, side: THREE.DoubleSide });
  const petals = new THREE.InstancedMesh(petalGeo, petalMat, 14);
  {
    const d = new THREE.Object3D();
    for (let i = 0; i < 14; i++) {
      let x, z;
      do { x = (rand() - 0.5) * 10; z = -4 + rand() * 6.5; } while ((Math.abs(x) < 1.5 && Math.abs(z) < 1.3) || (Math.abs(x) < 2.2 && z > 1));
      d.position.set(x, TABLE_Y + Math.max(0, satinH(x, z)) + 0.02, z);
      d.rotation.set((rand() - 0.5) * 0.25, rand() * Math.PI * 2, (rand() - 0.5) * 0.25);
      d.scale.setScalar(0.45 + rand() * 0.3); d.updateMatrix(); petals.setMatrixAt(i, d.matrix);
      petals.setColorAt(i, new THREE.Color().setHSL(0.99 + rand() * 0.02, 0.55, 0.72 + rand() * 0.2));
    }
  }
  petals.castShadow = petals.receiveShadow = true; setA.add(petals);

  // Candles behind the box: real light sources that the lens turns into bokeh.
  // Wax is translucent near the flame: an emissive gradient up the side stands in for light scattering through it.
  const waxGlow = canvasTex(8, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#ffb46a"); gr.addColorStop(0.12, "#a5521c"); gr.addColorStop(0.35, "#2a1206"); gr.addColorStop(1, "#0a0502"); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const wax = new THREE.MeshPhysicalMaterial({ color: 0xf2e6d4, roughness: 0.55, sheen: 0.6, sheenColor: 0xffe2b8, emissive: 0xffffff, emissiveMap: waxGlow, emissiveIntensity: 0.9 });
  const waxTop = new THREE.MeshPhysicalMaterial({ color: 0xf5ead8, roughness: 0.35, emissive: 0xff9a4a, emissiveIntensity: 0.55, clearcoat: 0.6 });
  const flameMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(9, 4.2, 1.3) });
  const candles = [];
  [[-5.2, -8.5, 3.0, 0.75], [6.0, -11, 2.2, 0.7], [-10.5, -14, 3.6, 0.8]].forEach(([x, z, hgt, r]) => {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, hgt, 48, 1, true), wax);
    body.position.set(x, TABLE_Y + hgt / 2, z); body.castShadow = true; setA.add(body);
    // The top: a pool of melted wax inside a soft, uneven lip, and a dark wick.
    const lip = new THREE.Mesh(new THREE.TorusGeometry(r * 0.94, r * 0.07, 10, 48), waxTop); lip.rotation.x = Math.PI / 2; lip.position.set(x, TABLE_Y + hgt - r * 0.02, z); lip.scale.set(1, 1, 1.6); setA.add(lip);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(r * 0.92, 48), waxTop); pool.rotation.x = -Math.PI / 2; pool.position.set(x, TABLE_Y + hgt - r * 0.09, z); setA.add(pool);
    const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.22, 8), new THREE.MeshBasicMaterial({ color: 0x120a06 })); wick.position.set(x, TABLE_Y + hgt + 0.03, z); wick.rotation.z = 0.12; setA.add(wick);
    const fl = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), flameMat);
    fl.scale.set(1, 2.6, 1); fl.position.set(x, TABLE_Y + hgt + 0.32, z); setA.add(fl);
    const pl = new THREE.PointLight(0xff9448, 14, 0, 2); pl.position.copy(fl.position); scene.add(pl);
    candles.push({ fl, pl, base: fl.position.clone(), seed: rand() * 10, meshes: [body, lip, pool, wick, fl] });
  });

  // Dust in the key light
  const DUST = 110, dustPos = new Float32Array(DUST * 3), dustSeed = new Float32Array(DUST);
  for (let i = 0; i < DUST; i++) { dustPos[i * 3] = (rand() - 0.5) * 6; dustPos[i * 3 + 1] = TABLE_Y + rand() * 4; dustPos[i * 3 + 2] = (rand() - 0.5) * 5; dustSeed[i] = rand() * 100; }
  const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  const dotTex = canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, "#fff"); r.addColorStop(0.5, "rgba(255,255,255,.6)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
  const dustMat = new THREE.PointsMaterial({ size: 0.022, map: dotTex, color: new THREE.Color(1.6, 1.25, 0.9), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
  const dust = new THREE.Points(dustGeo, dustMat); setA.add(dust);

  /* ---------- Set B: the reception hall ---------- */
  const floorMap = canvasTex(1024, 1024, (g, w, h) => {
    const pw = 32, pl = 256;
    for (let col = 0; col < w / pw; col++) {
      const off = (col * 97) % pl;
      for (let y = -off; y < h; y += pl) {
        const l = 13 + rand() * 9, hue = 18 + rand() * 10;
        g.fillStyle = `hsl(${hue},${38 + rand() * 12}%,${l}%)`;
        g.fillRect(col * pw, y, pw, pl);
        for (let k = 0; k < 9; k++) {
          g.strokeStyle = `hsla(${hue},40%,${l - 5 + rand() * 8}%,.5)`; g.lineWidth = 0.6 + rand();
          const gx = col * pw + rand() * pw; g.beginPath(); g.moveTo(gx, y); g.bezierCurveTo(gx + (rand() - 0.5) * 6, y + pl * 0.3, gx + (rand() - 0.5) * 6, y + pl * 0.7, gx + (rand() - 0.5) * 4, y + pl); g.stroke();
        }
        g.fillStyle = "rgba(0,0,0,.55)"; g.fillRect(col * pw, y, pw, 2);
      }
      g.fillStyle = "rgba(0,0,0,.6)"; g.fillRect(col * pw, 0, 1.5, h);
    }
  }, { repeat: [15, 15] });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ map: floorMap, roughness: 0.32, metalness: 0, envMapIntensity: 0.9 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; setB.add(floor);
  const danceFloor = new THREE.Mesh(new THREE.CircleGeometry(3.4, 128), new THREE.MeshPhysicalMaterial({ color: 0xe9e1d6, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.06 }));
  danceFloor.rotation.x = -Math.PI / 2; danceFloor.position.y = 0.006; danceFloor.receiveShadow = true; setB.add(danceFloor);
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xd8a85a, metalness: 1, roughness: 0.32 });
  const danceEdge = new THREE.Mesh(new THREE.RingGeometry(3.4, 3.48, 128), goldMat);
  danceEdge.rotation.x = -Math.PI / 2; danceEdge.position.y = 0.008; setB.add(danceEdge);
  // The couple's monogram, projected onto the floor by a gobo light the way real halls do it.
  const gobo = canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = "#000"; g.fillRect(0, 0, w, h); g.filter = "blur(3px)";
    g.strokeStyle = "#fff"; g.lineWidth = 5; g.beginPath(); g.arc(w / 2, h / 2, 440, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 2; g.beginPath(); g.arc(w / 2, h / 2, 418, 0, Math.PI * 2); g.stroke();
    g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = 'italic 400 300px "Bodoni Moda", Georgia, serif'; g.fillText("C & T", w / 2, h / 2 - 20);
    g.font = '400 40px "Figtree", Arial, sans-serif'; g.letterSpacing = "18px"; g.fillText("12 · 12 · 2026", w / 2, h / 2 + 190);
  });
  const goboMat = new THREE.MeshBasicMaterial({ map: gobo, color: new THREE.Color(1.3, 0.95, 0.6), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
  const goboMesh = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 5.4), goboMat);
  goboMesh.rotation.x = -Math.PI / 2; goboMesh.position.y = 0.012; setB.add(goboMesh);

  const tables = [];
  // Two rings of tables around the dance floor, both opened at the front (+z) for the aisle from the entrance.
  const tableRing = (n, r, gap) => { const step = (Math.PI * 2 - gap) / n; for (let i = 0; i < n; i++) { const a = Math.PI / 2 + gap / 2 + (i + 0.5) * step; tables.push([Math.cos(a) * r, Math.sin(a) * r]); } };
  tableRing(8, 5.4, 0.36); tableRing(16, 8.8, 0.42);
  const NT = tables.length, NS = NT * 10, CLOTH_Y = 0.765;

  const clothGeo = (() => {
    const prof = [[0, CLOTH_Y], [0.86, CLOTH_Y], [0.9, CLOTH_Y - 0.008], [0.93, CLOTH_Y - 0.04], [0.94, 0.62], [0.97, 0.35], [1.0, 0.1], [1.03, 0.0]].reverse().map((q) => new THREE.Vector2(q[0], q[1])); // floor to centre, so the faces point outward
    const g = new THREE.LatheGeometry(prof, 128), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), r = Math.hypot(x, z);
      if (r < 0.9 || y > CLOTH_Y - 0.03) continue;
      const th = Math.atan2(z, x), drop = 1 - y / CLOTH_Y;
      const nr = r + (Math.sin(th * 13) * 0.6 + Math.sin(th * 29 + 1.3) * 0.3) * 0.03 * drop;
      p.setXYZ(i, Math.cos(th) * nr, y, Math.sin(th) * nr);
    }
    g.computeVertexNormals();
    return g;
  })();
  const clothMat = new THREE.MeshPhysicalMaterial({ color: 0xece2d4, roughness: 0.8, sheen: 0.7, sheenRoughness: 0.5, sheenColor: 0xffffff, normalMap: linenNormal, normalScale: new THREE.Vector2(0.15, 0.15) });
  const cloths = new THREE.InstancedMesh(clothGeo, clothMat, NT);
  const chairGeo = (() => {
    const parts = [];
    const add = (geo, x, y, z) => { geo.translate(x, y, z); parts.push(geo); };
    add(new THREE.BoxGeometry(0.42, 0.035, 0.4), 0, 0.45, 0);
    [[-0.19, -0.18], [0.19, -0.18]].forEach(([x, z]) => add(new THREE.CylinderGeometry(0.012, 0.014, 0.45, 8), x, 0.225, z));
    [[-0.19, 0.18], [0.19, 0.18]].forEach(([x, z]) => add(new THREE.CylinderGeometry(0.012, 0.014, 0.95, 8), x, 0.475, z));
    for (let k = -2; k <= 2; k++) add(new THREE.CylinderGeometry(0.007, 0.007, 0.42, 6), k * 0.07, 0.69, 0.18);
    add(new THREE.BoxGeometry(0.42, 0.04, 0.03), 0, 0.93, 0.18);
    add(new THREE.BoxGeometry(0.42, 0.02, 0.025), 0, 0.5, 0.18);
    return mergeGeometries(parts);
  })();
  const chairs = new THREE.InstancedMesh(chairGeo, goldMat, NS);
  const cushionGeo = new RoundedBoxGeometry(0.4, 0.05, 0.38, 3, 0.02); cushionGeo.translate(0, 0.49, 0);
  const cushions = new THREE.InstancedMesh(cushionGeo, new THREE.MeshPhysicalMaterial({ color: 0xf1e7da, roughness: 0.75, sheen: 1, sheenColor: 0xffffff, sheenRoughness: 0.4 }), NS);
  const plateGeo = new THREE.CylinderGeometry(0.14, 0.11, 0.018, 40); plateGeo.translate(0, CLOTH_Y + 0.013, 0);
  const plates = new THREE.InstancedMesh(plateGeo, new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.12, clearcoat: 1 }), NS);
  const chargerGeo = new THREE.CylinderGeometry(0.175, 0.175, 0.006, 40); chargerGeo.translate(0, CLOTH_Y + 0.003, 0);
  const chargers = new THREE.InstancedMesh(chargerGeo, goldMat, NS);
  const votiveGeo = new THREE.CylinderGeometry(0.032, 0.028, 0.075, 20, 1, true); votiveGeo.translate(0, CLOTH_Y + 0.0375, 0);
  const votives = new THREE.InstancedMesh(votiveGeo, new THREE.MeshStandardMaterial({ color: 0x9a7440, metalness: 0.6, roughness: 0.15, side: THREE.DoubleSide }), NS);
  const seatFlameGeo = new THREE.SphereGeometry(0.011, 10, 8); seatFlameGeo.scale(1, 2.3, 1);
  const seatFlames = new THREE.InstancedMesh(seatFlameGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }), NS);
  const glowTex = canvasTex(128, 128, (g) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.25, "rgba(255,255,255,.35)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 128, 128); });
  // A soft halo around each candle flame, the way a lens sees it.
  candles.forEach((c) => { const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(1.3, 0.62, 0.2), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); h.position.copy(c.base); h.scale.setScalar(1.7); setA.add(h); c.halo = h; });
  const glowGeo = new THREE.PlaneGeometry(0.75, 0.75); glowGeo.rotateX(-Math.PI / 2);
  const seatGlows = new THREE.InstancedMesh(glowGeo, new THREE.MeshBasicMaterial({ map: glowTex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }), NS);
  // Centrepieces: gold stands with blush and ivory flower balls.
  const flowerGeo = (() => {
    const g = new THREE.IcosahedronGeometry(0.3, 5), p = g.attributes.position, col = new Float32Array(p.count * 3);
    const blooms = Array.from({ length: 70 }, () => new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize());
    const palette = [[0.96, 0.86, 0.82], [0.93, 0.7, 0.68], [0.99, 0.96, 0.9], [0.82, 0.45, 0.48], [0.35, 0.45, 0.3]];
    const tone = blooms.map(() => palette[Math.floor(rand() * rand() * palette.length * 1.15) % palette.length]);
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).normalize();
      let best = 0, bi = 0;
      blooms.forEach((b, j) => { const d = v.dot(b); if (d > best) { best = d; bi = j; } });
      const ang = Math.acos(Math.min(1, best));
      const petal = Math.cos(ang * 9 + Math.atan2(v.y, v.x) * 5) * 0.5 + 0.5;
      const bumpH = Math.max(0, 1 - ang / 0.42);
      v.multiplyScalar(0.3 * (0.86 + 0.16 * Math.sqrt(bumpH) + 0.03 * petal * bumpH));
      p.setXYZ(i, v.x, v.y, v.z);
      const shade = 0.55 + 0.45 * bumpH;
      col[i * 3] = tone[bi][0] * shade; col[i * 3 + 1] = tone[bi][1] * shade; col[i * 3 + 2] = tone[bi][2] * shade;
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
    g.translate(0, CLOTH_Y + 0.75 + 0.26, 0);
    return g;
  })();
  const flowers = new THREE.InstancedMesh(flowerGeo, new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.6, sheen: 1, sheenRoughness: 0.5, sheenColor: 0xffe8e8 }), NT);
  const standGeo = mergeGeometries([
    new THREE.CylinderGeometry(0.018, 0.03, 0.72, 16).translate(0, CLOTH_Y + 0.36, 0),
    new THREE.CylinderGeometry(0.11, 0.13, 0.025, 32).translate(0, CLOTH_Y + 0.012, 0),
    new THREE.CylinderGeometry(0.1, 0.03, 0.06, 32).translate(0, CLOTH_Y + 0.73, 0)
  ]);
  const stands = new THREE.InstancedMesh(standGeo, goldMat, NT);
  {
    const d = new THREE.Object3D();
    tables.forEach(([tx, tz], ti) => {
      d.position.set(tx, 0, tz); d.rotation.set(0, rand() * Math.PI, 0); d.scale.setScalar(1); d.updateMatrix();
      cloths.setMatrixAt(ti, d.matrix); flowers.setMatrixAt(ti, d.matrix); stands.setMatrixAt(ti, d.matrix);
      for (let s = 0; s < 10; s++) {
        const sa = (s / 10) * Math.PI * 2 + ti * 0.37, i = ti * 10 + s, c = Math.cos(sa), sn = Math.sin(sa);
        d.rotation.set(0, Math.PI / 2 - sa, 0);
        d.position.set(tx + c * 1.2, 0, tz + sn * 1.2); d.updateMatrix(); chairs.setMatrixAt(i, d.matrix); cushions.setMatrixAt(i, d.matrix);
        d.position.set(tx + c * 0.66, 0, tz + sn * 0.66); d.updateMatrix(); plates.setMatrixAt(i, d.matrix); chargers.setMatrixAt(i, d.matrix);
        const va = sa + 0.3;
        d.position.set(tx + Math.cos(va) * 0.5, 0, tz + Math.sin(va) * 0.5); d.updateMatrix(); votives.setMatrixAt(i, d.matrix);
      }
    });
  }
  [cloths, chairs, cushions, plates, chargers, flowers, stands, votives].forEach((m) => { m.castShadow = true; m.receiveShadow = true; setB.add(m); });
  setB.add(seatFlames, seatGlows);
  const seatOrder = [];
  for (let ti = 0; ti < NT; ti++) for (let s = 0; s < 10; s++) if (ti < 21 || (ti === 21 && s < 8)) seatOrder.push(ti * 10 + s);
  // Table 1 is the inner table nearest the couple; Mama's seat faces them. Her seat is the first one lit.
  const TABLE1 = 6, MAMA_SEAT = TABLE1 * 10 + 9;
  seatOrder.splice(seatOrder.indexOf(MAMA_SEAT), 1); seatOrder.unshift(MAMA_SEAT);
  const flameCol = new THREE.Color(10, 4.6, 1.4), glowCol = new THREE.Color(0.55, 0.3, 0.12), off = new THREE.Color(0, 0, 0);
  let seatsLit = -1, hideTable = -1, fullHouse = false;
  function lightSeats(n) {
    if (n === seatsLit) return;
    const d = new THREE.Object3D();
    fullHouse = n >= 999; // the dance: every seat taken
    const litSet = fullHouse ? new Set(guestSeat.map((_, i) => i)) : new Set(seatOrder.slice(0, n));
    tables.forEach(([tx, tz], ti) => {
      for (let s = 0; s < 10; s++) {
        const i = ti * 10 + s, on = litSet.has(i), va = (s / 10) * Math.PI * 2 + ti * 0.37 + 0.3;
        d.position.set(tx + Math.cos(va) * 0.5, CLOTH_Y + 0.062, tz + Math.sin(va) * 0.5);
        d.scale.setScalar(on ? 1 : 0.0001); d.updateMatrix(); seatFlames.setMatrixAt(i, d.matrix);
        seatFlames.setColorAt(i, on ? flameCol : off);
        d.position.y = CLOTH_Y + 0.004; d.scale.setScalar(1); d.updateMatrix(); seatGlows.setMatrixAt(i, d.matrix);
        seatGlows.setColorAt(i, on ? glowCol : off);
        placeGuest(i, on);
      }
    });
    seatFlames.instanceMatrix.needsUpdate = true; seatFlames.instanceColor.needsUpdate = true;
    seatGlows.instanceMatrix.needsUpdate = true; seatGlows.instanceColor.needsUpdate = true;
    [seatedBodies, seatedHeads, seatedGele, seatedFila].forEach((m) => { m.instanceMatrix.needsUpdate = true; });
    hallKey.shadow.needsUpdate = true;
    seatsLit = n;
  }

  // Head table and a curtain of fairy lights behind it.
  const headCloth = new THREE.Mesh(new RoundedBoxGeometry(6, 0.76, 0.9, 3, 0.03), clothMat);
  headCloth.position.set(0, 0.38, -12.2); headCloth.castShadow = headCloth.receiveShadow = true; setB.add(headCloth);
  const headFlowers = new THREE.InstancedMesh(flowerGeo, flowers.material, 5);
  for (let i = 0; i < 5; i++) { const d = new THREE.Object3D(); d.position.set(-2.4 + i * 1.2, -0.95, -12.2); d.scale.setScalar(i === 2 ? 1.3 : 0.9); d.updateMatrix(); headFlowers.setMatrixAt(i, d.matrix); }
  headFlowers.castShadow = true; setB.add(headFlowers);
  const drapeGeo = (() => {
    const g = new THREE.PlaneGeometry(22, 8, 220, 4), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, Math.sin(x * 3.1) * 0.12 + Math.sin(x * 7.3 + 1) * 0.05); }
    g.computeVertexNormals(); g.translate(0, 4, -13.9);
    return g;
  })();
  setB.add(new THREE.Mesh(drapeGeo, new THREE.MeshPhysicalMaterial({ color: 0xb8a68e, roughness: 0.7, sheen: 1, sheenColor: 0xffe2b8, sheenRoughness: 0.35, emissive: 0x2a1a0a, emissiveIntensity: 1 })));
  const bulbGeo = new THREE.SphereGeometry(0.018, 8, 6);
  const NB = 1100, bulbs = new THREE.InstancedMesh(bulbGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(7, 4.6, 2.4) }), NB);
  {
    const d = new THREE.Object3D();
    for (let i = 0; i < NB; i++) {
      const strand = i % 44, k = Math.floor(i / 44), x = -10.5 + strand * 0.49 + (rand() - 0.5) * 0.06;
      d.position.set(x, 7.6 - k * 0.3 - rand() * 0.08, -13.6 + Math.sin(x * 3.1) * 0.12); d.updateMatrix(); bulbs.setMatrixAt(i, d.matrix);
    }
  }
  setB.add(bulbs);
  // Chandeliers: crystal and light hanging between the camera and the tables.
  const crystalGeo = new THREE.OctahedronGeometry(0.045, 0); crystalGeo.scale(1, 1.8, 1);
  const crystalMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.04, envMapIntensity: 2.2 });
  const chand = [[0, 0], [5.4, 3], [-5.4, 3], [5.4, -3], [-5.4, -3], [0, 7.2], [0, -7.2]];
  const NC = chand.length * 70;
  const crystals = new THREE.InstancedMesh(crystalGeo, crystalMat, NC);
  const chBulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(16, 10, 5) }), chand.length * 12);
  {
    const d = new THREE.Object3D(); let ci = 0, bi = 0;
    chand.forEach(([cx, cz]) => {
      for (let k = 0; k < 70; k++) {
        const tier = k % 3, a = k * 2.399, rr = 0.35 + tier * 0.28 + rand() * 0.05;
        d.position.set(cx + Math.cos(a) * rr, 6.6 - tier * 0.35 - rand() * 0.5, cz + Math.sin(a) * rr);
        d.rotation.set(0, a, 0); d.updateMatrix(); crystals.setMatrixAt(ci++, d.matrix);
      }
      for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; d.position.set(cx + Math.cos(a) * 0.55, 6.75, cz + Math.sin(a) * 0.55); d.updateMatrix(); chBulbs.setMatrixAt(bi++, d.matrix); }
    });
  }
  setB.add(crystals, chBulbs);

  // Confetti: gold and champagne foil, lit like everything else.
  const CONF = mobile ? 360 : 700;
  const confMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.22, side: THREE.DoubleSide });
  const conf = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.034, 0.022), confMat, CONF);
  const confData = [], confCols = [0xf1cf8f, 0xece8e3, 0xe0a57a, 0xc99a4c].map((c) => new THREE.Color(c));
  for (let i = 0; i < CONF; i++) {
    confData.push({ x: (rand() - 0.5) * 7, z: -1 + rand() * 7.6, y0: rand() * 5, sp: 0.35 + rand() * 0.45, sw: rand() * 6, rs: 1 + rand() * 4 });
    conf.setColorAt(i, confCols[i % 4]);
  }
  conf.visible = false; conf.frustumCulled = false; setB.add(conf);

  /* ---------- The hall dressed like a marquee: a draped canopy strung with fairy lights, pleated walls washed by
     uplights, and every place set with crystal, gold flatware and a blush napkin. ---------- */
  const CAN_R = 17, CAN_N = 16;
  function canopyH(x, z) {
    const r = Math.min(Math.hypot(x, z), CAN_R), th = Math.atan2(z, x);
    const sag = (0.75 * Math.sin(Math.PI * r / CAN_R) + 0.12) * Math.pow(Math.sin(CAN_N * th / 2), 2);
    return 10.6 - 2.7 * (r / CAN_R) - sag;
  }
  const canopyGeo = (() => {
    const g = new THREE.PlaneGeometry(1, 1, 64, mobile ? 256 : 400), pa = g.attributes.position;
    for (let i = 0; i < pa.count; i++) {
      const r = (pa.getX(i) + 0.5) * CAN_R, th = (pa.getY(i) + 0.5) * Math.PI * 2, x = Math.cos(th) * r, z = Math.sin(th) * r;
      pa.setXYZ(i, x, canopyH(x, z), z);
    }
    g.computeVertexNormals(); return g;
  })();
  const chiffon = new THREE.MeshPhysicalMaterial({ color: 0xe8dac6, roughness: 0.8, sheen: 0.8, sheenColor: 0xfff0d8, sheenRoughness: 0.4, side: THREE.DoubleSide, emissive: 0x3a240f, emissiveIntensity: 1, envMapIntensity: 0.3 });
  const canopy = new THREE.Mesh(canopyGeo, chiffon); canopy.visible = false; setB.add(canopy);
  const NFB = mobile ? 1500 : 2300, fairy = new THREE.InstancedMesh(new THREE.SphereGeometry(0.024, 6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(9, 5.6, 2.6) }), NFB);
  {
    const d = new THREE.Object3D(); let i = 0;
    for (let sI = 0; sI < CAN_N * 3 && i < NFB; sI++) {
      const th = (sI / (CAN_N * 3)) * Math.PI * 2 + 0.03;
      for (let r = 1.6; r < CAN_R - 0.4 && i < NFB; r += 0.32 + rand() * 0.06) {
        const x = Math.cos(th) * r, z = Math.sin(th) * r;
        d.position.set(x, canopyH(x, z) - 0.1 - 0.25 * Math.sin(Math.PI * ((r * 1.9) % 1)), z); d.updateMatrix(); fairy.setMatrixAt(i++, d.matrix);
      }
    }
    fairy.count = i;
  }
  fairy.visible = false; setB.add(fairy);
  // The walls: ivory pleats, a pool of warm uplight every few metres.
  const upTex = canvasTex(2048, 256, (g, w, h) => {
    g.fillStyle = "#000"; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 28; k++) { const x = (k + 0.5) / 28 * w, gr = g.createRadialGradient(x, h, 0, x, h, h * 1.05); gr.addColorStop(0, "rgba(255,170,90,1)"); gr.addColorStop(0.45, "rgba(200,110,50,.45)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(x - h * 1.1, 0, h * 2.2, h); }
  });
  const wallGeo = (() => { const g = new THREE.CylinderGeometry(CAN_R, CAN_R, 8, mobile ? 720 : 1100, 1, true), pa = g.attributes.position; for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), z = pa.getZ(i), th = Math.atan2(z, x), k = 1 + 0.006 * Math.sin(th * 260); pa.setX(i, x * k); pa.setZ(i, z * k); } g.computeVertexNormals(); g.translate(0, 4, 0); return g; })();
  const wallDrape = new THREE.Mesh(wallGeo, new THREE.MeshPhysicalMaterial({ color: 0xd8c8b2, roughness: 0.85, sheen: 0.8, sheenColor: 0xffe8c8, side: THREE.BackSide, emissive: 0xffffff, emissiveMap: upTex, emissiveIntensity: 0.9 }));
  setB.add(wallDrape);
  // Every place: a blush velvet napkin on the plate, a goblet and a flute, a gold fork and knife.
  const napGeo = new RoundedBoxGeometry(0.07, 0.014, 0.17, 2, 0.005); napGeo.translate(0, CLOTH_Y + 0.03, 0);
  const napkins = new THREE.InstancedMesh(napGeo, new THREE.MeshPhysicalMaterial({ color: 0xc98d8a, roughness: 0.9, sheen: 1, sheenRoughness: 0.45, sheenColor: 0xffd6d2 }), NS);
  const hallGlassGeo = new THREE.LatheGeometry([[0.0001, 0], [0.032, 0], [0.004, 0.008], [0.004, 0.09], [0.034, 0.11], [0.042, 0.15], [0.038, 0.21]].map(([r, y]) => new THREE.Vector2(r, y)), 14); hallGlassGeo.translate(0, CLOTH_Y, 0);
  const hallGlassMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.2, roughness: 0.03, metalness: 0, envMapIntensity: 2.6, depthWrite: false, side: THREE.DoubleSide });
  const glasses = new THREE.InstancedMesh(hallGlassGeo, hallGlassMat, NS * 2);
  const flatGeo = new THREE.BoxGeometry(0.013, 0.004, 0.2); flatGeo.translate(0, CLOTH_Y + 0.002, 0);
  const flatware = new THREE.InstancedMesh(flatGeo, new THREE.MeshStandardMaterial({ color: 0xe6c07a, metalness: 1, roughness: 0.2 }), NS * 2);
  // Gold-framed table numbers, all from one card sheet: Table 1 is the inner table nearest the couple.
  const tableNo = (ti) => (ti < 8 ? ((ti - 6 + 8) % 8) + 1 : ti + 1);
  const numSheet = paperPair(2048, 1024, (g, w, h, C) => {
    const cw = w / 8, chh = h / 3;
    for (let ti = 0; ti < NT; ti++) {
      const cx = (ti % 8) * cw, cy = Math.floor(ti / 8) * chh;
      g.save(); g.translate(cx, cy);
      g.strokeStyle = C.foil; g.lineWidth = 4; g.strokeRect(12, 12, cw - 24, chh - 24); g.lineWidth = 1.4; g.strokeRect(22, 22, cw - 44, chh - 44);
      g.textAlign = "center"; g.fillStyle = C.foil; g.font = '600 17px "Figtree", Arial'; g.letterSpacing = "7px"; g.fillText("TABLE", cw / 2 + 4, 82); g.letterSpacing = "0px";
      g.fillStyle = C.ink; g.font = '300 140px "Figtree", Arial, sans-serif'; press(g, C, String(tableNo(ti)), cw / 2, 238);
      g.fillStyle = C.wine; g.font = '30px "Pinyon Script", cursive'; g.fillText("C & T", cw / 2, 300);
      g.restore();
    }
  });
  const numParts = [], frameMats = [], d0 = new THREE.Object3D();
  tables.forEach(([tx, tz], ti) => {
    const b = Math.atan2(-tz, -tx), phi = Math.PI / 2 - b;
    d0.position.set(tx + Math.cos(b) * 0.3, CLOTH_Y + 0.085, tz + Math.sin(b) * 0.3); d0.rotation.set(0, 0, 0); d0.rotateY(phi); d0.rotateX(-0.12); d0.updateMatrix();
    const pg = new THREE.PlaneGeometry(0.1, 0.135), uv = pg.attributes.uv, c0 = (ti % 8) / 8, r0 = Math.floor(ti / 8) / 3;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, c0 + uv.getX(i) / 8, 1 - r0 - (1 - uv.getY(i)) / 3);
    pg.translate(0, 0, 0.0045); pg.applyMatrix4(d0.matrix); numParts.push(pg); frameMats.push(d0.matrix.clone());
  });
  const numCards = new THREE.Mesh(mergeGeometries(numParts), new THREE.MeshPhysicalMaterial({ map: numSheet.map, roughnessMap: numSheet.rm, metalnessMap: numSheet.rm, roughness: 1, metalness: 1 }));
  const numFrameGeo = frameGeo(0.116, 0.151, 0.005, 0.1, 0.135, 0.003, 0.008, 0.0015); numFrameGeo.rotateX(Math.PI / 2);
  const numFrames = new THREE.InstancedMesh(numFrameGeo, flatware.material, NT); frameMats.forEach((m, i) => numFrames.setMatrixAt(i, m));
  setB.add(numCards, numFrames);
  {
    const d = new THREE.Object3D();
    tables.forEach(([tx, tz], ti) => {
      for (let s = 0; s < 10; s++) {
        const sa = (s / 10) * Math.PI * 2 + ti * 0.37, i = ti * 10 + s;
        d.position.set(tx + Math.cos(sa) * 0.66, 0, tz + Math.sin(sa) * 0.66); d.rotation.set(0, Math.PI / 2 - sa + 0.08, 0); d.updateMatrix(); napkins.setMatrixAt(i, d.matrix);
        [[sa - 0.24, 0.47], [sa - 0.36, 0.52]].forEach(([a, r], k) => { d.position.set(tx + Math.cos(a) * r, 0, tz + Math.sin(a) * r); d.rotation.set(0, 0, 0); d.scale.setScalar(k ? 0.9 : 1); d.updateMatrix(); glasses.setMatrixAt(i * 2 + k, d.matrix); });
        d.scale.setScalar(1);
        [-0.3, 0.3].forEach((o, k) => { const a = sa + o; d.position.set(tx + Math.cos(a) * 0.69, 0, tz + Math.sin(a) * 0.69); d.rotation.set(0, Math.PI / 2 - a, 0); d.updateMatrix(); flatware.setMatrixAt(i * 2 + k, d.matrix); });
      }
    });
  }
  napkins.castShadow = napkins.receiveShadow = true; flatware.receiveShadow = true; numFrames.castShadow = true;
  setB.add(napkins, glasses, flatware);

  /* ---------- The way in: the entrance, an ivory runner down the aisle to the dance floor, lanterns and flowers ---------- */
  const AISLE_Z0 = 14.3, AISLE_Z1 = 3.45, AISLE_W = 1.5;
  const runner = new THREE.Mesh(new THREE.PlaneGeometry(AISLE_W, AISLE_Z0 - AISLE_Z1, 4, 40), new THREE.MeshPhysicalMaterial({ color: 0xf2eadc, roughness: 0.82, sheen: 0.8, sheenColor: 0xffffff, sheenRoughness: 0.5, normalMap: linenNormal, normalScale: new THREE.Vector2(0.2, 0.2) }));
  runner.rotation.x = -Math.PI / 2; runner.position.set(0, 0.006, (AISLE_Z0 + AISLE_Z1) / 2); runner.receiveShadow = true; setB.add(runner);
  const runnerEdge = new THREE.InstancedMesh(new THREE.BoxGeometry(0.03, 0.004, AISLE_Z0 - AISLE_Z1), goldMat, 2);
  { const d = new THREE.Object3D(); [-1, 1].forEach((k, i) => { d.position.set(k * (AISLE_W / 2 - 0.06), 0.009, (AISLE_Z0 + AISLE_Z1) / 2); d.updateMatrix(); runnerEdge.setMatrixAt(i, d.matrix); }); } setB.add(runnerEdge);
  // Petals scattered along both edges of the runner.
  const NPA = mobile ? 160 : 300, aislePetals = new THREE.InstancedMesh(petalGeo, petalMat, NPA);
  { const d = new THREE.Object3D(), c = new THREE.Color();
    for (let i = 0; i < NPA; i++) { const side = i % 2 ? 1 : -1, x = side * (AISLE_W / 2 - 0.05 - Math.pow(rand(), 2) * 0.4) + (rand() < 0.2 ? (rand() - 0.5) * 1.2 : 0); d.position.set(x, 0.012, AISLE_Z1 + rand() * (AISLE_Z0 - AISLE_Z1)); d.rotation.set((rand() - 0.5) * 0.3, rand() * 6.28, (rand() - 0.5) * 0.3); d.scale.setScalar(0.03 + rand() * 0.015); d.updateMatrix(); aislePetals.setMatrixAt(i, d.matrix); aislePetals.setColorAt(i, c.setHSL(0.98 + rand() * 0.03, 0.45, 0.8 + rand() * 0.15)); } }
  aislePetals.receiveShadow = true; setB.add(aislePetals);
  // Hurricane lanterns on the floor either side, each with a pillar candle.
  const NLA = 16, aisleLanternGlass = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.11, 0.11, 0.42, 24, 1, true).translate(0, 0.23, 0), hallGlassMat, NLA);
  const aisleLanternBase = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.125, 0.135, 0.03, 24).translate(0, 0.015, 0), goldMat, NLA);
  const aisleLanternCandle = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.045, 0.045, 0.16, 20).translate(0, 0.11, 0), wax, NLA);
  const aisleLanternFlame = new THREE.InstancedMesh(new THREE.SphereGeometry(0.011, 10, 8).scale(1, 2.4, 1).translate(0, 0.215, 0), flameMat, NLA);
  const aisleLanternGlow = new THREE.InstancedMesh(glowGeo, new THREE.MeshBasicMaterial({ map: glowTex, color: new THREE.Color(0.7, 0.36, 0.14), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }), NLA);
  { const d = new THREE.Object3D();
    for (let i = 0; i < NLA; i++) { const side = i % 2 ? 1 : -1, z = AISLE_Z0 - 0.5 - Math.floor(i / 2) * 1.32; d.position.set(side * (AISLE_W / 2 + 0.22), 0, z); d.updateMatrix(); [aisleLanternGlass, aisleLanternBase, aisleLanternCandle, aisleLanternFlame].forEach((m) => m.setMatrixAt(i, d.matrix)); d.position.y = 0.01; d.scale.setScalar(1.6); d.updateMatrix(); aisleLanternGlow.setMatrixAt(i, d.matrix); d.scale.setScalar(1); } }
  setB.add(aisleLanternGlass, aisleLanternBase, aisleLanternCandle, aisleLanternFlame, aisleLanternGlow);
  // Tall gold pedestals of white flowers, alternating along the aisle, and an arch of flowers at the door.
  const pedestalGeo = mergeGeometries([new THREE.CylinderGeometry(0.16, 0.2, 0.04, 32).translate(0, 0.02, 0), new THREE.CylinderGeometry(0.03, 0.05, 1.1, 20).translate(0, 0.59, 0), new THREE.CylinderGeometry(0.17, 0.035, 0.18, 32).translate(0, 1.2, 0)]);
  const NPD = 8, pedestals = new THREE.InstancedMesh(pedestalGeo, goldMat, NPD), pedFlowers = new THREE.InstancedMesh(flowerGeo, flowers.material, NPD + 22);
  { const d = new THREE.Object3D();
    for (let i = 0; i < NPD; i++) { const side = i % 2 ? 1 : -1, z = AISLE_Z0 - 1.6 - i * 1.3; d.position.set(side * (AISLE_W / 2 + 0.85), 0, z); d.rotation.set(0, i, 0); d.scale.setScalar(1); d.updateMatrix(); pedestals.setMatrixAt(i, d.matrix);
      d.position.y = 1.3 - (CLOTH_Y + 1.01) * 0.85; d.scale.setScalar(0.85); d.updateMatrix(); pedFlowers.setMatrixAt(i, d.matrix); }
    for (let k = 0; k < 22; k++) { const a = Math.PI * (k / 21), r = 1.65; d.position.set(Math.cos(a) * r, Math.sin(a) * r * 1.35 + 0.15 - (CLOTH_Y + 1.01) * 0.95, AISLE_Z0 - 0.15); d.rotation.set(0, k * 1.3, 0); d.scale.setScalar(0.95); d.updateMatrix(); pedFlowers.setMatrixAt(NPD + k, d.matrix); } }
  pedestals.castShadow = pedFlowers.castShadow = true; setB.add(pedestals, pedFlowers);
  const archLights = new THREE.InstancedMesh(new THREE.SphereGeometry(0.02, 6, 4), fairy.material, 90);
  { const d = new THREE.Object3D(); for (let k = 0; k < 90; k++) { const a = Math.PI * (k / 89), r = 1.65 + (rand() - 0.5) * 0.3; d.position.set(Math.cos(a) * r, Math.sin(a) * r * 1.35 + 0.15 + (rand() - 0.5) * 0.25, AISLE_Z0 - 0.15 + (rand() - 0.5) * 0.3); d.updateMatrix(); archLights.setMatrixAt(k, d.matrix); } }
  setB.add(archLights);

  /* ---------- Hall life: aso ebi colours, light, people, celebration ---------- */
  const mergeAll = (list) => mergeGeometries(list.map((g) => (g.index ? g.toNonIndexed() : g)));
  // Ivory table linens.
  const ivoryCloth = new THREE.Color(0xfff8ee);
  tables.forEach((_, ti) => cloths.setColorAt(ti, ivoryCloth));
  cloths.instanceColor.needsUpdate = true;

  // Draped walls washed by coloured uplights.
  const uplightTex = canvasTex(1024, 256, (g, w, h) => {
    g.fillStyle = "#000"; g.fillRect(0, 0, w, h);
    const cols = ["255,176,96", "255,206,150", "255,186,110", "255,220,170"];
    for (let i = 0; i < 8; i++) {
      const x = (i + 0.5) * w / 8, c = cols[i % cols.length];
      const gr = g.createRadialGradient(x, h, 0, x, h, h * 1.1);
      gr.addColorStop(0, `rgba(${c},1)`); gr.addColorStop(0.45, `rgba(${c},.35)`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr; g.fillRect(x - w / 8, 0, w / 4, h);
    }
  });
  const wallMat = new THREE.MeshPhysicalMaterial({ color: 0x6e6252, roughness: 0.75, sheen: 1, sheenColor: 0xffe6c4, sheenRoughness: 0.4, emissive: 0xffffff, emissiveMap: uplightTex, emissiveIntensity: 1.1 });
  [[-15, 0, Math.PI / 2, 30], [15, 0, -Math.PI / 2, 30], [0, 15, Math.PI, 30]].forEach(([x, z, ry, wd]) => {
    const g = new THREE.PlaneGeometry(wd, 8.5, 300, 2), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const u = p.getX(i); p.setZ(i, Math.sin(u * 2.7) * 0.14 + Math.sin(u * 6.1 + 2) * 0.05); }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, wallMat); m.position.set(x, 4.25, z); m.rotation.y = ry; m.receiveShadow = true; setB.add(m);
  });

  // Moving-head lights sweeping the room, with visible beams through the haze.
  const beamTex = canvasTex(4, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.25, "rgba(255,255,255,.35)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const beamGeo = new THREE.CylinderGeometry(0.05, 1.5, 10, 40, 1, true); beamGeo.translate(0, -5, 0);
  const movers = [[-10, -7, 0xffd9a8], [10, -7, 0xffc785], [-10, 7, 0xffe6c4], [10, 7, 0xffcf96]].map(([x, z, hex], i) => {
    const col = new THREE.Color(hex);
    const head = new THREE.Group(); head.position.set(x, 8.2, z); setB.add(head);
    const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ map: beamTex, color: col.clone().multiplyScalar(0.11), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    head.add(beam);
    const spot = new THREE.SpotLight(col, 0, 0, 0.16, 0.6, 1.2);
    spot.position.set(x, 8.2, z); scene.add(spot, spot.target);
    return { head, spot, beam, seed: i * 1.7, x, z };
  });

  // Guests: seated guests appear as they RSVP. Aso ebi in burgundy, red and gold, gele and fila.
  function limb(a, b, r) {
    const d = new THREE.Vector3().subVectors(b, a), len = d.length();
    const g = new THREE.CapsuleGeometry(r, Math.max(0.01, len - 2 * r), 4, 10);
    g.applyMatrix4(new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()), new THREE.Vector3(1, 1, 1)));
    return g;
  }
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  // The tied gele: a wide halo of concentric pleats standing round the head, open at the nape, and a wrapped crown.
  // Origin at the centre of the head (radius about 0.1 m).
  function haloGele(s) {
    const halo = new THREE.RingGeometry(0.085, 0.25, 200, 30, -Math.PI * 0.22, Math.PI * 1.44), pa = halo.attributes.position;
    for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), y = pa.getY(i), r = Math.hypot(x, y), a = Math.atan2(y, x); pa.setZ(i, -(r - 0.085) * 0.5 + 0.0075 * Math.sin((r - 0.085) * 190) + 0.004 * Math.sin(a * 7)); }
    halo.computeVertexNormals(); halo.rotateX(-0.28); halo.translate(0, 0.025, -0.03);
    const parts = [halo,
      new THREE.TorusGeometry(0.1, 0.024, 10, 48).rotateX(Math.PI / 2 - 0.45).translate(0, 0.04, 0.005),
      new THREE.TorusGeometry(0.088, 0.022, 10, 48).rotateX(Math.PI / 2 - 0.3).translate(0, 0.072, -0.01),
      new THREE.TorusGeometry(0.068, 0.02, 10, 40).rotateX(Math.PI / 2 - 0.15).translate(0, 0.1, -0.02),
      new THREE.RingGeometry(0.02, 0.07, 40, 4, 0, Math.PI).rotateY(Math.PI / 2 - 0.5).translate(0.095, 0.05, 0.03)];
    const g = mergeAll(parts); g.scale(s, s, s); g.computeVertexNormals(); return g;
  }
  // A seated guest at the table: buba or agbada to the waist, the lap toward the table, forearms resting on its edge.
  const seatedBodyGeo = mergeAll([
    new THREE.LatheGeometry([[0.0001, 0.5], [0.16, 0.5], [0.18, 0.6], [0.19, 0.78], [0.19, 0.86], [0.12, 0.93], [0.05, 0.95], [0.0001, 0.95]].map(([r, y]) => new THREE.Vector2(r, y)), 24).scale(1, 1, 0.66),
    new RoundedBoxGeometry(0.34, 0.13, 0.4, 2, 0.05).translate(0, 0.5, -0.14),
    new THREE.CylinderGeometry(0.055, 0.05, 0.45, 10).translate(-0.09, 0.225, -0.34), new THREE.CylinderGeometry(0.055, 0.05, 0.45, 10).translate(0.09, 0.225, -0.34),
    new THREE.CylinderGeometry(0.042, 0.048, 0.1, 12).translate(0, 0.99, 0),
    limb(V(-0.19, 0.88, 0), V(-0.22, 0.66, -0.1), 0.055), limb(V(0.19, 0.88, 0), V(0.22, 0.66, -0.1), 0.055),
    limb(V(-0.22, 0.66, -0.1), V(-0.13, 0.78, -0.36), 0.045), limb(V(0.22, 0.66, -0.1), V(0.13, 0.78, -0.36), 0.045)
  ]);
  const headGeo = new THREE.SphereGeometry(0.095, 18, 14).scale(1, 1.15, 1);
  const geleGeoOld = mergeAll([
    new THREE.SphereGeometry(0.15, 20, 10).scale(1.35, 0.6, 1.1),
    new THREE.TorusGeometry(0.13, 0.045, 10, 28, Math.PI * 1.3).rotateX(-0.5).translate(0, 0.07, 0.03)
  ]);
  const geleGeo = haloGele(0.85);
  const filaGeo = new THREE.CylinderGeometry(0.088, 0.1, 0.11, 20).rotateZ(0.25);
  const fabric = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.7, sheen: 0.6, sheenRoughness: 0.45, sheenColor: 0xd8d0c0 });
  const geleMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.35, sheen: 1, sheenColor: 0xfff0c8 });
  const skin = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.48, sheen: 0.4, sheenColor: 0xffc8a0 });
  const asoEbi = [0x5e0c1e, 0x7a1228, 0x4a0816, 0x8e1a2e, 0xb8954e, 0x5e0c1e].map((c) => new THREE.Color(c));
  const skins = [0x4a2a1a, 0x5c3420, 0x3a2014, 0x6b3d24, 0x2f1a10].map((c) => new THREE.Color(c));
  const geleGold = new THREE.Color(0xc9a256);
  const seatedBodies = new THREE.InstancedMesh(seatedBodyGeo, fabric, NS);
  const seatedHeads = new THREE.InstancedMesh(headGeo, skin, NS);
  const seatedGele = new THREE.InstancedMesh(geleGeo, geleMat, NS);
  const seatedFila = new THREE.InstancedMesh(filaGeo, geleMat, NS);
  const gd = new THREE.Object3D();
  const guestSeat = [];
  tables.forEach(([tx, tz], ti) => {
    for (let s = 0; s < 10; s++) {
      const sa = (s / 10) * Math.PI * 2 + ti * 0.37;
      guestSeat.push({ x: tx + Math.cos(sa) * 1.17, z: tz + Math.sin(sa) * 1.17, ry: Math.PI / 2 - sa, woman: rand() < 0.55, lean: (rand() - 0.5) * 0.25, cloth: asoEbi[Math.floor(rand() * asoEbi.length)], skin: skins[Math.floor(rand() * skins.length)] });
    }
  });
  guestSeat.forEach((g, i) => {
    seatedBodies.setColorAt(i, g.cloth); seatedHeads.setColorAt(i, g.skin); seatedGele.setColorAt(i, geleGold); seatedFila.setColorAt(i, geleGold);
  });
  [seatedBodies, seatedHeads, seatedGele, seatedFila].forEach((m) => { m.castShadow = true; m.receiveShadow = true; setB.add(m); });
  function placeGuest(i, on) {
    if (!fullHouse && (i === MAMA_SEAT || Math.floor(i / 10) === hideTable)) on = false; // her place is kept for her until the dance, when she is there
    const g = guestSeat[i], d = gd;
    d.position.set(g.x, 0, g.z); d.rotation.set(0, g.ry + g.lean, 0); d.scale.setScalar(on ? 1 : 0.0001); d.updateMatrix();
    seatedBodies.setMatrixAt(i, d.matrix);
    d.position.y = 0; d.updateMatrix();
    const hm = new THREE.Matrix4().makeTranslation(0, 1.13, 0.0);
    seatedHeads.setMatrixAt(i, new THREE.Matrix4().multiplyMatrices(d.matrix, hm));
    const cap = new THREE.Matrix4().makeTranslation(0, 1.24, 0.02), geleAt = new THREE.Matrix4().makeTranslation(0, 1.13, 0);
    const capM = new THREE.Matrix4().multiplyMatrices(d.matrix, cap), geleM = new THREE.Matrix4().multiplyMatrices(d.matrix, geleAt);
    const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
    seatedGele.setMatrixAt(i, g.woman ? geleM : hidden);
    seatedFila.setMatrixAt(i, g.woman ? hidden : capM);
  }

  // The dance floor: the couple at the centre, family and friends around them, in aso ebi.
  // Women in iro and buba with a pleated gele; men in a flowing agbada and fila. Arms are jointed and dance.
  const lathe = (pts, seg) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg || 28);
  const womanGeo = mergeAll([
    lathe([[0.0001, 0.0], [0.22, 0.0], [0.215, 0.12], [0.2, 0.4], [0.175, 0.7], [0.155, 0.93], [0.15, 0.99], [0.0001, 0.99]]).scale(1, 1, 0.82), // the iro
    lathe([[0.0001, 0.93], [0.17, 0.93], [0.2, 1.02], [0.19, 1.16], [0.205, 1.3], [0.2, 1.38], [0.12, 1.45], [0.05, 1.47], [0.0001, 1.47]]).scale(1, 1, 0.66), // the buba
    new THREE.TorusGeometry(0.165, 0.035, 8, 28).rotateX(Math.PI / 2).scale(1, 1, 0.8).translate(0, 0.97, 0), // the knot of the wrap
    new THREE.CylinderGeometry(0.042, 0.048, 0.1, 14).translate(0, 1.5, 0)
  ]);
  const manGeo = mergeAll([
    lathe([[0.0001, 0.12], [0.3, 0.12], [0.33, 0.4], [0.36, 0.8], [0.37, 1.12], [0.33, 1.32], [0.16, 1.44], [0.06, 1.47], [0.0001, 1.47]]).scale(1.35, 1, 0.72), // the agbada
    new THREE.CylinderGeometry(0.06, 0.055, 0.14, 12).translate(-0.09, 0.07, 0.02), new THREE.CylinderGeometry(0.06, 0.055, 0.14, 12).translate(0.09, 0.07, 0.02),
    new THREE.BoxGeometry(0.09, 0.05, 0.22).translate(-0.09, 0.025, 0.06), new THREE.BoxGeometry(0.09, 0.05, 0.22).translate(0.09, 0.025, 0.06),
    new THREE.CylinderGeometry(0.044, 0.05, 0.1, 14).translate(0, 1.5, 0)
  ]);
  const headGeoD = new THREE.SphereGeometry(0.1, 20, 16).scale(0.86, 1.12, 0.98);
  // Gele: a stiff band round the head and a pleated fan rising behind.
  const geleFanGeo = (() => { const g = new THREE.CylinderGeometry(0.23, 0.12, 0.2, 64, 3, true, -Math.PI * 0.62, Math.PI * 1.24), pa = g.attributes.position; for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), z = pa.getZ(i), th = Math.atan2(z, x), k = 1 + 0.07 * Math.sin(th * 26) * (0.4 + (pa.getY(i) + 0.1) * 3); pa.setX(i, x * k); pa.setZ(i, z * k); } g.computeVertexNormals(); g.rotateX(-0.35); g.translate(0, 0.07, -0.02); return g; })();
  const geleGeoD = haloGele(0.95);
  const filaGeoD = mergeAll([new THREE.CylinderGeometry(0.095, 0.1, 0.1, 24).translate(0, 0.04, 0), new THREE.SphereGeometry(0.08, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.1, 0.6, 1).rotateZ(0.6).translate(0.07, 0.1, 0)]);
  const sleeveGeo = new THREE.CapsuleGeometry(0.058, 0.17, 4, 12); // upper arm, in the sleeve
  const foreGeo = new THREE.CapsuleGeometry(0.04, 0.18, 4, 10);
  const ND = mobile ? 34 : 56;
  const dancers = [];
  for (let i = 0; i < ND; i++) {
    const couple = i < 2, a = rand() * Math.PI * 2, r = couple ? 0.32 : 0.95 + Math.sqrt(rand()) * 2.15;
    const woman = i === 0 ? true : i === 1 ? false : rand() < 0.58;
    dancers.push({
      x: couple ? (i ? 0.32 : -0.32) : Math.cos(a) * r, z: couple ? 0 : Math.sin(a) * r, ry: couple ? (i ? -Math.PI / 2 : Math.PI / 2) : rand() * Math.PI * 2,
      woman, pose: couple ? 1 : Math.floor(rand() * 4), // 0 arms up waving, 1 one hand up, 2 arms low swinging, 3 spraying notes
      cloth: i === 0 ? new THREE.Color(0xf4ead8) : asoEbi[Math.floor(rand() * asoEbi.length)], skin: skins[Math.floor(rand() * skins.length)],
      ph: rand() * 6, sp: 2.6 + rand() * 1.4, h: (woman ? 0.96 : 1.02) + rand() * 0.08
    });
  }
  const nW = dancers.filter((d) => d.woman).length;
  const dWomen = new THREE.InstancedMesh(womanGeo, fabric, ND), dMen = new THREE.InstancedMesh(manGeo, fabric, ND);
  const dHeads = new THREE.InstancedMesh(headGeoD, skin, ND), dGele = new THREE.InstancedMesh(geleGeoD, geleMat, ND), dFila = new THREE.InstancedMesh(filaGeoD, geleMat, ND);
  const dSleeves = new THREE.InstancedMesh(sleeveGeo, fabric, ND * 2), dFore = new THREE.InstancedMesh(foreGeo, skin, ND * 2), dHands = new THREE.InstancedMesh(new THREE.SphereGeometry(0.042, 10, 8).scale(1, 1.25, 0.6), skin, ND * 2);
  dancers.forEach((g, i) => {
    dWomen.setColorAt(i, g.cloth); dMen.setColorAt(i, g.cloth); dHeads.setColorAt(i, g.skin);
    dGele.setColorAt(i, i === 0 ? new THREE.Color(0xd9b46a) : rand() < 0.6 ? geleGold : g.cloth); dFila.setColorAt(i, rand() < 0.5 ? geleGold : g.cloth);
    [0, 1].forEach((k) => { dSleeves.setColorAt(i * 2 + k, g.cloth); dFore.setColorAt(i * 2 + k, g.skin); dHands.setColorAt(i * 2 + k, g.skin); });
  });
  const danceMeshes = [dWomen, dMen, dHeads, dGele, dFila, dSleeves, dFore, dHands];
  // People are only shown on the dance floor at the end, in the party's own light. Seated guests stay as their lit votives.
  [...danceMeshes, seatedBodies, seatedHeads, seatedGele, seatedFila].forEach((m) => { m.visible = false; });
  danceMeshes.forEach((m) => { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; setB.add(m); });
  const zeroM = new THREE.Matrix4().makeScale(0, 0, 0), mA = new THREE.Matrix4(), mB = new THREE.Matrix4(), hand = new THREE.Vector3();
  const qA = new THREE.Quaternion(), upY = new THREE.Vector3(0, 1, 0), segDir = new THREE.Vector3(), segMid = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  const sh = new THREE.Vector3(), el = new THREE.Vector3(), wr = new THREE.Vector3();
  function segM(a, b, out) { segDir.subVectors(b, a); const len = segDir.length(); segDir.divideScalar(len); qA.setFromUnitVectors(upY, segDir); segMid.addVectors(a, b).multiplyScalar(0.5); return out.compose(segMid, qA, one); }
  function animateDancers(t) {
    dancers.forEach((g, i) => {
      const beat = Math.sin(t * g.sp + g.ph), bob = Math.abs(beat) * 0.045 * motion;
      gd.position.set(g.x + Math.sin(t * 0.6 + g.ph) * 0.06 * motion, bob, g.z);
      gd.rotation.set(0, g.ry + Math.sin(t * 0.9 + g.ph) * 0.45 * motion, Math.sin(t * g.sp * 0.5 + g.ph) * 0.05 * motion);
      gd.scale.set(1, g.h, 1); gd.updateMatrix();
      dWomen.setMatrixAt(i, g.woman ? gd.matrix : zeroM); dMen.setMatrixAt(i, g.woman ? zeroM : gd.matrix);
      mA.makeTranslation(0, 1.64, 0.0); dHeads.setMatrixAt(i, mB.multiplyMatrices(gd.matrix, mA));
      mA.makeTranslation(0, 1.64, 0); mB.multiplyMatrices(gd.matrix, mA); dGele.setMatrixAt(i, g.woman ? mB : zeroM);
      mA.makeTranslation(0, 1.72, -0.01); mB.multiplyMatrices(gd.matrix, mA); dFila.setMatrixAt(i, g.woman ? zeroM : mB);
      // Arms: shoulder, elbow, wrist, in the dancer's own space.
      [-1, 1].forEach((side, k) => {
        const w = Math.sin(t * g.sp * 0.5 + g.ph + k) * motion;
        let lift, bend;
        if (g.pose === 0) { lift = 2.5 + 0.15 * w; bend = 0.35 + 0.25 * Math.sin(t * g.sp + k * 2) * motion; }
        else if (g.pose === 1) { lift = k ? 2.6 + 0.2 * w : 0.55 + 0.2 * w; bend = k ? 0.3 + 0.3 * Math.sin(t * g.sp * 1.2) * motion : 1.1; }
        else if (g.pose === 2) { lift = 0.7 + 0.35 * w; bend = 1.2 + 0.3 * w; }
        else { lift = k ? 1.9 + 0.3 * Math.sin(t * g.sp) * motion : 0.6; bend = k ? 0.5 : 1.3; }
        sh.set(side * (g.woman ? 0.19 : 0.25), 1.4, 0);
        el.set(side * Math.sin(lift) * 0.27, -Math.cos(lift) * 0.27, 0.06 + 0.08 * Math.sin(lift)).add(sh);
        const fl = lift + bend * (lift > 1.6 ? -1 : 1) * 0.6;
        wr.set(side * Math.sin(fl) * 0.25, -Math.cos(fl) * 0.25, 0.1 + 0.12 * Math.sin(fl * 0.8)).add(el);
        dSleeves.setMatrixAt(i * 2 + k, mB.multiplyMatrices(gd.matrix, segM(sh, el, mA)));
        dFore.setMatrixAt(i * 2 + k, mB.multiplyMatrices(gd.matrix, segM(el, wr, mA)));
        hand.copy(wr).addScaledVector(segDir, 0.05); mA.makeTranslation(hand.x, hand.y, hand.z); dHands.setMatrixAt(i * 2 + k, mB.multiplyMatrices(gd.matrix, mA));
      });
    });
    danceMeshes.forEach((m) => { m.instanceMatrix.needsUpdate = true; });
  }
  animateDancers(0);
  lightSeats(0);

  // Photographers' flashes popping around the room.
  const flashes = Array.from({ length: 3 }, () => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffffff, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
    sp.scale.setScalar(0.9); sp.visible = false; setB.add(sp);
    return { sp, t0: -10 };
  });

  // The cake, beside the head table.
  const cake = new THREE.Group(); cake.position.set(4.3, 0, -11.2); setB.add(cake);
  const cakeTable = new THREE.Mesh(clothGeo, new THREE.MeshPhysicalMaterial({ color: 0xf2ebe0, roughness: 0.8, sheen: 0.7, sheenColor: 0xffffff }));
  cakeTable.scale.set(0.6, 1, 0.6); cake.add(cakeTable);
  const fondant = new THREE.MeshPhysicalMaterial({ color: 0xfbf6ee, roughness: 0.45, sheen: 0.8, sheenColor: 0xffffff, clearcoat: 0.3 });
  let cy = CLOTH_Y;
  [[0.34, 0.26], [0.27, 0.24], [0.2, 0.22], [0.14, 0.2]].forEach(([r, h]) => {
    const tier = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 48), fondant); tier.position.y = cy + h / 2; cake.add(tier);
    const band = new THREE.Mesh(new THREE.TorusGeometry(r + 0.004, 0.012, 8, 64), brass); band.rotation.x = Math.PI / 2; band.position.y = cy + 0.02; cake.add(band);
    cy += h;
  });
  const topper = new THREE.Mesh(flowerGeo, flowers.material); topper.scale.setScalar(0.45); topper.position.y = cy - 0.45 * (CLOTH_Y + 1.01) + 0.08; cake.add(topper);
  shadowAll(cake);

  // Naira notes sprayed on the dancers in the finale.
  const noteTex = canvasTex(256, 128, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, "#6b4a7a"); gr.addColorStop(0.5, "#8a6a5a"); gr.addColorStop(1, "#4f6a8a");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = 2; g.strokeRect(6, 6, w - 12, h - 12);
    for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(255,255,255,${0.05 + rand() * 0.1})`; g.beginPath(); g.arc(70, 64, 10 + i * 1.5, 0, Math.PI * 2); g.stroke(); }
    g.fillStyle = "rgba(40,25,40,.55)"; g.beginPath(); g.ellipse(190, 64, 34, 44, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#f5ecd8"; g.font = '600 34px "Figtree", Arial, sans-serif'; g.fillText("₦1000", 18, 40); g.font = '600 18px "Figtree", Arial, sans-serif'; g.fillText("ONE THOUSAND NAIRA", 18, 112);
  });
  const NN = mobile ? 90 : 170;
  const notes = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.15, 0.072), new THREE.MeshStandardMaterial({ map: noteTex, roughness: 0.65, side: THREE.DoubleSide }), NN);
  const noteData = Array.from({ length: NN }, () => ({ a: rand() * Math.PI * 2, r: rand() * 2.6, y0: rand() * 3, sp: 0.18 + rand() * 0.22, sw: rand() * 6, rs: 0.6 + rand() * 1.6 }));
  notes.visible = false; notes.frustumCulled = false; setB.add(notes);

  /* ---------- Camera path ---------- */
  // [progress, position, look target, aperture (blur in px at 1080p for objects far from focus)]
  const gemWorldY = RING_UP + gemC; // after the yes, the ring floats above its box
  const keysA = [
    [0.00, [0, 1.45, 5.6], [0, 0.55, 0], 24],
    [0.12, [0.45, 1.25, 4.0], [0, 0.3, 0], 20],
    [0.16, [0.75, 1.45, 3.9], [0, RING_UP * 0.55, 0], 22], // the camera rises with the ring, keeping the stone in frame
    [0.2, [1.1, 1.75, 3.6], [0, RING_UP, 0], 23],
    [0.25, [1.6, 1.95, 3.3], [0, RING_UP + 0.05, 0], 24],
    [0.35, [-1.9, 2.0, 5.2], [0, RING_UP + 0.1, 0], 18],
    [0.45, [0, 1.75, 7.0], [0, RING_UP + 0.1, 0], 12],
    [0.54, [0, 1.65, 3.2], [0, RING_UP + 0.15, 0], 22],
    [0.62, [0, gemWorldY + 0.62, 1.0], [0, gemWorldY + 0.02, 0], 28],
    [0.675, [0, gemWorldY + 0.32, 0.36], [0, gemWorldY + 0.03, 0], 36]
  ];
  const keysB = [
    [0.675, [0.6, 24, 1.4], [0, 0, 0], 34],
    [0.775, [-0.6, 21, 1.0], [0, 0, 0], 34],
    [0.80, [7.5, 12.5, 12.5], [-3.6, 0, 1.0], 26],
    [0.88, [10, 9.6, 8.6], [-3.0, 0.3, 0.4], 26],
    [0.94, [0.0, 2.6, 10.2], [0, 1.15, 0], 12],
    [1.00, [0.25, 2.3, 9.0], [0, 1.2, -0.3], 13]
  ];
  const v3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
  [keysA, keysB].forEach((ks) => ks.forEach((k) => { k[1] = v3(k[1]); k[2] = v3(k[2]); }));
  function catmull(p0, p1, p2, p3, t, out) {
    const t2 = t * t, t3 = t2 * t;
    return out.set(0, 0, 0)
      .addScaledVector(p0, -0.5 * t3 + t2 - 0.5 * t)
      .addScaledVector(p1, 1.5 * t3 - 2.5 * t2 + 1)
      .addScaledVector(p2, -1.5 * t3 + 2 * t2 + 0.5 * t)
      .addScaledVector(p3, 0.5 * t3 - 0.5 * t2);
  }
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), estPos = new THREE.Vector3(), estLook = new THREE.Vector3(-1.2, 0.2, -2);
  let camAperture = 14;
  function cameraAt(p) {
    const ks = p < 0.675 ? keysA : keysB;
    let i = 0;
    while (i < ks.length - 2 && p > ks[i + 1][0]) i++;
    const A = ks[i], B = ks[i + 1], P0 = ks[Math.max(0, i - 1)], P3 = ks[Math.min(ks.length - 1, i + 2)];
    const t = clamp((p - A[0]) / (B[0] - A[0]), 0, 1), te = lerp(t, smooth(t), 0.5); // eased into each mark: the camera rests a beat on what it shows
    catmull(P0[1], A[1], B[1], P3[1], te, camPos);
    catmull(P0[2], A[2], B[2], P3[2], te, camLook);
    camAperture = lerp(A[3], B[3], smooth(t));
  }

  /* ---------- Set C, "The colour": aso ebi silk with gold cord lace, and strands of Edo coral beads ---------- */
  const setC = new THREE.Group(); setC.visible = false; scene.add(setC);
  const silkBg = new THREE.Color(0x0c0306);
  // Lights used only by the new chapters. They stay in the scene (at zero) so switching chapters never recompiles shaders.
  const xKey = new THREE.DirectionalLight(0xffe2c0, 0); xKey.position.set(2.5, 6, 4);
  const xRim = new THREE.DirectionalLight(0xff9fb0, 0); xRim.position.set(-5, 2.5, -6);
  const xGlow = new THREE.PointLight(0xffc98a, 0, 14, 1.6);
  scene.add(xKey, xRim, xGlow);
  function drawLace(g, w, h, c) {
    g.fillStyle = c.bg; g.fillRect(0, 0, w, h);
    // Tulle: a fine diagonal net under the cord work.
    g.strokeStyle = c.net; g.lineWidth = 1.2;
    for (let i = -h; i < w; i += 18) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); g.beginPath(); g.moveTo(i + h, 0); g.lineTo(i, h); g.stroke(); }
    const cell = w / 4;
    for (let r = 0; r < 4; r++) for (let q = 0; q < 4; q++) {
      const cx = (q + (r % 2 ? 0.5 : 0) + 0.5) * cell % w, cy = (r + 0.5) * cell;
      for (const ox of [0, -w, w]) {
        const x = cx + ox;
        if (x < -cell || x > w + cell) continue;
        // Scalloped vine between motifs.
        g.strokeStyle = c.gold; g.lineWidth = 5;
        g.beginPath(); g.moveTo(x - cell * 0.5, cy + cell * 0.5); g.bezierCurveTo(x - cell * 0.25, cy + cell * 0.1, x + cell * 0.25, cy + cell * 0.9, x + cell * 0.5, cy + cell * 0.5); g.stroke();
        // Eight petals, each a cord outline with an eyelet.
        for (let k = 0; k < 8; k++) {
          const a = k / 8 * Math.PI * 2 + (r % 2 ? 0.2 : 0);
          g.save(); g.translate(x + Math.cos(a) * 36, cy + Math.sin(a) * 36); g.rotate(a);
          g.fillStyle = c.gold; g.beginPath(); g.ellipse(0, 0, 25, 12, 0, 0, Math.PI * 2); g.fill();
          g.fillStyle = c.hole; g.beginPath(); g.ellipse(2, 0, 13, 5, 0, 0, Math.PI * 2); g.fill();
          g.restore();
        }
        g.fillStyle = c.gold; g.beginPath(); g.arc(x, cy, 15, 0, Math.PI * 2); g.fill();
        g.fillStyle = c.hole; g.beginPath(); g.arc(x, cy, 6, 0, Math.PI * 2); g.fill();
        // A ring of beads around the flower.
        g.fillStyle = c.gold;
        for (let k = 0; k < 18; k++) { const a = k / 18 * Math.PI * 2; g.beginPath(); g.arc(x + Math.cos(a) * 72, cy + Math.sin(a) * 72, 4.2, 0, Math.PI * 2); g.fill(); }
        // Leaves off the vine.
        for (let k = 0; k < 2; k++) {
          g.save(); g.translate(x + (k ? 1 : -1) * cell * 0.32, cy + cell * 0.42); g.rotate(k ? -0.7 : 0.7);
          g.fillStyle = c.gold; g.beginPath(); g.ellipse(0, 0, 18, 7, 0, 0, Math.PI * 2); g.fill();
          g.strokeStyle = c.hole; g.lineWidth = 2; g.beginPath(); g.moveTo(-14, 0); g.lineTo(14, 0); g.stroke();
          g.restore();
        }
      }
    }
  }
  const SILK = { burgundy: "#4a0918", ruby: "#7a0f24", coral: "#86321f", blue: "#102a6c", green: "#1d4a35" };
  const laceCanvas = document.createElement("canvas"); laceCanvas.width = laceCanvas.height = 1024;
  const laceMap = new THREE.CanvasTexture(laceCanvas);
  laceMap.colorSpace = THREE.SRGBColorSpace; laceMap.wrapS = laceMap.wrapT = THREE.RepeatWrapping; laceMap.repeat.set(4.2, 2.8); laceMap.anisotropy = maxAniso;
  let silkNow = "";
  function paintSilk(name) {
    silkNow = name;
    drawLace(laceCanvas.getContext("2d"), 1024, 1024, { bg: SILK[name] || SILK.burgundy, net: "rgba(233,190,120,.22)", gold: "#e6bd6c", hole: SILK[name] || SILK.burgundy });
    laceMap.needsUpdate = true;
  }
  paintSilk(OP.velvet);
  // Roughness in green, metalness in blue: the cord lace is metal thread, the silk is not.
  const laceRM = canvasTex(1024, 1024, (g, w, h) => drawLace(g, w, h, { bg: "rgb(0,92,0)", net: "rgba(0,80,150,.6)", gold: "rgb(0,70,255)", hole: "rgb(0,92,0)" }), { srgb: false, repeat: [4.2, 2.8] });
  const CW = 7.4, CH = 4.8, CSX = mobile ? 110 : 168, CSY = mobile ? 72 : 110;
  const silkGeo = new THREE.PlaneGeometry(CW, CH, CSX, CSY);
  const silkBase = silkGeo.attributes.position.array.slice();
  const silk = new THREE.MeshPhysicalMaterial({
    map: laceMap, roughnessMap: laceRM, metalnessMap: laceRM, roughness: 1, metalness: 1,
    sheen: 1, sheenRoughness: 0.3, sheenColor: 0xc97a8c, anisotropy: 0.55, clearcoat: 0.12, clearcoatRoughness: 0.35, side: THREE.DoubleSide
  });
  const clothG = new THREE.Group(); clothG.rotation.x = -1.12; setC.add(clothG);
  const silkMesh = new THREE.Mesh(silkGeo, silk); clothG.add(silkMesh);
  function silkH(x, y, T) {
    const e = 0.45 + 0.55 * (x + CW / 2) / CW;
    return 0.26 * Math.sin(0.95 * x - 1.25 * T + 0.5 * y) * e + 0.1 * Math.sin(2.1 * x + 1.7 * y - 1.9 * T)
      + 0.04 * Math.sin(4.4 * x - 0.8 * y - 2.8 * T) + 0.16 * Math.sin(1.6 * y + 0.7 * Math.sin(0.8 * x + 0.4 * T));
  }
  // Coral bead strands, with gold spacers, that fall onto the silk.
  const STR = 3, PER = mobile ? 52 : 70;
  const beadGeo = new THREE.SphereGeometry(0.052, 18, 12);
  const coralMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08, sheen: 0.25, sheenColor: 0xffd0c0 });
  const beads = new THREE.InstancedMesh(beadGeo, coralMat, STR * PER);
  const spacers = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 14, 10), brass, STR * PER);
  const beadCol = new THREE.Color();
  for (let i = 0; i < STR * PER; i++) beads.setColorAt(i, beadCol.setHSL(0.02 + rand() * 0.018, 0.72, 0.4 + rand() * 0.08));
  beads.frustumCulled = spacers.frustumCulled = false;
  clothG.add(beads, spacers);
  const strands = [[-0.55, 0.95, 0], [0.1, 1.15, 0.6], [0.75, 0.8, 1.3]]; // base y, sag, phase
  // Gold dust in the air above the cloth.
  const GD = mobile ? 160 : 320;
  const gdGeo = new THREE.BufferGeometry(), gdPos = new Float32Array(GD * 3), gdSeed = new Float32Array(GD);
  for (let i = 0; i < GD; i++) { gdPos[i * 3] = (rand() - 0.5) * 8; gdPos[i * 3 + 1] = rand() * 2.6 - 0.6; gdPos[i * 3 + 2] = (rand() - 0.5) * 5; gdSeed[i] = rand() * 6.28; }
  gdGeo.setAttribute("position", new THREE.BufferAttribute(gdPos, 3));
  const goldDust = new THREE.Points(gdGeo, new THREE.PointsMaterial({ size: 0.028, map: dotTex, color: new THREE.Color(2.4, 1.7, 0.9), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  goldDust.frustumCulled = false; setC.add(goldDust);
  const dm = new THREE.Object3D();
  function updateC(u, t) {
    if (OP.velvet !== silkNow) paintSilk(OP.velvet);
    const T = t * 0.55 * motion + u * 5;
    const a = silkGeo.attributes.position.array;
    for (let i = 0; i < a.length; i += 3) a[i + 2] = silkH(silkBase[i], silkBase[i + 1], T);
    silkGeo.attributes.position.needsUpdate = true; silkGeo.computeVertexNormals();
    for (let s = 0; s < STR; s++) {
      const [y0, sag, ph] = strands[s];
      const drop = 1 - seg(u, 0.18 + s * 0.1, 0.42 + s * 0.1);
      for (let j = 0; j < PER; j++) {
        const k = j / (PER - 1), x = -3.1 + 6.2 * k + 0.12 * Math.sin(k * 7 + ph);
        const y = y0 - sag * (1 - (2 * k - 1) * (2 * k - 1)) + 0.14 * Math.sin(k * 9 + ph * 2);
        const z = silkH(x, y, T) + 0.05 + drop * (2.2 + 0.6 * Math.sin(k * 5 + ph)) + 0.03 * Math.sin(k * 30) * drop;
        const gold = j % 8 === 4;
        dm.position.set(x, y, z); dm.rotation.set(0, 0, k * 4); dm.scale.setScalar(gold ? 0 : 1); dm.updateMatrix(); beads.setMatrixAt(s * PER + j, dm.matrix);
        dm.scale.setScalar(gold ? 1.25 : 0); dm.updateMatrix(); spacers.setMatrixAt(s * PER + j, dm.matrix);
      }
    }
    beads.instanceMatrix.needsUpdate = true; spacers.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < GD; i++) {
      gdPos[i * 3 + 1] += (0.0016 + 0.001 * Math.sin(gdSeed[i])) * motion;
      if (gdPos[i * 3 + 1] > 2.2) gdPos[i * 3 + 1] = -0.6;
      gdPos[i * 3] += Math.sin(t * 0.4 + gdSeed[i]) * 0.0012 * motion;
    }
    gdGeo.attributes.position.needsUpdate = true;
    goldDust.material.opacity = 0.35 + 0.65 * seg(u, 0.1, 0.4);
    // A low warm key, a rose rim, and a gold light that sweeps across the silk like a stage light.
    xKey.color.set(0xffe2c0); xKey.intensity = 1.25; xKey.position.set(2.5, 6, 4);
    xRim.color.set(0xff8fa6); xRim.intensity = 1.1;
    xGlow.color.set(0xffc98a); xGlow.intensity = 8; xGlow.distance = 7;
    xGlow.position.set(lerp(-4.5, 4.5, u) + Math.sin(t * 0.3) * 0.4 * motion, 1.2, lerp(1.2, -0.6, u));
  }
  const keysC = [
    [0.00, [-3.0, 0.15, 3.0], [-1.2, -0.35, 0.9], 30],
    [0.30, [-1.1, 0.45, 2.6], [0.4, -0.1, 0.3], 26],
    [0.60, [1.6, 1.1, 3.0], [0.6, -0.05, -0.2], 18],
    [1.00, [0.2, 3.6, 6.2], [0, 0.1, -0.5], 9]
  ];

  /* ---------- Set D, "The send-off": a night lagoon, the skyline, lanterns, fireworks, and the names in the stars ---------- */
  const setD = new THREE.Group(); setD.visible = false; scene.add(setD);
  const nightBg = new THREE.Color(0x020104);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: "varying vec3 vD; void main() { vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: /* glsl */`
      varying vec3 vD;
      void main() {
        float y = vD.y;
        vec3 top = vec3(0.004, 0.002, 0.012), mid = vec3(0.03, 0.006, 0.02), hor = vec3(0.32, 0.07, 0.07);
        vec3 c = mix(mid, top, smoothstep(0.05, 0.6, y));
        c = mix(hor, c, smoothstep(-0.01, 0.16, y));
        c += vec3(0.5, 0.18, 0.08) * exp(-abs(y) * 22.0) * 0.6;
        if (y < 0.0) c = vec3(0.01, 0.004, 0.006);
        gl_FragColor = vec4(c, 1.0);
      }`
  }));
  sky.renderOrder = -1; setD.add(sky);
  // Water: dark, with moving ripples so the moon and every light leave a trail.
  const WN = 256, wh = new Float32Array(WN * WN);
  for (let y = 0; y < WN; y++) for (let x = 0; x < WN; x++) {
    const u = x / WN * Math.PI * 2, v = y / WN * Math.PI * 2;
    wh[y * WN + x] = Math.sin(u * 3 + v * 2) * 0.5 + Math.sin(u * 7 - v * 5) * 0.25 + Math.sin(u * 13 + v * 11) * 0.12 + Math.sin(u * 2 - v * 9) * 0.2;
  }
  const waterNormal = heightToNormal(wh, WN, WN, 3.2, [70, 70]);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), new THREE.MeshPhysicalMaterial({ color: 0x030103, roughness: 0.05, metalness: 0, normalMap: waterNormal, normalScale: new THREE.Vector2(1.1, 1.1) }));
  water.rotation.x = -Math.PI / 2; setD.add(water);
  // The moon, low over the lagoon.
  const moonPos = new THREE.Vector3(-150, 70, -420);
  const moon = new THREE.Mesh(new THREE.CircleGeometry(9, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 4.4, 3.6), fog: false }));
  moon.position.copy(moonPos); moon.lookAt(0, 2, 20); setD.add(moon);
  const moonHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(0.9, 0.6, 0.45), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false }));
  moonHalo.position.copy(moonPos); moonHalo.scale.setScalar(110); setD.add(moonHalo);
  // Lagos at night: towers with lit windows, and a cable-stayed bridge strung with lights.
  const winTex = canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = "#000"; g.fillRect(0, 0, w, h);
    for (let y = 8; y < h; y += 16) for (let x = 6; x < w; x += 14) {
      if (rand() < 0.42) continue;
      const k = rand(); g.fillStyle = k < 0.7 ? `rgba(255,${190 + Math.floor(rand() * 40)},${120 + Math.floor(rand() * 50)},${0.5 + rand() * 0.5})` : `rgba(255,240,220,${0.6 + rand() * 0.4})`;
      g.fillRect(x, y, 7, 9);
    }
  });
  const NTW = mobile ? 46 : 80;
  const towerMat = new THREE.MeshStandardMaterial({ color: 0x050306, roughness: 0.9, emissive: 0xffffff, emissiveMap: winTex, emissiveIntensity: 1.6 });
  const towers = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), towerMat, NTW);
  const towerRefl = new THREE.InstancedMesh(towers.geometry, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.22, 0.13, 0.08), map: winTex, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }), NTW);
  for (let i = 0; i < NTW; i++) {
    const x = -420 + 840 * (i + rand() * 0.8) / NTW, hgt = 6 + Math.pow(rand(), 2.2) * (Math.abs(x) < 140 ? 46 : 24), w = 7 + rand() * 12;
    dm.position.set(x, 0, -380 - rand() * 60); dm.rotation.set(0, rand() * 0.3, 0); dm.scale.set(w, hgt, w * (0.6 + rand() * 0.5)); dm.updateMatrix(); towers.setMatrixAt(i, dm.matrix);
    dm.scale.y = -hgt * 0.85; dm.updateMatrix(); towerRefl.setMatrixAt(i, dm.matrix);
  }
  setD.add(towers, towerRefl);
  const bridge = new THREE.Group(); setD.add(bridge);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(260, 0.8, 3), new THREE.MeshStandardMaterial({ color: 0x0a0608, roughness: 0.8 }));
  deck.position.set(60, 5, -230); bridge.add(deck);
  const pylonX = 40, pylonH = 48;
  const pylon = new THREE.Mesh(new THREE.BoxGeometry(1.6, pylonH, 1.6).translate(0, pylonH / 2, 0), new THREE.MeshStandardMaterial({ color: 0x0b0709, emissive: 0xffc890, emissiveIntensity: 0.06 }));
  pylon.position.set(pylonX, 0, -230); bridge.add(pylon);
  const cablePts = [];
  for (let k = 1; k <= 14; k++) for (const sgn of [-1, 1]) cablePts.push(pylonX, pylonH - k * 0.9, -230, pylonX + sgn * k * 7, 5.4, -230);
  const cableGeo = new THREE.BufferGeometry(); cableGeo.setAttribute("position", new THREE.Float32BufferAttribute(cablePts, 3));
  const cableMat = new THREE.LineBasicMaterial({ color: new THREE.Color(1.3, 0.55, 0.45), transparent: true, opacity: 0.45 });
  bridge.add(new THREE.LineSegments(cableGeo, cableMat));
  const deckLights = new THREE.BufferGeometry(), dlp = [];
  for (let k = 0; k < 90; k++) dlp.push(-70 + k * 2.9, 5.6, -228.4);
  deckLights.setAttribute("position", new THREE.Float32BufferAttribute(dlp, 3));
  const deckDots = new THREE.Points(deckLights, new THREE.PointsMaterial({ size: 1.6, map: dotTex, color: new THREE.Color(3, 2.1, 1.2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  bridge.add(deckDots);
  const deckDotsRefl = new THREE.Points(deckLights, new THREE.PointsMaterial({ size: 2.2, map: dotTex, color: new THREE.Color(0.9, 0.55, 0.3), transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
  deckDotsRefl.scale.y = -1; bridge.add(deckDotsRefl);
  // Paper lanterns: they float on the water first, then lift away one by one as the reader scrolls.
  const NL = mobile ? 44 : 90;
  const lanternGeo = new THREE.LatheGeometry([[0.2, 0], [0.25, 0.14], [0.27, 0.34], [0.24, 0.52], [0.13, 0.6]].map(([r, y]) => new THREE.Vector2(r, y)), 18);
  const lanternMat = new THREE.MeshStandardMaterial({ color: 0x2a0e06, emissive: 0xff8a3c, emissiveIntensity: 2.6, side: THREE.DoubleSide, roughness: 1 });
  const lanterns = new THREE.InstancedMesh(lanternGeo, lanternMat, NL); lanterns.frustumCulled = false; setD.add(lanterns);
  const lanternData = Array.from({ length: NL }, (_, i) => ({ x: (rand() - 0.5) * 70, z: -8 - rand() * 90, rel: 0.04 + 0.55 * (i / NL) + rand() * 0.05, sp: 0.8 + rand() * 0.5, ph: rand() * 6.28, dx: (rand() - 0.3) * 0.6, s: 0.9 + rand() * 0.6 }));
  const lgGeo = new THREE.BufferGeometry(), lgPos = new Float32Array(NL * 3);
  lgGeo.setAttribute("position", new THREE.BufferAttribute(lgPos, 3));
  const lgMat = new THREE.PointsMaterial({ size: 3.2, map: glowTex, color: new THREE.Color(1.4, 0.62, 0.22), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const lanternGlow = new THREE.Points(lgGeo, lgMat), lanternGlowRefl = new THREE.Points(lgGeo, new THREE.PointsMaterial({ size: 4.4, map: glowTex, color: new THREE.Color(0.7, 0.3, 0.1), transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
  lanternGlowRefl.scale.y = -1; lanternGlow.frustumCulled = lanternGlowRefl.frustumCulled = false;
  setD.add(lanternGlow, lanternGlowRefl);
  // Fireworks in gold, red and white, reflected in the lagoon.
  const FB = mobile ? 6 : 10, FP = mobile ? 150 : 240;
  const fwGeo = new THREE.BufferGeometry(), fwPos = new Float32Array(FB * FP * 3), fwCol = new Float32Array(FB * FP * 3), fwDir = new Float32Array(FB * FP * 3);
  for (let i = 0; i < FB * FP; i++) {
    const z = rand() * 2 - 1, a = rand() * Math.PI * 2, r = Math.sqrt(1 - z * z), sp = 0.75 + rand() * 0.35;
    fwDir[i * 3] = r * Math.cos(a) * sp; fwDir[i * 3 + 1] = z * sp; fwDir[i * 3 + 2] = r * Math.sin(a) * sp;
    fwPos[i * 3 + 1] = -999;
  }
  fwGeo.setAttribute("position", new THREE.BufferAttribute(fwPos, 3)); fwGeo.setAttribute("color", new THREE.BufferAttribute(fwCol, 3));
  const fwMat = new THREE.PointsMaterial({ size: 1.5, map: dotTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const fireworks = new THREE.Points(fwGeo, fwMat), fireworksRefl = new THREE.Points(fwGeo, new THREE.PointsMaterial({ size: 2.2, map: dotTex, vertexColors: true, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending }));
  fireworksRefl.scale.y = -1; fireworks.frustumCulled = fireworksRefl.frustumCulled = false;
  setD.add(fireworks, fireworksRefl);
  const FW_COLS = [[3.2, 2.2, 0.9], [3.4, 0.5, 0.45], [3, 2.8, 2.6], [3.4, 1.3, 0.5]];
  const bursts = Array.from({ length: FB }, () => ({ t0: -99, c: new THREE.Vector3(), col: FW_COLS[0], size: 14 }));
  let nextBurst = 0, burstI = 0;
  function fire(t) {
    const b = bursts[burstI++ % FB];
    b.t0 = t; b.c.set((rand() - 0.5) * 150, 45 + rand() * 40, -150 - rand() * 60); b.col = FW_COLS[Math.floor(rand() * FW_COLS.length)]; b.size = 16 + rand() * 12;
  }
  // The stars, which gather into the couple's names.
  const NSx = mobile ? 1100 : 2000;
  const sGeo = new THREE.BufferGeometry(), sStart = new Float32Array(NSx * 3), sTarget = new Float32Array(NSx * 3), sPhase = new Float32Array(NSx), sDelay = new Float32Array(NSx);
  for (let i = 0; i < NSx; i++) {
    const a = rand() * Math.PI * 2, el = 0.08 + Math.pow(rand(), 0.7) * 1.4, R = 480;
    sStart[i * 3] = Math.cos(a) * Math.cos(el) * R; sStart[i * 3 + 1] = Math.sin(el) * R; sStart[i * 3 + 2] = Math.sin(a) * Math.cos(el) * R;
    sTarget.set(sStart.subarray(i * 3, i * 3 + 3), i * 3); sPhase[i] = rand() * 6.28; sDelay[i] = rand() * 0.35;
  }
  async function writeNames() {
    try { await Promise.all([document.fonts.load('150px "Pinyon Script"'), document.fonts.load('40px "Bodoni Moda"')]); } catch (e) { /* system fallback */ }
    const c = document.createElement("canvas"); c.width = 1200; c.height = 420;
    const g = c.getContext("2d"); g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = '150px "Pinyon Script", cursive'; g.fillText("Chidinma & Tunde", 600, 170);
    g.font = '400 52px "Bodoni Moda", Georgia, serif'; g.fillText("12 · 12 · 2026", 600, 345);
    const d = g.getImageData(0, 0, 1200, 420).data, pts = [];
    for (let y = 0; y < 420; y += 3) for (let x = 0; x < 1200; x += 3) if (d[(y * 1200 + x) * 4 + 3] > 140) pts.push([x, y]);
    for (let i = pts.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [pts[i], pts[j]] = [pts[j], pts[i]]; }
    const M = Math.min(pts.length, Math.floor(NSx * 0.62)), W = 120, ctr = new THREE.Vector3(0, 78, -190);
    for (let i = 0; i < M; i++) {
      sTarget[i * 3] = ctr.x + (pts[i][0] / 1200 - 0.5) * W; sTarget[i * 3 + 1] = ctr.y - (pts[i][1] / 420 - 0.5) * W * 0.35; sTarget[i * 3 + 2] = ctr.z + (rand() - 0.5) * 2;
    }
    sGeo.attributes.aTarget.needsUpdate = true;
  }
  sGeo.setAttribute("position", new THREE.BufferAttribute(sStart, 3));
  sGeo.setAttribute("aTarget", new THREE.BufferAttribute(sTarget, 3));
  sGeo.setAttribute("aPhase", new THREE.BufferAttribute(sPhase, 1));
  sGeo.setAttribute("aDelay", new THREE.BufferAttribute(sDelay, 1));
  writeNames();
  const starMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { k: { value: 0 }, time: { value: 0 }, map: { value: dotTex }, scale: { value: 1 } },
    vertexShader: /* glsl */`
      attribute vec3 aTarget; attribute float aPhase, aDelay; uniform float k, time, scale; varying float vA; varying float vGold;
      void main() {
        float m = smoothstep(aDelay, aDelay + 0.65, k);
        float moving = distance(position, aTarget) > 1.0 ? 1.0 : 0.0;
        vec3 p = mix(position, aTarget, m * moving);
        p.y += sin(m * 3.14159) * 30.0 * moving;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float tw = 0.65 + 0.35 * sin(time * (1.3 + fract(aPhase) * 2.0) + aPhase * 7.0);
        vA = tw; vGold = m * moving;
        gl_PointSize = (2.2 + 2.6 * vGold) * scale * (1.0 + 0.35 * tw);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D map; varying float vA; varying float vGold;
      void main() {
        float a = texture2D(map, gl_PointCoord).a;
        vec3 c = mix(vec3(1.6, 1.5, 1.7), vec3(3.4, 2.4, 1.1), vGold);
        gl_FragColor = vec4(c * vA * a, a);
      }`
  });
  const stars = new THREE.Points(sGeo, starMat); stars.frustumCulled = false; setD.add(stars);
  function updateD(v, t) {
    const T = t * motion;
    waterNormal.offset.set(T * 0.006, T * 0.011);
    // Lanterns float, then rise and drift with the land breeze.
    for (let i = 0; i < NL; i++) {
      const L = lanternData[i], up = Math.max(0, v - L.rel) * 95 * L.sp, bob = Math.sin(T * 1.3 + L.ph) * 0.06;
      const x = L.x + up * L.dx * 0.3 + Math.sin(T * 0.3 + L.ph) * 0.4 * Math.min(1, up), y = 0.08 + up + bob, z = L.z - up * 0.35;
      dm.position.set(x, y, z); dm.rotation.set(Math.sin(T * 0.7 + L.ph) * 0.06, L.ph, Math.cos(T * 0.6 + L.ph) * 0.06); dm.scale.setScalar(L.s); dm.updateMatrix();
      lanterns.setMatrixAt(i, dm.matrix);
      lgPos[i * 3] = x; lgPos[i * 3 + 1] = y + 0.3 * L.s; lgPos[i * 3 + 2] = z;
    }
    lanterns.instanceMatrix.needsUpdate = true; lgGeo.attributes.position.needsUpdate = true;
    const flick = motion ? 0.9 + 0.1 * Math.sin(t * 11) : 1;
    lanternMat.emissiveIntensity = 2.6 * flick;
    // Fireworks: a volley while the lanterns rise.
    if (motion && v > 0.24 && v < 0.94 && t > nextBurst) { fire(t); nextBurst = t + 0.55 + rand() * 0.9; }
    if (!motion && bursts[0].t0 < 0 && v > 0.3) { for (let i = 0; i < 4; i++) { fire(t); bursts[i].t0 = t - 0.6 - i * 0.2; } }
    let flashI = 0;
    for (let b = 0; b < FB; b++) {
      const B = bursts[b], age = motion ? t - B.t0 : 0.9;
      const live = age >= 0 && age < 3.2;
      const out = 1 - Math.exp(-2.4 * age), fade = live ? Math.pow(Math.max(0, 1 - age / 3.0), 1.6) : 0;
      if (live && age < 0.25) flashI = Math.max(flashI, 1 - age / 0.25);
      for (let j = 0; j < FP; j++) {
        const i = (b * FP + j) * 3;
        if (!live) { fwPos[i + 1] = -999; continue; }
        fwPos[i] = B.c.x + fwDir[i] * B.size * out; fwPos[i + 1] = B.c.y + fwDir[i + 1] * B.size * out - 3.2 * age * age; fwPos[i + 2] = B.c.z + fwDir[i + 2] * B.size * out;
        const tw = j % 3 === 0 && age > 1.2 ? (Math.sin(t * 40 + j) > 0 ? 1 : 0.2) : 1;
        fwCol[i] = B.col[0] * fade * tw; fwCol[i + 1] = B.col[1] * fade * tw; fwCol[i + 2] = B.col[2] * fade * tw;
      }
      if (live && age < 0.3) xGlow.position.copy(B.c);
    }
    fwGeo.attributes.position.needsUpdate = true; fwGeo.attributes.color.needsUpdate = true;
    // The names: the stars gather in the last part of the chapter.
    starMat.uniforms.k.value = seg(v, 0.6, 0.95);
    starMat.uniforms.time.value = t;
    starMat.uniforms.scale.value = renderer.getPixelRatio() * (OP.vh() / 900);
    xKey.color.set(0xffd8b0); xKey.intensity = 0.55; xKey.position.copy(moonPos).normalize().multiplyScalar(10);
    xRim.color.set(0xff6a5a); xRim.intensity = 0.25;
    xGlow.color.set(0xffd09a); xGlow.distance = 400; xGlow.intensity = 3000 * flashI;
  }
  const keysD = [
    [0.00, [0, 1.4, 24], [0, 2.4, -40], 18],
    [0.35, [0, 2.0, 18], [0, 14, -70], 12],
    [0.62, [0, 2.6, 14], [0, 34, -120], 7],
    [1.00, [0, 3.0, 12], [0, 50, -190], 3]
  ];
  [keysC, keysD].forEach((ks) => ks.forEach((k) => { k[1] = new THREE.Vector3(...k[1]); k[2] = new THREE.Vector3(...k[2]); }));
  function camNew(ks, u) {
    let i = 0;
    while (i < ks.length - 2 && u > ks[i + 1][0]) i++;
    const A = ks[i], B = ks[i + 1], P0 = ks[Math.max(0, i - 1)], P3 = ks[Math.min(ks.length - 1, i + 2)];
    const tt = clamp((u - A[0]) / (B[0] - A[0]), 0, 1), te = lerp(tt, smooth(tt), 0.5);
    catmull(P0[1], A[1], B[1], P3[1], te, camPos);
    catmull(P0[2], A[2], B[2], P3[2], te, camLook);
    camAperture = lerp(A[3], B[3], smooth(tt));
  }

  /* ---------- Newer chapters: Mama's room in Benin (E), Tunde's room in Lagos (F), and the place kept at Table 1 ---------- */
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const mamaSeat = guestSeat[MAMA_SEAT], t1x = tables[TABLE1][0], t1z = tables[TABLE1][1];
  /* ---------- Shared objects: the ones that carry the story from scene to scene ---------- */
  // The childhood photograph: a boy seen from behind in his gold-trimmed outfit, in a doorway. No faces anywhere.
  const photoTex = canvasTex(512, 640, (g, w, h) => {
    g.fillStyle = "#f2ead8"; g.fillRect(0, 0, w, h);
    const ix = 34, iy = 34, iw = w - 68, ih = h - 150;
    const gr = g.createLinearGradient(0, iy, 0, iy + ih); gr.addColorStop(0, "#8a6a48"); gr.addColorStop(0.6, "#5e4630"); gr.addColorStop(1, "#3e2d1e");
    g.fillStyle = gr; g.fillRect(ix, iy, iw, ih);
    g.fillStyle = "rgba(255,230,180,.55)"; g.fillRect(ix + iw * 0.3, iy + ih * 0.08, iw * 0.4, ih * 0.78); // a bright doorway
    g.fillStyle = "#2a1c12"; // the boy, from behind
    g.beginPath(); g.ellipse(ix + iw * 0.5, iy + ih * 0.47, iw * 0.07, iw * 0.08, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(ix + iw * 0.4, iy + ih * 0.84); g.lineTo(ix + iw * 0.43, iy + ih * 0.56); g.quadraticCurveTo(ix + iw * 0.5, iy + ih * 0.52, ix + iw * 0.57, iy + ih * 0.56); g.lineTo(ix + iw * 0.6, iy + ih * 0.84); g.fill();
    g.fillStyle = "#e7dcc4"; g.fillRect(ix + iw * 0.43, iy + ih * 0.58, iw * 0.14, ih * 0.24); // the cream outfit
    g.fillStyle = "#c9a256"; g.fillRect(ix + iw * 0.43, iy + ih * 0.8, iw * 0.14, 6); g.fillRect(ix + iw * 0.495, iy + ih * 0.58, 4, ih * 0.22); // its gold trim
    const v = g.createRadialGradient(ix + iw / 2, iy + ih / 2, iw * 0.2, ix + iw / 2, iy + ih / 2, iw * 0.8); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(30,15,5,.55)");
    g.fillStyle = v; g.fillRect(ix, iy, iw, ih);
    g.fillStyle = "#6b5236"; g.font = 'italic 34px "Pinyon Script", cursive'; g.textAlign = "center"; g.fillText("Tunde, 2006", w / 2, h - 52);
  });
  const photoMat = new THREE.MeshStandardMaterial({ map: photoTex, roughness: 0.55 });
  const makePhoto = (s) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.1 * s, 0.125 * s, 0.0012 * s), photoMat); m.castShadow = true; return m; };
  // Stationery: heavy cotton paper, gold foil, letterpress ink. Each card is drawn twice from one layout: once in colour,
  // once as a roughness (green) and metalness (blue) map, so the foil catches the light and the paper does not.
  function paperPair(w, h, draw) {
    const mk = (rm) => canvasTex(w, h, (g) => {
      const C = rm ? { paper: "rgb(0,215,0)", foil: "rgb(0,60,255)", ink: "rgb(0,160,0)", wine: "rgb(0,160,0)", muted: "rgb(0,180,0)", rm: true }
        : { paper: "#f7f1e5", foil: "#d4ab62", ink: "#2b1b13", wine: "#6e1426", muted: "#8b7660", rm: false };
      g.fillStyle = C.paper; g.fillRect(0, 0, w, h);
      if (!rm) { // cotton fibres and a faint mottle
        for (let i = 0; i < w * h / 260; i++) { g.strokeStyle = `rgba(${120 + rand() * 40},${100 + rand() * 30},${70 + rand() * 20},${0.04 + rand() * 0.05})`; g.lineWidth = 0.6 + rand() * 0.8; const x = rand() * w, y = rand() * h, a = rand() * 6.28, l = 3 + rand() * 9; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
        const v = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.75); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(120,90,50,.08)"); g.fillStyle = v; g.fillRect(0, 0, w, h);
      }
      draw(g, w, h, C);
    }, { srgb: !rm });
    return { map: mk(false), rm: mk(true) };
  }
  // Letterpress: the ink sits in a shallow bite, so it gets a hair of shadow above and light below.
  function press(g, C, text, x, y) {
    if (!C.rm) { g.save(); g.fillStyle = "rgba(60,40,20,.28)"; g.fillText(text, x, y - 1.2); g.fillStyle = "rgba(255,255,255,.5)"; g.fillText(text, x, y + 1.2); g.restore(); }
    g.fillText(text, x, y);
  }
  function foilFrame(g, w, h, C, inset) {
    g.strokeStyle = C.foil; g.lineWidth = 5; g.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
    g.lineWidth = 1.6; g.strokeRect(inset + 13, inset + 13, w - (inset + 13) * 2, h - (inset + 13) * 2);
    g.fillStyle = C.foil;
    [[inset + 13, inset + 13], [w - inset - 13, inset + 13], [inset + 13, h - inset - 13], [w - inset - 13, h - inset - 13]].forEach(([x, y]) => {
      g.save(); g.translate(x, y); g.rotate(Math.PI / 4); g.fillRect(-7, -7, 14, 14); g.restore();
      g.beginPath(); g.arc(x + (x < w / 2 ? 22 : -22), y + (y < h / 2 ? 22 : -22), 3.5, 0, Math.PI * 2); g.fill();
    });
  }
  function foilRule(g, C, cx, y, half) {
    g.fillStyle = C.foil; g.fillRect(cx - half, y - 0.8, half - 16, 1.6); g.fillRect(cx + 16, y - 0.8, half - 16, 1.6);
    g.save(); g.translate(cx, y); g.rotate(Math.PI / 4); g.fillRect(-6, -6, 12, 12); g.restore();
    g.beginPath(); g.arc(cx - half - 6, y, 3, 0, Math.PI * 2); g.arc(cx + half + 6, y, 3, 0, Math.PI * 2); g.fill();
  }
  function crest(g, C, cx, cy, r) {
    g.strokeStyle = C.foil; g.lineWidth = 2.4; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, r - 6, 0, Math.PI * 2); g.stroke();
    // A laurel of small leaves around the lower half of the ring.
    g.fillStyle = C.foil;
    for (let k = 0; k < 9; k++) { [-1, 1].forEach((sd) => { const a = Math.PI / 2 + sd * (0.35 + k * 0.17); g.save(); g.translate(cx + Math.cos(a) * (r + 9), cy + Math.sin(a) * (r + 9)); g.rotate(a + sd * 0.9); g.beginPath(); g.ellipse(0, 0, 6.5, 2.6, 0, 0, Math.PI * 2); g.fill(); g.restore(); }); }
    g.textAlign = "center"; g.textBaseline = "middle"; g.font = `italic 400 ${r * 0.82}px "Bodoni Moda", Georgia, serif`; g.fillText("C&T", cx, cy + 2);
  }
  // The place card: a heavy folded card with gilded edges. Crest, table, her name in script, and the couple's date.
  function cardTex(top, name, sub, foot) {
    return paperPair(1024, 606, (g, w, h, C) => {
      foilFrame(g, w, h, C, 26);
      crest(g, C, w / 2, 104, 36);
      g.textAlign = "center"; g.textBaseline = "alphabetic";
      g.fillStyle = C.foil; g.font = '600 25px "Figtree", Arial'; g.letterSpacing = "9px"; g.fillText(top, w / 2 + 4, 194); g.letterSpacing = "0px";
      g.fillStyle = C.ink; g.font = '128px "Pinyon Script", cursive'; press(g, C, name, w / 2, 330);
      foilRule(g, C, w / 2, 378, 150);
      g.fillStyle = C.wine; g.font = 'italic 400 38px "Bodoni Moda", Georgia, serif'; press(g, C, sub, w / 2, 444);
      g.fillStyle = C.muted; g.font = '500 19px "Figtree", Arial'; g.letterSpacing = "6px"; g.fillText(foot || "CHIDINMA & TUNDE · 12 · 12 · 2026", w / 2 + 3, 520); g.letterSpacing = "0px";
    });
  }
  function makeTent(card, s) {
    const grp = new THREE.Group();
    const face = new THREE.MeshPhysicalMaterial({ map: card.map, roughnessMap: card.rm, metalnessMap: card.rm, roughness: 1, metalness: 1, sheen: 0.25, sheenColor: 0xffffff, sheenRoughness: 0.6 });
    const back = new THREE.MeshStandardMaterial({ color: 0xf4ede0, roughness: 0.85 });
    const gilt = new THREE.MeshStandardMaterial({ color: 0xdcb56c, metalness: 1, roughness: 0.28 });
    const W = 0.11 * s, Hh = 0.065 * s, T = 0.0008 * s, mats = [gilt, gilt, gilt, gilt, face, back], matsB = [gilt, gilt, gilt, gilt, back, back];
    const f = new THREE.Mesh(new THREE.BoxGeometry(W, Hh, T), mats); f.position.set(0, Hh * 0.47, Hh * 0.17); f.rotation.x = -0.36; grp.add(f);
    const b = new THREE.Mesh(new THREE.BoxGeometry(W, Hh, T), matsB); b.position.set(0, Hh * 0.47, -Hh * 0.17); b.rotation.x = 0.36; grp.add(b);
    grp.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    return grp;
  }
  const mamaCardTex = cardTex("TABLE ONE", "Mama Ijeoma", "Mother of the groom");
  // The travel bag: soft leather, two handles, a front pocket.
  function makeBag(s) {
    const grp = new THREE.Group();
    const leather = new THREE.MeshPhysicalMaterial({ color: 0x5b3320, roughness: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.5, sheen: 0.3, sheenColor: 0xffd2b0 });
    const body = new THREE.Mesh(new RoundedBoxGeometry(0.46 * s, 0.28 * s, 0.22 * s, 4, 0.06 * s), leather); body.position.y = 0.14 * s; grp.add(body);
    const pocket = new THREE.Mesh(new RoundedBoxGeometry(0.3 * s, 0.14 * s, 0.03 * s, 3, 0.012 * s), leather); pocket.position.set(0, 0.12 * s, 0.115 * s); grp.add(pocket);
    const strap = new THREE.MeshStandardMaterial({ color: 0x3a2014, roughness: 0.6 });
    [-1, 1].forEach((k) => { const h = new THREE.Mesh(new THREE.TorusGeometry(0.075 * s, 0.009 * s, 8, 24, Math.PI), strap); h.position.set(k * 0.09 * s, 0.28 * s, 0); grp.add(h); });
    const zip = new THREE.Mesh(new THREE.BoxGeometry(0.4 * s, 0.006 * s, 0.01 * s), brass); zip.position.set(0, 0.281 * s, 0); grp.add(zip);
    grp.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    return grp;
  }
  // A wooden dining chair.
  const chairWood = new THREE.MeshPhysicalMaterial({ color: 0x4a2c1a, roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.3 });
  function makeChair() {
    const parts = [];
    const add = (g, x, y, z) => { g.translate(x, y, z); parts.push(g); };
    add(new THREE.BoxGeometry(0.44, 0.035, 0.42), 0, 0.46, 0);
    [[-0.19, -0.18], [0.19, -0.18], [-0.19, 0.18], [0.19, 0.18]].forEach(([x, z]) => add(new THREE.BoxGeometry(0.035, 0.46, 0.035), x, 0.23, z));
    [[-0.19], [0.19]].forEach(([x]) => add(new THREE.BoxGeometry(0.035, 0.5, 0.035), x, 0.72, 0.19));
    add(new THREE.BoxGeometry(0.42, 0.09, 0.02), 0, 0.92, 0.19); add(new THREE.BoxGeometry(0.42, 0.05, 0.02), 0, 0.72, 0.19);
    const m = new THREE.Mesh(mergeGeometries(parts), chairWood); m.castShadow = m.receiveShadow = true;
    return m;
  }

  /* ---------- Set E: Mama's dining room in Benin City. A lamp, a covered plate, an empty chair, rain on the window ---------- */
  const setE = new THREE.Group(); setE.visible = false; scene.add(setE);
  const roomBg = new THREE.Color(0x070304);
  const TOP = 0.76;
  const terrazzo = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = "#3a302a"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { const r = 1 + rand() * 3.5; g.fillStyle = ["#6d5f52", "#2a221d", "#8a7a68", "#4a3d33", "#a3917c"][Math.floor(rand() * 5)]; g.beginPath(); g.arc(rand() * w, rand() * h, r, 0, Math.PI * 2); g.fill(); }
    g.strokeStyle = "rgba(0,0,0,.4)"; g.lineWidth = 2; g.strokeRect(0, 0, w, h);
  }, { repeat: [6, 6] });
  const eFloor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshStandardMaterial({ map: terrazzo, roughness: 0.35 }));
  eFloor.rotation.x = -Math.PI / 2; eFloor.receiveShadow = true; setE.add(eFloor);
  const plaster = new THREE.MeshStandardMaterial({ color: 0x6a5240, roughness: 0.95 });
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(10, 3.4), plaster); backWall.position.set(0, 1.7, -2.3); backWall.receiveShadow = true; setE.add(backWall);
  const sideWall = new THREE.Mesh(new THREE.PlaneGeometry(10, 3.4), plaster); sideWall.position.set(-2.6, 1.7, 0); sideWall.rotation.y = Math.PI / 2; sideWall.receiveShadow = true; setE.add(sideWall);
  // The window, with rain running down it and the cold blue of a wet night outside.
  const rainCanvas = document.createElement("canvas"); rainCanvas.width = 256; rainCanvas.height = 512;
  {
    const g = rainCanvas.getContext("2d"), gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#1c2a44"); gr.addColorStop(1, "#0b1220");
    g.fillStyle = gr; g.fillRect(0, 0, 256, 512);
    for (let i = 0; i < 260; i++) { const x = rand() * 256, y = rand() * 512, r = 1 + rand() * 3; g.fillStyle = `rgba(170,190,230,${0.15 + rand() * 0.35})`; g.beginPath(); g.ellipse(x, y, r * 0.8, r, 0, 0, Math.PI * 2); g.fill(); if (rand() < 0.3) { g.fillRect(x - 0.6, y, 1.2, 20 + rand() * 60); } }
  }
  const rainTex = new THREE.CanvasTexture(rainCanvas); rainTex.colorSpace = THREE.SRGBColorSpace; rainTex.wrapS = rainTex.wrapT = THREE.RepeatWrapping;
  const windowGlass = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.3), new THREE.MeshBasicMaterial({ map: rainTex, color: new THREE.Color(0.55, 0.62, 0.8) }));
  windowGlass.position.set(-1.1, 1.55, -2.28); setE.add(windowGlass);
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x2a1c14, roughness: 0.7 });
  [[0, 0.68, 1.12, 0.06], [0, -0.68, 1.12, 0.06], [-0.53, 0, 0.06, 1.42], [0.53, 0, 0.06, 1.42], [0, 0, 0.04, 1.3], [0, 0.1, 1.0, 0.04]].forEach(([x, y, w, h]) => {
    const f = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.05), frameMat); f.position.set(-1.1 + x, 1.55 + y, -2.26); setE.add(f);
  });
  // The table, with a crocheted doily under the lamp.
  const eTable = new THREE.Group(); setE.add(eTable);
  const tableTopE = new THREE.Mesh(new RoundedBoxGeometry(1.5, 0.045, 0.9, 3, 0.012), walnut); tableTopE.position.y = TOP - 0.0225; eTable.add(tableTopE);
  [[-0.68, -0.38], [0.68, -0.38], [-0.68, 0.38], [0.68, 0.38]].forEach(([x, z]) => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.05, TOP - 0.045, 0.05), walnut); l.position.set(x, (TOP - 0.045) / 2, z); eTable.add(l); });
  const apron = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.02), walnut); apron.position.set(0, TOP - 0.085, 0.43); eTable.add(apron);
  // The drawer: closed until the evening she opens it.
  const drawer = new THREE.Group(); drawer.position.set(-0.25, TOP - 0.09, 0.4); eTable.add(drawer);
  const drawerFront = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.07, 0.022), walnut); drawerFront.position.z = 0.03; drawer.add(drawerFront);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 8), brass); knob.position.set(0, 0, 0.05); drawer.add(knob);
  const drawerBox = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.05, 0.36), new THREE.MeshStandardMaterial({ color: 0x3a2416, roughness: 0.8, side: THREE.BackSide })); drawerBox.position.set(0, 0, -0.16); drawer.add(drawerBox);
  const doily = new THREE.Mesh(new THREE.CircleGeometry(0.2, 48), new THREE.MeshStandardMaterial({ map: canvasTex(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.strokeStyle = "#9c907b"; g.lineWidth = 3;
    for (let r = 20; r < 126; r += 14) { g.beginPath(); for (let a = 0; a <= 64; a++) { const th = a / 64 * Math.PI * 2, rr = r + Math.sin(th * 16) * 4; g.lineTo(w / 2 + Math.cos(th) * rr, h / 2 + Math.sin(th) * rr); } g.stroke(); }
    for (let a = 0; a < 32; a++) { const th = a / 32 * Math.PI * 2; g.beginPath(); g.moveTo(w / 2, h / 2); g.lineTo(w / 2 + Math.cos(th) * 126, h / 2 + Math.sin(th) * 126); g.stroke(); }
  }), transparent: true, roughness: 0.9 }));
  doily.rotation.x = -Math.PI / 2; doily.position.set(0.42, TOP + 0.001, -0.18); setE.add(doily);
  // The lamp: brass base, fabric shade, warm bulb. It is the only warm light in the room.
  const lamp = new THREE.Group(); lamp.position.set(0.42, TOP, -0.18); setE.add(lamp);
  const lampBase = new THREE.Mesh(mergeGeometries([new THREE.CylinderGeometry(0.07, 0.085, 0.025, 32).translate(0, 0.0125, 0), new THREE.CylinderGeometry(0.012, 0.016, 0.3, 16).translate(0, 0.17, 0)]), brass); lamp.add(lampBase);
  const shadeMat = new THREE.MeshPhysicalMaterial({ color: 0xf1dcb8, roughness: 0.9, side: THREE.DoubleSide, emissive: 0xffb15a, emissiveIntensity: 0.9, transmission: 0 });
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.16, 40, 1, true), shadeMat); shade.position.y = 0.36; lamp.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(9, 6, 3) })); bulb.position.y = 0.33; lamp.add(bulb);
  const lampLight = new THREE.SpotLight(0xffc489, 0, 6, 1.15, 0.85, 1.6);
  lampLight.position.set(0.42, TOP + 0.31, -0.18); lampLight.target.position.set(0.3, 0, 0.1);
  lampLight.castShadow = true; lampLight.shadow.mapSize.set(1024, 1024); lampLight.shadow.bias = -0.0008; lampLight.shadow.radius = 6; lampLight.shadow.blurSamples = 12;
  lampLight.shadow.camera.near = 0.05; lampLight.shadow.camera.far = 6;
  scene.add(lampLight, lampLight.target);
  const lampFill = new THREE.PointLight(0xffb070, 0, 5, 1.8); lampFill.position.set(0.42, TOP + 0.5, -0.18); scene.add(lampFill);
  const windowLight = new THREE.DirectionalLight(0x8aa4ff, 0); windowLight.position.set(-1.1, 1.7, -2.6); windowLight.target.position.set(0, 0.6, 0.4); scene.add(windowLight, windowLight.target);
  // The ceiling fan, turning slowly.
  const fan = new THREE.Group(); fan.position.set(0, 3.0, 0); setE.add(fan);
  fan.add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.08, 20), frameMat));
  for (let k = 0; k < 3; k++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.008, 0.11), frameMat); bl.position.x = 0.36; const arm = new THREE.Group(); arm.rotation.y = k * Math.PI * 2 / 3; arm.add(bl); fan.add(arm); }
  // Enamel plate under an enamel cover, white with a blue rim.
  const enamelMap = canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#f4f1ea"; g.fillRect(0, 0, w, h); g.strokeStyle = "#24407a"; g.lineWidth = 10; g.beginPath(); g.arc(w / 2, h / 2, 118, 0, Math.PI * 2); g.stroke(); });
  const enamel = new THREE.MeshPhysicalMaterial({ map: enamelMap, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08 });
  const plateE = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.02, 48), enamel); plateE.position.set(-0.32, TOP + 0.01, 0.08); setE.add(plateE);
  const coverBand = canvasTex(256, 64, (g, w, h) => { g.fillStyle = "#f4f1ea"; g.fillRect(0, 0, w, h); g.fillStyle = "#24407a"; g.fillRect(0, h - 10, w, 10); });
  const cover = new THREE.Mesh(new THREE.SphereGeometry(0.135, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ map: coverBand, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08 }));
  cover.scale.y = 0.62; cover.position.set(-0.32, TOP + 0.016, 0.08); setE.add(cover);
  const coverKnob = new THREE.Mesh(new THREE.SphereGeometry(0.016, 16, 10), new THREE.MeshPhysicalMaterial({ color: 0x24407a, roughness: 0.2, clearcoat: 1 })); coverKnob.position.set(-0.32, TOP + 0.1, 0.08); setE.add(coverKnob);
  // Chairs: hers by the lamp, and the empty one at the covered plate.
  const mamaChairE = makeChair(); mamaChairE.position.set(0.42, 0, 0.66); mamaChairE.rotation.y = Math.PI; setE.add(mamaChairE);
  const boyChair = makeChair(); setE.add(boyChair);
  const BOY_CHAIR = { away: [-0.32, 0.62, Math.PI], close: [0.0, 0.7, Math.PI - 0.35] };
  // The paper football he brings in from the rain.
  const ballGeo = new THREE.IcosahedronGeometry(0.06, 3);
  { const pa = ballGeo.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i); v.multiplyScalar(1 + (Math.sin(v.x * 140) * Math.cos(v.y * 120) + Math.sin(v.z * 170)) * 0.08); pa.setXYZ(i, v.x, v.y, v.z); } ballGeo.computeVertexNormals(); }
  const paperBall = new THREE.Mesh(ballGeo, new THREE.MeshStandardMaterial({ color: 0xcfc7b6, roughness: 0.75 })); paperBall.castShadow = true; setE.add(paperBall);
  // The sewing: the boy's cream outfit with its loose gold trim, a needle, the gold thread, the spool.
  const creamCloth = new THREE.MeshPhysicalMaterial({ color: 0xe9dfc9, roughness: 0.7, sheen: 1, sheenRoughness: 0.4, sheenColor: 0xfff4dc, side: THREE.DoubleSide });
  const sewGeo = new THREE.PlaneGeometry(0.5, 0.34, 60, 40);
  { const pa = sewGeo.attributes.position; for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), y = pa.getY(i); pa.setZ(i, 0.012 * Math.sin(x * 22 + y * 6) + 0.008 * Math.sin(y * 31) + 0.02 * Math.max(0, x - 0.12) * 4); } sewGeo.computeVertexNormals(); }
  const sewing = new THREE.Group(); sewing.position.set(0.18, TOP + 0.004, 0.16); sewing.rotation.y = 0.25; setE.add(sewing);
  const cloth = new THREE.Mesh(sewGeo, creamCloth); cloth.rotation.x = -Math.PI / 2; cloth.receiveShadow = true; cloth.castShadow = true; sewing.add(cloth);
  const goldThreadMat = new THREE.MeshPhysicalMaterial({ color: 0xe6bd6c, metalness: 1, roughness: 0.28, emissive: 0x3a2508 });
  const trimGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V3(-0.24, 0.006, 0.15), V3(-0.08, 0.006, 0.152), V3(0.04, 0.008, 0.15), V3(0.12, 0.02, 0.16), V3(0.2, 0.035, 0.19), V3(0.26, 0.02, 0.21)]), 60, 0.006, 6);
  trimGeo.scale(1, 1, 1); const trim = new THREE.Mesh(trimGeo, goldThreadMat); trim.castShadow = true; sewing.add(trim);
  const needle = new THREE.Mesh(new THREE.CylinderGeometry(0.0007, 0.0012, 0.05, 8), new THREE.MeshPhysicalMaterial({ color: 0xdedede, metalness: 1, roughness: 0.12 }));
  needle.position.set(0.04, 0.018, 0.13); needle.rotation.set(0.9, 0, 1.1); sewing.add(needle);
  const threadCurveE = new THREE.CatmullRomCurve3([V3(0.055, 0.03, 0.12), V3(0.1, 0.05, 0.08), V3(0.16, 0.04, 0.02), V3(0.22, 0.012, -0.03), V3(0.3, 0.004, -0.06), V3(0.36, 0.006, -0.12)]);
  const threadE = new THREE.Mesh(new THREE.TubeGeometry(threadCurveE, 120, 0.0011, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.7, 0.7) })); sewing.add(threadE);
  const spool = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.04, 24), goldThreadMat); spool.position.set(0.37, 0.016, -0.13); spool.rotation.z = Math.PI / 2; sewing.add(spool);
  // The phone: dark glass, and a screen we can change.
  const phoneCanvas = document.createElement("canvas"); phoneCanvas.width = 810; phoneCanvas.height = 1650; // drawn in 540 x 1100 units at 1.5x
  const phoneTex = new THREE.CanvasTexture(phoneCanvas); phoneTex.colorSpace = THREE.SRGBColorSpace; phoneTex.anisotropy = maxAniso;
  // A current phone: an anodised aluminium unibody, a full-width camera plateau on the back, glass edge to edge on the front.
  function makePhone(color) {
    const grp = new THREE.Group();
    const alum = new THREE.MeshPhysicalMaterial({ color, metalness: 1, roughness: 0.36, clearcoat: 0.3, clearcoatRoughness: 0.4 });
    const W = 0.0719, D = 0.150, T = 0.0088;
    const body = new THREE.Mesh(new RoundedBoxGeometry(W, T, D, 5, 0.0042), alum); grp.add(body);
    const glass = new THREE.Mesh(new RoundedBoxGeometry(W - 0.0016, 0.0008, D - 0.0016, 3, 0.0004), new THREE.MeshPhysicalMaterial({ color: 0x050506, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02 }));
    glass.position.y = T / 2 - 0.0002; grp.add(glass);
    // The back: a matte glass panel, the plateau, three lenses in a triangle, the flash and the depth sensor.
    const backGlass = new THREE.Mesh(new RoundedBoxGeometry(W - 0.01, 0.0004, D * 0.56, 2, 0.0002), new THREE.MeshPhysicalMaterial({ color, metalness: 0.3, roughness: 0.7 }));
    backGlass.position.set(0, -T / 2 - 0.0001, D * 0.17); grp.add(backGlass);
    const plateau = new THREE.Mesh(new RoundedBoxGeometry(W - 0.003, 0.0022, 0.036, 3, 0.001), alum); plateau.position.set(0, -T / 2 - 0.0009, -D / 2 + 0.021); grp.add(plateau);
    const lensGlass = new THREE.MeshPhysicalMaterial({ color: 0x0a0b12, roughness: 0.02, clearcoat: 1, iridescence: 0.6, iridescenceIOR: 1.6, metalness: 0.2 });
    [[-0.022, -0.063], [-0.006, -0.054], [-0.022, -0.045]].forEach(([x, z]) => {
      const ringL = new THREE.Mesh(new THREE.CylinderGeometry(0.0074, 0.0076, 0.0026, 32), alum); ringL.position.set(x, -T / 2 - 0.0028, z); grp.add(ringL);
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.0058, 0.0058, 0.0008, 32), lensGlass); lens.position.set(x, -T / 2 - 0.0042, z); grp.add(lens);
    });
    const flash = new THREE.Mesh(new THREE.CylinderGeometry(0.0026, 0.0026, 0.0006, 20), new THREE.MeshStandardMaterial({ color: 0xf3efe6, roughness: 0.3 })); flash.position.set(0.024, -T / 2 - 0.0022, -0.063); grp.add(flash);
    const lidar = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.0006, 20), lensGlass); lidar.position.set(0.024, -T / 2 - 0.0022, -0.048); grp.add(lidar);
    // Side buttons.
    [[W / 2, -0.03, 0.022], [-W / 2, -0.036, 0.009], [-W / 2, -0.02, 0.012], [-W / 2, -0.003, 0.012], [W / 2, 0.03, 0.012]].forEach(([x, z, l]) => {
      const b = new THREE.Mesh(new RoundedBoxGeometry(0.0012, 0.0034, l, 2, 0.0005), alum); b.position.set(x + Math.sign(x) * 0.0003, 0, z); grp.add(b);
    });
    grp.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    return grp;
  }
  const phone = new THREE.Group(); setE.add(phone);
  phone.add(makePhone(0x5a1e2b)); // Mama's: burgundy
  const phoneScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.0685, 0.1465), new THREE.MeshBasicMaterial({ map: phoneTex, color: new THREE.Color(1.15, 1.15, 1.15) }));
  phoneScreen.rotation.x = -Math.PI / 2; phoneScreen.position.y = 0.0049; phone.add(phoneScreen); // just above the cover glass
  let phoneState = "";
  function drawPhone(state) {
    if (state === phoneState) return; phoneState = state;
    const g = phoneCanvas.getContext("2d"), w = 540, h = 1100;
    g.setTransform(1.5, 0, 0, 1.5, 0, 0);
    g.fillStyle = "#000"; g.fillRect(0, 0, w, h);
    if (state === "off") { phoneTex.needsUpdate = true; return; }
    const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, "#2a0d16"); bg.addColorStop(1, "#0d0507"); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.textAlign = "center"; g.fillStyle = "#f4efe6";
    const big = (t, y, size, font) => { g.font = (font || '300 ') + size + 'px "Figtree", Arial'; g.fillText(t, w / 2, y); };
    if (state === "call" || state === "incall") {
      big(state === "call" ? "Tunde" : "Tunde", 260, 64, "400 "); g.fillStyle = "#bda5aa"; big(state === "call" ? "calling…" : "00:12", 330, 34);
      if (state === "call") { [[150, "#c0392b"], [390, "#c9a256"]].forEach(([x, c]) => { g.fillStyle = c; g.beginPath(); g.arc(x, 880, 62, 0, Math.PI * 2); g.fill(); }); }
      else { g.fillStyle = "#c0392b"; g.beginPath(); g.arc(270, 900, 62, 0, Math.PI * 2); g.fill(); }
    } else if (state === "video") {
      const vg = g.createRadialGradient(270, 480, 40, 270, 480, 420); vg.addColorStop(0, "#c78a52"); vg.addColorStop(1, "#3a1810"); g.fillStyle = vg; g.fillRect(0, 0, w, h);
      g.fillStyle = "rgba(255,240,220,.85)"; big("Tunde, Chidinma", 120, 34, "400 ");
      g.fillStyle = "#c0392b"; g.beginPath(); g.arc(270, 960, 56, 0, Math.PI * 2); g.fill();
    } else if (state === "lock" || state === "sms" || state === "lockNight") {
      big(state === "lockNight" ? "23:10" : "21:40", 300, 150, "200 "); g.fillStyle = "#bda5aa"; big("Thursday 26 November", 370, 30);
      if (state === "sms") {
        g.fillStyle = "rgba(244,239,230,.94)"; g.beginPath(); g.roundRect(40, 470, 460, 250, 30); g.fill();
        g.textAlign = "left"; g.fillStyle = "#6e1426"; g.font = '600 26px "Figtree", Arial'; g.fillText("MESSAGES · now", 72, 520);
        g.fillStyle = "#23141a"; g.font = '500 30px "Figtree", Arial';
        ["Mama Ijeoma, Chidinma and", "Tunde have saved you a place.", "Open your invitation:", "ariya.ng/r/ijeoma"].forEach((l, k) => g.fillText(l, 72, 575 + k * 40));
      }
    } else if (state === "voice" || state === "voiceSent") {
      // A chat app in dark mode, the way it looks on her phone: Tunde's chat, her earlier messages, then the voice note.
      g.fillStyle = "#0b141a"; g.fillRect(0, 0, w, h);
      g.save(); g.globalAlpha = 0.05; g.strokeStyle = "#e9edef"; g.lineWidth = 1.4; // the doodle wallpaper
      for (let y = 190; y < h - 90; y += 46) for (let x = (y / 46) % 2 ? 10 : 34; x < w; x += 48) { const k = (x * 7 + y * 3) % 4; g.beginPath(); if (k === 0) g.arc(x, y, 7, 0, Math.PI * 2); else if (k === 1) { g.moveTo(x - 7, y + 5); g.lineTo(x, y - 7); g.lineTo(x + 7, y + 5); g.closePath(); } else if (k === 2) g.rect(x - 6, y - 6, 12, 12); else { g.moveTo(x - 8, y); g.quadraticCurveTo(x, y - 10, x + 8, y); } g.stroke(); }
      g.restore();
      g.fillStyle = "#1f2c34"; g.fillRect(0, 0, w, 168);
      g.strokeStyle = "#aebac1"; g.lineWidth = 4; g.lineCap = "round"; g.beginPath(); g.moveTo(34, 104); g.lineTo(22, 118); g.lineTo(34, 132); g.stroke();
      const av = g.createLinearGradient(52, 92, 104, 144); av.addColorStop(0, "#c9a256"); av.addColorStop(1, "#6e1426");
      g.fillStyle = av; g.beginPath(); g.arc(78, 118, 26, 0, Math.PI * 2); g.fill();
      g.fillStyle = "rgba(255,255,255,.75)"; g.beginPath(); g.arc(78, 111, 9, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(78, 134, 15, 9, 0, Math.PI, 0); g.fill();
      g.textAlign = "left"; g.fillStyle = "#e9edef"; g.font = '600 31px "Figtree", Arial'; g.fillText("Tunde", 118, 114);
      g.fillStyle = "#8696a0"; g.font = '400 19px "Figtree", Arial'; g.fillText(state === "voice" ? "last seen today at 20:12" : "last seen today at 20:12", 118, 140);
      g.strokeStyle = "#aebac1"; g.lineWidth = 3; g.beginPath(); g.roundRect(392, 106, 30, 22, 5); g.stroke(); g.beginPath(); g.moveTo(422, 114); g.lineTo(434, 107); g.lineTo(434, 127); g.lineTo(422, 120); g.stroke();
      g.beginPath(); g.arc(478, 117, 13, Math.PI * 0.6, Math.PI * 1.6); g.stroke();
      const chip = (t, y) => { g.font = '500 17px "Figtree", Arial'; const tw = g.measureText(t).width + 30; g.fillStyle = "#182229"; g.beginPath(); g.roundRect(w / 2 - tw / 2, y, tw, 34, 9); g.fill(); g.fillStyle = "#8696a0"; g.textAlign = "center"; g.fillText(t, w / 2, y + 23); };
      const ticks = (x, y, read) => { g.strokeStyle = read ? "#53bdeb" : "#8696a0"; g.lineWidth = 2; [0, 6].forEach((o) => { g.beginPath(); g.moveTo(x + o, y - 5); g.lineTo(x + o + 4, y); g.lineTo(x + o + 12, y - 10); g.stroke(); }); };
      const bubble = (out, lines, time, y, read) => {
        g.font = '400 27px "Figtree", Arial'; const tw = Math.min(w - 60, Math.max(...lines.map((l) => g.measureText(l).width)) + 104), bh = 24 + lines.length * 36;
        const x = out ? w - 18 - tw : 18;
        g.fillStyle = out ? "#005c4b" : "#202c33"; g.beginPath(); g.roundRect(x, y, tw, bh, 12); g.fill();
        g.beginPath(); if (out) { g.moveTo(x + tw - 4, y); g.lineTo(x + tw + 12, y); g.lineTo(x + tw - 4, y + 16); } else { g.moveTo(x + 4, y); g.lineTo(x - 12, y); g.lineTo(x + 4, y + 16); } g.fill();
        g.fillStyle = "#e9edef"; g.textAlign = "left"; lines.forEach((l, k) => g.fillText(l, x + 16, y + 40 + k * 36));
        g.fillStyle = out ? "rgba(233,237,239,.6)" : "#8696a0"; g.font = '400 18px "Figtree", Arial'; g.textAlign = "right"; g.fillText(time, x + tw - (out ? 34 : 12), y + bh - 10);
        if (out) ticks(x + tw - 30, y + bh - 14, read);
        return y + bh + 12;
      };
      chip("YESTERDAY", 192);
      let y = bubble(false, ["Mama, the planners are", "sorting everything.", "I will call you."], "18:02", 244, false);
      y = bubble(true, ["Ok my son. God bless you."], "18:05", y, true);
      chip("TODAY", y + 6); y += 56;
      y = bubble(true, ["Tunde, have they sent", "the card?"], "21:12", y, false);
      if (state === "voiceSent") {
        // Her voice note, sent: play, the waveform, her photo with a small mic, the length, one grey tick.
        const bx = 120, bw = w - 18 - bx, bh = 92; g.fillStyle = "#005c4b"; g.beginPath(); g.roundRect(bx, y, bw, bh, 12); g.fill();
        g.beginPath(); g.moveTo(bx + bw - 4, y); g.lineTo(bx + bw + 12, y); g.lineTo(bx + bw - 4, y + 16); g.fill();
        const ag = g.createLinearGradient(bx + 14, y + 14, bx + 76, y + 76); ag.addColorStop(0, "#d9b98a"); ag.addColorStop(1, "#7a3a2a"); g.fillStyle = ag; g.beginPath(); g.arc(bx + 46, y + 44, 30, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#53bdeb"; g.beginPath(); g.arc(bx + 70, y + 68, 10, 0, Math.PI * 2); g.fill(); g.fillStyle = "#fff"; g.fillRect(bx + 67, y + 61, 6, 10);
        g.fillStyle = "#d1d7db"; g.beginPath(); g.moveTo(bx + 94, y + 30); g.lineTo(bx + 116, y + 44); g.lineTo(bx + 94, y + 58); g.fill();
        for (let k = 0; k < 34; k++) { const hh = 6 + Math.abs(Math.sin(k * 1.7) * 18 + Math.sin(k * 0.5) * 8); g.fillStyle = k < 2 ? "#53bdeb" : "rgba(233,237,239,.55)"; g.beginPath(); g.roundRect(bx + 130 + k * 7.6, y + 44 - hh / 2, 4, hh, 2); g.fill(); }
        g.fillStyle = "#53bdeb"; g.beginPath(); g.arc(bx + 132, y + 44, 7, 0, Math.PI * 2); g.fill();
        g.fillStyle = "rgba(233,237,239,.6)"; g.font = '400 15px "Figtree", Arial'; g.textAlign = "left"; g.fillText("0:07", bx + 130, y + bh - 10);
        g.textAlign = "right"; g.fillText("21:40", bx + bw - 34, y + bh - 10);
        g.strokeStyle = "#8696a0"; g.lineWidth = 2; g.beginPath(); g.moveTo(bx + bw - 26, y + bh - 19); g.lineTo(bx + bw - 22, y + bh - 14); g.lineTo(bx + bw - 14, y + bh - 24); g.stroke();
        // The input bar, idle again.
        g.fillStyle = "#1f2c34"; g.beginPath(); g.roundRect(14, h - 96, w - 110, 68, 34); g.fill();
        g.fillStyle = "#8696a0"; g.font = '400 23px "Figtree", Arial'; g.textAlign = "left"; g.fillText("Message", 70, h - 54);
        g.strokeStyle = "#8696a0"; g.lineWidth = 2.5; g.beginPath(); g.arc(40, h - 62, 12, 0, Math.PI * 2); g.stroke();
      } else {
        // Recording: the red dot, the timer, "slide to cancel", the big mic button held down.
        g.fillStyle = "#1f2c34"; g.beginPath(); g.roundRect(14, h - 96, w - 110, 68, 34); g.fill();
        g.fillStyle = "#f15c6d"; g.beginPath(); g.arc(48, h - 62, 10, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#e9edef"; g.font = '400 24px "Figtree", Arial'; g.textAlign = "left"; g.fillText("0:07", 70, h - 53);
        g.fillStyle = "#8696a0"; g.font = '400 21px "Figtree", Arial'; g.fillText("‹  Slide to cancel", 200, h - 54);
      }
      g.fillStyle = "#00a884"; g.beginPath(); g.arc(w - 50, h - 62, state === "voice" ? 44 : 34, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#fff"; g.beginPath(); g.roundRect(w - 58, h - 82, 16, 28, 8); g.fill(); g.strokeStyle = "#fff"; g.lineWidth = 3; g.beginPath(); g.arc(w - 50, h - 66, 13, 0.1 * Math.PI, 0.9 * Math.PI); g.stroke(); g.fillRect(w - 51.5, h - 53, 3, 9);
    }
    // The status bar and the island at the top of the glass.
    g.fillStyle = "#000"; g.beginPath(); g.roundRect(w / 2 - 74, 22, 148, 42, 21); g.fill();
    g.fillStyle = "rgba(244,239,230,.9)"; g.font = '600 24px "Figtree", Arial'; g.textAlign = "left"; g.fillText(state === "lockNight" ? "23:10" : "21:40", 48, 52);
    g.textAlign = "right"; g.fillText("▮▮▮  ◔", w - 44, 52);
    phoneTex.needsUpdate = true;
  }
  drawPhone("off");
  // The photograph lives in the drawer, then in her bag, then beside the place card.
  const photoDrawer = makePhoto(1); photoDrawer.rotation.set(-Math.PI / 2 + 0.05, 0, 0.2); photoDrawer.position.set(0.06, 0.02, -0.14); drawer.add(photoDrawer);
  const foldedFabric = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.025, 0.16, 2, 0.008), creamCloth); foldedFabric.position.set(-0.1, 0.0, -0.2); drawer.add(foldedFabric);
  const foldTrim = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.004, 0.012), goldThreadMat); foldTrim.position.set(-0.1, 0.014, -0.13); drawer.add(foldTrim);
  const needlePack = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.002, 0.07), new THREE.MeshStandardMaterial({ color: 0x24407a, roughness: 0.6 })); needlePack.position.set(0.16, 0.0, -0.22); drawer.add(needlePack);
  // Her outfit for the wedding, the travel bag, and the bed they wait on.
  const bed = new THREE.Group(); bed.position.set(2.15, 0, -1.2); setE.add(bed);
  const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.32, 2.0), new THREE.MeshStandardMaterial({ color: 0x2e1c12, roughness: 0.6 })); bedFrame.position.y = 0.16; bed.add(bedFrame);
  const sheet = new THREE.Mesh(new RoundedBoxGeometry(1.46, 0.2, 1.96, 3, 0.06), new THREE.MeshPhysicalMaterial({ color: 0xece4d6, roughness: 0.85, sheen: 0.6, sheenColor: 0xffffff })); sheet.position.y = 0.42; sheet.receiveShadow = true; bed.add(sheet);
  const headboard = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.9, 0.06), new THREE.MeshStandardMaterial({ color: 0x2e1c12, roughness: 0.6 })); headboard.position.set(0, 0.75, -1.0); bed.add(headboard);
  const outfit = new THREE.Group(); outfit.position.set(-0.05, 0.53, 0.1); outfit.rotation.y = 0.12; bed.add(outfit);
  const outfitBody = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.03, 0.78, 3, 0.012), silk); outfitBody.castShadow = true; outfit.add(outfitBody);
  const outfitWrap = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.028, 0.4, 3, 0.012), silk); outfitWrap.position.set(0.12, 0.025, -0.15); outfitWrap.rotation.y = 0.5; outfitWrap.castShadow = true; outfit.add(outfitWrap);
  const gele = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.045, 12, 28, Math.PI * 1.6), goldThreadMat); gele.rotation.x = Math.PI / 2; gele.position.set(-0.36, 0.05, -0.32); outfit.add(gele);
  const bagE = makeBag(1); setE.add(bagE);
  const photoBag = makePhoto(1); photoBag.rotation.set(0.15, 0, 0.12); bagE.add(photoBag); photoBag.position.set(0.04, 0.2, 0.135);
  // At night, back home: the place card propped beside the photograph, under the lamp.
  const photoNight = makePhoto(1.3); photoNight.position.set(0.25, TOP + 0.07, -0.2); photoNight.rotation.set(-0.22, -0.35, 0); setE.add(photoNight);
  const cardNight = makeTent(mamaCardTex, 1.3); cardNight.position.set(0.12, TOP, -0.12); cardNight.rotation.y = -0.2; setE.add(cardNight);
  shadowAll(eTable); [plateE, cover, mamaChairE, boyChair, bedFrame, headboard].forEach((m) => { m.castShadow = true; m.receiveShadow = true; });

  /* ---------- Set F: Tunde's room in Lagos, late. A laptop on the bed, the city through the window ---------- */
  const setF = new THREE.Group(); setF.visible = false; scene.add(setF);
  const fBg = new THREE.Color(0x05030a);
  const fBed = new THREE.Mesh(new RoundedBoxGeometry(2.2, 0.5, 2.2, 4, 0.08), new THREE.MeshPhysicalMaterial({ color: 0x3a2a2e, roughness: 0.9, sheen: 0.7, sheenColor: 0x9a8a9a })); fBed.position.set(0, 0.25, 0); fBed.receiveShadow = true; setF.add(fBed);
  const fWall = new THREE.Mesh(new THREE.PlaneGeometry(12, 4), new THREE.MeshStandardMaterial({ color: 0x1a1218, roughness: 0.95 })); fWall.position.set(0, 2, -2.2); setF.add(fWall);
  const laptop = new THREE.Group(); laptop.position.set(0.1, 0.5, 0.25); laptop.rotation.y = -0.35; setF.add(laptop);
  // A thin aluminium laptop: midnight finish, a backlit keyboard, the planner open on a wallpaper of burgundy silk.
  const alu = new THREE.MeshPhysicalMaterial({ color: 0x353b48, metalness: 1, roughness: 0.34, clearcoat: 0.2, clearcoatRoughness: 0.5 });
  const lapBase = new THREE.Mesh(new RoundedBoxGeometry(0.31, 0.011, 0.215, 4, 0.0045), alu); lapBase.position.y = 0.0055; lapBase.castShadow = true; laptop.add(lapBase);
  const keysTex = canvasTex(1024, 720, (g, w, h) => {
    g.fillStyle = "#2a2f3a"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#14161c"; g.beginPath(); g.roundRect(40, 24, w - 80, 400, 14); g.fill();
    const rows = [14, 14, 13, 12, 11];
    rows.forEach((n, r) => { const kw = (w - 110) / 14.4, y = 40 + r * 74; let x = 55 + r * kw * 0.25;
      for (let k = 0; k < n; k++) { const ww = (r === 4 && k === 4) ? kw * 4.6 : kw * 0.9; g.fillStyle = "#0c0d11"; g.beginPath(); g.roundRect(x, y, ww, 62, 8); g.fill(); g.fillStyle = "rgba(215,225,255,.55)"; g.fillRect(x + ww * 0.42, y + 26, ww * 0.16, 9); x += ww + kw * 0.1; } });
    g.fillStyle = "#3a404d"; g.beginPath(); g.roundRect(w / 2 - 230, 450, 460, 250, 18); g.fill();
    g.strokeStyle = "rgba(255,255,255,.08)"; g.lineWidth = 2; g.stroke();
  });
  const keyboard = new THREE.Mesh(new THREE.PlaneGeometry(0.29, 0.204), new THREE.MeshPhysicalMaterial({ map: keysTex, roughness: 0.5, metalness: 0.4, emissive: 0xffffff, emissiveMap: keysTex, emissiveIntensity: 0.06 }));
  keyboard.rotation.x = -Math.PI / 2; keyboard.position.set(0, 0.0111, 0.002); laptop.add(keyboard);
  const lapLid = new THREE.Group(); lapLid.position.set(0, 0.011, -0.107); lapLid.rotation.x = -0.32; laptop.add(lapLid);
  const lidE = new THREE.Mesh(new RoundedBoxGeometry(0.31, 0.205, 0.0055, 3, 0.0025), alu); lidE.position.y = 0.1025; lidE.castShadow = true; lapLid.add(lidE);
  const bezel = new THREE.Mesh(new THREE.PlaneGeometry(0.304, 0.199), new THREE.MeshPhysicalMaterial({ color: 0x030304, roughness: 0.06, clearcoat: 1 })); bezel.position.set(0, 0.1025, 0.0029); lapLid.add(bezel);
  const lapScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.292, 0.183), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.45, 1.4, 1.35), map: canvasTex(1280, 800, (g, w, h) => {
    // Wallpaper: ribbons of burgundy and rose silk with a gold edge.
    const bg = g.createLinearGradient(0, 0, w, h); bg.addColorStop(0, "#1a0409"); bg.addColorStop(1, "#3a0816"); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 16; k++) {
      const y0 = h * (0.2 + k * 0.045), amp = 120 + k * 14, gr = g.createLinearGradient(0, y0 - amp, w, y0 + amp);
      gr.addColorStop(0, `rgba(${110 + k * 8},${12 + k * 3},${36 + k * 3},.0)`); gr.addColorStop(0.5, `rgba(${150 + k * 6},${30 + k * 5},${60 + k * 3},.35)`); gr.addColorStop(1, `rgba(233,190,120,${0.04 + k * 0.012})`);
      g.fillStyle = gr; g.beginPath(); g.moveTo(0, y0);
      g.bezierCurveTo(w * 0.3, y0 - amp * 1.4, w * 0.55, y0 + amp * 1.2, w, y0 - amp * 0.6); g.lineTo(w, y0 - amp * 0.6 + 28); g.bezierCurveTo(w * 0.55, y0 + amp * 1.2 + 28, w * 0.3, y0 - amp * 1.4 + 28, 0, y0 + 28); g.fill();
    }
    // The planner window.
    const X = 210, Y = 90, WW = 860, HH = 600;
    g.fillStyle = "rgba(0,0,0,.35)"; g.beginPath(); g.roundRect(X + 6, Y + 14, WW, HH, 18); g.fill();
    g.fillStyle = "#fbf7f0"; g.beginPath(); g.roundRect(X, Y, WW, HH, 18); g.fill();
    g.fillStyle = "#6e1426"; g.beginPath(); g.roundRect(X, Y, WW, 62, [18, 18, 0, 0]); g.fill();
    g.fillStyle = "#f4efe6"; g.font = 'italic 400 30px "Bodoni Moda", Georgia, serif'; g.fillText("Àríyá", X + 28, Y + 41);
    g.font = '500 17px "Figtree", Arial'; g.fillStyle = "#e9c98a"; g.fillText("CHIDINMA & TUNDE · 12 DEC 2026", X + 150, Y + 39);
    g.fillStyle = "#8b7660"; g.font = '600 15px "Figtree", Arial'; g.fillText("GUESTS  320       CONFIRMED  212       SEATED  188", X + 30, Y + 104);
    const rows = [["Aunty Bisi Adeyemi", "Lagos", "Confirmed"], ["Uncle Femi Okafor", "Abuja", "Confirmed"], ["Mama Ijeoma", "Benin City", "Invitation not sent"], ["Dr. Amaka Eze", "Enugu", "Opened"], ["Chief Ade Balogun", "Ibadan", "Confirmed"], ["Mrs. Ronke Bello", "Lagos", "Confirmed"]];
    rows.forEach(([n, c, st], k) => { const y = Y + 130 + k * 72, hi = k === 2;
      g.fillStyle = hi ? "#f6e7e2" : "#ffffff"; g.beginPath(); g.roundRect(X + 24, y, WW - 48, 60, 10); g.fill();
      if (hi) { g.strokeStyle = "#c9a256"; g.lineWidth = 2.5; g.stroke(); }
      g.fillStyle = "#24161b"; g.font = (hi ? "600 " : "500 ") + '22px "Figtree", Arial'; g.fillText(n, X + 48, y + 38);
      g.fillStyle = "#8b7660"; g.font = '400 18px "Figtree", Arial'; g.fillText(c, X + 360, y + 37);
      const pill = st === "Confirmed" ? ["#f1e5c8", "#7d5c1d"] : st === "Opened" ? ["#ece4e6", "#5b4a50"] : ["#f7dfe2", "#8c1d32"];
      g.font = '600 15px "Figtree", Arial'; const pw = g.measureText(st).width + 30; g.fillStyle = pill[0]; g.beginPath(); g.roundRect(X + WW - 48 - pw - 16, y + 15, pw, 30, 15); g.fill(); g.fillStyle = pill[1]; g.fillText(st, X + WW - 48 - pw - 1, y + 36);
    });
    g.fillStyle = "rgba(255,255,255,.75)"; g.fillRect(0, h - 4, w, 4);
  }) }));
  lapScreen.position.set(0, 0.1035, 0.0031); lapLid.add(lapScreen);
  const screenGlow = new THREE.PointLight(0xdfe4ff, 0, 3, 1.6); screenGlow.position.set(0.1, 0.72, 0.4); scene.add(screenGlow);
  const phoneDown = makePhone(0xc4672c); phoneDown.position.set(-0.32, 0.5068, 0.35); phoneDown.rotation.set(Math.PI, 0.5, 0); setF.add(phoneDown); // Tunde's, face down: orange
  const fPillow = new THREE.Mesh(new RoundedBoxGeometry(0.7, 0.16, 0.42, 4, 0.07), new THREE.MeshPhysicalMaterial({ color: 0xd8d0d4, roughness: 0.9, sheen: 0.6, sheenColor: 0xffffff })); fPillow.position.set(-0.4, 0.58, -0.75); setF.add(fPillow);
  // Lagos at night through the window: out-of-focus lights.
  const NCity = mobile ? 120 : 220, cityPos = [], cityCol = [];
  for (let i = 0; i < NCity; i++) { cityPos.push((rand() - 0.5) * 9, 0.6 + rand() * 2.6, -6 - rand() * 4); const warm = rand() < 0.7; cityCol.push(warm ? 2.4 : 1.2, warm ? 1.5 : 1.4, warm ? 0.7 : 2.2); }
  const cityGeo = new THREE.BufferGeometry(); cityGeo.setAttribute("position", new THREE.Float32BufferAttribute(cityPos, 3)); cityGeo.setAttribute("color", new THREE.Float32BufferAttribute(cityCol, 3));
  const cityLights = new THREE.Points(cityGeo, new THREE.PointsMaterial({ size: 0.16, map: dotTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  setF.add(cityLights);
  const fWindow = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.02, 0.025, 0.06), transparent: true, opacity: 0.2 })); fWindow.position.set(0.6, 1.9, -2.19); setF.add(fWindow);
  setF.remove(fWall);
  [[-1.7, 1.9, 2.2, 4], [2.75, 1.9, 1.1, 4], [0.6, 3.4, 3.2, 1], [0.6, 0.4, 3.2, 0.8]].forEach(([x, y, w, h]) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), fWall.material); p.position.set(x, y, -2.2); setF.add(p); });

  /* ---------- The hall (set B): Table 14 then, Table 1 now. Mama's chair, her card, her bag ---------- */
  const card1 = makeTent(mamaCardTex, 1.05); setB.add(card1);
  { const a = Math.atan2(mamaSeat.z - t1z, mamaSeat.x - t1x); card1.position.set(t1x + Math.cos(a) * 0.5, CLOTH_Y, t1z + Math.sin(a) * 0.5); card1.rotation.y = -a + Math.PI / 2; }
  const mamaChairB = new THREE.Mesh(chairGeo, goldMat), mamaCushion = new THREE.Mesh(cushionGeo, cushions.material);
  mamaChairB.castShadow = mamaCushion.castShadow = true; setB.add(mamaChairB, mamaCushion);
  { const d = new THREE.Object3D(); d.scale.setScalar(0); d.updateMatrix(); chairs.setMatrixAt(MAMA_SEAT, d.matrix); cushions.setMatrixAt(MAMA_SEAT, d.matrix); chairs.instanceMatrix.needsUpdate = cushions.instanceMatrix.needsUpdate = true; }
  const bagB = makeBag(1); setB.add(bagB);
  const seatA = Math.atan2(mamaSeat.z - t1z, mamaSeat.x - t1x);
  function placeMama(state) {
    const out = state === "out" || state === "empty", dist = out ? 1.55 : 1.2, rot = Math.PI / 2 - seatA + (out ? 0.25 : 0);
    mamaChairB.position.set(t1x + Math.cos(seatA) * dist, 0, t1z + Math.sin(seatA) * dist); mamaChairB.rotation.set(0, rot, 0);
    mamaCushion.position.copy(mamaChairB.position); mamaCushion.rotation.copy(mamaChairB.rotation);
    bagB.visible = out;
    if (state === "out") { bagB.position.set(t1x + Math.cos(seatA + 0.32) * 1.62, 0, t1z + Math.sin(seatA + 0.32) * 1.62); bagB.rotation.set(0, rot + 0.4, 0); }
    else if (state === "empty") { bagB.position.set(mamaChairB.position.x, 0.5, mamaChairB.position.z); bagB.rotation.set(0, rot + 0.1, 0); }
    // Her guest figure stays out of her seat: she is never shown, only the place kept for her.
  }
  placeMama("tucked");
  let mamaState = "tucked";

  const lightsE = [lampLight, lampFill, windowLight], lightsF = [screenGlow];
  // Mama's room, the evening before: her outfit is ready on the bed, her bag is packed, and no invitation has come.
  // The phone on the table shows the voice message she records for Tunde.
  function updateE(u, t) {
    boyChair.position.set(BOY_CHAIR.away[0], 0, BOY_CHAIR.away[1]); boyChair.rotation.y = BOY_CHAIR.away[2];
    paperBall.visible = false; sewing.visible = false; drawer.position.z = 0.4;
    bagE.visible = true; bagE.position.set(1.25, 0, -0.55); bagE.rotation.y = -0.5; photoBag.visible = true;
    photoNight.visible = cardNight.visible = false;
    phone.visible = true; phone.position.set(0.12, TOP + 0.0045, -0.02); phone.rotation.set(0, 0.3, 0);
    drawPhone(u < 0.34 ? "lock" : u < 0.72 ? "voice" : "voiceSent"); // long enough on each screen to read it
    rainTex.offset.y = -t * 0.02 * motion;
    fan.rotation.y = t * 1.6 * motion;
    lampLight.intensity = 2.4; lampFill.intensity = 0.3; windowLight.intensity = 0.4;
  }
  const fFill = new THREE.DirectionalLight(0x8a9cff, 0); fFill.position.set(1.5, 3, -4); scene.add(fFill); lightsF.push(fFill);
  function updateF(u, t) { screenGlow.intensity = 7; fFill.intensity = 0.5; }
  const keysE = [
    [0.00, V3(-0.9, 1.45, 1.9), V3(0.5, 0.7, -0.5), 18],
    [0.24, V3(-0.6, 1.3, 1.6), V3(0.3, 0.72, -0.2), 20],
    [0.42, V3(0.15, TOP + 0.27, 0.17), V3(0.12, TOP, -0.03), 12],
    [1.00, V3(0.14, TOP + 0.25, 0.15), V3(0.12, TOP, -0.03), 10]
  ];
  const keysF = [
    [0.00, V3(-0.9, 0.95, 1.3), V3(0.1, 0.6, 0.1), 30],
    [1.00, V3(-0.55, 0.86, 1.0), V3(0.1, 0.62, 0.12), 34]
  ];
  const keysT = [
    // First her card, close and in focus above the words; then her chair, pulled out.
    [0.00, V3(t1x + Math.cos(seatA) * 1.05, 0.98, t1z + Math.sin(seatA) * 1.05), V3(t1x + Math.cos(seatA) * 0.5, 0.86, t1z + Math.sin(seatA) * 0.5), 34],
    [0.45, V3(t1x + Math.cos(seatA) * 0.95, 0.96, t1z + Math.sin(seatA) * 0.95), V3(t1x + Math.cos(seatA) * 0.5, 0.86, t1z + Math.sin(seatA) * 0.5), 36],
    [0.55, V3(mamaSeat.x + Math.cos(seatA + 0.5) * 1.9, 1.3, mamaSeat.z + Math.sin(seatA + 0.5) * 1.9), V3(mamaSeat.x, 0.7, mamaSeat.z), 26],
    [1.00, V3(mamaSeat.x + Math.cos(seatA + 0.5) * 1.75, 1.28, mamaSeat.z + Math.sin(seatA + 0.5) * 1.75), V3(mamaSeat.x, 0.7, mamaSeat.z), 26]
  ];
  [keysE, keysF, keysT].forEach((ks) => ks.forEach((k) => { k[1] = k[1].clone(); k[2] = k[2].clone(); }));

  /* ---------- Set G, "The weave": hand-woven aso-oke, rolled on folded squares, each roll tagged with a guest's name ---------- */
  const setG = new THREE.Group(); setG.visible = false; scene.add(setG);
  const gBg = new THREE.Color(0x0a0605);
  // Aso-oke is woven in narrow strips with the stripes running along the cloth; rolled up, they wrap round the roll.
  // A colourway is a list of [width, colour] from the selvedge to the centre, mirrored to make the full width.
  // The family colourway: the colour of the day with gold bands and ivory pinstripes at the selvedge.
  function wineway(base) {
    const dark = "#" + new THREE.Color(base).multiplyScalar(0.45).getHexString(), lift = "#" + new THREE.Color(base).multiplyScalar(1.35).getHexString();
    return { base, half: [[0.018, dark], [0.006, "#efe4d6"], [0.008, dark], [0.006, "#efe4d6"], [0.008, dark], [0.006, "#efe4d6"], [0.014, lift], [0.05, "#c59a5e"], [0.012, base], [0.006, "#efe4d6"], [0.03, base], [0.02, "#c59a5e"]] };
  }
  const ASO = {
    wine: wineway("#5a0a1e"),
    indigo: { base: "#0f0f17", half: [[0.03, "#0f0f17"], [0.007, "#e9e9f0"], [0.007, "#0f0f17"], [0.007, "#e9e9f0"], [0.007, "#0f0f17"], [0.012, "#e9e9f0"], [0.13, "#1e2a86"], [0.012, "#e9e9f0"], [0.006, "#0f0f17"], [0.006, "#e9e9f0"]] }
  };
  function asoTex(cw, along) {
    // along = true: stripes run along v (the flat cloth); false: they run along u (the roll, where u is the roll's axis).
    return canvasTex(1024, 1024, (g, w, h) => {
      const n = along ? w : h, put = (a, b, col) => { g.fillStyle = col; if (along) g.fillRect(a * w, 0, (b - a) * w, h); else g.fillRect(0, a * h, w, (b - a) * h); };
      put(0, 1, cw.base);
      let x = 0; const stripes = [];
      cw.half.forEach(([wd, col]) => { stripes.push([x, x + wd, col]); x += wd; });
      stripes.forEach(([a, b, col]) => { put(a, b, col); put(1 - b, 1 - a, col); });
      // The weave: fine ribs across the cloth, and the heathered fleck of two-ply yarn.
      for (let i = 0; i < n; i += 4) { g.fillStyle = "rgba(0,0,0,.09)"; if (along) g.fillRect(0, i, w, 1); else g.fillRect(i, 0, 1, h); }
      for (let i = 0; i < 26000; i++) { const l = rand() < 0.5 ? "255,255,255" : "0,0,0"; g.fillStyle = `rgba(${l},${0.03 + rand() * 0.06})`; const px = rand() * w, py = rand() * h; if (along) g.fillRect(px, py, 1.2, 2.5); else g.fillRect(px, py, 2.5, 1.2); }
    }, { repeat: along ? [1, 1] : [2, 1] });
  }
  const ribNormal = (() => {
    const w = 128, h = 128, H = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) H[y * w + x] = 0.5 + 0.5 * Math.sin(y / h * Math.PI * 2 * 32) + 0.25 * Math.sin(x / w * Math.PI * 2 * 64 + Math.sin(y * 0.7)) + (rand() - 0.5) * 0.3;
    return heightToNormal(H, w, h, 1.2, [6, 6]);
  })();
  const ribNormalRoll = ribNormal.clone(); ribNormalRoll.repeat.set(8, 3); ribNormalRoll.rotation = Math.PI / 2;
  const asoMat = (cw, along) => new THREE.MeshPhysicalMaterial({ map: asoTex(cw, along), normalMap: along ? ribNormal : ribNormalRoll, normalScale: new THREE.Vector2(0.35, 0.35), roughness: 0.82, sheen: 0.6, sheenRoughness: 0.55, sheenColor: 0xfff0e0 });
  // The cut end of a roll: the cloth's layers spiralling in.
  const spiralTex = (cw) => canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = "#120607"; g.fillRect(0, 0, w, h);
    g.lineWidth = 3.2; g.strokeStyle = cw.base; g.beginPath();
    for (let a = 0; a < Math.PI * 2 * 15; a += 0.05) { const r = 6 + a * 1.27; g.lineTo(w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r); }
    g.stroke();
  });
  const MAT = { wine: { flat: asoMat(ASO.wine, true), roll: asoMat(ASO.wine, false) }, indigo: { flat: asoMat(ASO.indigo, true), roll: asoMat(ASO.indigo, false) } };
  MAT.wine.end = new THREE.MeshStandardMaterial({ map: spiralTex(ASO.wine), roughness: 0.9 }); MAT.indigo.end = new THREE.MeshStandardMaterial({ map: spiralTex(ASO.indigo), roughness: 0.9 });
  // A folded square of cloth with softened edges, a little uneven, and a roll on top along the diagonal.
  const squareGeo = (() => { const g = new RoundedBoxGeometry(0.44, 0.012, 0.44, 2, 0.005), pa = g.attributes.position; for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), z = pa.getZ(i); pa.setY(i, pa.getY(i) + 0.002 * Math.sin(x * 40) * Math.cos(z * 33)); } g.computeVertexNormals(); return g; })();
  const rollGeo = (() => { const g = new THREE.CylinderGeometry(0.052, 0.052, 0.38, 64, 24, true), pa = g.attributes.position; for (let i = 0; i < pa.count; i++) { const y = pa.getY(i), k = 1 + 0.035 * Math.sin(y * 28) * Math.sin(y * 9 + 1); pa.setX(i, pa.getX(i) * k); pa.setZ(i, pa.getZ(i) * k); } g.computeVertexNormals(); g.rotateZ(Math.PI / 2); return g; })();
  const capGeo = new THREE.CircleGeometry(0.051, 48);
  const cordMat = new THREE.MeshPhysicalMaterial({ color: 0xe2b867, metalness: 1, roughness: 0.32 });
  const tagFor = (name, role) => paperPair(256, 400, (g, w, h, C) => {
    g.strokeStyle = C.foil; g.lineWidth = 3; g.strokeRect(14, 14, w - 28, h - 28);
    g.fillStyle = C.rm ? "rgb(0,0,0)" : "#1a0d08"; g.beginPath(); g.arc(w / 2, 46, 11, 0, Math.PI * 2); g.fill(); // the eyelet
    g.strokeStyle = C.foil; g.lineWidth = 4; g.beginPath(); g.arc(w / 2, 46, 15, 0, Math.PI * 2); g.stroke();
    g.textAlign = "center"; g.fillStyle = C.foil; g.font = '600 15px "Figtree", Arial'; g.letterSpacing = "5px"; g.fillText("ASO-OKE", w / 2 + 2, 110); g.letterSpacing = "0px";
    g.fillStyle = C.ink; g.font = '50px "Pinyon Script", cursive';
    const parts = name.split(" "); parts.forEach((p, k) => press(g, C, p, w / 2, 190 + k * 56));
    foilRule(g, C, w / 2, 190 + parts.length * 56 - 4, 56);
    g.fillStyle = C.wine; g.font = 'italic 400 21px "Bodoni Moda", Georgia, serif'; press(g, C, role, w / 2, 190 + parts.length * 56 + 40);
    g.fillStyle = C.muted; g.font = '500 13px "Figtree", Arial'; g.letterSpacing = "3px"; g.fillText("C & T · 12.12.26", w / 2 + 2, h - 40); g.letterSpacing = "0px";
  });
  // Lace for the aso ebi: heavy beaded lace. Burgundy chiffon with big beaded flowers for her family; brown with sequinned
  // leaves for his. Drawn twice from one layout so the beads and sequins catch the light and the chiffon does not.
  function laceTex(kind, rm) {
    return canvasTex(1024, 1024, (g, w, h) => {
      const P = kind === "wine" ? { base: "#4c0a18", fold: "rgba(0,0,0,.18)", line: "#e2a7b4", bead: "#7c1a2c", sheen: "#f2c9d2" } : { base: "#3a2012", fold: "rgba(0,0,0,.22)", line: "#c98a5a", bead: "#140c08", sheen: "#e8c09a" };
      g.fillStyle = rm ? "rgb(0,180,0)" : P.base; g.fillRect(0, 0, w, h);
      if (!rm) for (let y = 0; y < h; y += 5) { g.fillStyle = y % 10 ? P.fold : "rgba(255,255,255,.04)"; g.fillRect(0, y, w, 2); } // chiffon pleats
      const ink = rm ? "rgb(0,60,255)" : P.line, bead = rm ? "rgb(0,90,200)" : P.bead;
      const outline = (cx, cy, R, n, rot) => {
        // A flower drawn as beads along its petal outlines: bugle beads on the outer edge, pearls inside.
        for (let ring = 0; ring < 2; ring++) {
          const rr = R * (1 - ring * 0.35);
          for (let k = 0; k <= 360; k += 2.2) {
            const a = (k / 180) * Math.PI + rot, r = rr * (0.62 + 0.38 * Math.abs(Math.sin(n * a / 2)));
            const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
            if (ring === 0) { g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = ink; g.fillRect(-1.2, -4, 2.4, 8); g.restore(); }
            else if (k % 9 < 2.2) { g.fillStyle = bead; g.beginPath(); g.arc(x, y, 4.2, 0, Math.PI * 2); g.fill(); if (!rm) { g.fillStyle = P.sheen; g.beginPath(); g.arc(x - 1.3, y - 1.3, 1.3, 0, Math.PI * 2); g.fill(); } }
          }
        }
      };
      if (kind === "wine") { outline(330, 420, 250, 5, 0.3); outline(820, 820, 220, 5, 1.1); outline(860, 180, 160, 5, 2.0); outline(140, 900, 140, 5, 0.6); }
      else for (let i = 0; i < 26; i++) { const x = rand() * w, y = rand() * h, a = rand() * 6.28; g.save(); g.translate(x, y); g.rotate(a); g.strokeStyle = ink; g.lineWidth = 5; g.setLineDash([3, 4]); g.beginPath(); g.ellipse(0, 0, 70, 30, 0, 0, Math.PI * 2); g.stroke(); g.restore(); }
      g.setLineDash([]);
      // Scattered sequins.
      for (let i = 0; i < 700; i++) { g.fillStyle = rm ? "rgb(0,40,255)" : (kind === "wine" ? "rgba(240,190,205,.8)" : "rgba(30,30,40,.9)"); g.beginPath(); g.arc(rand() * w, rand() * h, 1.6 + rand() * 1.8, 0, Math.PI * 2); g.fill(); }
    }, { srgb: !rm });
  }
  const laceMatFor = (kind) => new THREE.MeshPhysicalMaterial({ map: laceTex(kind, false), roughnessMap: laceTex(kind, true), metalnessMap: laceTex(kind, true), roughness: 1, metalness: 1, sheen: 0.8, sheenColor: kind === "wine" ? 0xffb0c0 : 0xffd0a8, sheenRoughness: 0.4 });
  const LACE = { wine: laceMatFor("wine"), indigo: laceMatFor("brown") };
  const damaskTex = canvasTex(512, 256, (g, w, h) => { g.fillStyle = "#1a0f0c"; g.fillRect(0, 0, w, h); for (let i = 0; i < 14; i++) { g.strokeStyle = i % 2 ? "#c2603a" : "#e38a52"; g.lineWidth = 10 + rand() * 12; g.beginPath(); const x = rand() * w; g.moveTo(x, 0); g.bezierCurveTo(x + 80, h * 0.3, x - 90, h * 0.6, x + 40, h); g.stroke(); } }, { repeat: [1, 1] });
  // Folded the way it comes from the weaver: the length folded into a flat stack, each fold rounding over at the front.
  function foldedStack(mat, w, d, layers) {
    const grp = new THREE.Group(), th = 0.019;
    for (let k = 0; k < layers; k++) {
      const m = new THREE.Mesh(new RoundedBoxGeometry(w - k * 0.004, th, d - k * 0.006, 3, 0.0092), mat);
      m.position.set((k % 2 ? 0.003 : -0.002) + k * 0.001, th / 2 + k * (th - 0.001), -k * 0.004); m.rotation.y = (k % 2 ? 1 : -1) * 0.006; grp.add(m);
    }
    grp.userData.top = layers * (th - 0.001) + 0.001;
    return grp;
  }
  function makeAso(cw, name, role) {
    const grp = new THREE.Group();
    const stack = foldedStack(MAT[cw].flat, 0.4, 0.28, 4); grp.add(stack);
    const lace = foldedStack(LACE[cw], 0.36, 0.24, 3); lace.position.set(0.36, 0, -0.1); lace.rotation.y = 0.12; grp.add(lace);
    if (cw === "indigo") { const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.3, 32).rotateZ(Math.PI / 2), new THREE.MeshPhysicalMaterial({ map: damaskTex, metalness: 0.6, roughness: 0.35 })); roll.position.set(0.36, 0.032, 0.11); roll.rotation.y = 0.12; grp.add(roll); }
    if (name) {
      // A gold cord tied round the stack, and the tag lying on top.
      const top = stack.userData.top;
      const loop = []; for (let k = 0; k <= 64; k++) { const a = k / 64 * Math.PI * 2; loop.push(V3(0.1, top / 2 + Math.sin(a) * (top / 2 + 0.003), -0.004 + Math.cos(a) * 0.143)); }
      const cord = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(loop, true), 96, 0.0016, 6, true), cordMat); grp.add(cord);
      const t = tagFor(name, role), tag = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.0006, 0.072), [cordMat, cordMat, new THREE.MeshPhysicalMaterial({ map: t.map, roughnessMap: t.rm, metalnessMap: t.rm, roughness: 1, metalness: 1 }), cordMat, cordMat, cordMat]);
      tag.position.set(0.04, top + 0.0012, 0.04); tag.rotation.y = -0.2; grp.add(tag);
      const tail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V3(0.1, top + 0.001, -0.02), V3(0.08, top + 0.002, 0.0), V3(0.05, top + 0.0015, 0.012)]), 16, 0.0014, 6), cordMat); grp.add(tail);
    }
    grp.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    return grp;
  }
  // The cutting table: unbleached cotton over a board.
  const gTable = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), new THREE.MeshPhysicalMaterial({ color: 0xe7dccb, roughness: 0.9, sheen: 0.4, sheenColor: 0xffffff, normalMap: linenNormal, normalScale: new THREE.Vector2(0.25, 0.25) }));
  gTable.rotation.x = -Math.PI / 2; gTable.receiveShadow = true; setG.add(gTable);
  const asoSets = [
    [makeAso("wine", "Mama Ijeoma", "Mother of the groom"), 0, 0, 0.0],
    [makeAso("indigo", "Uncle Femi", "Groom’s family"), 0.5, -0.3, 0.25],
    [makeAso("wine", "Aunty Bisi", "Bride’s family"), -0.52, -0.36, -0.2],
    [makeAso("wine"), 0.18, -0.78, 0.6], [makeAso("indigo"), -0.3, -0.95, -0.4], [makeAso("wine"), 0.95, -0.75, 0.1]
  ];
  asoSets.forEach(([o, x, z, ry]) => { o.position.set(x, 0, z); o.rotation.y = ry; setG.add(o); });
  // The shop behind: cubbies of rolls seen end on, out of focus.
  const NR = mobile ? 90 : 160;
  const shelfRolls = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.075, 0.075, 0.5, 24).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ map: spiralTex({ base: "#d8d0c4" }), roughness: 0.85 }), NR);
  {
    const d = new THREE.Object3D(), cols = ["#7a1530", "#c59a5e", "#1e2a86", "#5a1020", "#e9e0d2", "#2a0e14", "#9a6a3a", "#3a3f8a"].map((c) => new THREE.Color(c));
    for (let i = 0; i < NR; i++) {
      const c = i % 20, r = Math.floor(i / 20);
      d.position.set(-2.4 + c * 0.25 + (r % 2) * 0.12, 0.5 + r * 0.3 + (rand() - 0.5) * 0.02, -2.4 - rand() * 0.08); d.rotation.set(0, 0, rand() * 6); d.updateMatrix();
      shelfRolls.setMatrixAt(i, d.matrix); shelfRolls.setColorAt(i, cols[Math.floor(rand() * cols.length)]);
    }
  }
  setG.add(shelfRolls);
  const shelfWood = new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.7 });
  for (let r = 0; r < 9; r++) { const b = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.025, 0.6), shelfWood); b.position.set(0, 0.35 + r * 0.3, -2.4); setG.add(b); }
  const gBack = new THREE.Mesh(new THREE.PlaneGeometry(8, 5), shelfWood); gBack.position.set(0, 2, -2.75); setG.add(gBack);
  function updateG(u, t) {
    // A soft warm window key from the left with shadows, a cooler fill, and a glow on the shelves.
    key.position.set(-2.2, 3.4, 1.6); key.target.position.set(0, 0, -0.2); key.angle = 0.55; key.penumbra = 1; key.distance = 0; key.decay = 2;
    key.intensity = 60; key.shadow.autoUpdate = true; key.color.set(0xfff0e2);
    xKey.color.set(0xbfd0ff); xKey.intensity = 0.25; xKey.position.set(3, 2, 2);
    xRim.color.set(0xffb38a); xRim.intensity = 0.7; xRim.position.set(2, 1.6, -3);
    xGlow.color.set(0xffb070); xGlow.intensity = 3.2; xGlow.distance = 4; xGlow.position.set(0.4, 1.6, -1.6);
  }
  const keysG = [
    [0.00, V3(0.15, 1.05, 0.62), V3(0.0, 0.02, -0.02), 22],
    [0.40, V3(0.62, 0.42, 0.55), V3(0.02, 0.04, -0.06), 28],
    [0.72, V3(0.3, 0.36, 0.45), V3(0.1, 0.06, 0.04), 30],
    [1.00, V3(0.14, 0.3, 0.3), V3(0.05, 0.075, 0.04), 34]
  ];
  /* ---------- Set H, "The morning": Table 1 set before the doors open. Gold, glass, roses, the menu, the cards ---------- */
  const tmpV0 = new THREE.Vector3();
  const setH = new THREE.Group(); setH.visible = false; scene.add(setH);
  const hTable = new THREE.Mesh(clothGeo, clothMat); hTable.receiveShadow = hTable.castShadow = true; setH.add(hTable);
  const goldPolish = new THREE.MeshPhysicalMaterial({ color: 0xe6c07a, metalness: 1, roughness: 0.16, clearcoat: 0.2 });
  const goldSatin = new THREE.MeshPhysicalMaterial({ color: 0xd9ae63, metalness: 1, roughness: 0.34 });
  const porcelain = new THREE.MeshPhysicalMaterial({ color: 0xfbf8f2, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05, sheen: 0.2, sheenColor: 0xffffff });
  const crystalGlass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.02, transmission: 1, thickness: 0.002, ior: 1.52, envMapIntensity: 2.4, specularIntensity: 1 });
  const champagne = new THREE.MeshPhysicalMaterial({ color: 0xf1cf7e, roughness: 0.05, transmission: 0.85, thickness: 0.02, ior: 1.34, emissive: 0x3a2508, emissiveIntensity: 0.25 });
  const blushVelvet = new THREE.MeshPhysicalMaterial({ map: suedeMottle, color: 0xc98d8a, roughness: 0.92, sheen: 1, sheenRoughness: 0.45, sheenColor: 0xffd6d2, normalMap: velvetNormal, normalScale: new THREE.Vector2(0.3, 0.3) });
  // Lathe a solid of revolution with a wall: an outer profile, then back down the inside.
  function shell(outer, wall, seg) {
    const pts = outer.map(([r, y]) => new THREE.Vector2(r, y)), inner = outer.slice().reverse().map(([r, y]) => new THREE.Vector2(Math.max(0, r - wall), y + (r < wall * 2 ? wall : 0)));
    return new THREE.LatheGeometry(pts.concat(inner), seg || 48);
  }
  const plateGeoH = shell([[0, 0], [0.085, 0], [0.095, 0.004], [0.112, 0.012], [0.132, 0.019], [0.14, 0.0205]], 0.0035, 72);
  const plateRim = new THREE.TorusGeometry(0.1385, 0.0011, 6, 96); plateRim.rotateX(Math.PI / 2); plateRim.translate(0, 0.0212, 0);
  const chargerGeoH = mergeGeometries([new THREE.CylinderGeometry(0.168, 0.168, 0.005, 72).translate(0, 0.0025, 0), new THREE.TorusGeometry(0.166, 0.005, 10, 120).rotateX(Math.PI / 2).translate(0, 0.005, 0)]);
  const beadGeoH = new THREE.SphereGeometry(0.0034, 8, 6);
  const gobletGeo = shell([[0.0001, 0], [0.034, 0], [0.036, 0.003], [0.005, 0.008], [0.004, 0.09], [0.012, 0.096], [0.036, 0.115], [0.044, 0.15], [0.042, 0.19], [0.038, 0.215]], 0.0012, 48);
  const fluteGeo = shell([[0.0001, 0], [0.03, 0], [0.032, 0.003], [0.004, 0.008], [0.0035, 0.1], [0.01, 0.108], [0.022, 0.135], [0.026, 0.19], [0.024, 0.25]], 0.0011, 40);
  const fizzGeo = new THREE.LatheGeometry([[0.0001, 0.112], [0.012, 0.114], [0.02, 0.133], [0.0238, 0.18], [0.0001, 0.18]].map(([r, y]) => new THREE.Vector2(r, y)), 32);
  const votiveGeoH = shell([[0.0001, 0], [0.032, 0], [0.034, 0.012], [0.034, 0.072]], 0.0025, 40);
  const mercury = new THREE.MeshPhysicalMaterial({ color: 0xd8c39a, metalness: 1, roughness: 0.38, map: suedeMottle });
  // Flatware, cut as flat shapes and given a polished edge.
  function flat(shape) { const g = new THREE.ExtrudeGeometry(shape, { depth: 0.0022, bevelEnabled: true, bevelSize: 0.0008, bevelThickness: 0.0008, bevelSegments: 2, curveSegments: 10 }); g.rotateX(-Math.PI / 2); return g; }
  const knifeGeo = flat((() => { const s = new THREE.Shape(); s.moveTo(-0.006, 0.1); s.lineTo(-0.008, 0.0); s.quadraticCurveTo(-0.0075, -0.012, -0.006, -0.02); s.lineTo(-0.004, -0.1); s.quadraticCurveTo(0.002, -0.112, 0.006, -0.1); s.lineTo(0.007, -0.02); s.lineTo(0.008, 0.0); s.lineTo(0.007, 0.1); s.quadraticCurveTo(0.0, 0.108, -0.006, 0.1); return s; })());
  const forkGeo = flat((() => {
    const s = new THREE.Shape(); s.moveTo(-0.006, 0.1); s.quadraticCurveTo(0, 0.107, 0.006, 0.1); s.lineTo(0.004, 0.0); s.quadraticCurveTo(0.012, -0.03, 0.012, -0.05);
    for (let k = 0; k < 4; k++) { const x = 0.012 - k * 0.0072; s.lineTo(x, -0.098); s.lineTo(x - 0.0026, -0.098); if (k < 3) { s.lineTo(x - 0.0026, -0.064); s.lineTo(x - 0.0046, -0.064); } }
    s.lineTo(-0.012, -0.05); s.quadraticCurveTo(-0.012, -0.03, -0.004, 0.0); s.lineTo(-0.006, 0.1); return s; })());
  const spoonGeo = flat((() => { const s = new THREE.Shape(); s.moveTo(-0.004, 0.075); s.quadraticCurveTo(0, 0.081, 0.004, 0.075); s.lineTo(0.003, -0.01); s.quadraticCurveTo(0.017, -0.02, 0.016, -0.045); s.quadraticCurveTo(0.014, -0.07, 0, -0.072); s.quadraticCurveTo(-0.014, -0.07, -0.016, -0.045); s.quadraticCurveTo(-0.017, -0.02, -0.003, -0.01); s.lineTo(-0.004, 0.075); return s; })());
  const menuTex = paperPair(512, 900, (g, w, h, C) => {
    foilFrame(g, w, h, C, 22); crest(g, C, w / 2, 110, 36);
    g.textAlign = "center"; g.fillStyle = C.ink; g.font = '96px "Pinyon Script", cursive'; press(g, C, "Menu", w / 2, 250);
    foilRule(g, C, w / 2, 285, 110);
    const items = [["SMALL CHOPS", "puff-puff, samosa, peppered gizzard"], ["TO START", "seafood okra soup"], ["THE MAIN", "party jollof, fried plantain, grilled croaker"], ["OR", "pounded yam and egusi"], ["TO FINISH", "chin chin, and the wedding cake"], ["TO DRINK", "zobo, palm wine, champagne"]];
    items.forEach(([hd, it], k) => { const y = 348 + k * 82; g.fillStyle = C.foil; g.font = '600 15px "Figtree", Arial'; g.letterSpacing = "5px"; g.fillText(hd, w / 2 + 2, y); g.letterSpacing = "0px"; g.fillStyle = C.ink; g.font = 'italic 400 25px "Bodoni Moda", Georgia, serif'; press(g, C, it, w / 2, y + 34); });
    g.fillStyle = C.wine; g.font = 'italic 400 22px "Bodoni Moda", Georgia, serif'; press(g, C, "Chidinma & Tunde", w / 2, h - 78);
    g.fillStyle = C.muted; g.font = '500 14px "Figtree", Arial'; g.letterSpacing = "4px"; g.fillText("12 · 12 · 2026 · VICTORIA ISLAND", w / 2 + 2, h - 48); g.letterSpacing = "0px";
  });
  const menuMat = new THREE.MeshPhysicalMaterial({ map: menuTex.map, roughnessMap: menuTex.rm, metalnessMap: menuTex.rm, roughness: 1, metalness: 1 });
  const paperEdge = new THREE.MeshStandardMaterial({ color: 0xdcb56c, metalness: 1, roughness: 0.3 });
  const GUESTS_H = [["Aunty Bisi", "Bride’s family"], ["Uncle Femi", "Groom’s family"], ["Dr. Amaka Eze", "Friend of the bride"]];
  const settingsH = [];
  [Math.PI / 2 + 0.76, Math.PI / 2, Math.PI / 2 - 0.76].forEach((a, k) => {
    const st = new THREE.Group(); st.position.set(Math.cos(a) * 0.62, CLOTH_Y, Math.sin(a) * 0.62); st.rotation.y = Math.PI / 2 - a; setH.add(st);
    const ch = new THREE.Mesh(chargerGeoH, goldSatin); st.add(ch);
    const beads = new THREE.InstancedMesh(beadGeoH, goldPolish, 120); { const d = new THREE.Object3D(); for (let i = 0; i < 120; i++) { const b = i / 120 * Math.PI * 2; d.position.set(Math.cos(b) * 0.158, 0.0062, Math.sin(b) * 0.158); d.updateMatrix(); beads.setMatrixAt(i, d.matrix); } } st.add(beads);
    const pl = new THREE.Mesh(plateGeoH, porcelain); pl.position.y = 0.006; st.add(pl);
    const rim = new THREE.Mesh(plateRim, goldPolish); rim.position.y = 0.006; st.add(rim);
    // The napkin, folded in three, held by a gold ring, with the menu tucked under it.
    const menu = new THREE.Mesh(new THREE.BoxGeometry(0.088, 0.0006, 0.155), [paperEdge, paperEdge, menuMat, paperEdge, paperEdge, paperEdge]); menu.position.set(0.012, 0.0145, 0.004); menu.rotation.y = 0.06; st.add(menu);
    const nap = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.012, 0.17, 3, 0.005), blushVelvet); nap.position.set(-0.03, 0.022, 0.0); nap.rotation.set(0, 0.06, 0.04); st.add(nap);
    const nring = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.0028, 10, 32), goldPolish); nring.scale.set(1.6, 0.5, 1); nring.position.set(-0.03, 0.022, 0.0); nring.rotation.y = 0.06; st.add(nring);
    // Flatware: forks to the left, knives to the right, the dessert spoon above.
    [[-0.182, 0, forkGeo], [-0.202, 0.01, forkGeo], [0.182, 0, knifeGeo], [0.2, 0.008, knifeGeo]].forEach(([x, z, geo]) => { const m = new THREE.Mesh(geo, goldPolish); m.position.set(x, 0.0012, z); st.add(m); });
    const sp = new THREE.Mesh(spoonGeo, goldPolish); sp.rotation.y = Math.PI / 2; sp.position.set(0, 0.0012, -0.2); st.add(sp);
    // Glass: water goblet and a champagne flute, upper right.
    const gob = new THREE.Mesh(gobletGeo, crystalGlass); gob.position.set(0.17, 0, -0.2); st.add(gob);
    const fl = new THREE.Mesh(fluteGeo, crystalGlass); fl.position.set(0.24, 0, -0.13); st.add(fl);
    const fz = new THREE.Mesh(fizzGeo, champagne); fz.position.copy(fl.position); st.add(fz);
    const vo = new THREE.Mesh(votiveGeoH, mercury); vo.position.set(-0.14, 0, -0.22); st.add(vo);
    const tl = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.014, 24), wax); tl.position.set(-0.14, 0.009, -0.22); st.add(tl);
    const fla = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 10, 8), flameMat); fla.scale.set(1, 2.4, 1); fla.position.set(-0.14, 0.03, -0.22); st.add(fla);
    const card = makeTent(cardTex("TABLE ONE", GUESTS_H[k][0], GUESTS_H[k][1]), 0.95); card.position.set(0, 0, -0.27); st.add(card);
    st.traverse((m) => { if (m.isMesh && m.material !== crystalGlass && m.material !== champagne) { m.castShadow = true; m.receiveShadow = true; } });
    settingsH.push({ st, flame: fla });
  });
  // The centrepiece: a gold compote heaped with roses, and a gold-framed table number.
  const roseGeo = (() => {
    const parts = [], layers = [[3, 0.36, 0.08, 0.02], [5, 0.5, 0.3, 0.06], [5, 0.62, 0.55, 0.1], [7, 0.7, 0.9, 0.14], [8, 0.74, 1.2, 0.17]];
    layers.forEach(([n, sc, tilt, r], li) => { for (let k = 0; k < n; k++) {
      const g = petalGeo.clone(); g.translate(0, 0, -0.5); g.scale(sc, sc, sc); g.rotateX(Math.PI / 2); g.rotateX(-tilt); g.translate(0, li * 0.02, -r); g.rotateY(k / n * Math.PI * 2 + li * 0.7); parts.push(g);
    } });
    const m = mergeGeometries(parts); m.scale(0.05, 0.05, 0.05); m.computeVertexNormals(); return m;
  })();
  const NRZ = mobile ? 32 : 48;
  const roses = new THREE.InstancedMesh(roseGeo, new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.55, sheen: 1, sheenRoughness: 0.4, sheenColor: 0xffffff, side: THREE.DoubleSide }), NRZ);
  {
    const d = new THREE.Object3D(), cols = [0xf6efe4, 0xeec9c1, 0xf8ece6, 0xe7b9b0, 0xfbf6ee].map((c) => new THREE.Color(c)), ctr = V3(0, CLOTH_Y + 0.2, 0);
    for (let i = 0; i < NRZ; i++) {
      const y = 1 - (i + 0.5) / NRZ * 0.75, rr = Math.sqrt(1 - y * y), th = i * 2.399;
      const n = V3(Math.cos(th) * rr, y, Math.sin(th) * rr);
      d.position.copy(ctr).addScaledVector(n, 0.15); d.lookAt(tmpV0.copy(d.position).add(n)); d.rotateX(Math.PI / 2); d.scale.setScalar(0.85 + rand() * 0.35); d.updateMatrix();
      roses.setMatrixAt(i, d.matrix); roses.setColorAt(i, cols[i % cols.length]);
    }
  }
  roses.castShadow = true; setH.add(roses);
  const compote = new THREE.Mesh(shell([[0.0001, 0], [0.07, 0], [0.072, 0.008], [0.014, 0.02], [0.012, 0.1], [0.05, 0.12], [0.13, 0.16], [0.14, 0.17]], 0.003, 64), goldSatin); compote.position.y = CLOTH_Y; compote.castShadow = true; setH.add(compote);
  const numTex = paperPair(400, 560, (g, w, h, C) => {
    foilFrame(g, w, h, C, 18); g.textAlign = "center";
    g.fillStyle = C.foil; g.font = '600 22px "Figtree", Arial'; g.letterSpacing = "10px"; g.fillText("TABLE", w / 2 + 5, 130); g.letterSpacing = "0px";
    g.fillStyle = C.ink; g.font = '300 230px "Figtree", Arial, sans-serif'; press(g, C, "1", w / 2, 375);
    foilRule(g, C, w / 2, 420, 70);
    g.fillStyle = C.wine; g.font = '44px "Pinyon Script", cursive'; press(g, C, "Chidinma & Tunde", w / 2, 488);
  });
  const numCard = new THREE.Group(); numCard.position.set(0.09, CLOTH_Y, 0.2); numCard.rotation.y = -0.2; setH.add(numCard);
  { const fr = new THREE.Mesh(frameGeo(0.118, 0.158, 0.006, 0.1, 0.14, 0.003, 0.008, 0.0015), goldPolish); fr.rotation.x = Math.PI / 2 - 0.12; fr.position.set(0, 0.082, 0); numCard.add(fr);
    const nc = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.14), new THREE.MeshPhysicalMaterial({ map: numTex.map, roughnessMap: numTex.rm, metalnessMap: numTex.rm, roughness: 1, metalness: 1 })); nc.rotation.x = -0.12; nc.position.set(0, 0.081, 0.0042); numCard.add(nc);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.0018, 0.0018, 0.15, 8), goldPolish); leg.position.set(0, 0.07, -0.035); leg.rotation.x = -0.35; numCard.add(leg);
    numCard.traverse((m) => { if (m.isMesh) m.castShadow = true; }); }
  // The hall behind, before the doors open: other tables set and waiting, and fairy lights far off, all out of focus.
  const farTables = new THREE.InstancedMesh(clothGeo, clothMat, 6);
  { const d = new THREE.Object3D(); [[-2.6, -3.2], [2.4, -3.6], [-0.2, -6.2], [-4.6, -6.8], [4.4, -7.4], [0.6, -10]].forEach(([x, z], i) => { d.position.set(x, 0, z); d.updateMatrix(); farTables.setMatrixAt(i, d.matrix); }); }
  setH.add(farTables);
  const NFL = mobile ? 220 : 380, flPos = [], flCol = [];
  for (let i = 0; i < NFL; i++) { const far = i < NFL * 0.75; flPos.push((rand() - 0.5) * (far ? 22 : 8), far ? 1.6 + rand() * 4.5 : CLOTH_Y + 0.06, far ? -8 - rand() * 10 : -2.5 - rand() * 8); const k = 0.8 + rand() * 0.6; flCol.push(2.6 * k, 1.6 * k, 0.75 * k); }
  const flGeo = new THREE.BufferGeometry(); flGeo.setAttribute("position", new THREE.Float32BufferAttribute(flPos, 3)); flGeo.setAttribute("color", new THREE.Float32BufferAttribute(flCol, 3));
  setH.add(new THREE.Points(flGeo, new THREE.PointsMaterial({ size: 0.07, map: dotTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
  const hFloor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), floor.material); hFloor.rotation.x = -Math.PI / 2; hFloor.receiveShadow = true; setH.add(hFloor);
  function updateH(u, t) {
    // Morning light from a high window, and the three votives.
    key.position.set(-1.6, 3.4, 2.4); key.target.position.set(0, CLOTH_Y, 0.4); key.angle = 0.5; key.penumbra = 1; key.distance = 0; key.decay = 2;
    key.intensity = 40; key.shadow.autoUpdate = true; key.color.set(0xfff0dc);
    xKey.color.set(0xffd9b0); xKey.intensity = 0.35; xKey.position.set(2, 3, -2);
    xRim.color.set(0xffc39a); xRim.intensity = 0.6; xRim.position.set(0, 1.5, -4);
    xGlow.intensity = 0;
    settingsH.forEach((s, i) => {
      const f = motion ? 0.85 + 0.1 * Math.sin(t * 9 + i * 2) + 0.05 * Math.sin(t * 21 + i) : 0.9;
      s.flame.getWorldPosition(candles[i].pl.position); candles[i].pl.intensity = 0.05 * f; s.flame.scale.set(1, 2.4 * (0.9 + 0.1 * f), 1);
    });
  }
  const keysH = [
    [0.00, V3(0.4, 0.9, 1.06), V3(0.04, 0.79, 0.52), 26],
    [0.36, V3(0.16, 1.12, 1.18), V3(0.0, 0.78, 0.5), 30],
    [0.70, V3(-0.5, 1.0, 1.08), V3(0.0, 0.82, 0.34), 32],
    [1.00, V3(-0.1, 0.9, 0.6), V3(0.09, 0.85, 0.21), 36]
  ];
  /* ---------- Set J, "Getting ready": the bride's room, the morning of. Her shoes hang from the floor lamp; on the vanity,
     everything laid out in order: the tied gele, the wrapper, the clutch, her coral beads, her phone. The wall mirror
     shows the room behind the camera: the bride at her makeup, the artist, and the photographer passing. ---------- */
  const setJ = new THREE.Group(); setJ.visible = false; scene.add(setJ);
  const jBg = new THREE.Color(0x120c09);
  const jFloor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), floor.material); jFloor.rotation.x = -Math.PI / 2; jFloor.receiveShadow = true; setJ.add(jFloor);
  const jPlaster = new THREE.MeshStandardMaterial({ color: 0xcdb9a0, roughness: 0.95 });
  [[0, 1.6, -0.62, 0], [0, 1.6, 3.4, Math.PI], [-2.2, 1.6, 1.4, Math.PI / 2], [2.4, 1.6, 1.4, -Math.PI / 2]].forEach(([x, y, z, ry]) => { const w = new THREE.Mesh(new THREE.PlaneGeometry(8, 3.2), jPlaster); w.position.set(x, y, z); w.rotation.y = ry; w.receiveShadow = true; setJ.add(w); });
  // The window to the left, its sheer curtains glowing with morning light.
  const j_sheerTex = canvasTex(256, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); for (let k = 0; k <= 16; k++) gr.addColorStop(k / 16, k % 2 ? "rgba(255,246,228,.92)" : "rgba(235,220,196,.7)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const j_sheerGeo = (() => { const g = new THREE.PlaneGeometry(1.3, 2.4, 80, 4), pa = g.attributes.position; for (let i = 0; i < pa.count; i++) pa.setZ(i, Math.sin(pa.getX(i) * 38) * 0.025 + Math.sin(pa.getX(i) * 9) * 0.03); g.computeVertexNormals(); return g; })();
  const j_sheer = new THREE.Mesh(j_sheerGeo, new THREE.MeshBasicMaterial({ map: j_sheerTex, color: new THREE.Color(2.4, 2.2, 1.95), transparent: true, opacity: 0.95, side: THREE.DoubleSide }));
  j_sheer.position.set(-1.55, 1.55, -0.6); setJ.add(j_sheer);
  // The vanity: ivory lacquer.
  const j_lacquer = new THREE.MeshPhysicalMaterial({ color: 0xf1e8da, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.15 });
  const VT = 0.76;
  const j_vTop = new THREE.Mesh(new RoundedBoxGeometry(1.2, 0.04, 0.5, 3, 0.01), j_lacquer); j_vTop.position.set(0, VT - 0.02, -0.3); setJ.add(j_vTop);
  [[-0.56, -0.08], [0.56, -0.08], [-0.56, -0.52], [0.56, -0.52]].forEach(([x, z]) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.012, VT - 0.04, 12), j_lacquer); l.position.set(x, (VT - 0.04) / 2, z); setJ.add(l); });
  // The wall mirror above the vanity: a real reflection of the room.
  const jMirror = new Reflector(new THREE.PlaneGeometry(0.78, 1.0), { textureWidth: 300, textureHeight: 384, color: 0xb3aca2, clipBias: 0.003 }); // a soft, low-detail reflection, the way a mirror across the room reads
  jMirror.position.set(0, 1.5, -0.6); setJ.add(jMirror);
  const jFrame = new THREE.Mesh(frameGeo(0.86, 1.08, 0.02, 0.78, 1.0, 0.004, 0.025, 0.004).rotateX(Math.PI / 2), goldPolish); jFrame.position.set(0, 1.5, -0.615); setJ.add(jFrame);
  // The gele, already tied, waiting on its block at the left of the vanity.
  const j_blockMat = new THREE.MeshPhysicalMaterial({ color: 0xd8c3a2, roughness: 0.75, sheen: 0.3, sheenColor: 0xfff0d8 });
  const j_block = new THREE.Group(); j_block.position.set(-0.38, VT, -0.34); j_block.rotation.y = 0.35; setJ.add(j_block);
  j_block.add(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.025, 32).translate(0, 0.0125, 0), goldPolish));
  j_block.add(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.15, 16).translate(0, 0.1, 0), goldPolish));
  j_block.add(new THREE.Mesh(new THREE.LatheGeometry([[0.0001, 0.17], [0.05, 0.17], [0.04, 0.2], [0.036, 0.25], [0.045, 0.28], [0.075, 0.31], [0.09, 0.35], [0.088, 0.39], [0.075, 0.42], [0.05, 0.44], [0.0001, 0.452]].map(([r, y]) => new THREE.Vector2(r, y)), 64).scale(0.92, 1, 1.04), j_blockMat));
  const geleCloth = new THREE.MeshPhysicalMaterial({ color: 0x6a1428, roughness: 0.34, metalness: 0.35, sheen: 1, sheenColor: 0xf0c878, sheenRoughness: 0.35, normalMap: ribNormal, normalScale: new THREE.Vector2(0.3, 0.3), side: THREE.DoubleSide });
  const j_gele = new THREE.Mesh(haloGele(0.98), geleCloth); j_gele.position.y = 0.365; j_block.add(j_gele);
  // Her wrapper, folded: the same aso-oke as the family's rolls.
  const j_wrapper = new THREE.Group(); j_wrapper.position.set(-0.12, VT, -0.24); j_wrapper.rotation.y = -0.15; setJ.add(j_wrapper);
  [[0.28, 0.022, 0.2, 0.011], [0.25, 0.02, 0.18, 0.032]].forEach(([w, h, d, y], k) => { const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.008), MAT.wine.flat); m.position.set(k * 0.012, y, k * -0.008); m.rotation.y = k * 0.04; j_wrapper.add(m); });
  const j_crystal = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0.3, roughness: 0.02, iridescence: 0.6, iridescenceIOR: 1.9, envMapIntensity: 3, emissive: 0x30302c });
  // The clutch: a champagne glitter box, the front half set with crystals, a jewelled clasp on top.
  const j_glitter = canvasTex(512, 256, (g, w, h) => { g.fillStyle = "#b9a184"; g.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { const l = 55 + rand() * 45; g.fillStyle = `hsla(${32 + rand() * 12},${30 + rand() * 30}%,${l}%,.9)`; g.fillRect(rand() * w, rand() * h, 1.6, 1.6); } });
  const j_clutchMat = new THREE.MeshPhysicalMaterial({ map: j_glitter, metalness: 0.9, roughness: 0.38, clearcoat: 0.3 });
  const j_clutch = new THREE.Group(); j_clutch.position.set(0.1, VT, -0.3); j_clutch.rotation.y = 0.25; setJ.add(j_clutch);
  const j_clutchBody = new THREE.Mesh(new RoundedBoxGeometry(0.19, 0.11, 0.06, 4, 0.022), j_clutchMat); j_clutchBody.position.y = 0.055; j_clutch.add(j_clutchBody);
  { const NS2 = 160, cr = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0045, 10, 8), j_crystal, NS2), dd = new THREE.Object3D(); let n = 0;
    for (let row = 0; row < 10 && n < NS2; row++) for (let col = 0; col < 16 && n < NS2; col++) { const x = 0.005 + col * 0.0058, y = 0.012 + row * 0.0092; if (x > 0.09) continue; dd.position.set(x + (row % 2) * 0.0029, y, 0.0305); dd.scale.setScalar(0.8 + rand() * 0.5); dd.updateMatrix(); cr.setMatrixAt(n++, dd.matrix); }
    cr.count = n; j_clutch.add(cr); }
  const j_clasp = new THREE.Mesh(new THREE.OctahedronGeometry(0.012, 0).scale(1, 1.3, 0.7), j_crystal); j_clasp.position.set(0, 0.122, 0); j_clutch.add(j_clasp);
  const j_claspBase = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.009, 0.01, 16), goldPolish); j_claspBase.position.set(0, 0.113, 0); j_clutch.add(j_claspBase);
  // Edo coral on a burgundy velvet bust: three layered strands of chunky coral with gold filigree beads, earrings beside.
  const j_bust = new THREE.Mesh(new THREE.LatheGeometry([[0.0001, 0], [0.09, 0], [0.095, 0.02], [0.1, 0.1], [0.13, 0.17], [0.135, 0.2], [0.07, 0.23], [0.035, 0.25], [0.035, 0.31], [0.0001, 0.315]].map(([r, y]) => new THREE.Vector2(r, y)), 48).scale(1, 1, 0.55), velvetDeep);
  j_bust.position.set(0.3, VT, -0.36); setJ.add(j_bust);
  const j_coralTone = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.2 });
  const j_NCB = mobile ? 120 : 170, j_jBeads = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), j_coralTone, j_NCB);
  const j_filigree = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), goldPolish, 40);
  {
    const d = new THREE.Object3D(), c = new THREE.Color(); let i = 0, f = 0;
    [[0.03, 0.2, 0.0075], [0.075, 0.17, 0.0085], [0.12, 0.14, 0.0095]].forEach(([drop, yTop, br], sI) => {
      const n = 44 - sI * 4;
      for (let k = 0; k < n && i < j_NCB; k++) {
        const t = k / (n - 1), a = Math.PI * (0.08 + 0.84 * t), x = Math.cos(a) * (0.07 + sI * 0.02), y = yTop - Math.sin(a) * drop, z = 0.05 + Math.sin(a) * (0.022 + sI * 0.006);
        if (k % 6 === 3 && f < 40) { d.position.set(0.3 + x, VT + y, -0.36 + z); d.scale.setScalar(br * 0.95); d.rotation.set(0, 0, 0); d.updateMatrix(); j_filigree.setMatrixAt(f++, d.matrix); continue; }
        d.position.set(0.3 + x, VT + y, -0.36 + z); d.rotation.set(rand() * 6, rand() * 6, rand() * 6); d.scale.set(br * (0.8 + rand() * 0.5), br * (0.9 + rand() * 0.6), br * (0.8 + rand() * 0.4)); d.updateMatrix(); j_jBeads.setMatrixAt(i, d.matrix);
        j_jBeads.setColorAt(i++, c.setHSL(0.03 + rand() * 0.015, 0.78, 0.5 + rand() * 0.08));
      }
    });
    // A matching bracelet on the vanity.
    for (let k = 0; k < 16 && i < j_NCB; k++) { const a = k / 16 * Math.PI * 2; d.position.set(0.47 + Math.cos(a) * 0.032, VT + 0.0065, -0.2 + Math.sin(a) * 0.032); d.rotation.set(rand() * 6, rand() * 6, 0); d.scale.setScalar(0.0068); d.updateMatrix(); j_jBeads.setMatrixAt(i, d.matrix); j_jBeads.setColorAt(i++, c.setHSL(0.035, 0.76, 0.52)); }
    j_jBeads.count = i; j_filigree.count = f;
  }
  setJ.add(j_filigree);
  setJ.add(j_jBeads);
  [[0.2, -0.12], [0.235, -0.11]].forEach(([x, z], k) => { const e = new THREE.Group(); e.position.set(x, VT + 0.003, z); e.rotation.y = k * 0.6; e.add(new THREE.Mesh(new THREE.TorusGeometry(0.011, 0.0018, 8, 24).rotateX(Math.PI / 2), goldPolish)); const drop = new THREE.Mesh(new THREE.SphereGeometry(0.0062, 12, 8).scale(1, 1.4, 1), new THREE.MeshPhysicalMaterial({ color: 0xc23a28, roughness: 0.25, clearcoat: 1 })); drop.position.set(0, 0.002, 0.016); e.add(drop); setJ.add(e); });
  const j_perfume = new THREE.Group(); j_perfume.position.set(-0.08, VT, -0.46); setJ.add(j_perfume);
  j_perfume.add(new THREE.Mesh(new RoundedBoxGeometry(0.07, 0.1, 0.045, 3, 0.008).translate(0, 0.05, 0), crystalGlass));
  j_perfume.add(new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.07, 0.035, 3, 0.006).translate(0, 0.045, 0), new THREE.MeshPhysicalMaterial({ color: 0xf2c48a, transmission: 0.8, roughness: 0.05, thickness: 0.03 })));
  j_perfume.add(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.035, 24).translate(0, 0.118, 0), goldPolish));
  // Her phone, lit with messages, on the table.
  const brideCanvas = document.createElement("canvas"); brideCanvas.width = 540; brideCanvas.height = 1100;
  { const g = brideCanvas.getContext("2d"), w = 540, h = 1100, bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, "#3a2418"); bg.addColorStop(1, "#120a07"); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = "#000"; g.beginPath(); g.roundRect(w / 2 - 74, 22, 148, 42, 21); g.fill();
    g.textAlign = "center"; g.fillStyle = "#f4efe6"; g.font = '200 150px "Figtree", Arial'; g.fillText("11:48", w / 2, 290); g.font = '400 30px "Figtree", Arial'; g.fillStyle = "#d8c8b8"; g.fillText("Saturday 12 December", w / 2, 350);
    [["Tunde", "See you at the altar."], ["Mama", "I am here, my daughter. Don't rush."], ["Aunty Bisi", "We are on our way!"], ["Sade (planner)", "Car at 12:30. Photographer at 12."]].forEach(([n, m], k) => { const y = 470 + k * 140; g.fillStyle = "rgba(255,248,240,.16)"; g.beginPath(); g.roundRect(30, y, w - 60, 120, 26); g.fill(); g.textAlign = "left"; g.fillStyle = "#f4efe6"; g.font = '600 28px "Figtree", Arial'; g.fillText(n, 60, y + 48); g.fillStyle = "rgba(244,239,230,.8)"; g.font = '400 26px "Figtree", Arial'; g.fillText(m, 60, y + 88); g.textAlign = "right"; g.fillStyle = "rgba(244,239,230,.55)"; g.font = '400 22px "Figtree", Arial'; g.fillText(k ? k * 4 + "m ago" : "now", w - 56, y + 48); }); }
  const brideTex = new THREE.CanvasTexture(brideCanvas); brideTex.colorSpace = THREE.SRGBColorSpace; brideTex.anisotropy = maxAniso;
  const bridePhone = new THREE.Group(); bridePhone.position.set(0.44, VT + 0.0045, -0.2); bridePhone.rotation.y = -0.45; setJ.add(bridePhone);
  bridePhone.add(makePhone(0xd9a48c));
  const brideScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.0685, 0.1465), new THREE.MeshBasicMaterial({ map: brideTex, color: new THREE.Color(1.1, 1.1, 1.1) })); brideScreen.rotation.x = -Math.PI / 2; brideScreen.position.y = 0.0049; bridePhone.add(brideScreen);
  // The floor lamp beside the vanity, its shade lit, and her shoes hung from its hook by their ankle straps.
  const j_lamp = new THREE.Group(); j_lamp.position.set(0.86, 0, -0.36); setJ.add(j_lamp);
  j_lamp.add(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.03, 40).translate(0, 0.015, 0), goldPolish));
  j_lamp.add(new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.013, 1.56, 16).translate(0, 0.8, 0), goldPolish));
  const j_lampShade = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.28, 48, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xf3e3c8, roughness: 0.9, side: THREE.DoubleSide, emissive: 0xffb873, emissiveIntensity: 0.9 })); j_lampShade.position.y = 1.72; j_lamp.add(j_lampShade);
  const j_hook = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V3(0, 1.2, 0), V3(0.08, 1.2, 0.06), V3(0.13, 1.19, 0.1), V3(0.14, 1.23, 0.11)]), 24, 0.005, 8), goldPolish); j_lamp.add(j_hook);
  // Her shoes: pointed rose-gold pumps with a line of crystals round the topline and a crystal slingback.
  const j_shoeMat = new THREE.MeshPhysicalMaterial({ color: 0xf6b9a0, metalness: 0.9, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 2.2, emissive: 0x3c1a10, emissiveIntensity: 0.5, side: THREE.DoubleSide }); // mirror rose gold, lifted by the shade's glow // lifted a little: the shade's glow falls on them
  const j_soleMat = new THREE.MeshPhysicalMaterial({ color: 0x2a1a14, roughness: 0.5 });
  const j_innerMat = new THREE.MeshStandardMaterial({ color: 0xc8907a, roughness: 0.55, side: THREE.DoubleSide }); // nude leather lining
  function j_makeShoe() {
    const grp = new THREE.Group();
    // The sole line, toe (x = 0.13) to heel seat (x = -0.105), and the half-width of the shoe along it (pointed at the toe).
    const soleY = (x) => x > 0.06 ? 0 : x > -0.03 ? 0.012 * (0.06 - x) / 0.09 + 0.03 * Math.pow((0.06 - x) / 0.09, 2) : 0.042 + (-0.03 - x) * 0.58;
    const halfW = (x) => x > 0.03 ? 0.034 * Math.pow(Math.max(0, 1 - (x - 0.03) / 0.1), 0.75) : 0.034 - Math.max(0, -0.06 - x) * 0.12;
    const X0 = -0.105, X1 = 0.13, NX = 48, NT = 20;
    // The upper: a toe box closed over the front, open from the throat back, and a low heel counter.
    const pos = [], idx = [];
    for (let i = 0; i <= NX; i++) { const x = X0 + (X1 - X0) * i / NX, w = halfW(x), y0 = soleY(x), top = x > 0.0 ? 0.032 * Math.sqrt(Math.max(0, 1 - (x - 0.0) / 0.13)) + 0.004 : x < -0.07 ? 0.045 : 0.006;
      for (let j = 0; j <= NT; j++) { const a = Math.PI * j / NT; pos.push(x, y0 + 0.004 + Math.sin(a) * (x > 0 ? top : 0.0) + (x <= 0 ? (1 - Math.abs(Math.cos(a))) * 0 : 0), Math.cos(a) * w); } }
    // Two walls along the sides for the open part, rising into the heel counter.
    for (let i = 0; i < NX; i++) for (let j = 0; j < NT; j++) { const a = i * (NT + 1) + j, b = a + NT + 1; const x = X0 + (X1 - X0) * i / NX; if (x <= 0.0) continue; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const upper = new THREE.BufferGeometry(); upper.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); upper.setIndex(idx); upper.computeVertexNormals();
    grp.add(new THREE.Mesh(upper, j_shoeMat));
    const wallPts = (side) => { const pts = []; for (let i = 0; i <= 30; i++) { const x = X0 + (0.0 - X0) * i / 30; pts.push(new THREE.Vector2(x, soleY(x))); } return pts; };
    [-1, 1].forEach((sd) => {
      const pts = wallPts(sd), wp = [], wi = [];
      pts.forEach((q, i) => { const h = q.x < -0.07 ? 0.052 : 0.024 + 0.028 * smooth(clamp(-q.x / 0.07, 0, 1)); wp.push(q.x, q.y + 0.003, sd * halfW(q.x), q.x, q.y + 0.003 + h, sd * halfW(q.x) * 0.96); if (i) { const a = (i - 1) * 2; wi.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } });
      const wg = new THREE.BufferGeometry(); wg.setAttribute("position", new THREE.Float32BufferAttribute(wp, 3)); wg.setIndex(wi); wg.computeVertexNormals(); grp.add(new THREE.Mesh(wg, j_shoeMat));
    });
    // The insole, pale leather, and the sole beneath.
    const outline = new THREE.Shape(); for (let i = 0; i <= 40; i++) { const x = X0 + (X1 - X0) * i / 40; i ? outline.lineTo(x, halfW(x)) : outline.moveTo(x, halfW(x)); } for (let i = 40; i >= 0; i--) { const x = X0 + (X1 - X0) * i / 40; outline.lineTo(x, -halfW(x)); }
    const bent = (geo, dy) => { geo.rotateX(Math.PI / 2); const pa = geo.attributes.position; for (let i = 0; i < pa.count; i++) pa.setY(i, pa.getY(i) + soleY(pa.getX(i)) + dy); geo.computeVertexNormals(); return geo; };
    grp.add(new THREE.Mesh(bent(new THREE.ShapeGeometry(outline, 4), 0.004), j_innerMat));
    grp.add(new THREE.Mesh(bent(new THREE.ExtrudeGeometry(outline, { depth: 0.004, bevelEnabled: false, curveSegments: 4 }), -0.001), j_soleMat));
    const heel = new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0032, 0.088, 20), j_shoeMat); heel.position.set(-0.096, 0.0, 0); heel.rotation.z = -0.06; grp.add(heel);
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.0032, 0.0032, 0.006, 10), j_soleMat); tip.position.set(-0.093, -0.045, 0); grp.add(tip);
    heel.position.y = 0.0; heel.translateY(-0.0); // the stiletto runs from the heel seat to the floor
    heel.position.set(-0.097, soleY(-0.097) - 0.044, 0); tip.position.set(-0.094, soleY(-0.097) - 0.09, 0);
    // Crystals along the throat of the toe box, and a crystal slingback round the heel.
    const NCr = 34, crystals = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.0042, 0), j_crystal, NCr * 2);
    { const dd = new THREE.Object3D(); for (let k = 0; k < NCr; k++) { const a = Math.PI * k / (NCr - 1), x = 0.0015; dd.position.set(x, soleY(x) + 0.006 + Math.sin(a) * 0.036, Math.cos(a) * halfW(x)); dd.updateMatrix(); crystals.setMatrixAt(k, dd.matrix);
        const b = Math.PI * 0.15 + Math.PI * 0.7 * k / (NCr - 1); dd.position.set(-0.105 - Math.sin(b) * 0.012, soleY(-0.105) + 0.055, Math.cos(b) * 0.036); dd.updateMatrix(); crystals.setMatrixAt(NCr + k, dd.matrix); } }
    grp.add(crystals);
    grp.userData.strap = V3(-0.112, soleY(-0.105) + 0.055, 0); // where it hangs from
    return grp;
  }
  // Hung by the ankle strap, each shoe swings toe down.
  [-0.04, 0.045].forEach((dz, k) => { const pivot = new THREE.Group(); pivot.position.set(0.14, 1.215, 0.11 + dz); pivot.rotation.set(0.12 - 0.2 * k, k ? -1.75 : -0.8, -1.3); /* turned to show the insole, heel and crystal lines */ j_lamp.add(pivot); const sh = j_makeShoe(); sh.position.copy(sh.userData.strap).multiplyScalar(-1); pivot.add(sh); });
  // The room behind the camera, seen only in the mirror: the bride in her robe at the makeup chair, the artist leaning
  // in with a brush, and the photographer who walks across with his camera up.
  const jPeople = new THREE.Group(); setJ.add(jPeople);
  const j_robe = new THREE.MeshPhysicalMaterial({ color: 0xf6efe4, roughness: 0.55, sheen: 1, sheenColor: 0xffffff });
  const j_black = new THREE.MeshPhysicalMaterial({ color: 0x18151a, roughness: 0.7, sheen: 0.5, sheenColor: 0x6a6070 });
  const skinJ = new THREE.MeshPhysicalMaterial({ color: 0x5c3420, roughness: 0.5, sheen: 0.4, sheenColor: 0xffc8a0 });
  function j_person(bodyGeo, mat, x, z, ry, sy, arms) {
    const p = new THREE.Group(); p.position.set(x, 0, z); p.rotation.y = ry; p.scale.set(1, sy, 1);
    p.add(new THREE.Mesh(bodyGeo, mat));
    const head = new THREE.Mesh(headGeoD, skinJ); head.position.y = 1.64; p.add(head);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.104, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.55).scale(0.9, 1.05, 1.02), j_black); hair.position.y = 1.655; p.add(hair);
    (arms || []).forEach(([a, b, c]) => { const m1 = new THREE.Mesh(sleeveGeo, mat); segM(a, b, m1.matrix); m1.matrixAutoUpdate = false; p.add(m1); const m2 = new THREE.Mesh(foreGeo, skinJ); segM(b, c, m2.matrix); m2.matrixAutoUpdate = false; p.add(m2); });
    jPeople.add(p); return p;
  }
  const j_bride = j_person(womanGeo, j_robe, -0.35, 2.3, Math.PI / 2 + 0.3, 0.74, [[V3(-0.19, 1.4, 0), V3(-0.22, 1.15, 0.12), V3(-0.12, 1.05, 0.3)], [V3(0.19, 1.4, 0), V3(0.22, 1.15, 0.12), V3(0.12, 1.05, 0.3)]]);
  const j_brideWrap = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.04, 12, 28).rotateX(Math.PI / 2 - 0.4).scale(1, 1, 1.15), j_robe); j_brideWrap.position.y = 1.7; j_bride.add(j_brideWrap); // a towel round her hair
  const j_chairJ = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.5, 0.46, 3, 0.04), j_black); j_chairJ.position.set(-0.4, 0.25, 2.32); jPeople.add(j_chairJ);
  j_person(womanGeo, j_black, 0.25, 2.0, -Math.PI / 2 - 0.35, 1.0, [[V3(0.19, 1.4, 0), V3(0.26, 1.22, 0.2), V3(0.12, 1.32, 0.42)], [V3(-0.19, 1.4, 0), V3(-0.24, 1.15, 0.1), V3(-0.2, 1.05, 0.3)]]);
  const j_photographer = j_person(manGeo, j_black, -1.6, 1.75, Math.PI / 2, 1.0, [[V3(0.25, 1.4, 0), V3(0.22, 1.32, 0.24), V3(0.06, 1.6, 0.3)], [V3(-0.25, 1.4, 0), V3(-0.2, 1.32, 0.24), V3(-0.06, 1.6, 0.3)]]);
  const j_camBody = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.1, 0.08, 2, 0.015), j_black); j_camBody.position.set(0, 1.62, 0.2); j_photographer.add(j_camBody);
  const j_camLens = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.1, 20).rotateX(Math.PI / 2), j_black); j_camLens.position.set(0, 1.62, 0.29); j_photographer.add(j_camLens);
  const j_camFlash = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffffff, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); j_camFlash.position.set(0, 1.72, 0.25); j_camFlash.scale.setScalar(0.5); j_camFlash.visible = false; j_photographer.add(j_camFlash);
  setJ.traverse((m) => { if (m.isMesh && m !== j_sheer && m !== jMirror && m.material !== crystalGlass) { m.castShadow = true; m.receiveShadow = true; } });
  function updateJ(u, t) {
    // The photographer crosses the room behind the camera while it pulls back; his flash pops once.
    const walk = seg(u, 0.72, 0.98);
    j_photographer.position.x = lerp(-1.7, 1.9, walk) + Math.sin(t * 6) * 0.01 * motion; j_photographer.position.y = Math.abs(Math.sin(walk * 30)) * 0.02;
    const fk = u - 0.86; j_camFlash.visible = fk > 0 && fk < 0.02; j_camFlash.material.color.setScalar(j_camFlash.visible ? 40 * (1 - fk / 0.02) : 0);
    const buzz = motion && Math.sin(t * 2.2) > 0.6 ? Math.sin(t * 90) * 0.012 : 0; bridePhone.rotation.y = -0.45 + buzz;
    key.position.set(-1.7, 2.2, 1.4); key.target.position.set(0, VT + 0.2, -0.25); key.angle = 0.75; key.penumbra = 1; key.distance = 0; key.decay = 2;
    key.intensity = 30; key.shadow.autoUpdate = true; key.color.set(0xfff1de);
    xKey.color.set(0xffe6c8); xKey.intensity = 0.45; xKey.position.set(1, 2.5, 4);
    xRim.color.set(0xffd2a8); xRim.intensity = 0.5; xRim.position.set(-2, 1.5, -1);
    xGlow.color.set(0xffb873); xGlow.intensity = 3.2; xGlow.distance = 3; xGlow.position.set(0.9, 1.5, -0.1);
  }
  // The lamp and the shoes, then each thing on the vanity in turn, then all of it, with the mirror above.
  const keysJ = [
    [0.00, V3(1.08, 1.34, 0.5), V3(0.98, 1.1, -0.25), 24],
    [0.14, V3(1.4, 1.25, 0.75), V3(0.95, 1.05, -0.25), 22],
    [0.27, V3(0.62, 0.96, 0.06), V3(0.44, VT, -0.2), 30],
    [0.39, V3(0.42, 0.94, 0.0), V3(0.28, VT, -0.24), 32],
    [0.51, V3(0.18, 0.95, 0.02), V3(0.03, VT + 0.02, -0.28), 30],
    [0.63, V3(-0.16, 1.08, 0.12), V3(-0.36, VT + 0.32, -0.34), 28],
    [0.85, V3(0.05, 1.36, 1.3), V3(0.05, 1.08, -0.32), 16],
    [1.00, V3(0.08, 1.4, 1.45), V3(0.05, 1.1, -0.32), 15]
  ];
  /* ---------- The opening, on the box set (set A, 1 unit = 3 cm). Three groups of props, one per scene:
     R, Tunde's dresser before dinner; M, Table 14 at a wedding in December 2021; N, their dinner for two tonight. ---------- */
  const U = 1 / 0.03, TY = TABLE_Y;
  const propsR = new THREE.Group(), propsM = new THREE.Group(), propsN = new THREE.Group();
  [propsR, propsM, propsN].forEach((g) => { g.visible = false; setA.add(g); });
  const o_shadowed = (o) => { o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; };
  // Handwriting: ink that pools a little at the start of strokes, on lined writing paper.
  function o_handwriting(w, h, lines, opts) {
    return canvasTex(w, h, (g) => {
      g.fillStyle = opts.paper || "#f6f0e2"; g.fillRect(0, 0, w, h);
      for (let i = 0; i < w * h / 300; i++) { g.fillStyle = `rgba(120,95,60,${0.03 + rand() * 0.04})`; g.fillRect(rand() * w, rand() * h, 1 + rand() * 2, 1); }
      if (opts.ruled) { g.strokeStyle = "rgba(90,120,170,.22)"; g.lineWidth = 2; for (let y = opts.top; y < h - 40; y += opts.lh) { g.beginPath(); g.moveTo(40, y + 12); g.lineTo(w - 40, y + 12); g.stroke(); } }
      g.textBaseline = "alphabetic"; g.fillStyle = opts.ink || "#1f2638";
      lines.forEach(([txt, struck, size], k) => {
        const y = opts.top + k * opts.lh, x = opts.left + (k % 2 ? 6 : 0);
        g.save(); g.translate(x, y); g.rotate((rand() - 0.5) * 0.012);
        g.font = `${size || opts.size}px "Pinyon Script", cursive`; g.fillText(txt, 0, 0);
        if (struck) { const tw = g.measureText(txt).width; g.strokeStyle = opts.ink || "#1f2638"; g.lineWidth = 3.4; g.beginPath(); g.moveTo(-6, -opts.size * 0.28); for (let xx = 0; xx <= tw + 12; xx += 24) g.lineTo(xx, -opts.size * 0.28 + Math.sin(xx * 0.08) * 2.5); g.stroke(); }
        g.restore();
      });
    });
  }
  // R. The speech: a sheet folded once, written and rewritten.
  const o_speechTex = o_handwriting(1024, 1400, [["Chidinma,"], ["these past five years…", true], ["I have rehearsed this too many times", true], ["Since that night at table fourteen,"], ["you made a crowded room feel quiet."], ["Every table after that one,"], ["I have wanted you beside me."], ["So —", true], ["Will you…"]], { ruled: true, top: 190, lh: 100, left: 110, size: 46 });
  const o_speech = new THREE.Group(); o_speech.position.set(-1.5, TY + 0.02, 1.15); o_speech.rotation.y = 0.18; propsR.add(o_speech);
  { const W = 21 / 3, H = 29.7 / 3 / 2, paper = new THREE.MeshStandardMaterial({ map: o_speechTex, roughness: 0.85, side: THREE.DoubleSide });
    // Two halves of an A4 sheet, the crease still lifting the paper a little.
    const lower = new THREE.Mesh(new THREE.PlaneGeometry(W, H), paper); lower.rotation.x = -Math.PI / 2 + 0.03; lower.position.set(0, 0.06, H / 2 - 0.02);
    const geoU = new THREE.PlaneGeometry(W, H); const uv = geoU.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, 0.5 + uv.getY(i) * 0.5);
    const geoL = lower.geometry, uvl = geoL.attributes.uv; for (let i = 0; i < uvl.count; i++) uvl.setY(i, uvl.getY(i) * 0.5);
    const upper = new THREE.Mesh(geoU, paper); upper.rotation.x = -Math.PI / 2 - 0.035; upper.position.set(0, 0.09, -H / 2 + 0.02);
    o_speech.add(lower, upper); o_shadowed(o_speech); }
  // R. His watch: a gold case, an ivory dial at twenty to eight, a burgundy leather strap.
  const o_watch = new THREE.Group(); o_watch.position.set(2.3, TY, 2.0); o_watch.rotation.y = -0.6; propsR.add(o_watch);
  { const dial = canvasTex(512, 512, (g, w, h) => { g.fillStyle = "#f3ead8"; g.fillRect(0, 0, w, h); g.translate(w / 2, h / 2); g.fillStyle = "#b38a43";
      for (let k = 0; k < 12; k++) { g.save(); g.rotate(k * Math.PI / 6); g.fillRect(-5, -230, 10, k % 3 ? 26 : 44); g.restore(); }
      g.fillStyle = "#3a2a1c"; g.font = 'italic 34px "Bodoni Moda", Georgia, serif'; g.textAlign = "center"; g.fillText("Àríyá", 0, -90);
      const hand = (a, len, wd, c) => { g.save(); g.rotate(a); g.fillStyle = c; g.beginPath(); g.moveTo(-wd, 20); g.lineTo(0, -len); g.lineTo(wd, 20); g.fill(); g.restore(); };
      hand((7 + 40 / 60) / 12 * Math.PI * 2, 130, 9, "#2a1f16"); hand(40 / 60 * Math.PI * 2, 200, 7, "#2a1f16"); hand(0.3, 210, 2, "#8a1730");
      g.fillStyle = "#b38a43"; g.beginPath(); g.arc(0, 0, 12, 0, Math.PI * 2); g.fill(); });
    const caseM = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.68, 0.3, 48), goldPolish); caseM.position.y = 0.15; o_watch.add(caseM);
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.58, 48), new THREE.MeshPhysicalMaterial({ map: dial, roughness: 0.4, clearcoat: 1, clearcoatRoughness: 0.02 })); face.rotation.x = -Math.PI / 2; face.position.y = 0.305; o_watch.add(face);
    const bez = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 12, 64), goldPolish); bez.rotation.x = Math.PI / 2; bez.position.y = 0.3; o_watch.add(bez);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.14, 16), goldPolish); crown.rotation.z = Math.PI / 2; crown.position.set(0.74, 0.15, 0); o_watch.add(crown);
    const leather = new THREE.MeshPhysicalMaterial({ color: 0x4a1220, roughness: 0.55, clearcoat: 0.3, sheen: 0.4, sheenColor: 0xffc0b0 });
    [-1, 1].forEach((k) => { const strap = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V3(0, 0.12, k * 0.6), V3(0, 0.05, k * 1.4), V3(0.1, 0.03, k * 2.4), V3(0.3, 0.03, k * 3.1)]), 24, 1, 2), leather); strap.scale.set(0.46, 0.09, 1); o_watch.add(strap); });
    o_shadowed(o_watch); }
  // R. The Table 14 photograph, mostly hidden under the speech at first.
  const photoRT = new THREE.WebGLRenderTarget(900, 600, { type: THREE.HalfFloatType });
  function o_makePrint() {
    const g = new THREE.Group(), W = 15 / 3, H = 10 / 3, b = 0.22;
    const border = new THREE.Mesh(new THREE.BoxGeometry(W, 0.03, H), new THREE.MeshStandardMaterial({ color: 0xf4eee2, roughness: 0.7 })); border.position.y = 0.015; g.add(border);
    const img = new THREE.Mesh(new THREE.PlaneGeometry(W - b * 2, H - b * 2), new THREE.MeshPhysicalMaterial({ map: photoRT.texture, roughness: 0.32, clearcoat: 0.5, clearcoatRoughness: 0.2, color: new THREE.Color(1.06, 1.0, 0.92) }));
    img.rotation.x = -Math.PI / 2; img.position.y = 0.032; g.add(img);
    return o_shadowed(g);
  }
  const o_printR = o_makePrint(); o_printR.position.set(-3.6, TY + 0.005, -0.4); o_printR.rotation.y = 0.5; propsR.add(o_printR);
  // M. Table 14, December 2021: the card, two places side by side, a dish of jollof with its serving spoon, glasses,
  // and a runner of the hosts' burgundy and gold aso-oke.
  const o_card14 = paperPair(1024, 606, (g, w, h, C) => {
    foilFrame(g, w, h, C, 26); g.textAlign = "center";
    g.fillStyle = C.foil; g.font = '600 30px "Figtree", Arial'; g.letterSpacing = "14px"; g.fillText("TABLE", w / 2 + 7, 190); g.letterSpacing = "0px";
    g.fillStyle = C.ink; g.font = '300 210px "Figtree", Arial, sans-serif'; press(g, C, "14", w / 2, 425);
    g.fillStyle = C.muted; g.font = '500 20px "Figtree", Arial'; g.letterSpacing = "6px"; g.fillText("ADAEZE & FEMI · 18 · 12 · 2021", w / 2 + 3, 520); g.letterSpacing = "0px";
  });
  const o_tent14 = makeTent(o_card14, U * 1.1); o_tent14.position.set(0, TY, 0.4); propsM.add(o_tent14);
  // A folded napkin of the hosts' aso-oke, burgundy and gold, beside the card.
  const o_napkin14 = foldedStack(MAT.wine.flat, 0.4, 0.28, 3); o_napkin14.scale.setScalar(U * 0.32); o_napkin14.position.set(5.6, TY, -0.8); o_napkin14.rotation.y = -0.55; propsM.add(o_napkin14); // napkin-sized, beside the card, never against it
  const o_setting = (x, z, ry, parent) => {
    const st = new THREE.Group(); st.position.set(x, TY + 0.02, z); st.rotation.y = ry; st.scale.setScalar(U); parent.add(st);
    st.add(new THREE.Mesh(chargerGeoH, goldSatin));
    const pl = new THREE.Mesh(plateGeoH, porcelain); pl.position.y = 0.006; st.add(pl);
    const rim = new THREE.Mesh(plateRim, goldPolish); rim.position.y = 0.006; st.add(rim);
    [[-0.19, forkGeo], [0.19, knifeGeo]].forEach(([fx, geo]) => { const m = new THREE.Mesh(geo, goldPolish); m.position.set(fx, 0.0012, 0); st.add(m); });
    return o_shadowed(st);
  };
  o_setting(-6.2, -8.6, 0.1, propsM); o_setting(6.2, -8.6, -0.1, propsM); // their two places, side by side, behind the card
  // The jollof: a gold-rimmed dish, rice glossy with tomato and pepper, a few slices of fried plantain, the spoon.
  const o_riceTex = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = "#b8461c"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { const x = rand() * w, y = rand() * h, a = rand() * Math.PI; g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = `hsl(${12 + rand() * 14},${62 + rand() * 20}%,${36 + rand() * 22}%)`; g.beginPath(); g.ellipse(0, 0, 5.5, 2.2, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
    for (let i = 0; i < 60; i++) { g.fillStyle = rand() < 0.5 ? "#d62a1a" : "#e9d7b0"; g.fillRect(rand() * w, rand() * h, 6 + rand() * 6, 4); }
  });
  const o_jollof = new THREE.Group(); o_jollof.position.set(-10.5, TY, -1.5); propsM.add(o_jollof);
  { const dish = new THREE.Mesh(shell([[0.0001, 0], [0.1, 0], [0.13, 0.02], [0.16, 0.05], [0.165, 0.055]], 0.004, 64), porcelain); dish.scale.setScalar(U); o_jollof.add(dish);
    const drim = new THREE.Mesh(new THREE.TorusGeometry(0.163, 0.0016, 6, 96).rotateX(Math.PI / 2).translate(0, 0.055, 0), goldPolish); drim.scale.setScalar(U); o_jollof.add(drim);
    const mound = new THREE.Mesh((() => { const g = new THREE.SphereGeometry(0.15, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2), pa = g.attributes.position; for (let i = 0; i < pa.count; i++) { const v = V3(pa.getX(i), pa.getY(i), pa.getZ(i)); pa.setY(i, v.y * 0.45 + Math.sin(v.x * 90) * Math.cos(v.z * 80) * 0.002); } g.computeVertexNormals(); return g; })(), new THREE.MeshPhysicalMaterial({ map: o_riceTex, roughness: 0.45, clearcoat: 0.35, clearcoatRoughness: 0.3 }));
    mound.scale.setScalar(U); mound.position.y = 0.02 * U; o_jollof.add(mound);
    const plantain = new THREE.MeshPhysicalMaterial({ color: 0xc8771e, roughness: 0.4, clearcoat: 0.4 });
    for (let k = 0; k < 6; k++) { const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.008, 20).scale(1.6, 1, 1), plantain); const a = k * 0.55 + 2.2; sl.position.set(Math.cos(a) * 0.1 * U, (0.055 + 0.008 * (k % 2)) * U, Math.sin(a) * 0.1 * U); sl.rotation.set(0.25, a, 0.2); sl.scale.multiplyScalar(U); o_jollof.add(sl); }
    const spoon = new THREE.Mesh(spoonGeo, new THREE.MeshPhysicalMaterial({ color: 0xe8e4dc, metalness: 1, roughness: 0.14 })); spoon.scale.setScalar(U * 1.7); spoon.position.set(4.6, 0.08, 1.4); spoon.rotation.y = 0.5; o_jollof.add(spoon);
    o_shadowed(o_jollof); }
  [[-2.8, -4.4, gobletGeo], [3.2, -4.0, fluteGeo], [9.4, -4.8, gobletGeo]].forEach(([x, z, geo]) => { const gl = new THREE.Mesh(geo, crystalGlass); gl.scale.setScalar(U); gl.position.set(x, TY, z); propsM.add(gl); });
  // The party behind them, out of focus: warm lights, a few in the hosts' colours.
  const o_NPB = mobile ? 160 : 300, o_pbPos = [], o_pbCol = [];
  for (let i = 0; i < o_NPB; i++) { o_pbPos.push((rand() - 0.5) * 140, TY + 2 + rand() * 40, -28 - rand() * 70); const k = rand(), c = k < 0.6 ? [2.6, 1.6, 0.7] : k < 0.85 ? [2.4, 0.9, 1.0] : [2.6, 2.2, 1.8]; const b = 0.6 + rand() * 0.8; o_pbCol.push(c[0] * b, c[1] * b, c[2] * b); }
  const o_pbGeo = new THREE.BufferGeometry(); o_pbGeo.setAttribute("position", new THREE.Float32BufferAttribute(o_pbPos, 3)); o_pbGeo.setAttribute("color", new THREE.Float32BufferAttribute(o_pbCol, 3));
  propsM.add(new THREE.Points(o_pbGeo, new THREE.PointsMaterial({ size: 2.2, map: dotTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
  // N. Their dinner: the same print, now on the table, his note beside it, two glasses, two places, the candles.
  const o_printN = o_makePrint(); o_printN.position.set(-3.7, TY + 0.005, 0.9); o_printN.rotation.y = 0.22; propsN.add(o_printN);
  const o_noteTex = o_handwriting(1100, 760, [["My favourite seat", false, 120], ["was the one", false, 120], ["beside you.", false, 120], ["— T.", false, 84]], { top: 190, lh: 160, left: 110, size: 120, paper: "#f8f1e3", ink: "#262033" });
  const o_note = new THREE.Mesh(new THREE.BoxGeometry(12 / 3, 0.03, 8.3 / 3), [paperEdge, paperEdge, new THREE.MeshStandardMaterial({ map: o_noteTex, roughness: 0.8 }), paperEdge, paperEdge, paperEdge]);
  o_note.position.set(-1.3, TY + 0.056, 3.1); o_note.rotation.y = -0.12; propsN.add(o_shadowed(o_note)); // lying on the corner of the photograph, not through it
  [[2.6, -2.8, fluteGeo], [-1.0, -4.2, fluteGeo]].forEach(([x, z, geo]) => { const gl = new THREE.Mesh(geo, crystalGlass); gl.scale.setScalar(U); gl.position.set(x, TY, z); propsN.add(gl); const fz = new THREE.Mesh(fizzGeo, champagne); fz.scale.setScalar(U); fz.position.set(x, TY, z); propsN.add(fz); });
  o_setting(12.5, 4.5, -0.6, propsN); o_setting(-11.5, -9.5, 2.6, propsN); // their places, out of the close-ups
  // Cameras for the opening. Short dollies and deliberate focus; cuts where the story cuts.
  const keysR = [
    [0.00, V3(-1.2, 3.2, 5.2), V3(-1.55, TY, 0.8), 22],
    [0.30, V3(-0.8, 3.4, 5.8), V3(-1.1, TY, 0.7), 20],
    [0.56, V3(0.9, 2.8, 6.4), V3(1.6, TY + 0.2, 0.9), 18],
    [0.78, V3(2.6, 2.6, 5.6), V3(3.4, TY + 0.5, -0.8), 18],
    [0.88, V3(-1.6, 2.5, 3.6), V3(-1.8, TY, 0.75), 22],
    [1.00, V3(-1.7, 2.3, 3.3), V3(-1.85, TY, 0.75), 24]
  ];
  const keysM = [
    [0.00, V3(0, 1.6, 6.4), V3(0, 0.35, 0.4), 22],
    [0.45, V3(1.6, 2.6, 8.8), V3(0, 0.0, -0.6), 16],
    [1.00, V3(0.6, 8.5, 19.0), V3(-0.6, -0.8, -3.2), 10]
  ];
  const photoCam = new THREE.PerspectiveCamera(30, 1.5, 0.05, 200); photoCam.position.copy(keysM[2][1]); photoCam.lookAt(keysM[2][2]);
  const keysN1 = [
    [0.00, V3(-3.2, 3.8, 5.0), V3(-3.7, TY, 0.9), 20],
    [0.12, V3(-3.0, 3.6, 5.2), V3(-3.4, TY, 1.3), 20],
    [0.18, V3(-1.45, 4.0, 7.0), V3(-1.5, TY, 2.75), 20],
    [0.27, V3(-1.4, 3.9, 6.9), V3(-1.5, TY, 2.75), 20],
    [0.40, V3(-0.6, 4.8, 10.5), V3(-1.6, TY + 0.3, 1.4), 13],
    [0.60, V3(-0.4, 4.6, 10.2), V3(-1.4, TY + 0.3, 1.3), 13],
    [0.66, V3(-0.3, 4.55, 10.0), V3(-1.3, TY + 0.3, 1.2), 13]
  ];
  const keysN2 = [[0.66, V3(1.9, 1.2, 4.2), V3(0, -0.1, 0), 22], [0.70, V3(1.8, 1.15, 4.05), V3(0, -0.1, 0), 22]];
  const gemSeatY = RING_REST + gemC;
  const keysN3 = [[0.70, V3(0.9, gemSeatY + 0.75, 2.9), V3(0, gemSeatY - 0.15, 0), 26], [0.86, V3(0.75, gemSeatY + 0.66, 2.65), V3(0, gemSeatY - 0.12, 0), 28], [1.00, V3(0.6, gemSeatY + 0.6, 2.45), V3(0, gemSeatY - 0.1, 0), 30]];
  function camOpening(mode, u) {
    const ks = mode === "R" ? keysR : mode === "M" ? keysM : u < 0.66 ? keysN1 : u < 0.7 ? keysN2 : keysN3;
    if (OP.reduceMotion) { // composed stills instead of travelling moves
      let best = ks[0]; ks.forEach((k) => { if (k[0] <= u + 1e-6) best = k; });
      camPos.copy(best[1]); camLook.copy(best[2]); camAperture = best[3]; return;
    }
    camNew(ks, clamp(u, ks[0][0], ks[ks.length - 1][0]));
  }
  let photoDone = false;
  // The dance: dinner has been served. Jollof, a piece of chicken and fried plantain on most plates in the hall.
  const foodRice = new THREE.InstancedMesh(new THREE.SphereGeometry(0.068, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.4, 1), new THREE.MeshPhysicalMaterial({ map: o_riceTex, roughness: 0.45, clearcoat: 0.3 }), NS);
  const foodSide = new THREE.InstancedMesh(mergeGeometries([
    new THREE.CapsuleGeometry(0.017, 0.05, 4, 10).rotateZ(Math.PI / 2).scale(1, 0.8, 1.15).translate(0.03, 0.014, 0.045).toNonIndexed(),
    ...[0, 1, 2].map((k) => new THREE.CylinderGeometry(0.02, 0.02, 0.008, 16).scale(1.6, 1, 1).rotateY(k * 0.5).translate(-0.045 + k * 0.012, 0.006 + k * 0.004, -0.04 - k * 0.006).toNonIndexed())
  ]), new THREE.MeshPhysicalMaterial({ color: 0xa8521c, roughness: 0.4, clearcoat: 0.5 }), NS);
  {
    const d = new THREE.Object3D(), zero = new THREE.Matrix4().makeScale(0, 0, 0);
    tables.forEach(([tx, tz], ti) => { for (let s2 = 0; s2 < 10; s2++) {
      const i = ti * 10 + s2, sa = (s2 / 10) * Math.PI * 2 + ti * 0.37, served = rand() < 0.78;
      d.position.set(tx + Math.cos(sa) * 0.66, CLOTH_Y + 0.024, tz + Math.sin(sa) * 0.66); d.rotation.set(0, rand() * 6.28, 0); d.updateMatrix();
      foodRice.setMatrixAt(i, served ? d.matrix : zero); foodSide.setMatrixAt(i, served ? d.matrix : zero);
    } });
  }
  foodRice.visible = foodSide.visible = false; foodRice.castShadow = foodSide.castShadow = true; setB.add(foodRice, foodSide);
  // W, the way in: through the arch, down the aisle, rising over the dance floor into the overhead shot of the hall.
  const keysW = [
    [0.00, V3(0, 1.62, 15.2), V3(0, 1.45, 6), 14],
    [0.45, V3(0, 1.6, 10.6), V3(0, 1.25, 0), 16],
    [0.80, V3(0, 3.4, 6.0), V3(0, 0.6, -1.2), 20],
    [1.00, V3(0.3, 8.5, 3.6), V3(0, 0, -0.2), 26]
  ];
  [keysG, keysH, keysW, keysJ].forEach((ks) => ks.forEach((k) => { k[1] = k[1].clone(); k[2] = k[2].clone(); }));

  /* ---------- Render pipeline: HDR scene, lens blur, bloom, film ---------- */
  let pr = Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.5, OP.embed ? 1.25 : 9);
  const sceneRT = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  sceneRT.depthTexture = new THREE.DepthTexture(1, 1, THREE.FloatType);
  const dofRT = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
  const quadVS = "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";
  const dofMat = new THREE.ShaderMaterial({
    defines: { SAMPLES: mobile ? 36 : 72 },
    uniforms: {
      tColor: { value: sceneRT.texture }, tDepth: { value: sceneRT.depthTexture },
      near: { value: 0.05 }, far: { value: 120 }, focus: { value: 5 }, aperture: { value: 10 }, maxBlur: { value: 24 },
      texel: { value: new THREE.Vector2() }, time: { value: 0 }
    },
    vertexShader: quadVS,
    fragmentShader: /* glsl */`
      uniform sampler2D tColor; uniform sampler2D tDepth; uniform float near, far, focus, aperture, maxBlur, time; uniform vec2 texel;
      varying vec2 vUv;
      float viewZ(vec2 uv) { float d = texture2D(tDepth, uv).x; return (near * far) / ((far - near) * d - far) * -1.0; }
      float coc(float z) { return min(abs(1.0 - focus / z) * aperture, maxBlur); }
      float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
      void main() {
        float zc = viewZ(vUv), cc = coc(zc);
        vec3 col = texture2D(tColor, vUv).rgb; float tot = 1.0;
        float rot = ign(gl_FragCoord.xy + fract(time) * 37.0) * 6.2831853;
        for (int i = 0; i < SAMPLES; i++) {
          float fi = float(i) + 0.5;
          float r = sqrt(fi / float(SAMPLES)) * maxBlur;
          float a = fi * 2.39996323 + rot;
          vec2 uv = vUv + vec2(cos(a), sin(a)) * r * texel;
          float zs = viewZ(uv), cs = coc(zs);
          if (zs > zc) cs = min(cs, cc * 2.0);
          float m = smoothstep(r - 1.5, r + 0.5, cs);
          vec3 s = texture2D(tColor, uv).rgb;
          col += mix(col / tot, s, m); tot += 1.0;
        }
        gl_FragColor = vec4(col / tot, 1.0);
      }`
  });
  const dofQuad = new FullScreenQuad(dofMat);
  // Ambient occlusion from the depth buffer alone: where surfaces meet (a box on a table, a card on a cloth), light is
  // blocked and the crease darkens. This grounds objects the way a real lens and real light do.
  const aoRT = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
  const aoMat = new THREE.ShaderMaterial({
    defines: { AO_SAMPLES: mobile ? 8 : 14 },
    uniforms: { tColor: { value: sceneRT.texture }, tDepth: { value: sceneRT.depthTexture }, proj: { value: new THREE.Matrix4() }, projInv: { value: new THREE.Matrix4() }, radius: { value: 0.5 }, strength: { value: 0 }, time: { value: 0 } },
    vertexShader: quadVS,
    fragmentShader: /* glsl */`
      uniform sampler2D tColor; uniform sampler2D tDepth; uniform mat4 proj, projInv; uniform float radius, strength, time;
      varying vec2 vUv;
      vec3 viewPos(vec2 uv) { float d = texture2D(tDepth, uv).x; vec4 v = projInv * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); return v.xyz / v.w; }
      float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
      void main() {
        vec3 col = texture2D(tColor, vUv).rgb;
        float d = texture2D(tDepth, vUv).x;
        if (strength <= 0.0 || d >= 0.9999) { gl_FragColor = vec4(col, 1.0); return; }
        vec3 P = viewPos(vUv);
        vec3 N = normalize(cross(dFdx(P), dFdy(P)));
        float rot = ign(gl_FragCoord.xy + fract(time) * 31.0) * 6.2831853, occ = 0.0;
        for (int i = 0; i < AO_SAMPLES; i++) {
          float fi = float(i) + 0.5, a = fi * 2.39996323 + rot, r = sqrt(fi / float(AO_SAMPLES)) * radius;
          vec3 S = P + vec3(cos(a), sin(a), 0.0) * r + N * r * 0.35;
          vec4 sp = proj * vec4(S, 1.0); vec2 suv = sp.xy / sp.w * 0.5 + 0.5;
          vec3 V = viewPos(suv) - P; float dist = length(V) + 1e-4;
          occ += max(dot(N, V / dist) - 0.08, 0.0) * (1.0 - smoothstep(radius * 0.6, radius * 1.6, dist));
        }
        float ao = clamp(1.0 - strength * occ / float(AO_SAMPLES) * 1.6, 0.0, 1.0);
        gl_FragColor = vec4(col * ao, 1.0);
      }`
  });
  const aoQuad = new FullScreenQuad(aoMat);
  dofMat.uniforms.tColor.value = aoRT.texture;
  // Clean edges on gold rims, glass and lettering: SMAA after the grade.
  const ldrRT = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false });
  const smaa = new SMAAPass(1, 1); smaa.renderToScreen = true;
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.42, 0.5, 1.8);
  const finalMat = new THREE.ShaderMaterial({
    uniforms: {
      tColor: { value: dofRT.texture }, time: { value: 0 }, exposure: { value: 1 }, grain: { value: 0.045 }, ca: { value: 0.0024 },
      vignette: { value: 0.55 }, fade: { value: 0 }, aspect: { value: 1 }, warmth: { value: 0 },
      tPrev: { value: null }, prevMix: { value: 0 }, prevZoom: { value: 1 }
    },
    vertexShader: quadVS,
    fragmentShader: /* glsl */`
      uniform sampler2D tColor, tPrev; uniform float time, exposure, grain, ca, vignette, fade, aspect, warmth, prevMix, prevZoom;
      varying vec2 vUv;
      vec3 aces(vec3 c) {
        const mat3 IM = mat3(0.59719, 0.07600, 0.02840, 0.35458, 0.90834, 0.13383, 0.04823, 0.01566, 0.83777);
        const mat3 OM = mat3(1.60475, -0.10208, -0.00327, -0.53108, 1.10813, -0.07276, -0.07367, -0.00605, 1.07602);
        c = IM * (c / 0.6);
        c = (c * (c + 0.0245786) - 0.000090537) / (c * (0.983729 * c + 0.4329510) + 0.238081);
        return clamp(OM * c, 0.0, 1.0);
      }
      vec3 srgb(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
      float hash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
      void main() {
        vec2 c = vUv - 0.5; float r2 = dot(c * vec2(aspect, 1.0), c * vec2(aspect, 1.0)) / (aspect * aspect * 0.25 + 0.25);
        vec2 uv = 0.5 + c * (1.0 - 0.035 * r2) ;
        vec2 off = c * ca * r2;
        vec3 col = vec3(texture2D(tColor, uv + off).r, texture2D(tColor, uv).g, texture2D(tColor, uv - off).b);
        col *= exposure;
        col = aces(col);
        // Grade: warm, slightly matte blacks, gentle split tone.
        float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
        // Grade: contrast S-curve, wine-tinted shadows, warm gold highlights, richer colour.
        col = col * col * (3.0 - 2.0 * col) * 0.55 + col * 0.45;
        l = dot(col, vec3(0.2126, 0.7152, 0.0722));
        vec3 shadowTint = vec3(1.05, 0.9, 0.93), highTint = vec3(1.06, 1.0, 0.88);
        col *= mix(shadowTint, highTint, smoothstep(0.08, 0.7, l));
        col = mix(vec3(l), col, 1.12 + 0.06 * warmth);
        col = max(col, 0.0) + vec3(0.012, 0.004, 0.006) * (1.0 - l);
        col *= 1.0 - vignette * smoothstep(0.15, 1.15, r2);
        col = srgb(col);
        float g = (hash(gl_FragCoord.xy + fract(time * 13.7) * 197.0) + hash(gl_FragCoord.xy * 1.37 + fract(time * 7.3) * 91.0) - 1.0);
        col += g * grain * (0.35 + 1.4 * l * (1.0 - l));
        col *= 1.0 - fade;
        // A cut: the last frame of the shot before, held and drifting gently closer, dissolves into this one.
        if (prevMix > 0.001) col = mix(col, texture2D(tPrev, 0.5 + (vUv - 0.5) / prevZoom).rgb, prevMix);
        gl_FragColor = vec4(col, 1.0);
      }`
  });
  const finalQuad = new FullScreenQuad(finalMat);
  const holdRT = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false });
  const copyMat = new THREE.ShaderMaterial({ uniforms: { t: { value: null } }, vertexShader: quadVS, fragmentShader: "uniform sampler2D t; varying vec2 vUv; void main() { gl_FragColor = texture2D(t, vUv); }" });
  const copyQuad = new FullScreenQuad(copyMat); copyMat.uniforms.t.value = ldrRT.texture;
  finalMat.uniforms.tPrev.value = holdRT.texture;
  let lastCut = -1, cutT0 = -10, cutsHeld = 0;
  const DISSOLVE = 1.15; // seconds

  let sizedW = 0, sizedH = 0, sizedPr = 0;
  function resize() {
    const w = window.innerWidth, h = OP.vh();
    // The address bar sliding in or out fires resize without changing the stable size: reallocating every target would clear them and flash.
    if (w === sizedW && h === sizedH && pr === sizedPr) return;
    sizedW = w; sizedH = h; sizedPr = pr;
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    const W = Math.floor(w * pr), H = Math.floor(h * pr);
    sceneRT.setSize(W, H); dofRT.setSize(W, H); bloom.setSize(W, H); aoRT.setSize(W, H); ldrRT.setSize(W, H); holdRT.setSize(W, H); smaa.setSize(W, H);
    dofMat.uniforms.texel.value.set(1 / W, 1 / H);
    dofMat.uniforms.maxBlur.value = Math.round(H * 0.024);
    finalMat.uniforms.aspect.value = w / h;
    camera.aspect = w / h;
    camera.fov = w < h ? 48 : 34;
    if (OP.embed === "hero") {
      if (w > 960) camera.setViewOffset(w, h, -w * 0.2, 0, w, h);
      else camera.setViewOffset(w, h, 0, h * 0.2, w, h);
    } else if (OP.embed === "hall" && w > 960) camera.setViewOffset(w, h, -w * 0.12, 0, w, h);
    else if (!OP.embed) camera.setViewOffset(w, h, 0, h * (w < h ? 0.16 : 0.12), w, h); // subject above the words
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  // Compile every material in every set up front, hidden props included, so no cut stalls the first time it plays.
  // Lights keep their own visibility: the light count must stay as it will be when the film runs.
  const hidden = [];
  scene.traverse((o) => { if (!o.visible && !o.isLight) { hidden.push(o); o.visible = true; } });
  scene.background = envTex;
  OP.loaded = 0.8;
  try { if (renderer.compileAsync) await renderer.compileAsync(scene, camera); else renderer.compile(scene, camera); } catch (e) { renderer.compile(scene, camera); }
  hidden.forEach((o) => { o.visible = false; });
  OP.loaded = 1;

  let px = 0, pxT = 0, pyT = 0, py = 0;
  window.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    pxT = (e.clientX / window.innerWidth * 2 - 1);
    pyT = (e.clientY / window.innerHeight * 2 - 1);
  });

  const tmpV = new THREE.Vector3(), tmpM = new THREE.Matrix4(), dummy = new THREE.Object3D();
  const envRotM = new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(-envEuler.x, -envEuler.y, -envEuler.z)));
  gemMat.uniforms.envRot.value.copy(envRotM);
  let tStart = -1, introEntered = false, lastSet = "", frameAvg = 16, lastT = 0, slowFrames = 0;

  OP.render = function (p, t) {
    // The lens opens once behind the door, and again (from dark, out of focus) as the visitor walks in.
    if (tStart < 0 && OP.gateLoop) tStart = t;
    if (OP.entered && !introEntered) { introEntered = true; tStart = t; }
    canvas.classList.add("live");
    if (OP.covered) return;
    const intro = tStart < 0 ? 0 : motion ? smooth((t - tStart) / 3.2) : 1;
    px += (pxT - px) * 0.04; py += (pyT - py) * 0.04;

    // Which set is on screen: the original chapters (A, the box; B, the hall) or the new ones (C, the colour; D, the send-off).
    const SC = OP.scene || { mode: "old", local: 0, fade: 0 };
    // T, the place kept, is the hall (set B) with its own camera.
    // The opening (R, M, N) is played on the box set (A) with its own props and cameras.
    const OPEN = SC.mode === "R" || SC.mode === "M" || SC.mode === "N";
    const mode = SC.mode === "T" || SC.mode === "W" || OPEN ? "old" : SC.mode, isNew = mode !== "old", atTable = SC.mode === "T", atWalk = SC.mode === "W";
    // The Table 14 photograph is that table, photographed: render the memory's last frame once into the print.
    if (!photoDone && OP.loaded >= 1) {
      photoDone = true;
      const vis = [setA, setB, setC, setD, setE, setF, setG, setH, setJ].map((g) => g.visible);
      [setB, setC, setD, setE, setF, setG, setH, setJ].forEach((g) => { g.visible = false; });
      setA.visible = true; propsR.visible = propsN.visible = false; propsM.visible = true; box.visible = ring.visible = false; satinCloth.visible = petals.visible = false;
      scene.background = envTex; scene.backgroundIntensity = 0.1; scene.environment = envTex; scene.environmentIntensity = 0.22;
      key.position.set(2.8, 6.2, 3.6); key.target.position.set(0, 0, 0); key.intensity = 150; key.color.set(0xffd2a4); key.shadow.needsUpdate = true;
      candles.forEach((c) => { c.pl.intensity = 12; });
      photoCam.updateMatrixWorld();
      renderer.setRenderTarget(photoRT); renderer.render(scene, photoCam); renderer.setRenderTarget(null);
      [setA, setB, setC, setD, setE, setF, setG, setH, setJ].forEach((g, i) => { g.visible = vis[i]; });
      lastSet = "";
    }
    const inA = !isNew && p < 0.675;
    setA.visible = inA; setB.visible = !isNew && !inA; setC.visible = mode === "C"; setD.visible = mode === "D"; setE.visible = mode === "E"; setF.visible = mode === "F"; setG.visible = mode === "G"; setH.visible = mode === "H"; setJ.visible = mode === "J";
    const setName = isNew ? mode : inA ? "A" + (OPEN ? SC.mode : "") : "B";
    if (setName !== lastSet) {
      lastSet = setName;
      scene.environment = mode === "D" ? envNight : envTex;
      if (mode === "C") { scene.background = silkBg; scene.environmentIntensity = 0.2; scene.fog.density = 0; }
      else if (mode === "E") { scene.background = roomBg; scene.environment = envRoom; scene.environmentIntensity = 0.06; scene.fog.density = 0; }
      else if (mode === "F") { scene.background = fBg; scene.environment = envRoom; scene.environmentIntensity = 0.06; scene.fog.density = 0; }
      else if (mode === "D") { scene.background = nightBg; scene.environmentIntensity = 0; scene.fog.density = 0; }
      else if (mode === "G") { scene.background = gBg; scene.environment = envRoom; scene.environmentIntensity = 0.12; scene.fog.density = 0; }
      else if (mode === "J") { scene.background = jBg; scene.environment = envRoom; scene.environmentIntensity = 0.25; scene.fog.density = 0; }
      else if (mode === "H") { scene.background = hallColor; scene.environmentIntensity = 0.45; scene.fog.density = 0; }
      else if (inA && SC.mode === "R") { scene.background = roomBg; scene.environment = envRoom; scene.environmentIntensity = 0.1; scene.fog.density = 0; }
      else if (inA) { scene.background = envTex; scene.backgroundIntensity = 0.08; scene.environmentIntensity = 0.17; scene.fog.density = 0; }
      else { scene.background = hallColor; scene.environmentIntensity = 0.38; scene.fog.density = 0.022; hallKey.shadow.needsUpdate = true; }
    }
    if (mode !== "C" && mode !== "D" && mode !== "G" && mode !== "H" && mode !== "J") { xKey.intensity = 0; xRim.intensity = 0; xGlow.intensity = 0; }
    if (mode !== "E") lightsE.forEach((l) => { l.intensity = 0; });
    if (mode !== "F") lightsF.forEach((l) => { l.intensity = 0; });
    // At Table 1: her chair pulled out, her bag beside it; the rest of that table stays out of the picture.
    const want = atTable ? "out" : "tucked";
    if (want !== mamaState) { mamaState = want; placeMama(want); hallKey.shadow.needsUpdate = true; }
    const hideT = atTable ? TABLE1 : -1;
    if (hideT !== hideTable) { hideTable = hideT; seatsLit = -1; }

    if (OP.velvet !== velvetNow) applyVelvet(OP.velvet);
    if (isNew) {
      key.shadow.autoUpdate = false; key.intensity = 0; rim.intensity = 0; hallKey.intensity = 0;
      candles.forEach((c) => { c.pl.intensity = 0; });
      movers.forEach((m) => { m.spot.intensity = 0; });
      if (mode === "C") updateC(SC.local, t); else if (mode === "D") updateD(SC.local, t); else if (mode === "E") updateE(SC.local, t); else if (mode === "G") updateG(SC.local, t); else if (mode === "H") updateH(SC.local, t); else if (mode === "J") updateJ(SC.local, t); else updateF(SC.local, t);
    } else if (inA) {
      // The key and the candle lights are lent to the newer close-ups; put them back where the box needs them.
      key.position.set(2.8, 6.2, 3.6); key.target.position.set(0, 0, 0); key.angle = 0.42; key.penumbra = 0.85; key.color.set(0xffdcb8);
      candles.forEach((c) => { c.pl.position.copy(c.fl.position); });
      // Which props are on the table. The ring box first appears on Tunde's dresser, closed; at dinner it is only there
      // after the blackout, set down while her eyes were closed; the lid is open from the cut after the hinge.
      const sm = SC.mode, u = SC.local;
      propsR.visible = sm === "R"; propsM.visible = sm === "M"; propsN.visible = sm === "N";
      satinCloth.visible = petals.visible = !OPEN;
      candles.forEach((c) => { const on = sm !== "R"; c.meshes.forEach((m) => { m.visible = on; }); c.halo.visible = on; });
      box.visible = !OPEN || sm === "R" || (sm === "N" && u >= 0.5);
      ring.visible = !OPEN || (sm === "N" && u >= 0.5);
      if (sm === "R") { box.position.set(3.6, 0, -1.0); box.rotation.y = 0.55; } else { box.position.set(0, 0, 0); }
      // Box: open from the hinge cut in the opening, and open for the rest of the film.
      const open = OPEN ? (sm === "N" && u >= 0.7 ? 1 : 0) : 1;
      lidPivot.rotation.x = -(1.86 * open + 0.09 * Math.sin(open * Math.PI));
      if (sm !== "R") box.rotation.y = OPEN ? -0.18 : 0;
      // In the opening the ring stays seated in its slot. After the yes it lifts out of the box in one slow turn and
      // floats there for the rest of the film: one movement, all in one shot.
      // Seated, the band lies exactly along the slit between the two cushions (the ring's own plane is the box's x axis).
      ring.position.set(box.position.x, RING_REST, box.position.z); ring.rotation.set(0, box.rotation.y, 0);
      if (!OPEN) {
        const lift = seg(p, 0.12, 0.195); // straight up and clear of the cushion first
        const settle = clamp((p - 0.195) / 0.035, 0, 1); // at the top it rises a touch past, then settles back
        ring.position.y = lerp(RING_REST, RING_UP, lift) + 0.045 * Math.sin(settle * Math.PI) * (1 - settle * 0.5) + Math.sin(t * 0.9) * 0.025 * lift * motion;
        // One unhurried turn as it rises, so the stone shows itself all the way round, then it settles facing us.
        const spin = smooth(clamp((p - 0.195) / 0.08, 0, 1)) * (Math.PI * 2 - 0.35); // then the turn, in the air, ending three-quarters on
        ring.rotation.y = box.rotation.y + spin + Math.sin(t * 0.35) * 0.06 * motion * lift + px * 0.12 * lift;
        ring.rotation.x = py * 0.08 * lift;
        ring.rotation.z = Math.sin(t * 0.5) * 0.05 * lift * motion;
      }
      const dim = OPEN ? 1 : 1 - 0.72 * bump(p, 0.29, 0.34, 0.45, 0.48);
      const flare = OPEN ? 1 : 1 + 1.2 * bump(p, 0.47, 0.5, 0.52, 0.57) + 0.35 * bump(p, 0.6, 0.64, 0.66, 0.7);
      // Each scene has its own light: a single warm lamp on his dresser; the party's warmth for the memory; candles at dinner.
      if (sm === "R") { key.position.set(-4.5, 6.5, 2.0); key.color.set(0xffc283); key.intensity = 120; key.angle = 0.5; key.penumbra = 1; }
      else if (sm === "M") { key.color.set(0xffd2a4); key.intensity = 150; }
      else if (sm === "N") { key.color.set(0xffcf9c); key.intensity = 95; }
      else key.intensity = 140 * dim * Math.min(flare, 1.5);
      rim.intensity = (sm === "R" ? 0.15 : sm === "N" ? 0.4 : 0.6) * dim;
      scene.environmentIntensity = (sm === "R" ? 0.1 : sm === "M" ? 0.22 : 0.17) * dim;
      scene.backgroundIntensity = (sm === "M" ? 0.1 : 0.08) * (0.5 + 0.5 * dim);
      gemMat.uniforms.envIntensity.value = (sm === "N" ? 0.75 : 0.9 * dim * flare);
      gemMat.uniforms.sparkle.value = sm === "N" ? 0.35 : dim * flare; // one soft candle reflection, nothing more
      candles.forEach((c) => {
        const f = motion ? 0.82 + 0.1 * Math.sin(t * 9 + c.seed) + 0.08 * Math.sin(t * 23.7 + c.seed * 3) : 0.9;
        c.pl.intensity = sm === "R" ? 0 : 14 * f * (0.6 + 0.4 * dim) * (sm === "N" ? 0.7 : 1);
        c.fl.scale.set(1, 2.6 * (0.9 + 0.1 * f), 1);
        c.fl.position.x = c.base.x + (motion ? Math.sin(t * 3 + c.seed) * 0.02 : 0);
      });
      // Gem uniforms: camera in gem space, and the real light directions for sparkle.
      gem.updateWorldMatrix(true, false);
      gemMat.uniforms.camObj.value.copy(camera.position).applyMatrix4(tmpM.copy(gem.matrixWorld).invert());
      gemMat.uniforms.model3.value.setFromMatrix4(gem.matrixWorld);
      gem.getWorldPosition(tmpV);
      sparkDirs[0].copy(key.position).sub(tmpV).normalize();
      sparkDirs[1].copy(candles[0].base).sub(tmpV).normalize();
      sparkDirs[2].copy(candles[1].base).sub(tmpV).normalize();
      bagStones.forEach((m) => { m.updateWorldMatrix(true, false); m.material.uniforms.camObj.value.copy(camera.position).applyMatrix4(tmpM.copy(m.matrixWorld).invert()); m.material.uniforms.model3.value.setFromMatrix4(m.matrixWorld); });
      const dp = dustGeo.attributes.position;
      for (let i = 0; i < DUST; i++) {
        let y = dp.array[i * 3 + 1] + (0.0012 + 0.0008 * Math.sin(dustSeed[i])) * motion;
        if (y > TABLE_Y + 4) y = TABLE_Y;
        dp.array[i * 3 + 1] = y;
        dp.array[i * 3] += Math.sin(t * 0.3 + dustSeed[i]) * 0.0008 * motion;
      }
      dp.needsUpdate = true;
      dustMat.opacity = 0.55 * dim;
      key.shadow.autoUpdate = true;
      hallKey.intensity = 0;
      movers.forEach((m) => { m.spot.intensity = 0; });
    } else {
      key.shadow.autoUpdate = false;
      key.intensity = 0; rim.intensity = 0;
      candles.forEach((c) => { c.pl.intensity = 0; });
      const hv0 = atWalk ? 0.8 : seg(p, 0.675, 0.72);
      movers.forEach((m) => {
        const sx = m.x < 0 ? 1 : -1, sz = m.z < 0 ? -1 : 1;
        m.head.rotation.set(sz * (0.42 + 0.28 * Math.sin(t * 0.37 * motion + m.seed)), 0, sx * (0.5 + 0.3 * Math.sin(t * 0.5 * motion + m.seed * 2)));
        m.head.updateMatrixWorld();
        m.spot.target.position.copy(m.head.localToWorld(tmpV.set(0, -10, 0)));
        m.spot.intensity = 45 * hv0;
        m.beam.material.opacity = hv0;
      });
      // The dance: the floor fills with family and friends for the last chapter of the night.
      const dancing = !atTable && !atWalk && p >= 0.885;
      danceMeshes.forEach((m) => { m.visible = dancing; });
      [seatedBodies, seatedHeads, seatedGele, seatedFila, foodRice, foodSide].forEach((m) => { m.visible = dancing; }); napkins.visible = !dancing;
      if (dancing) animateDancers(t);
      flashes.forEach((fl) => {
        if (motion && t - fl.t0 > 0.9 && Math.random() < 0.015 && OP.seated > 10) {
          const pick = Math.random() < 0.5 ? guestSeat[seatOrder[Math.floor(Math.random() * OP.seated)]] : dancers[Math.floor(Math.random() * ND)];
          fl.sp.position.set(pick.x, 1.5, pick.z); fl.t0 = t;
        }
        const k = t - fl.t0; fl.sp.visible = k < 0.2;
        if (fl.sp.visible) { const e = Math.exp(-k * 26); fl.sp.material.color.setScalar(60 * e); fl.sp.scale.setScalar(0.5 + 0.9 * e); }
      });
      const hv = atWalk ? 0.85 : seg(p, 0.675, 0.72);
      hallKey.intensity = 1.35 * hv * (1 - 0.75 * seg(p, 0.89, 0.95));
      lightSeats(!atTable && !atWalk && p >= 0.885 ? 999 : OP.seated);
      goboMat.opacity = 0.32 + 0.4 * seg(p, 0.84, 0.95);
      const cf = seg(p, 0.89, 0.95);
      conf.visible = cf > 0.001;
      if (conf.visible) {
        for (let i = 0; i < CONF; i++) {
          const c = confData[i];
          const y = 4.6 - ((c.y0 + t * c.sp * (motion ? 1 : 0.1)) % 4.8) - (1 - cf) * 3;
          dummy.position.set(c.x + Math.sin(t * 1.3 + c.sw) * 0.18, y, c.z + Math.cos(t + c.sw) * 0.1);
          dummy.rotation.set(t * c.rs, t * c.rs * 0.7, c.sw);
          dummy.updateMatrix();
          conf.setMatrixAt(i, dummy.matrix);
        }
        conf.instanceMatrix.needsUpdate = true;
      }
      notes.visible = cf > 0.001;
      if (notes.visible) {
        for (let i = 0; i < NN; i++) {
          const n = noteData[i];
          const y = Math.max(0.012, 3.4 - ((n.y0 + t * n.sp * (motion ? 1 : 0.1)) % 3.6)) - (1 - cf) * 3;
          dummy.position.set(Math.cos(n.a) * n.r + Math.sin(t * 0.9 + n.sw) * 0.25, y, Math.sin(n.a) * n.r);
          if (y <= 0.012) dummy.rotation.set(-Math.PI / 2, 0, n.sw);
          else dummy.rotation.set(Math.sin(t * n.rs + n.sw) * 1.2, t * n.rs * 0.5 + n.sw, Math.cos(t * n.rs * 0.8) * 0.8);
          dummy.updateMatrix(); notes.setMatrixAt(i, dummy.matrix);
        }
        notes.instanceMatrix.needsUpdate = true;
      }
    }

    // Camera: keyframed path, a little handheld breath, and the pointer as a slight parallax.
    if (OPEN) camOpening(SC.mode, SC.local);
    else if (atTable) camNew(keysT, SC.local);
    else if (atWalk) camNew(keysW, SC.local);
    else if (isNew) camNew(mode === "C" ? keysC : mode === "D" ? keysD : mode === "E" ? keysE : mode === "G" ? keysG : mode === "H" ? keysH : mode === "J" ? keysJ : keysF, SC.local); else cameraAt(p);
    if (!isNew && !OPEN && OP.pro < 1) {
      // Prologue: a wide, drifting establishing shot of the table that settles onto the box.
      const k = smooth(OP.pro);
      camPos.lerpVectors(estPos.set(3.4 + Math.sin(t * 0.1) * 0.4 * motion, 4.4, 13.5), camPos, k);
      camLook.lerpVectors(estLook, camLook, k);
      camAperture = lerp(46, camAperture, k);
    }
    // The canopy is only drawn once the camera is under it: the overhead shots of the hall look straight through the roof.
    canopy.visible = fairy.visible = setB.visible && camPos.y < canopyH(camPos.x, camPos.z) - 0.8;
    if (OP.gateLoop && motion) { // the slow orbit behind the door
      const a = Math.sin(t * 0.11) * 0.32, dx = camPos.x - camLook.x, dz = camPos.z - camLook.z;
      camPos.x = camLook.x + dx * Math.cos(a) - dz * Math.sin(a); camPos.z = camLook.z + dx * Math.sin(a) + dz * Math.cos(a);
    }
    camera.position.copy(camPos);
    camera.position.x += px * 0.12; camera.position.y -= py * 0.06;
    camera.lookAt(camLook);
    if (motion) {
      camera.rotateX((Math.sin(t * 0.71) * 0.6 + Math.sin(t * 1.93) * 0.4) * 0.0022);
      camera.rotateY((Math.sin(t * 0.53 + 1) * 0.6 + Math.sin(t * 1.61) * 0.4) * 0.0026);
      camera.rotateZ(Math.sin(t * 0.37) * 0.0015);
    }
    const focusDist = camPos.distanceTo(camLook);
    const close = mode === "E" || mode === "F" || mode === "G" || mode === "H" || mode === "J";
    camera.near = mode === "D" ? 0.3 : close ? 0.01 : inA || mode === "C" ? 0.05 : 0.2; camera.far = mode === "D" ? 1300 : close ? 30 : inA || mode === "C" ? 60 : 90;
    camera.updateProjectionMatrix();

    // Lens: the page opens out of focus, then pulls focus onto the box.
    const H1080 = sceneRT.height / 1080;
    dofMat.uniforms.near.value = camera.near; dofMat.uniforms.far.value = camera.far;
    dofMat.uniforms.focus.value = focusDist * lerp(0.35, 1, intro) * (1 + (motion ? Math.sin(t * 0.6) * 0.006 : 0));
    dofMat.uniforms.aperture.value = camAperture * H1080 * lerp(2.2, 1, intro);
    dofMat.uniforms.time.value = motion ? t : 0;

    renderer.setRenderTarget(sceneRT);
    renderer.render(scene, camera);
    OP.frameInfo = { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, pixelRatio: pr };
    // Contact shadows, scaled to each set (the box table is in centimetres, the hall and rooms in metres).
    aoMat.uniforms.proj.value.copy(camera.projectionMatrix); aoMat.uniforms.projInv.value.copy(camera.projectionMatrixInverse);
    aoMat.uniforms.radius.value = inA ? 0.9 : mode === "C" ? 0.22 : mode === "G" || mode === "H" || mode === "J" ? 0.03 : close ? 0.07 : 0.35;
    aoMat.uniforms.strength.value = mode === "D" ? 0 : 0.85;
    aoMat.uniforms.time.value = motion ? t : 0;
    renderer.setRenderTarget(aoRT);
    aoQuad.render(renderer);
    renderer.setRenderTarget(dofRT);
    dofQuad.render(renderer);
    bloom.render(renderer, null, dofRT, 0, false);
    renderer.setRenderTarget(null);
    finalMat.uniforms.time.value = motion ? t : 0;
    // The hall is pulled down while the invitation is on screen so the paper reads.
    finalMat.uniforms.exposure.value = (mode === "C" ? 0.95 : mode === "D" ? 1.05 : mode === "E" ? 1.0 : mode === "F" ? 0.95 : mode === "G" || mode === "H" || mode === "J" ? 1.0 : inA ? 0.9 : 0.95 * (1 - 0.5 * bump(p, 0.67, 0.69, 0.77, 0.79))) * lerp(0.15, 1, intro);
    finalMat.uniforms.warmth.value = inA ? 0 : 1;
    // Blackout only where the story asks for it (she closes her eyes); cuts dissolve instead.
    finalMat.uniforms.fade.value = Math.max(SC.fade || 0, OP.blackout || 0);
    if (SC.cut !== undefined && SC.cut !== lastCut) {
      if (lastCut >= 0 && Math.abs(SC.cut - lastCut) <= 2) { renderer.setRenderTarget(holdRT); copyQuad.render(renderer); cutT0 = t; cutsHeld++; } // hold the outgoing frame
      lastCut = SC.cut;
    }
    const dk = clamp((t - cutT0) / DISSOLVE, 0, 1);
    finalMat.uniforms.prevMix.value = 1 - smooth(dk);
    finalMat.uniforms.prevZoom.value = 1 + 0.035 * dk * motion;
    OP.state = { cam: camera.position.toArray().map((v) => +v.toFixed(2)), setA: setA.visible, propsR: propsR.visible, set: lastSet, box: box.visible && setA.visible, ring: ring.visible && setA.visible, lid: -lidPivot.rotation.x, ringY: ring.position.y, ringRest: RING_REST, fade: finalMat.uniforms.fade.value, dissolve: finalMat.uniforms.prevMix.value, cutsHeld };
    renderer.setRenderTarget(ldrRT);
    finalQuad.render(renderer);
    smaa.render(renderer, null, ldrRT);


    // Keep the frame rate up: lower the render resolution if frames run long.
    const dt = (t - lastT) * 1000; lastT = t;
    if (dt > 0 && dt < 200) frameAvg = frameAvg * 0.95 + dt * 0.05;
    if (frameAvg > 30 && pr > 0.7) { if (++slowFrames > 90) { pr = Math.max(0.7, pr - 0.2); resize(); slowFrames = 0; frameAvg = 20; } }
    else slowFrames = 0;
  };
}
