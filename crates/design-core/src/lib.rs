//! The invitation design engine.
//!
//! A design is a card: a background and a stack of layers (words, shapes, pictures, a wax seal and
//! the entry seal). This crate owns the document. It knows what a valid design is, and it does
//! every edit the designer offers (duplicate, reorder, align, resize, rotate, import a card) as a
//! pure function from one design to the next, so the browser, the server and the tests all agree.
//!
//! Nothing here touches a clock, a random source or the network. Anything that needs a new layer
//! id is handed one by the caller.

pub mod model;
pub mod ops;
pub mod validate;
pub mod wire;
