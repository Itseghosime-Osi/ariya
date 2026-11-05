//! The JSON contract between the studio's TypeScript and this crate.
//!
//! One call per user action, JSON in and JSON out. The types here are the single definition of
//! the wire format: the TypeScript side is generated from them, never hand-written.

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
#[cfg(feature = "ts")]
use ts_rs::TS;

use crate::archetype::ArrangeTable;
use crate::fit::{fit_tables, FitOptions, FitResult};
use crate::geometry::{
    extents, footprint, gap_between, gap_to_walls, gap_to_zone, table_top, Footprint, TableTop,
};
use crate::search::{search, LayoutOption, SearchInput};
use crate::venue::Zone;

/// The ABI the crate and `packages/studio` agree on.
pub const ABI_VERSION: u32 = 1;

pub const OP_VERSION: u32 = 0;
pub const OP_GEOMETRY: u32 = 1;
pub const OP_FIT: u32 = 2;
pub const OP_ARRANGE: u32 = 3;
pub const OP_SCORE: u32 = 4;
pub const OP_THERMAL: u32 = 5;
pub const OP_CATERING: u32 = 6;
pub const OP_RISK: u32 = 7;
pub const OP_CHECKLIST: u32 = 8;

/// One table, as the studio describes it.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Debug, Deserialize)]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub struct TableSpec {
    pub shape: String,
    pub capacity: i32,
    pub x: f64,
    pub y: f64,
    #[serde(default)]
    pub rot: f64,
}

#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Debug, Serialize)]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub struct TableGeometry {
    pub top: TableTop,
    pub footprint: Footprint,
    pub ex: f64,
    pub ey: f64,
    pub wall_gap: f64,
}

#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Debug, Deserialize)]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub struct GeometryRequest {
    pub width: f64,
    pub length: f64,
    pub tables: Vec<TableSpec>,
    /// Index pairs into `tables`; the response returns the gap for each, in order.
    #[serde(default)]
    pub pairs: Vec<[usize; 2]>,
    #[serde(default)]
    pub zones: Vec<Zone>,
    /// `[table index, zone index]` pairs; the response returns the gap for each, in order.
    #[serde(default)]
    pub zone_pairs: Vec<[usize; 2]>,
}

#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Debug, Serialize)]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub struct GeometryResponse {
    pub tables: Vec<TableGeometry>,
    pub gaps: Vec<f64>,
    pub zone_gaps: Vec<f64>,
}

#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Debug, Deserialize)]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub struct FitRequest {
    pub width: f64,
    pub length: f64,
    #[serde(default)]
    pub zones: Vec<Zone>,
    #[serde(default)]
    pub obstacles: Vec<Footprint>,
    pub shape: String,
    pub capacity: i32,
    #[serde(default)]
    pub rotation: f64,
    pub gap: f64,
    #[serde(default)]
    pub aisle: bool,
}

#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Debug, Deserialize)]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub struct ArrangeRequest {
    pub width: f64,
    pub length: f64,
    #[serde(default)]
    pub zones: Vec<Zone>,
    pub tables: Vec<ArrangeTable>,
    pub gap: f64,
    /// What the venue is certified for, when the host has said.
    #[serde(default)]
    pub capacity: Option<i32>,
    #[serde(default)]
    pub seed: u64,
    #[serde(default = "default_keep")]
    pub keep: usize,
}

fn default_keep() -> usize {
    crate::search::DEFAULT_KEEP
}

#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Debug, Serialize)]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub struct ArrangeResponse {
    pub options: Vec<LayoutOption>,
}

fn ok(data: Value) -> String {
    json!({ "ok": true, "data": data }).to_string()
}

fn err(code: &str, message: &str) -> String {
    json!({ "ok": false, "code": code, "message": message }).to_string()
}

fn parse<T: for<'de> Deserialize<'de>>(payload: &[u8]) -> Result<T, String> {
    serde_json::from_slice(payload).map_err(|e| format!("could not read the request: {e}"))
}

