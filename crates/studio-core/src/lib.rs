//! The venue studio's computational core: room geometry, table packing, and the venue facts the
//! rest of the studio reads.
//!
//! Pure and deterministic. The same functions run natively in tests and compiled to
//! `wasm32-unknown-unknown` behind `crates/studio-wasm`. Nothing here touches the DOM, the
//! database or the clock.

pub mod archetype;
pub mod catering;
pub mod checklist;
pub mod civil;
pub mod field;
pub mod fit;
pub mod geometry;
pub mod grid;
pub mod load;
pub mod risk;
pub mod score;
pub mod search;
pub mod units;
pub mod venue;
pub mod wire;
pub mod zones;
