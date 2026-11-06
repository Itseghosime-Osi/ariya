/**
 * Bundle Check: Three.js and GSAP must never reach the logged-in app.
 *
 * The marketing film and the 3D hall are allowed to know about three — they are
 * public pages that load it from a CDN behind an import map. What is forbidden
 * is any chunk that an (app) or auth route downloads. So the check is scoped by
 * route, not by chunk: Next writes a client-reference manifest per route, and
 * those manifests are the authority on which chunks a route actually pulls.
 *
 * The check fails loudly on a violation, and equally on any condition that would
 * let it pass without having proven anything — a missing build, an unparseable
 * manifest set, or a referenced chunk it cannot read.
 */

import fs from "node:fs";
import path from "node:path";

const nextDir = path.join(process.cwd(), ".next");
const appDir = path.join(nextDir, "server/app");
const chunksDir = path.join(nextDir, "static/chunks");

const MANIFEST_SUFFIX = "_client-reference-manifest.js";

/** Route groups whose chunks may never carry the 3D or animation stack. */
const PROTECTED_PREFIXES = ["(shell)"];

/** Auth surfaces that live outside (shell). */
const PROTECTED_EXACT = [
  "sign-in",
  "sign-up",
  "forgot-password",
  "reset-password",
];

const FORBIDDEN_PATTERNS = [
  { name: "Three.js package import", regex: /node_modules[\/\\]three/i },
  { name: "Three.js module", regex: /three\.module\.js/i },
  { name: "Three.js WebGLRenderer", regex: /THREE\.WebGLRenderer/ },
  { name: "GSAP package import", regex: /node_modules[\/\\]gsap/i },
  {
    name: "GSAP library signature",
    regex: /(GreenSock|gsap\.registerPlugin|gsap\.to\()/,
  },
];

function die(message: string): never {
  console.error(`\n❌ Bundle Check FAILED! ${message}`);
  process.exit(1);
}

for (const [label, dir] of [
  [".next", nextDir],
  [".next/server/app", appDir],
  [".next/static/chunks", chunksDir],
] as const) {
  if (!fs.existsSync(dir)) {
    die(`${label} does not exist. Run 'pnpm build' first.`);
  }
}

function findManifests(dir: string): string[] {
  const found: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...findManifests(full));
    } else if (entry.isFile() && entry.name.endsWith(MANIFEST_SUFFIX)) {
      found.push(full);
    }
  }
  return found;
}

/** Chunk basenames a route's client-reference manifest names. */
function chunksOf(manifestPath: string): string[] {
  const text = fs.readFileSync(manifestPath, "utf8");
  const names = new Set<string>();
  for (const match of text.matchAll(
    /(?:\/_next)?\/?static\/chunks\/([A-Za-z0-9_.-]+\.js)/g
  )) {
    names.add(match[1]);
  }
  return [...names];
}

function routeName(manifestPath: string): string {
  return path
    .relative(appDir, manifestPath)
    .replace(new RegExp(`${MANIFEST_SUFFIX}$`), "")
    .split(path.sep)
    .join("/");
}

function isProtected(route: string): boolean {
  if (PROTECTED_PREFIXES.some((prefix) => route.startsWith(`${prefix}/`))) {
    return true;
  }
  return PROTECTED_EXACT.some(
    (name) => route === name || route.startsWith(`${name}/`)
  );
}

const manifests = findManifests(appDir);
if (manifests.length === 0) {
  die(
    "No route manifests found under .next/server/app - cannot prove anything."
  );
}

const violations: Array<{ route: string; chunk: string; pattern: string }> = [];
const missingChunks = new Set<string>();
const scannedChunks = new Set<string>();
const protectedRoutes: string[] = [];
const publicRoutes: string[] = [];

for (const manifest of manifests) {
  const route = routeName(manifest);
  const chunks = chunksOf(manifest);

  if (!isProtected(route)) {
    publicRoutes.push(route);
    continue;
  }
  protectedRoutes.push(route);

  for (const chunk of chunks) {
    const file = path.join(chunksDir, chunk);
    if (!fs.existsSync(file)) {
      missingChunks.add(chunk);
      continue;
    }
    scannedChunks.add(chunk);
    const content = fs.readFileSync(file, "utf8");
    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.regex.test(content)) {
        violations.push({ route, chunk, pattern: pattern.name });
      }
    }
  }
}