/// Run one operation. Never panics: a bad request comes back as an error envelope.
pub fn dispatch(op: u32, payload: &[u8]) -> String {
    match op {
        OP_VERSION => ok(json!({ "abi": ABI_VERSION })),
        OP_GEOMETRY => match parse::<GeometryRequest>(payload) {
            Ok(req) => ok(serde_json::to_value(geometry(&req)).unwrap_or(Value::Null)),
            Err(message) => err("bad_request", &message),
        },
        OP_FIT => match parse::<FitRequest>(payload) {
            Ok(req) => {
                let result: FitResult = fit_tables(&FitOptions {
                    width: req.width,
                    length: req.length,
                    zones: req.zones,
                    obstacles: req.obstacles,
                    shape: req.shape,
                    capacity: req.capacity,
                    rotation: req.rotation,
                    gap: req.gap,
                    aisle: req.aisle,
                });
                ok(serde_json::to_value(result).unwrap_or(Value::Null))
            }
            Err(message) => err("bad_request", &message),
        },
        OP_ARRANGE => match parse::<ArrangeRequest>(payload) {
            Ok(req) => {
                let mut input = SearchInput::new(
                    req.width,
                    req.length,
                    &req.zones,
                    &req.tables,
                    req.gap,
                    req.capacity,
                    req.seed,
                );
                input.keep = req.keep.max(1);
                ok(serde_json::to_value(ArrangeResponse {
                    options: search(&input),
                })
                .unwrap_or(Value::Null))
            }
            Err(message) => err("bad_request", &message),
        },
        OP_SCORE | OP_THERMAL | OP_CATERING | OP_RISK | OP_CHECKLIST => {
            err("not_implemented", "this operation is not built yet")
        }
        _ => err("unknown_op", "no such operation"),
    }
}

fn geometry(req: &GeometryRequest) -> GeometryResponse {
    let tables: Vec<TableGeometry> = req
        .tables
        .iter()
        .map(|t| {
            let f = footprint(&t.shape, t.capacity, t.x, t.y, t.rot);
            let (ex, ey) = extents(&f);
            TableGeometry {
                top: table_top(&t.shape, t.capacity),
                footprint: f,
                ex,
                ey,
                wall_gap: gap_to_walls(&f, req.width, req.length),
            }
        })
        .collect();

    let gaps = req
        .pairs
        .iter()
        .filter_map(|[a, b]| {
            let fa = tables.get(*a)?;
            let fb = tables.get(*b)?;
            Some(gap_between(&fa.footprint, &fb.footprint))
        })
        .collect();

    let zone_gaps = req
        .zone_pairs
        .iter()
        .filter_map(|[t, z]| {
            let table = tables.get(*t)?;
            let zone = req.zones.get(*z)?;
            Some(gap_to_zone(&table.footprint, zone))
        })
        .collect();

    GeometryResponse {
        tables,
        gaps,
        zone_gaps,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn version_reports_the_abi() {
        let out = dispatch(OP_VERSION, b"");
        let value: Value = serde_json::from_str(&out).expect("json");
        assert_eq!(value["ok"], true);
        assert_eq!(value["data"]["abi"], ABI_VERSION);
    }

    #[test]
    fn a_bad_request_is_an_error_envelope_not_a_panic() {
        let out = dispatch(OP_GEOMETRY, b"{not json");
        let value: Value = serde_json::from_str(&out).expect("json");
        assert_eq!(value["ok"], false);
        assert_eq!(value["code"], "bad_request");
    }

    #[test]
    fn an_unknown_op_is_reported() {
        let out = dispatch(999, b"");
        let value: Value = serde_json::from_str(&out).expect("json");
        assert_eq!(value["code"], "unknown_op");
    }

    #[test]
    fn geometry_returns_one_entry_per_table_and_one_gap_per_pair() {
        let payload = br#"{
            "width": 30, "length": 20,
            "tables": [
                {"shape":"round","capacity":8,"x":5,"y":5},
                {"shape":"round","capacity":8,"x":8,"y":5}
            ],
            "pairs": [[0,1]]
        }"#;
        let out = dispatch(OP_GEOMETRY, payload);
        let value: Value = serde_json::from_str(&out).expect("json");
        assert_eq!(value["ok"], true);
        assert_eq!(value["data"]["tables"].as_array().unwrap().len(), 2);
        assert_eq!(value["data"]["gaps"].as_array().unwrap().len(), 1);
    }

    #[test]
    fn fit_returns_placements() {
        let payload = br#"{
            "width": 30, "length": 20,
            "shape": "round", "capacity": 8, "gap": 0.6
        }"#;
        let out = dispatch(OP_FIT, payload);
        let value: Value = serde_json::from_str(&out).expect("json");
        assert_eq!(value["ok"], true);
        assert!(value["data"]["count"].as_u64().unwrap() > 0);
    }

    #[test]
    fn an_unbuilt_op_says_so() {
        let out = dispatch(OP_THERMAL, b"{}");
        let value: Value = serde_json::from_str(&out).expect("json");
        assert_eq!(value["code"], "not_implemented");
    }
}
