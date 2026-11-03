/**
 * Builds the Rust renderer and publishes it where Next.js serves it.
 *
 * The artifact is committed, so Vercel only needs Node. Run this after changing
 * anything in crates/: `pnpm build:wasm`.
 */

import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const root = process.cwd();
const manifest = path.join(root, "crates", "render-wasm", "Cargo.toml");
const cargo =
  process.env.CARGO ??
  (existsSync(path.join(homedir(), ".cargo", "bin", "cargo"))
    ? path.join(homedir(), ".cargo", "bin", "cargo")
    : "cargo");

const built = path.join(
  root,
  "target",
  "wasm32-unknown-unknown",
  "release",
  "ariya_render_wasm.wasm"
);
const outDir = path.join(root, "public", "wasm");
const outFile = path.join(outDir, "ariya_render.wasm");

try {
  execFileSync(
    cargo,
    [
      "build",
      "--manifest-path",
      manifest,
      "--target",
      "wasm32-unknown-unknown",
      "--release",
    ],
    { stdio: "inherit" }
  );
} catch {
  console.error(
    "\nCould not build the Rust renderer. Install the toolchain and the wasm target:\n" +
      "  rustup target add wasm32-unknown-unknown\n"
  );
  process.exit(1);
}

if (!existsSync(built)) {
  console.error(`Cargo finished but ${built} is missing.`);
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
copyFileSync(built, outFile);

const { size } = statSync(outFile);
console.log(`ariya_render.wasm: ${(size / 1024).toFixed(1)} KiB`);
