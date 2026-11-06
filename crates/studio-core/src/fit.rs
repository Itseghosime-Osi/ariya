//! How many tables fit, and where. Ported from `apps/web/src/features/seating/hall/fit.ts`.
//!
//! Packs one table type into the room around its zones, walls, a centre aisle and any tables
//! already placed. Tries straight rows and staggered rows at several offsets and keeps the
//! arrangement with the most tables; ties go to the more symmetrical one.

use serde::{Deserialize, Serialize};
#[cfg(feature = "ts")]
use ts_rs::TS;

use crate::geometry::{
    extents, footprint, gap_between, gap_to_walls, gap_to_zone, js_round, round2, Footprint,
};
use crate::venue::Zone;

/// Clear band kept along the walls for service and exits.
pub const WALL_MARGIN: f64 = 1.0;
/// Clear band kept around stages, dance floors and stations.
pub const ZONE_CLEARANCE: f64 = 1.0;
/// Main aisle where it serves more than 50 people.
pub const MAIN_AISLE: f64 = 1.12;

#[derive(Clone, Debug)]
pub struct FitOptions {
    pub width: f64,
    pub length: f64,
    pub zones: Vec<Zone>,
    /// Tables already in the room, which new ones must keep clear of.
    pub obstacles: Vec<Footprint>,
    pub shape: String,
    pub capacity: i32,
    /// 0 or 90 for banquet tables; ignored for rounds.
    pub rotation: f64,
    /// Clear gap between neighbouring footprints (chair back to chair back).
    pub gap: f64,
    /// Keep a main aisle down the middle, from the entrance to the stage.
    pub aisle: bool,
}

#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub enum Arrangement {
    Rows,
    Staggered,
}

#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub struct FitPlacement {
    pub x: f64,
    pub y: f64,
    pub rot: f64,
}

#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Debug, Serialize, Deserialize)]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub struct FitResult {
    pub placements: Vec<FitPlacement>,
    pub count: usize,
    pub seats: usize,
    pub arrangement: Arrangement,
}

/// How much clear floor a zone needs around it before a table may sit beside it.
pub fn zone_clearance(z: &Zone) -> f64 {
    use crate::venue::ZoneKind::*;
    match z.kind {
        Pillar => 0.3,
        Custom => 0.6,
        Entrance => 1.6,
        _ => ZONE_CLEARANCE,
    }
}

/// The point everything faces: the stage if there is one, else the top wall.
pub fn front_of(zones: &[Zone], width: f64) -> (f64, f64) {
    match zones
        .iter()
        .find(|z| z.kind == crate::venue::ZoneKind::Stage)
    {
        Some(stage) => (stage.x, stage.y),
        None => (width / 2.0, 0.0),
    }
}

pub fn can_place(f: &Footprint, opts: &FitOptions) -> bool {
    if gap_to_walls(f, opts.width, opts.length) < WALL_MARGIN {
        return false;
    }
    for z in &opts.zones {
        if gap_to_zone(f, z) < zone_clearance(z) {
            return false;
        }
    }
    for o in &opts.obstacles {
        if gap_between(f, o) < opts.gap {
            return false;
        }
    }
    if opts.aisle {
        let (ex, _) = extents(f);
        let (x, _) = f.centre();
        if (x - opts.width / 2.0).abs() - ex < MAIN_AISLE / 2.0 {
            return false;
        }
    }
    true
}

pub fn fit_tables(opts: &FitOptions) -> FitResult {
    let is_round = opts.shape == "round";
    let rot = if is_round { 0.0 } else { opts.rotation };
    let probe = footprint(&opts.shape, opts.capacity, 0.0, 0.0, rot);
    let (ex, ey) = extents(&probe);
    let pitch_x = 2.0 * ex + opts.gap;
    let pitch_y = 2.0 * ey + opts.gap;
    let cx = opts.width / 2.0;

    let mut best = FitResult {
        placements: Vec::new(),
        count: 0,
        seats: 0,
        arrangement: Arrangement::Rows,
    };
    let mut best_sym = -1.0_f64;

    let lattices = [
        (Arrangement::Rows, pitch_y),
        (
            Arrangement::Staggered,
            // Rounds nest into the gaps of the row in front; banquet rows just shift sideways.
            if is_round {
                (pitch_x * 3.0_f64.sqrt()) / 2.0
            } else {
                pitch_y
            },
        ),
    ];

    for (kind, row_pitch) in lattices {
        for ox in [0.0, 0.5] {
            for oy_step in [0.0, 0.25, 0.5, 0.75] {
                let mut placements: Vec<FitPlacement> = Vec::new();
                let y0 = WALL_MARGIN + ey + oy_step * row_pitch;
                let mut row = 0usize;
                let mut y = y0;
                while y <= opts.length - WALL_MARGIN - ey + 1e-6 {
                    let shift = if kind == Arrangement::Staggered && row % 2 == 1 {
                        0.5
                    } else {
                        0.0
                    };
                    let off = (ox + shift) % 1.0;
                    let span = (opts.width / pitch_x).ceil() as i64 + 2;
                    for i in -span..=span {
                        let x = cx + (i as f64 + off) * pitch_x;
                        if x < 0.0 || x > opts.width {
                            continue;
                        }
                        let f = footprint(&opts.shape, opts.capacity, x, y, rot);
                        if can_place(&f, opts) {
                            placements.push(FitPlacement {
                                x: round2(x),
                                y: round2(y),
                                rot,
                            });
                        }
                    }
                    row += 1;
                    y += row_pitch;
                }
                let sym = symmetry(&placements, cx);
                if placements.len() > best.count
                    || (placements.len() == best.count && sym > best_sym)
                {
                    best = FitResult {
                        count: placements.len(),
                        seats: placements.len() * opts.capacity.max(0) as usize,
                        placements,
                        arrangement: kind,
                    };
                    best_sym = sym;
                }
            }
        }
    }
    best
}

