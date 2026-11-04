//! Deterministic rendering math shared by the browser renderer and its Rust core.
//!
//! Nothing here touches the DOM or WebGL; the crate is pure so the same functions run
//! natively in tests and compiled to `wasm32-unknown-unknown` in the browser.

pub mod math;
pub mod rng;
pub mod story;
