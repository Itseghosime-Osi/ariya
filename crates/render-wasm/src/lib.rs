//! The C-ABI surface the browser instantiates as WebAssembly.
//!
//! The module exports plain `extern "C"` functions and needs no JS glue beyond a
//! loader: callers write into linear memory via `ariya_alloc` and read results back
//! with `DataView`.

use std::alloc::{alloc, dealloc, Layout};
use std::sync::OnceLock;

use ariya_render_core::rng::{hash_str, XorShift32};
use ariya_render_core::story::StoryMap;

pub const ABI_VERSION: u32 = 1;

/// Exports that could not find their target (for example a cut index past the end).
pub const INVALID: u32 = u32::MAX;

fn story() -> &'static StoryMap {
    static STORY: OnceLock<StoryMap> = OnceLock::new();
    STORY.get_or_init(StoryMap::new)
}

#[no_mangle]
pub extern "C" fn ariya_abi_version() -> u32 {
    ABI_VERSION
}

/// Eight-byte aligned scratch memory for `f64` buffers and encoded strings.
#[no_mangle]
pub extern "C" fn ariya_alloc(size: u32) -> *mut u8 {
    let layout = Layout::from_size_align(size.max(1) as usize, 8).expect("valid layout");
    unsafe { alloc(layout) }
}

/// Frees a buffer handed out by [`ariya_alloc`].
///
/// # Safety
///
/// `ptr` must come from `ariya_alloc` with the same `size`, and must not be used afterwards.
#[no_mangle]
pub unsafe extern "C" fn ariya_free(ptr: *mut u8, size: u32) {
    if ptr.is_null() {
        return;
    }
    let layout = Layout::from_size_align(size.max(1) as usize, 8).expect("valid layout");
    dealloc(ptr, layout);
}

/// Hashes a UTF-8 string, or returns `INVALID` when the bytes are not UTF-8.
///
/// # Safety
///
/// `ptr` must point to at least `len` readable bytes for the duration of the call.
#[no_mangle]
pub unsafe extern "C" fn ariya_hash_str(ptr: *const u8, len: usize) -> u32 {
    if ptr.is_null() {
        return hash_str("");
    }
    let bytes = std::slice::from_raw_parts(ptr, len);
    match std::str::from_utf8(bytes) {
        Ok(value) => hash_str(value),
        Err(_) => INVALID,
    }
}

/// Writes `count` random numbers in `[0, 1)` to `out`.
///
/// # Safety
///
/// `out` must point to at least `count` writable `f64` slots, or be null.
#[no_mangle]
pub unsafe extern "C" fn ariya_rng_fill(seed: u32, count: u32, out: *mut f64) {
    if out.is_null() {
        return;
    }
    let mut rng = XorShift32::new(seed);
    for index in 0..count as usize {
        out.add(index).write(rng.next_unit());
    }
}

/// Returns the mode index and writes `[p, local, fade, vis, cut]`.
///
/// # Safety
///
/// `out` must point to at least five writable `f64` slots, or be null.
#[no_mangle]
pub unsafe extern "C" fn ariya_scene_at(s: f64, out: *mut f64) -> u32 {
    let scene = story().map_story(s);
    if !out.is_null() {
        out.add(0).write(scene.p);
        out.add(1).write(scene.local);
        out.add(2).write(scene.fade);
        out.add(3).write(scene.vis);
        out.add(4).write(scene.cut as f64);
    }
    u32::from(scene.mode)
}

#[no_mangle]
pub extern "C" fn ariya_cut_count() -> u32 {
    story().cuts().len() as u32
}

/// Returns the mode index and writes `[a, b, p0, p1, t0, t1, scroll_sec]`.
///
/// # Safety
///
/// `out` must point to at least seven writable `f64` slots, or be null.
#[no_mangle]
pub unsafe extern "C" fn ariya_cut_at(index: u32, out: *mut f64) -> u32 {
    let Some(cut) = story().cuts().get(index as usize) else {
        return INVALID;
    };
    if !out.is_null() {
        out.add(0).write(cut.a);
        out.add(1).write(cut.b);
        out.add(2).write(cut.p0);
        out.add(3).write(cut.p1);
        out.add(4).write(cut.t0);
        out.add(5).write(cut.t1);
        out.add(6).write(cut.scroll_sec);
    }
    u32::from(cut.mode)
}

#[no_mangle]
pub extern "C" fn ariya_s_from_scene(mode: u32, k: f64) -> f64 {
    story().s_from_scene(mode as u8, k)
}

#[no_mangle]
pub extern "C" fn ariya_s_from_old(p: f64) -> f64 {
    story().s_from_old(p)
}

#[no_mangle]
pub extern "C" fn ariya_raw_from_s(s: f64) -> f64 {
    StoryMap::raw_from_s(s)
}

#[no_mangle]
pub extern "C" fn ariya_t_from_s(s: f64) -> f64 {
    story().t_from_s(s)
}

#[no_mangle]
pub extern "C" fn ariya_s_from_t(t: f64) -> f64 {
    story().s_from_t(t)
}

#[no_mangle]
pub extern "C" fn ariya_total_time() -> f64 {
    story().total_time()
}
