//! Table and zone geometry, ported from `apps/web/src/features/seating/hall/model.ts`.
//!
//! The port is exact: same formulas, same rounding, same tie-breaking. `tests/parity.rs` holds it
//! to the TypeScript implementation on a generated corpus, so the two can never drift silently.

use serde::{Deserialize, Serialize};
#[cfg(feature = "ts")]
use ts_rs::TS;

use crate::venue::{Zone, ZoneShape};

/// Depth of a chair plus the person sitting in it, measured out from the table edge.
pub const CHAIR_DEPTH: f64 = 0.5;

/// `Math.round`: halves go towards positive infinity, unlike Rust's `f64::round`.
pub fn js_round(value: f64) -> f64 {
    let floor = value.floor();
    if value - floor >= 0.5 {
        floor + 1.0
    } else {
        floor
    }
}

/// Two decimal places, the precision the studio stores positions at.
pub fn round2(value: f64) -> f64 {
    js_round(value * 100.0) / 100.0
}

#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub enum TopKind {
    Circle,
    Rect,
    Ellipse,
}

/// The table top itself, before chairs.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub struct TableTop {
    pub w: f64,
    pub h: f64,
    pub kind: TopKind,
}

/// Real-world table sizes: 36/48/60/72-inch rounds and 6 or 8-foot banquet tables.
pub fn table_top(shape: &str, capacity: i32) -> TableTop {
    let seats = capacity.max(1) as f64;
    match shape {
        "rectangular" => TableTop {
            w: 1.83_f64.max((seats / 2.0).ceil() * 0.6),
            h: 0.76,
            kind: TopKind::Rect,
        },
        "head" => TableTop {
            w: 1.83_f64.max(seats * 0.6),
            h: 0.76,
            kind: TopKind::Rect,
        },
        "oval" => TableTop {
            w: 1.8_f64.max((seats / 2.0).ceil() * 0.6 + 0.4),
            h: 1.1,
            kind: TopKind::Ellipse,
        },
        _ => {
            let d = if seats <= 4.0 {
                0.91
            } else if seats <= 6.0 {
                1.22
            } else if seats <= 10.0 {
                1.52
            } else if seats <= 12.0 {
                1.83
            } else {
                (seats * 0.5) / std::f64::consts::PI
            };
            TableTop {
                w: d,
                h: d,
                kind: TopKind::Circle,
            }
        }
    }
}

/// A table's footprint with its chairs: a circle, or an oriented rectangle.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "lowercase")]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub enum Footprint {
    Circle {
        x: f64,
        y: f64,
        r: f64,
    },
    Rect {
        x: f64,
        y: f64,
        hw: f64,
        hh: f64,
        rot: f64,
    },
}

impl Footprint {
    pub fn centre(&self) -> (f64, f64) {
        match *self {
            Footprint::Circle { x, y, .. } | Footprint::Rect { x, y, .. } => (x, y),
        }
    }
}

pub fn footprint(shape: &str, capacity: i32, x: f64, y: f64, rot: f64) -> Footprint {
    let top = table_top(shape, capacity);
    if top.kind == TopKind::Circle {
        return Footprint::Circle {
            x,
            y,
            r: top.w / 2.0 + CHAIR_DEPTH,
        };
    }
    let chairs_behind_only = shape == "head";
    let hh = if chairs_behind_only {
        top.h / 2.0 + CHAIR_DEPTH / 2.0
    } else {
        top.h / 2.0 + CHAIR_DEPTH
    };
    let hw = top.w / 2.0
        + if top.kind == TopKind::Ellipse {
            CHAIR_DEPTH
        } else {
            0.15
        };
    Footprint::Rect { x, y, hw, hh, rot }
}

/// Axis-aligned bounding half-extents of a footprint.
pub fn extents(f: &Footprint) -> (f64, f64) {
    match *f {
        Footprint::Circle { r, .. } => (r, r),
        Footprint::Rect { hw, hh, rot, .. } => {
            let c = (rot * std::f64::consts::PI / 180.0).cos().abs();
            let s = (rot * std::f64::consts::PI / 180.0).sin().abs();
            (hw * c + hh * s, hw * s + hh * c)
        }
    }
}

