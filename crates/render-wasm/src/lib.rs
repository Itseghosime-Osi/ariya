//! The C-ABI surface the browser instantiates as WebAssembly.
//!
//! The module exports plain `extern "C"` functions and needs no JS glue beyond a
//! loader: callers write into linear memory via `ariya_alloc` and read results back
//! with `DataView`.

pub const ABI_VERSION: u32 = 1;

#[no_mangle]
pub extern "C" fn ariya_abi_version() -> u32 {
    ABI_VERSION
}
