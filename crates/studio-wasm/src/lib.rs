//! The C-ABI surface the browser instantiates as WebAssembly.
//!
//! JSON in, JSON out, over a length-prefixed buffer. The caller writes the request into linear
//! memory with `ariya_studio_alloc`, calls `ariya_studio_call`, reads the response from the
//! returned pointer and length, then frees it with `ariya_studio_free`.

use std::alloc::{alloc, dealloc, Layout};

use ariya_studio_core::wire::{dispatch, ABI_VERSION};

#[no_mangle]
pub extern "C" fn ariya_studio_abi_version() -> u32 {
    ABI_VERSION
}

/// Eight-byte aligned scratch memory for request and response buffers.
#[no_mangle]
pub extern "C" fn ariya_studio_alloc(size: u32) -> *mut u8 {
    let layout = Layout::from_size_align(size.max(1) as usize, 8).expect("valid layout");
    unsafe { alloc(layout) }
}

/// Frees a buffer handed out by [`ariya_studio_alloc`].
///
/// # Safety
///
/// `ptr` must come from `ariya_studio_alloc` with the same `size`, and must not be used afterwards.
#[no_mangle]
pub unsafe extern "C" fn ariya_studio_free(ptr: *mut u8, size: u32) {
    if ptr.is_null() {
        return;
    }
    let layout = Layout::from_size_align(size.max(1) as usize, 8).expect("valid layout");
    dealloc(ptr, layout);
}

/// The response bytes for one call. Split out from the ABI so it can be tested on a 64-bit host,
/// where the packed pointer below cannot round-trip.
fn respond(op: u32, input: &[u8]) -> Vec<u8> {
    dispatch(op, input).into_bytes()
}

/// Run one operation and return `(ptr << 32) | len` for the response buffer.
///
/// The response is always valid JSON, including when the request is malformed. The packing
/// assumes a 32-bit pointer, which is what `wasm32-unknown-unknown` gives us.
///
/// # Safety
///
/// `ptr` must point to at least `len` readable bytes, or be null. The caller owns the returned
/// buffer and must pass it to [`ariya_studio_free`] with the length in the low 32 bits.
#[no_mangle]
pub unsafe extern "C" fn ariya_studio_call(op: u32, ptr: *const u8, len: u32) -> u64 {
    let input: &[u8] = if ptr.is_null() || len == 0 {
        &[]
    } else {
        std::slice::from_raw_parts(ptr, len as usize)
    };

    let bytes = respond(op, input);
    let size = bytes.len();
    let out = ariya_studio_alloc(size as u32);
    if out.is_null() {
        return 0;
    }
    std::ptr::copy_nonoverlapping(bytes.as_ptr(), out, size);
    ((out as u64) << 32) | size as u64
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_geometry_call_returns_an_ok_envelope() {
        let request = br#"{"width":30,"length":20,"tables":[]}"#;
        let text = String::from_utf8(respond(1, request)).expect("utf8");
        assert!(text.contains("\"ok\":true"));
    }

    #[test]
    fn an_empty_request_still_returns_json() {
        let text = String::from_utf8(respond(0, &[])).expect("utf8");
        assert!(text.contains("\"abi\""));
    }

    #[test]
    fn a_malformed_request_returns_an_error_envelope() {
        let text = String::from_utf8(respond(1, b"{oops")).expect("utf8");
        assert!(text.contains("\"ok\":false"));
    }
}