fn corners(f: &Footprint) -> [(f64, f64); 4] {
    let Footprint::Rect { x, y, hw, hh, rot } = *f else {
        return [(0.0, 0.0); 4];
    };
    let c = (rot * std::f64::consts::PI / 180.0).cos();
    let s = (rot * std::f64::consts::PI / 180.0).sin();
    [(-hw, -hh), (hw, -hh), (hw, hh), (-hw, hh)]
        .map(|(px, py)| (x + px * c - py * s, y + px * s + py * c))
}

fn point_rect_distance(px: f64, py: f64, r: &Footprint) -> f64 {
    let Footprint::Rect { x, y, hw, hh, rot } = *r else {
        return f64::INFINITY;
    };
    let c = (-rot * std::f64::consts::PI / 180.0).cos();
    let s = (-rot * std::f64::consts::PI / 180.0).sin();
    let dx = px - x;
    let dy = py - y;
    let lx = dx * c - dy * s;
    let ly = dx * s + dy * c;
    let ox = (lx.abs() - hw).max(0.0);
    let oy = (ly.abs() - hh).max(0.0);
    if ox == 0.0 && oy == 0.0 {
        return -(hw - lx.abs()).min(hh - ly.abs());
    }
    ox.hypot(oy)
}

fn rects_overlap(a: &Footprint, b: &Footprint) -> bool {
    let ca = corners(a);
    let cb = corners(b);
    for poly in [&ca, &cb] {
        for i in 0..4 {
            let (x1, y1) = poly[i];
            let (x2, y2) = poly[(i + 1) % 4];
            let nx = y2 - y1;
            let ny = x1 - x2;
            let project = |pts: &[(f64, f64)]| -> (f64, f64) {
                let mut lo = f64::INFINITY;
                let mut hi = f64::NEG_INFINITY;
                for (x, y) in pts {
                    let v = x * nx + y * ny;
                    lo = lo.min(v);
                    hi = hi.max(v);
                }
                (lo, hi)
            };
            let (a_lo, a_hi) = project(&ca);
            let (b_lo, b_hi) = project(&cb);
            if a_hi < b_lo || b_hi < a_lo {
                return false;
            }
        }
    }
    true
}

/// Smallest distance between two footprints (negative when they overlap).
pub fn gap_between(a: &Footprint, b: &Footprint) -> f64 {
    match (a, b) {
        (
            Footprint::Circle {
                x: ax,
                y: ay,
                r: ar,
            },
            Footprint::Circle {
                x: bx,
                y: by,
                r: br,
            },
        ) => (ax - bx).hypot(ay - by) - ar - br,
        (Footprint::Circle { x, y, r }, rect) | (rect, Footprint::Circle { x, y, r }) => {
            point_rect_distance(*x, *y, rect) - r
        }
        _ => {
            if rects_overlap(a, b) {
                return -1.0;
            }
            let mut best = f64::INFINITY;
            for (px, py) in corners(a) {
                best = best.min(point_rect_distance(px, py, b));
            }
            for (px, py) in corners(b) {
                best = best.min(point_rect_distance(px, py, a));
            }
            best
        }
    }
}

/// A zone's outline for spacing checks: a circle for even round shapes, else its rectangle.
pub fn zone_footprint(z: &Zone) -> Footprint {
    let roundish = matches!(
        z.shape,
        Some(ZoneShape::Round) | Some(ZoneShape::Hexagon) | Some(ZoneShape::Octagon)
    );
    if roundish && (z.w - z.h).abs() < 0.01 {
        return Footprint::Circle {
            x: z.x,
            y: z.y,
            r: z.w / 2.0,
        };
    }
    Footprint::Rect {
        x: z.x,
        y: z.y,
        hw: z.w / 2.0,
        hh: z.h / 2.0,
        rot: z.rotation(),
    }
}

