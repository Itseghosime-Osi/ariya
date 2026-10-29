// Procedural textures for floors, dance floors and light washes, drawn on canvases so the hall
// needs no image downloads.
import * as THREE from "three";
import { rng } from "./geo.js";

function canvas(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  return c;
}

function tex(c, { srgb = true, repeat = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

const cache = new Map();
function cached(key, make) {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
}

/** Polished marble tiles, 2 × 2 tiles of 1.2 m per texture (so one repeat is 2.4 m). */
export function marble(base = "#f2eee8") {
  return cached("marble" + base, () =>
    tex(
      canvas(1024, 1024, (g, w, h) => {
        const r = rng(11);
        g.fillStyle = base;
        g.fillRect(0, 0, w, h);
        for (let tile = 0; tile < 4; tile++) {
          const ox = (tile % 2) * 512;
          const oy = Math.floor(tile / 2) * 512;
          g.save();
          g.beginPath();
          g.rect(ox, oy, 512, 512);
          g.clip();
          const grad = g.createLinearGradient(ox, oy, ox + 512, oy + 512);
          grad.addColorStop(0, "rgba(255,255,255,0.35)");
          grad.addColorStop(1, "rgba(180,170,160,0.12)");
          g.fillStyle = grad;
          g.fillRect(ox, oy, 512, 512);
          for (let v = 0; v < 7; v++) {
            g.strokeStyle = `rgba(${120 + r() * 40},${115 + r() * 30},${110 + r() * 30},${0.08 + r() * 0.18})`;
            g.lineWidth = 0.6 + r() * 2.4;
            g.beginPath();
            let x = ox + r() * 512;
            let y = oy;
            g.moveTo(x, y);
            while (y < oy + 512) {
              const nx = x + (r() - 0.5) * 90;
              const ny = y + 30 + r() * 60;
              g.quadraticCurveTo(x + (r() - 0.5) * 80, (y + ny) / 2, nx, ny);
              x = nx;
              y = ny;
            }
            g.stroke();
          }
          g.restore();
        }
        g.strokeStyle = "rgba(150,140,130,0.35)";
        g.lineWidth = 2;
        for (const p of [0, 512, 1024]) {
          g.beginPath();
          g.moveTo(p, 0);
          g.lineTo(p, h);
          g.moveTo(0, p);
          g.lineTo(w, p);
          g.stroke();
        }
      })
    )
  );
}

/** Oak planks, about 2.4 m per repeat. */
export function wood(base = "#a9764a") {
  return cached("wood" + base, () =>
    tex(
      canvas(1024, 1024, (g, w, h) => {
        const r = rng(5);
        const col = new THREE.Color(base);
        const plank = w / 12;
        for (let i = 0; i < 12; i++) {
          let y = -r() * h;
          while (y < h) {
            const len = h * (0.35 + r() * 0.4);
            const c = col
              .clone()
              .offsetHSL(0, (r() - 0.5) * 0.05, (r() - 0.5) * 0.08);
            g.fillStyle = `#${c.getHexString()}`;
            g.fillRect(i * plank, y, plank, len);
            for (let k = 0; k < 14; k++) {
              g.strokeStyle = `rgba(60,35,15,${0.05 + r() * 0.08})`;
              g.lineWidth = 1;
              g.beginPath();
              const x = i * plank + r() * plank;
              g.moveTo(x, y);
              g.bezierCurveTo(
                x + 4,
                y + len / 3,
                x - 4,
                y + (2 * len) / 3,
                x + 2,
                y + len
              );
              g.stroke();
            }
            g.fillStyle = "rgba(40,22,10,0.55)";
            g.fillRect(i * plank, y, plank, 2);
            y += len;
          }
          g.fillStyle = "rgba(40,22,10,0.45)";
          g.fillRect(i * plank, 0, 1.5, h);
        }
      })
    )
  );
}

/** Deep patterned banquet carpet. */
export function carpet(base = "#4a0f1c", motif = "#c9a465") {
  return cached("carpet" + base + motif, () =>
    tex(
      canvas(512, 512, (g, w, h) => {
        g.fillStyle = base;
        g.fillRect(0, 0, w, h);
        const r = rng(9);
        for (let i = 0; i < 9000; i++) {
          g.fillStyle = `rgba(0,0,0,${r() * 0.12})`;
          g.fillRect(r() * w, r() * h, 2, 2);
        }
        g.strokeStyle = motif;
        g.globalAlpha = 0.45;
        g.lineWidth = 3;
        for (let y = 0; y <= 2; y++)
          for (let x = 0; x <= 2; x++) {
            const cx = x * 256;
            const cy = y * 256;
            g.beginPath();
            g.moveTo(cx, cy - 70);
            g.quadraticCurveTo(cx + 70, cy, cx, cy + 70);
            g.quadraticCurveTo(cx - 70, cy, cx, cy - 70);
            g.stroke();
            g.beginPath();
            g.arc(cx, cy, 18, 0, Math.PI * 2);
            g.stroke();
          }
        g.globalAlpha = 1;
      })
    )
  );
}

export function checker() {
  return cached("checker", () =>
    tex(
      canvas(256, 256, (g) => {
        for (let y = 0; y < 2; y++)
          for (let x = 0; x < 2; x++) {
            g.fillStyle = (x + y) % 2 ? "#111013" : "#f4f1ea";
            g.fillRect(x * 128, y * 128, 128, 128);
          }
      })
    )
  );
}

export function parquet() {
  return cached("parquet", () =>
    tex(
      canvas(512, 512, (g, w) => {
        const r = rng(4);
        const s = w / 4;
        for (let y = 0; y < 4; y++)
          for (let x = 0; x < 4; x++) {
            const c = new THREE.Color("#b07a45").offsetHSL(
              0,
              0,
              (r() - 0.5) * 0.1
            );
            g.fillStyle = `#${c.getHexString()}`;
            g.fillRect(x * s, y * s, s, s);
            g.strokeStyle = "rgba(50,28,12,0.5)";
            g.lineWidth = 2;
            for (let k = 1; k < 4; k++) {
              g.beginPath();
              if ((x + y) % 2) {
                g.moveTo(x * s + (k * s) / 4, y * s);
                g.lineTo(x * s + (k * s) / 4, y * s + s);
              } else {
                g.moveTo(x * s, y * s + (k * s) / 4);
                g.lineTo(x * s + s, y * s + (k * s) / 4);
              }
              g.stroke();
            }
            g.strokeRect(x * s, y * s, s, s);
          }
      })
    )
  );
}

/** A grid of glowing LED panels (used as both colour and emissive map). */
export function led(seed = 2) {
  return cached("led" + seed, () =>
    tex(
      canvas(512, 512, (g, w) => {
        const r = rng(seed);
        const palette = [
          "#ff3d7f",
          "#ffb347",
          "#7c4dff",
          "#00d1ff",
          "#ffffff",
          "#ff6f3c",
          "#e9c98a",
        ];
        const n = 8;
        const s = w / n;
        g.fillStyle = "#050406";
        g.fillRect(0, 0, w, w);
        for (let y = 0; y < n; y++)
          for (let x = 0; x < n; x++) {
            const c = palette[Math.floor(r() * palette.length)];
            const grad = g.createRadialGradient(
              x * s + s / 2,
              y * s + s / 2,
              2,
              x * s + s / 2,
              y * s + s / 2,
              s * 0.7
            );
            grad.addColorStop(0, c);
            grad.addColorStop(1, "#0a0710");
            g.fillStyle = grad;
            g.fillRect(x * s + 3, y * s + 3, s - 6, s - 6);
          }
      })
    )
  );
}

/** Soft vertical light wash: bright at the bottom centre, fading up and to the sides. */
export function wash() {
  return cached("wash", () =>
    tex(
      canvas(128, 256, (g, w, h) => {
        const img = g.createImageData(w, h);
        for (let y = 0; y < h; y++)
          for (let x = 0; x < w; x++) {
            const u = (x / (w - 1) - 0.5) * 2;
            const v = 1 - y / (h - 1);
            const spread = 0.25 + v * 0.75;
            const a =
              Math.max(0, 1 - Math.abs(u) / spread) ** 1.6 * (1 - v) ** 1.4;
            const i = (y * w + x) * 4;
            img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
            img.data[i + 3] = Math.round(a * 255);
          }
        g.putImageData(img, 0, 0);
      }),
      { repeat: false }
    )
  );
}

/** Round glow sprite. */
export function glow() {
  return cached("glow", () =>
    tex(
      canvas(128, 128, (g, w) => {
        const grad = g.createRadialGradient(
          w / 2,
          w / 2,
          0,
          w / 2,
          w / 2,
          w / 2
        );
        grad.addColorStop(0, "rgba(255,255,255,1)");
        grad.addColorStop(0.25, "rgba(255,255,255,0.45)");
        grad.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = grad;
        g.fillRect(0, 0, w, w);
      }),
      { repeat: false }
    )
  );
}

/** Light beam: fades out along the length and towards the edges (for open cones). */
export function beam() {
  return cached("beam", () =>
    tex(
      canvas(64, 256, (g, w, h) => {
        const grad = g.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, "rgba(255,255,255,0.0)");
        grad.addColorStop(0.15, "rgba(255,255,255,0.5)");
        grad.addColorStop(1, "rgba(255,255,255,0.03)");
        g.fillStyle = grad;
        g.fillRect(0, 0, w, h);
      }),
      { repeat: false }
    )
  );
}

/** Soft shadow under the hall, so it sits on the board. */
export function contact() {
  return cached("contact", () =>
    tex(
      canvas(256, 256, (g, w) => {
        const grad = g.createRadialGradient(
          w / 2,
          w / 2,
          w * 0.3,
          w / 2,
          w / 2,
          w / 2
        );
        grad.addColorStop(0, "rgba(0,0,0,0.28)");
        grad.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = grad;
        g.fillRect(0, 0, w, w);
      }),
      { repeat: false }
    )
  );
}

/** Wall panelling: a wainscot with mouldings and a smooth upper wall, one repeat per 2 m. */
export function panels(wall = "#efe7da") {
  return cached("panels" + wall, () =>
    tex(
      canvas(512, 1024, (g, w, h) => {
        const c = new THREE.Color(wall);
        g.fillStyle = `#${c.getHexString()}`;
        g.fillRect(0, 0, w, h);
        const dark = c.clone().offsetHSL(0, 0, -0.06);
        const light = c.clone().offsetHSL(0, 0, 0.04);
        // Lower wainscot occupies the bottom quarter of the texture (mapped to ~1.1 m).
        const top = h * 0.78;
        g.fillStyle = `#${dark.getHexString()}`;
        g.fillRect(0, top, w, h - top);
        g.strokeStyle = `#${light.getHexString()}`;
        g.lineWidth = 6;
        g.strokeRect(40, top + 30, w - 80, h - top - 60);
        g.strokeStyle = "rgba(201,164,101,0.9)";
        g.lineWidth = 8;
        g.beginPath();
        g.moveTo(0, top);
        g.lineTo(w, top);
        g.stroke();
        // Upper panel moulding.
        g.strokeStyle = `#${dark.getHexString()}`;
        g.lineWidth = 4;
        g.strokeRect(50, 60, w - 100, top - 120);
      })
    )
  );
}
