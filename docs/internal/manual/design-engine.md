# Rust engines

How the invitation design engine and the studio engine are built, shipped and kept honest.

Audience: Developers

> Archived from the former public manual. Internal reference only; content reflects the product at the time it was archived.

## Why Rust

The arithmetic must be identical in a browser, an AI call and a test, and heavy maths should not weigh down the page. Both engines are small Rust crates compiled to WebAssembly and loaded lazily.

| Engine                                            | Crates                                             | Browser package | Artifact                        |
| ------------------------------------------------- | -------------------------------------------------- | --------------- | ------------------------------- |
| Studio (hall, thermal, catering, risk, checklist) | `crates/studio-core`, `studio-wasm`, `render-core` | `@ariya/studio` | `public/wasm/ariya_studio.wasm` |
| Design (invitation editing)                       | `crates/design-core`, `design-wasm`                | `@ariya/design` | `public/wasm/ariya_design.wasm` |

## The pattern

1. A pure core crate owns the model and operations (serde with camelCase fields; enum variant fields need `rename_all_fields`).
2. A thin wasm crate exposes a C-ABI: `ariya_design_alloc`, `ariya_design_free` and `ariya_design_call`. JSON goes in, JSON comes out.
3. Failures are returned as data (`{ ok: false, code, message }`), never a panic across the boundary.
4. Types are generated from Rust with `ts-rs` into `packages/*/src/generated` (excluded from Prettier).
5. A TypeScript package wraps the wasm and falls back to a TypeScript implementation if loading fails, so a failed load never blanks the page.
6. The compiled `.wasm` is committed and built deterministically with `--remap-path-prefix` by `apps/web/scripts/build-wasm.mjs`.

## Design engine operations

Add shape, add layer of a kind, add image, duplicate, stacking order, align and distribute, import a card, remove the card, ensure the entry seal, fast resize (minimum width 5%, height 1%) and rotation snapping.

## Keeping it honest

- Rust unit and integration tests, including a fixture design (`tests/fixtures/house.json`).
- A TypeScript/Rust **parity test** (`engine.parity.test.ts`) runs the same operations on both and compares normalised results.
- CI checks that the committed wasm equals a fresh build, and that regenerated types equal the committed ones.
- The studio's parity corpus has 693 cases for geometry.

## Rebuilding

```bash
cd apps/web && node scripts/build-wasm.mjs   # builds both targets
cargo test --workspace                       # Rust tests
```

Next phases (not started): a picture pipeline, effects, and print-ready export. See [Roadmap](roadmap.md).