/// Distance from a footprint to a zone rectangle (negative when overlapping).
pub fn gap_to_zone(f: &Footprint, z: &Zone) -> f64 {
    gap_between(f, &zone_footprint(z))
}

/// How far a footprint sits inside the walls (negative when it pokes through one).
pub fn gap_to_walls(f: &Footprint, width: f64, length: f64) -> f64 {
    let (ex, ey) = extents(f);
    let (x, y) = f.centre();
    (x - ex)
        .min(y - ey)
        .min(width - (x + ex))
        .min(length - (y + ey))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn js_round_matches_javascript() {
        assert_eq!(js_round(0.5), 1.0);
        assert_eq!(js_round(-0.5), 0.0);
        assert_eq!(js_round(2.4), 2.0);
        assert_eq!(js_round(2.6), 3.0);
        assert_eq!(js_round(-2.6), -3.0);
    }

    #[test]
    fn round2_keeps_two_places() {
        assert_eq!(round2(1.2345), 1.23);
        assert_eq!(round2(1.235), 1.24);
        // -1.235 * 100 is -123.50000000000001 in binary, so JavaScript rounds it away from zero.
        assert_eq!(round2(-1.235), -1.24);
    }

    #[test]
    fn a_round_table_grows_with_its_seats() {
        assert_eq!(table_top("round", 4).w, 0.91);
        assert_eq!(table_top("round", 6).w, 1.22);
        assert_eq!(table_top("round", 8).w, 1.52);
        assert_eq!(table_top("round", 10).w, 1.52);
        assert_eq!(table_top("round", 12).w, 1.83);
    }

    #[test]
    fn a_banquet_table_is_at_least_six_foot() {
        assert_eq!(table_top("rectangular", 6).w, 1.83);
        assert_eq!(table_top("rectangular", 8).w, 2.4);
    }

    #[test]
    fn a_round_footprint_includes_the_chairs() {
        let f = footprint("round", 8, 5.0, 5.0, 0.0);
        let Footprint::Circle { r, .. } = f else {
            panic!("round tables are circles");
        };
        assert!((r - (1.52 / 2.0 + CHAIR_DEPTH)).abs() < 1e-12);
    }

    #[test]
    fn a_head_table_only_has_chairs_behind_it() {
        let head = footprint("head", 8, 0.0, 0.0, 0.0);
        let banquet = footprint("rectangular", 8, 0.0, 0.0, 0.0);
        let (_, head_ey) = extents(&head);
        let (_, banquet_ey) = extents(&banquet);
        assert!(head_ey < banquet_ey);
    }

    #[test]
    fn overlapping_tables_report_a_negative_gap() {
        let a = footprint("round", 8, 5.0, 5.0, 0.0);
        let b = footprint("round", 8, 5.2, 5.0, 0.0);
        assert!(gap_between(&a, &b) < 0.0);
    }

    #[test]
    fn a_table_clear_of_another_reports_the_distance_between_chair_backs() {
        let a = footprint("round", 8, 5.0, 5.0, 0.0);
        let b = footprint("round", 8, 8.0, 5.0, 0.0);
        let gap = gap_between(&a, &b);
        assert!((gap - (3.0 - 2.0 * (1.52 / 2.0 + CHAIR_DEPTH))).abs() < 1e-12);
    }

    #[test]
    fn a_table_against_the_wall_reports_a_small_gap() {
        let f = footprint("round", 8, 1.0, 1.0, 0.0);
        let gap = gap_to_walls(&f, 30.0, 20.0);
        assert!((gap - (1.0 - (1.52 / 2.0 + CHAIR_DEPTH))).abs() < 1e-12);
    }

    #[test]
    fn a_table_outside_the_wall_reports_a_negative_gap() {
        let f = footprint("round", 8, 0.2, 5.0, 0.0);
        assert!(gap_to_walls(&f, 30.0, 20.0) < 0.0);
    }
}
