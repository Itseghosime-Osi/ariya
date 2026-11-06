//! Holds the Rust port to the TypeScript implementation.
//!
//! The corpus is generated from `apps/web/src/features/seating/hall` by
//! `apps/web/scripts/gen-geometry-corpus.ts`. If this test fails, the two implementations have
//! drifted: fix the port, or regenerate the corpus if the TypeScript change was intended.

use ariya_studio_core::fit::{fit_tables, Arrangement, FitOptions};
use ariya_studio_core::geometry::{
    extents, footprint, gap_between, gap_to_walls, gap_to_zone, table_top, Footprint, TableTop,
};
use ariya_studio_core::venue::Zone;
use serde::Deserialize;

const CORPUS: &str = include_str!("fixtures/geometry-corpus.json");

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Corpus {
    tables: Vec<TableCase>,
    pairs: Vec<PairCase>,
    zones: Vec<Zone>,
    zone_pairs: Vec<ZonePairCase>,
    fits: Vec<FitCase>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct TableCase {
    width: f64,
    length: f64,
    shape: String,
    capacity: i32,
    x: f64,
    y: f64,
    rot: f64,
    top: TableTop,
    footprint: Footprint,
    ex: f64,
    ey: f64,
    wall_gap: f64,
}

#[derive(Deserialize)]
struct PairCase {
    a: usize,
    b: usize,
    gap: f64,
}

#[derive(Deserialize)]
struct ZonePairCase {
    table: usize,
    zone: usize,
    gap: f64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct FitCase {
    width: f64,
    length: f64,
    zones: Vec<Zone>,
    shape: String,
    capacity: i32,
    rotation: f64,
    gap: f64,
    aisle: bool,
    count: usize,
    seats: usize,
    arrangement: Arrangement,
    placements: Vec<Placement>,
}

#[derive(Deserialize)]
struct Placement {
    x: f64,
    y: f64,
    rot: f64,
}

fn close(a: f64, b: f64, what: &str) {
    assert!(
        (a - b).abs() < 1e-9,
        "{what}: rust {a} vs typescript {b} (difference {})",
        (a - b).abs()
    );
}

fn corpus() -> Corpus {
    serde_json::from_str(CORPUS).expect("the corpus is valid JSON")
}

#[test]
fn table_tops_match() {
    let c = corpus();
    for (i, t) in c.tables.iter().enumerate() {
        let top = table_top(&t.shape, t.capacity);
        close(top.w, t.top.w, &format!("table {i} top width"));
        close(top.h, t.top.h, &format!("table {i} top height"));
        assert_eq!(top.kind, t.top.kind, "table {i} top kind");
    }
}

#[test]
fn footprints_match() {
    let c = corpus();
    for (i, t) in c.tables.iter().enumerate() {
        let f = footprint(&t.shape, t.capacity, t.x, t.y, t.rot);
        match (f, t.footprint) {
            (
                Footprint::Circle { x, y, r },
                Footprint::Circle {
                    x: tx,
                    y: ty,
                    r: tr,
                },
            ) => {
                close(x, tx, &format!("table {i} x"));
                close(y, ty, &format!("table {i} y"));
                close(r, tr, &format!("table {i} radius"));
            }
            (
                Footprint::Rect { x, y, hw, hh, rot },
                Footprint::Rect {
                    x: tx,
                    y: ty,
                    hw: thw,
                    hh: thh,
                    rot: trot,
                },
            ) => {
                close(x, tx, &format!("table {i} x"));
                close(y, ty, &format!("table {i} y"));
                close(hw, thw, &format!("table {i} half width"));
                close(hh, thh, &format!("table {i} half height"));
                close(rot, trot, &format!("table {i} rotation"));
            }
            _ => panic!("table {i} is a different shape in Rust and TypeScript"),
        }
    }
}

#[test]
fn extents_and_wall_gaps_match() {
    let c = corpus();
    for (i, t) in c.tables.iter().enumerate() {
        let f = footprint(&t.shape, t.capacity, t.x, t.y, t.rot);
        let (ex, ey) = extents(&f);
        close(ex, t.ex, &format!("table {i} ex"));
        close(ey, t.ey, &format!("table {i} ey"));
        close(
            gap_to_walls(&f, t.width, t.length),
            t.wall_gap,
            &format!("table {i} wall gap"),
        );
    }
}

#[test]
fn pairwise_gaps_match() {
    let c = corpus();
    for (i, p) in c.pairs.iter().enumerate() {
        let a = &c.tables[p.a];
        let b = &c.tables[p.b];
        let fa = footprint(&a.shape, a.capacity, a.x, a.y, a.rot);
        let fb = footprint(&b.shape, b.capacity, b.x, b.y, b.rot);
        close(gap_between(&fa, &fb), p.gap, &format!("pair {i}"));
    }
}

#[test]
fn zone_gaps_match() {
    let c = corpus();
    for (i, p) in c.zone_pairs.iter().enumerate() {
        let t = &c.tables[p.table];
        let f = footprint(&t.shape, t.capacity, t.x, t.y, t.rot);
        close(
            gap_to_zone(&f, &c.zones[p.zone]),
            p.gap,
            &format!("zone pair {i}"),
        );
    }
}

#[test]
fn packing_matches() {
    let c = corpus();
    for (i, case) in c.fits.iter().enumerate() {
        let result = fit_tables(&FitOptions {
            width: case.width,
            length: case.length,
            zones: case.zones.clone(),
            obstacles: Vec::new(),
            shape: case.shape.clone(),
            capacity: case.capacity,
            rotation: case.rotation,
            gap: case.gap,
            aisle: case.aisle,
        });
        assert_eq!(result.count, case.count, "fit {i} table count");
        assert_eq!(result.seats, case.seats, "fit {i} seat count");
        assert_eq!(result.arrangement, case.arrangement, "fit {i} arrangement");
        assert_eq!(
            result.placements.len(),
            case.placements.len(),
            "fit {i} placement count"
        );
        for (j, (got, want)) in result
            .placements
            .iter()
            .zip(case.placements.iter())
            .enumerate()
        {
            close(got.x, want.x, &format!("fit {i} placement {j} x"));
            close(got.y, want.y, &format!("fit {i} placement {j} y"));
            close(got.rot, want.rot, &format!("fit {i} placement {j} rot"));
        }
    }
}
