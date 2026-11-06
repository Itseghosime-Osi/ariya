# ADR 0005: The Rust Studio Core and its JSON ABI

## Status

Accepted (2026-11-06)

## Context

The venue studio does real arithmetic: packing tables into a room, scoring a layout on sightlines, circulation and service, modelling heat and moisture, costing food and drink, and generating a checklist. The first version of this was TypeScript in `apps/web/src/features/seating/hall/`, and it worked — but every one of those calculations has a worked example in the research document, and a TypeScript-only model cannot be held to those numbers from a test runner that does not share the engine with a connected app or a background job.

Two constraints shaped the decision:

1. **The renderer already had a Rust core.** `crates/render-core` holds the deterministic RNG and string hashing the film uses. A second, unrelated random source in the studio would make "the same plan on every device" impossible to promise.
2. **The arithmetic must be identical wherever it runs.** A host's browser, an MCP tool call, and a test all need to agree, or an "explain this number" panel becomes a description of a different calculation.

## Decision

1. **One engine, in Rust.** `crates/studio-core` owns the model: venue, geometry, fitting, archetypes, scoring, search, thermal, catering, risk and checklist generation. `studio-core` depends on `render-core` for `XorShift32` and `hash_str`, so the studio and the renderer share one random number generator.
2. **A single JSON entry point, not an exported surface.** `crates/studio-wasm` compiles to a `cdylib` exposing `ariya_studio_call(op, ptr, len) -> u64` and `ariya_free`. The return packs a pointer and a length into one `u64`. Every operation — `VERSION`, `GEOMETRY`, `FIT`, `ARRANGE`, `SCORE`, `THERMAL`, `CATERING`, `RISK`, `CHECKLIST` — is one call in, one JSON document out.
3. **Errors are data, never a panic across the boundary.** Every call runs inside `catch_unwind` and returns `{ ok: false, code, message }` on failure, so a bad input degrades a panel rather than blanking the page.
4. **The wire format is a snapshot.** `crates/studio-core/tests/wire.rs` compares every envelope against the committed fixtures in `tests/fixtures/wire/`. A schema change is a visible diff in review, not a field that quietly stops being read.
5. **Types are generated, not written twice.** The wire types are declared once in Rust with `serde` and emitted to TypeScript by `ts-rs` into `packages/studio/src/generated.ts`. CI fails if a fresh generation differs from the committed file.
6. **The loader never breaks the page.** `packages/studio/src/index.ts` exposes `loadStudio()` and typed wrappers; no raw ABI is exported. If the wasm fails to load, the seating route falls back to the TypeScript geometry and checks, hides the engine-only decks, and says so quietly. The build emits `public/wasm/ariya_studio.wasm`, which is excluded from app chunks by the bundle guard.

## Consequences

- **Positive:** the research document's worked examples are asserted against the engine that ships; the same code answers a browser, an MCP call and a test; a geometry change is caught by a parity corpus (693 cases) before it reaches a canvas; and the deterministic seed makes "the same three options on every device" a property, not a hope.
- **Negative:** a Rust toolchain and a wasm build step are now part of the web app's CI, and a wire-type change costs a regeneration commit. Both are deliberate: the alternative was a TypeScript engine that could not be shared and drifted from its own tests.
- **Where the model diverges from the research document**, the divergence is asserted in a test with the reason attached — for example `the_research_table_is_lower_than_its_own_formula` in `catering.rs`, and the SHR band in `load.rs`. The document is the source of intent; the engine is the source of arithmetic.