/// Share of placements whose mirror image across the centre line is also a placement.
fn symmetry(ps: &[FitPlacement], cx: f64) -> f64 {
    if ps.is_empty() {
        return 0.0;
    }
    let key = |x: f64, y: f64| format!("{}:{}", js_round(x * 10.0), js_round(y * 10.0));
    let set: std::collections::HashSet<String> = ps.iter().map(|p| key(p.x, p.y)).collect();
    let mirrored = ps
        .iter()
        .filter(|p| set.contains(&key(2.0 * cx - p.x, p.y)))
        .count();
    mirrored as f64 / ps.len() as f64
}

/// Keep only the `n` placements nearest the stage, so a smaller party sits up front.
pub fn nearest_to_front(ps: &[FitPlacement], front: (f64, f64), n: usize) -> Vec<FitPlacement> {
    let mut sorted: Vec<FitPlacement> = ps.to_vec();
    sorted.sort_by(|a, b| {
        let da = (a.x - front.0).hypot((a.y - front.1) * 1.4);
        let db = (b.x - front.0).hypot((b.y - front.1) * 1.4);
        da.partial_cmp(&db).unwrap_or(std::cmp::Ordering::Equal)
    });
    sorted.truncate(n);
    sorted
}

/// Find a free spot for one table, scanning out from the preferred point.
pub fn find_free_spot(opts: &FitOptions, prefer: (f64, f64)) -> Option<FitPlacement> {
    let rot = if opts.shape == "round" {
        0.0
    } else {
        opts.rotation
    };
    let step = 0.5;
    let max_r = opts.width.max(opts.length);
    let mut r = 0.0;
    while r <= max_r {
        let n = if r == 0.0 {
            1
        } else {
            (2.0 * std::f64::consts::PI * r / step).ceil() as usize
        };
        for k in 0..n {
            let t = (k as f64 / n as f64) * std::f64::consts::PI * 2.0;
            let x = prefer.0 + t.cos() * r;
            let y = prefer.1 + t.sin() * r;
            let f = footprint(&opts.shape, opts.capacity, x, y, rot);
            if can_place(&f, opts) {
                return Some(FitPlacement {
                    x: round2(x),
                    y: round2(y),
                    rot,
                });
            }
        }
        r += step;
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::venue::ZoneKind;

    fn empty_room(width: f64, length: f64) -> FitOptions {
        FitOptions {
            width,
            length,
            zones: Vec::new(),
            obstacles: Vec::new(),
            shape: "round".into(),
            capacity: 8,
            rotation: 0.0,
            gap: 0.6,
            aisle: false,
        }
    }

    #[test]
    fn a_bigger_room_fits_more_tables() {
        let small = fit_tables(&empty_room(18.0, 14.0));
        let large = fit_tables(&empty_room(40.0, 28.0));
        assert!(large.count > small.count);
    }

    #[test]
    fn every_placement_keeps_the_wall_margin() {
        let opts = empty_room(30.0, 20.0);
        let result = fit_tables(&opts);
        assert!(result.count > 0);
        for p in &result.placements {
            let f = footprint(&opts.shape, opts.capacity, p.x, p.y, p.rot);
            assert!(gap_to_walls(&f, opts.width, opts.length) >= WALL_MARGIN - 1e-9);
        }
    }

    #[test]
    fn no_two_placements_are_closer_than_the_gap() {
        let opts = empty_room(30.0, 20.0);
        let result = fit_tables(&opts);
        let mut min_gap = f64::INFINITY;
        for (i, a) in result.placements.iter().enumerate() {
            for b in result.placements.iter().skip(i + 1) {
                let fa = footprint(&opts.shape, opts.capacity, a.x, a.y, a.rot);
                let fb = footprint(&opts.shape, opts.capacity, b.x, b.y, b.rot);
                min_gap = min_gap.min(gap_between(&fa, &fb));
            }
        }
        // Positions are stored to the centimetre, so a lattice built on the exact pitch can land
        // up to a centimetre or so inside the requested gap. The TypeScript does the same.
        assert!(
            min_gap >= opts.gap - 0.02,
            "closest pair is {min_gap} m apart, asked for {} m",
            opts.gap
        );
    }

    #[test]
    fn a_stage_takes_floor_away_from_the_tables() {
        let mut with_stage = empty_room(30.0, 20.0);
        with_stage.zones.push(Zone {
            id: "s".into(),
            kind: ZoneKind::Stage,
            label: "Stage".into(),
            x: 15.0,
            y: 2.2,
            w: 9.0,
            h: 3.6,
            shape: None,
            rot: None,
        });
        let without = fit_tables(&empty_room(30.0, 20.0));
        let with = fit_tables(&with_stage);
        assert!(with.count < without.count);
    }

    #[test]
    fn the_same_room_always_gives_the_same_answer() {
        let a = fit_tables(&empty_room(30.0, 20.0));
        let b = fit_tables(&empty_room(30.0, 20.0));
        assert_eq!(a.count, b.count);
        assert_eq!(a.arrangement, b.arrangement);
        for (p, q) in a.placements.iter().zip(b.placements.iter()) {
            assert_eq!((p.x, p.y), (q.x, q.y));
        }
    }

    #[test]
    fn a_free_spot_is_found_in_an_empty_room() {
        let opts = empty_room(30.0, 20.0);
        let spot = find_free_spot(&opts, (15.0, 10.0)).expect("a spot");
        let f = footprint(&opts.shape, opts.capacity, spot.x, spot.y, spot.rot);
        assert!(gap_to_walls(&f, opts.width, opts.length) >= WALL_MARGIN - 1e-9);
    }
}
