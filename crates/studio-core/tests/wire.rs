//! Snapshots the JSON the studio's wasm ABI returns.
//!
//! The browser reads these envelopes, so a renamed field or a changed error code is a breaking
//! change even when the Rust still compiles. Each case is compared against a committed file in
//! `tests/fixtures/wire/`, which makes an unintended change a diff in review.
//!
//! Regenerate after an intended change:
//!
//!   UPDATE_WIRE_SNAPSHOTS=1 cargo test -p ariya-studio-core --test wire

use std::fs;
use std::path::PathBuf;

use ariya_studio_core::wire::{
    dispatch, OP_ARRANGE, OP_CATERING, OP_CHECKLIST, OP_FIT, OP_GEOMETRY, OP_RISK, OP_SCORE,
    OP_THERMAL, OP_VERSION,
};
use serde_json::Value;

fn snapshot(name: &str, op: u32, payload: &str) {
    let raw = dispatch(op, payload.as_bytes());
    let value: Value = serde_json::from_str(&raw)
        .unwrap_or_else(|e| panic!("`{name}` did not return JSON: {e}\n{raw}"));
    let got = serde_json::to_string_pretty(&value).expect("the envelope re-serialises");

    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("tests/fixtures/wire")
        .join(format!("{name}.json"));

    if std::env::var_os("UPDATE_WIRE_SNAPSHOTS").is_some() {
        fs::create_dir_all(path.parent().expect("the snapshot has a parent"))
            .expect("the snapshot directory is writable");
        fs::write(&path, format!("{got}\n")).expect("the snapshot is writable");
        return;
    }

    let want = fs::read_to_string(&path).unwrap_or_else(|_| {
        panic!("no snapshot for `{name}`; run with UPDATE_WIRE_SNAPSHOTS=1 to write it")
    });
    // Compare the parsed document, not the bytes: the repo's formatter rewrites JSON files, and a
    // reformatted snapshot is not a wire change. A renamed field or a changed value still fails.
    let want: Value = serde_json::from_str(&want)
        .unwrap_or_else(|e| panic!("the snapshot for `{name}` is not JSON: {e}"));
    let want = serde_json::to_string_pretty(&want).expect("the snapshot re-serialises");
    assert_eq!(
        got, want,
        "the wire format for `{name}` changed; if that was intended, rerun with \
         UPDATE_WIRE_SNAPSHOTS=1 and review the diff"
    );
}

#[test]
fn version_envelope() {
    snapshot("version", OP_VERSION, "");
}

#[test]
fn geometry_envelope() {
    let request = r#"{
        "width": 24,
        "length": 18,
        "tables": [
            { "shape": "round", "capacity": 8, "x": 6, "y": 5 },
            { "shape": "rectangular", "capacity": 6, "x": 14, "y": 9, "rot": 90 }
        ],
        "pairs": [[0, 1]],
        "zones": [
            { "id": "z-stage", "kind": "stage", "label": "Stage", "x": 12, "y": 1.5, "w": 6, "h": 2.4 }
        ],
        "zone_pairs": [[0, 0]]
    }"#;
    snapshot("geometry", OP_GEOMETRY, request);
}

#[test]
fn fit_envelope() {
    let request = r#"{
        "width": 18,
        "length": 14,
        "shape": "round",
        "capacity": 8,
        "gap": 0.6,
        "aisle": true
    }"#;
    snapshot("fit", OP_FIT, request);
}

#[test]
fn arrange_envelope() {
    let request = r#"{
        "width": 30,
        "length": 20,
        "gap": 0.6,
        "seed": 7,
        "keep": 3,
        "tables": [
            { "id": "t0", "shape": "round", "capacity": 8 },
            { "id": "t1", "shape": "round", "capacity": 8 },
            { "id": "t2", "shape": "round", "capacity": 8 },
            { "id": "t3", "shape": "round", "capacity": 8 }
        ],
        "zones": [
            { "id": "z-stage", "kind": "stage", "label": "Stage", "x": 15, "y": 2.5, "w": 9, "h": 4 },
            { "id": "z-entrance", "kind": "entrance", "label": "Entrance", "x": 15, "y": 19.5, "w": 3, "h": 1 },
            { "id": "z-buffet", "kind": "buffet", "label": "Buffet", "x": 1.3, "y": 11, "w": 1.6, "h": 7 }
        ]
    }"#;
    snapshot("arrange", OP_ARRANGE, request);
}

#[test]
fn unbuilt_operations_share_one_envelope() {
    for (name, op) in [
        ("score", OP_SCORE),
        ("thermal", OP_THERMAL),
        ("catering", OP_CATERING),
        ("risk", OP_RISK),
        ("checklist", OP_CHECKLIST),
    ] {
        snapshot(name, op, "{}");
    }
}

#[test]
fn unknown_operation_envelope() {
    snapshot("unknown-op", 99, "{}");
}

#[test]
fn malformed_request_envelope() {
    snapshot("bad-request", OP_GEOMETRY, r#"{ "width": "#);
}

#[test]
fn missing_field_envelope() {
    snapshot("missing-field", OP_FIT, r#"{ "width": 18 }"#);
}
