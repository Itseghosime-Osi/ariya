/**
 * Bundle Check: Fail if Three.js or GSAP appears in any app-route chunk.
 *
 * The marketing film and 3D experience are isolated to public/site and
 * must never be bundled into the Next.js App Router client chunks.
 */

import fs from "node:fs";
import path from "node:path";

const chunksDir = path.join(process.cwd(), ".next/static/chunks");

if (!fs.existsSync(chunksDir)) {
  console.error(
    "Error: .next/static/chunks does not exist. Run 'pnpm build' first."
  );
  process.exit(1);
}

function findJsFiles(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of list) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(findJsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      results.push(fullPath);
    }
  }
  return results;
}

const jsFiles = findJsFiles(chunksDir);
console.log(
  `Checking ${jsFiles.length} client chunk(s) for Three.js and GSAP leakage...`
);

const violations: Array<{ file: string; pattern: string }> = [];

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

for (const file of jsFiles) {
  const content = fs.readFileSync(file, "utf8");
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.regex.test(content)) {
      violations.push({
        file: path.relative(process.cwd(), file),
        pattern: pattern.name,
      });
    }
  }
}

if (violations.length > 0) {
  console.error(
    "\n❌ Bundle Check FAILED! Forbidden animation/3D library detected in app chunks:"
  );
  for (const v of violations) {
    console.error(` - ${v.file}: matched ${v.pattern}`);
  }
  process.exit(1);
}

console.log(
  "✅ Bundle check PASSED: No Three.js or GSAP found in any app-route chunk."
);
