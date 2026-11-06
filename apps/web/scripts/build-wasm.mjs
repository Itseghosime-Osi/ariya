/**
 * Builds the Rust crates and publishes them where Next.js serves them.
 *
 * The artifacts are committed, so Vercel only needs Node. Run this after changing
 * anything in crates/: `pnpm build:wasm`.
 */

import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const repoRoot = path.resolve(webRoot, "../..");
const cargo =
  process.env.CARGO ??
  (existsSync(path.join(homedir(), ".cargo", "bin", "cargo"))
    ? path.join(homedir(), ".cargo", "bin", "cargo")
    : "cargo");

const outDir = path.join(webRoot, "public", "wasm");

/** Each crate, the artifact cargo writes, and the name the browser fetches. */
const TARGETS = [
  {
    crate: "render-wasm",
    built: "ariya_render_wasm.wasm",
    out: "ariya_render.wasm",
  },
  {
    crate: "studio-wasm",
    built: "ariya_studio_wasm.wasm",
    out: "ariya_studio.wasm",
  },
];

// A wasm binary carries the path of every source file it was built from, panic messages included.
// Left alone, a build on /root and a build on /home/runner differ by bytes for the same source,
// and the CI check that compares the committed artifacts with a fresh build can never pass. Map
// the checkout and cargo's home to fixed names so the output depends on the source alone.
const cargoHome = process.env.CARGO_HOME ?? path.join(homedir(), ".cargo");
const rustflags = [
  `--remap-path-prefix=${repoRoot}=/src`,
  `--remap-path-prefix=${cargoHome}=/cargo`,
].join("\x1f");

mkdirSync(outDir, { recursive: true });

for (const target of TARGETS) {
  const manifest = path.join(repoRoot, "crates", target.crate, "Cargo.toml");
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
      {
        stdio: "inherit",
        env: { ...process.env, CARGO_ENCODED_RUSTFLAGS: rustflags },
      }
    );
  } catch {
    console.error(
      `\nCould not build ${target.crate}. Install the toolchain and the wasm target:\n` +
        "  rustup target add wasm32-unknown-unknown\n"
    );
    process.exit(1);
  }

  const built = path.join(
    repoRoot,
    "target",
    "wasm32-unknown-unknown",
    "release",
    target.built
  );
  if (!existsSync(built)) {
    console.error(`Cargo finished but ${built} is missing.`);
    process.exit(1);
  }

  const outFile = path.join(outDir, target.out);
  copyFileSync(built, outFile);
  const { size } = statSync(outFile);
  console.log(`${target.out}: ${(size / 1024).toFixed(1)} KiB`);
}