if (protectedRoutes.length === 0) {
  die("No (app) or auth routes found - the route rule matched nothing.");
}

// Route handlers ship no client chunks, so they are trivially safe. A total of
// zero scanned chunks means the manifests did not resolve, not that we passed.
if (scannedChunks.size === 0) {
  die("No chunks resolved for any (app)/auth route - nothing was proven.");
}

if (publicRoutes.length === 0) {
  die("No public routes found - the manifest set looks truncated.");
}

if (missingChunks.size > 0) {
  die(
    "Cannot read chunk(s) referenced by protected routes, so absence cannot be " +
      `proven:\n${[...missingChunks].map((c) => ` - ${c}`).join("\n")}`
  );
}

console.log(
  `Checked ${protectedRoutes.length} (app)/auth route(s) and the ` +
    `${scannedChunks.size} chunk(s) they download.`
);
console.log(
  `Not policed (public marketing/film): ${publicRoutes.length} route(s).`
);

if (violations.length > 0) {
  console.error(
    "\n❌ Bundle Check FAILED! Three.js or GSAP reached an app/auth route:"
  );
  for (const v of violations) {
    console.error(` - ${v.route} -> ${v.chunk}: matched ${v.pattern}`);
  }
  process.exit(1);
}

console.log(
  "\n✅ Bundle check PASSED: no (app) or auth route downloads Three.js or GSAP."
);

/**
 * The studio's Rust core is fetched at runtime from `/wasm/ariya_studio.wasm`, so it must stay a
 * static asset. If a bundler ever inlines it or emits it as a chunk, every route that touches the
 * studio pays for 180 kB it may never use. The URL string itself is expected in the loader chunk;
 * what is forbidden is the bytes.
 */
const STUDIO_WASM = "ariya_studio.wasm";
const publicWasm = path.join(process.cwd(), "public/wasm", STUDIO_WASM);

if (!fs.existsSync(publicWasm)) {
  die(
    `public/wasm/${STUDIO_WASM} is missing. Run 'pnpm build:wasm' - the studio cannot load without it.`
  );
}

function findFiles(dir: string, suffix: string): string[] {
  const found: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...findFiles(full, suffix));
    } else if (entry.isFile() && entry.name.endsWith(suffix)) {
      found.push(full);
    }
  }
  return found;
}

const emittedWasm = findFiles(chunksDir, ".wasm");
if (emittedWasm.length > 0) {
  die(
    "The bundler emitted wasm into .next/static/chunks, so it is being bundled " +
      `rather than served from public/:\n${emittedWasm
        .map((f) => ` - ${path.relative(nextDir, f)}`)
        .join("\n")}`
  );
}

const INLINE_PATTERNS = [
  { name: "base64 wasm data URI", regex: /data:application\/wasm;base64,/ },
  { name: "base64 wasm module", regex: /AGFzbQ/ },
];

const inlined: Array<{ chunk: string; pattern: string }> = [];
for (const chunk of findFiles(chunksDir, ".js")) {
  const content = fs.readFileSync(chunk, "utf8");
  for (const pattern of INLINE_PATTERNS) {
    if (pattern.regex.test(content)) {
      inlined.push({ chunk: path.basename(chunk), pattern: pattern.name });
    }
  }
}

if (inlined.length > 0) {
  die(
    "The studio wasm was inlined into a JavaScript chunk instead of being " +
      `fetched from /wasm/:\n${inlined
        .map((i) => ` - ${i.chunk}: matched ${i.pattern}`)
        .join("\n")}`
  );
}

const wasmKb = Math.round(fs.statSync(publicWasm).size / 1024);
console.log(
  `✅ Studio wasm stays a static asset: public/wasm/${STUDIO_WASM} (${wasmKb} kB), ` +
    "not emitted into or inlined in any chunk."
);
