//! How good a layout is, term by term.
//!
//! Every term is computed on its own and carries a line the host can read, so "why is A better?"
//! is answerable from the breakdown rather than from a single opaque number.
//!
//! Called from `search.rs` (every candidate and every annealing step) and `wire.rs` (the breakdown
//! travels with each option). No existing module scores a layout: the TypeScript `checks.ts`
//! reports problems as strings but has no objective. Reads `ArrangeTable`, `Placement`,
//! `ChairPlacement` and `venue::Zone`; writes `ScoreBreakdown`.

use serde::{Deserialize, Serialize};
#[cfg(feature = "ts")]
use ts_rs::TS;

use crate::archetype::{ArrangeTable, ChairPlacement, Placement};
use crate::geometry::{
    extents, footprint, gap_between, gap_to_walls, gap_to_zone, js_round, zone_footprint, Footprint,
};
use crate::grid::Grid;
use crate::venue::{Zone, ZoneKind};

/// The 24 m MUTA limit on the longest escape route.
pub const EGRESS_LIMIT: f64 = 24.0;
/// Beyond this angle from the stage axis a guest is looking sideways at the performance.
const SIGHT_ANGLE: f64 = 60.0;
/// Closer than this and guests crane; further than the far band and they are in the back.
const SIGHT_NEAR: f64 = 3.0;
const SIGHT_FAR: f64 = 20.0;

/// How much each term counts. The positive terms sum to 1; the penalties are subtracted.
#[derive(Clone, Copy, Debug)]
pub struct Weights {
    pub seats: f64,
    pub sightline: f64,
    pub circulation: f64,
    pub service: f64,
    pub symmetry: f64,
    pub comfort: f64,
    pub egress: f64,
    pub penalty: f64,
}

impl Default for Weights {
    fn default() -> Self {
        Self {
            seats: 0.30,
            sightline: 0.22,
            circulation: 0.16,
            service: 0.12,
            symmetry: 0.10,
            comfort: 0.10,
            egress: 0.15,
            penalty: 0.25,
        }
    }
}

/// One line of the breakdown.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Debug, Serialize, Deserialize)]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub struct ScoreTerm {
    pub id: String,
    pub label: String,
    /// The raw measure, 0..1.
    pub value: f64,
    /// How much this term counts, signed: negative for a penalty.
    pub weight: f64,
    /// What this term added to (or took from) the total.
    pub contribution: f64,
    /// One line the host can read.
    pub detail: String,
}

/// The whole objective, with every term still visible.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Debug, Serialize, Deserialize)]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub struct ScoreBreakdown {
    pub total: f64,
    pub terms: Vec<ScoreTerm>,
}

/// Everything the objective reads.
pub struct ScoreInput<'a> {
    pub width: f64,
    pub length: f64,
    pub zones: &'a [Zone],
    pub tables: &'a [ArrangeTable],
    pub placements: &'a [Placement],
    pub chairs: &'a [ChairPlacement],
    pub gap: f64,
}

/// Score one layout.
pub fn score(input: &ScoreInput, weights: &Weights) -> ScoreBreakdown {
    let grid = build_grid(input);
    let mut terms = Vec::with_capacity(8);

    let (v, d) = seats_term(input);
    terms.push(term("seats", "Seats placed", v, weights.seats, d));

    let (v, d) = sightline_term(input);
    terms.push(term("sightline", "Sightlines", v, weights.sightline, d));

    let (v, d) = circulation_term(input);
    terms.push(term(
        "circulation",
        "Getting around",
        v,
        weights.circulation,
        d,
    ));

    let (v, d) = service_term(input);
    terms.push(term("service", "Service", v, weights.service, d));

    let (v, d) = symmetry_term(input);
    terms.push(term("symmetry", "Symmetry", v, weights.symmetry, d));

    let (v, d) = comfort_term(input, &grid);
    terms.push(term(
        "comfort",
        "Room between tables",
        v,
        weights.comfort,
        d,
    ));

    let (v, d) = egress_term(input);
    terms.push(term("egress", "Escape distance", v, -weights.egress, d));

    let (v, d) = penalty_term(input, &grid);
    terms.push(term("penalty", "Problems", v, -weights.penalty, d));

    let total = terms.iter().map(|t| t.contribution).sum();
    ScoreBreakdown { total, terms }
}

fn term(id: &str, label: &str, value: f64, weight: f64, detail: String) -> ScoreTerm {
    ScoreTerm {
        id: id.into(),
        label: label.into(),
        value,
        weight,
        contribution: value * weight,
        detail,
    }
}

fn footprint_of(input: &ScoreInput, p: &Placement) -> Footprint {
    let t = &input.tables[p.table];
    footprint(&t.shape, t.capacity, p.x, p.y, p.rot)
}

fn build_grid(input: &ScoreInput) -> Grid {
    let (ex, ey) = input
        .placements
        .iter()
        .map(|p| extents(&footprint_of(input, p)))
        .fold((0.0_f64, 0.0_f64), |a, b| (a.0.max(b.0), a.1.max(b.1)));
    let cell = (2.0 * ex.max(ey) + input.gap).max(1.0);
    let mut grid = Grid::new(input.width, input.length, cell);
    for p in input.placements {
        grid.insert(footprint_of(input, p));
    }
    grid
}

fn seats_term(input: &ScoreInput) -> (f64, String) {
    let requested: i64 = input.tables.iter().map(|t| t.capacity.max(0) as i64).sum();
    let at_tables: i64 = input
        .placements
        .iter()
        .map(|p| input.tables[p.table].capacity.max(0) as i64)
        .sum();
    let placed = at_tables + input.chairs.len() as i64;
    if requested == 0 {
        return (1.0, "No seats to place.".into());
    }
    let value = (placed as f64 / requested as f64).clamp(0.0, 1.0);
    (value, format!("{placed} of {requested} seats placed."))
}

fn sightline_term(input: &ScoreInput) -> (f64, String) {
    let Some(stage) = input.zones.iter().find(|z| z.kind == ZoneKind::Stage) else {
        return (1.0, "No stage, so nothing to face.".into());
    };
    if input.placements.is_empty() {
        return (0.0, "No tables placed.".into());
    }
    let pillars: Vec<Footprint> = input
        .zones
        .iter()
        .filter(|z| z.kind == ZoneKind::Pillar)
        .map(zone_footprint)
        .collect();

    let mut sum = 0.0;
    let mut poor = 0;
    for p in input.placements {
        let s = sightline((p.x, p.y), (stage.x, stage.y), &pillars);
        sum += s;
        if s < 0.5 {
            poor += 1;
        }
    }
    let value = sum / input.placements.len() as f64;
    let detail = if poor == 0 {
        "Every table has a clear view of the stage.".to_string()
    } else {
        format!(
            "{poor} of {} tables have a poor view of the stage.",
            input.placements.len()
        )
    };
    (value, detail)
}

/// How well one table sees the stage: the angle off the axis, the distance band, and whether a
/// pillar stands in the way.
fn sightline(centre: (f64, f64), stage: (f64, f64), pillars: &[Footprint]) -> f64 {
    let dx = centre.0 - stage.0;
    let dy = centre.1 - stage.1;
    if dy <= 0.0 {
        // Behind the stage: there is nothing to see.
        return 0.0;
    }
    let angle = dx.abs().atan2(dy).to_degrees();
    let angle_score = (1.0 - angle / SIGHT_ANGLE).clamp(0.0, 1.0);

    let dist = dx.hypot(dy);
    let dist_score = if dist < SIGHT_NEAR {
        // Too close: guests crane and the front row blocks the second.
        0.4 + 0.6 * (dist / SIGHT_NEAR)
    } else if dist > SIGHT_FAR {
        (1.0 - (dist - SIGHT_FAR) / 15.0).clamp(0.0, 1.0)
    } else {
        1.0
    };

    let occluded = pillars.iter().any(|p| segment_hits(centre, stage, p));
    let occlusion = if occluded { 0.4 } else { 1.0 };

    angle_score * dist_score * occlusion
}

/// Whether the straight line from a table to the stage passes through a pillar.
fn segment_hits(a: (f64, f64), b: (f64, f64), pillar: &Footprint) -> bool {
    const STEPS: usize = 24;
    for i in 1..STEPS {
        let t = i as f64 / STEPS as f64;
        let point = Footprint::Circle {
            x: a.0 + (b.0 - a.0) * t,
            y: a.1 + (b.1 - a.1) * t,
            r: 0.0,
        };
        if gap_between(&point, pillar) < 0.0 {
            return true;
        }
    }
    false
}

fn circulation_term(input: &ScoreInput) -> (f64, String) {
    if input.placements.is_empty() {
        return (0.0, "No tables placed.".into());
    }
    let cell = 0.5;
    let cols = (input.width / cell).ceil() as usize;
    let rows = (input.length / cell).ceil() as usize;
    if cols == 0 || rows == 0 {
        return (0.0, "The room has no floor.".into());
    }
    let mut blocked = vec![false; cols * rows];

    for p in input.placements {
        let f = footprint_of(input, p);
        mark(&mut blocked, cols, rows, cell, &f, input.gap / 2.0);
    }
    for z in input.zones {
        if z.kind == ZoneKind::Entrance {
            continue;
        }
        mark(&mut blocked, cols, rows, cell, &zone_footprint(z), 0.0);
    }

    let entrance = input.zones.iter().find(|z| z.kind == ZoneKind::Entrance);
    let start = match entrance {
        Some(z) => cell_of(z.x, z.y, cell, cols, rows),
        None => cell_of(input.width / 2.0, input.length - 0.5, cell, cols, rows),
    };
    let Some(start) = free_near(&blocked, cols, rows, start) else {
        return (0.0, "There is no way into the room.".into());
    };
    let reachable = flood(&blocked, cols, rows, start);

    let mut reached = 0;
    for p in input.placements {
        let (cx, cy) = cell_of(p.x, p.y, cell, cols, rows);
        if reachable[cy * cols + cx] {
            reached += 1;
        }
    }
    let fraction = reached as f64 / input.placements.len() as f64;

    // The centre aisle, from the entrance to the stage, has to stay open.
    let stage_row = input
        .zones
        .iter()
        .find(|z| z.kind == ZoneKind::Stage)
        .map(|z| cell_of(z.x, z.y, cell, cols, rows).1);
    let entrance_row = entrance.map(|z| cell_of(z.x, z.y, cell, cols, rows).1);
    let (lo, hi) = match (stage_row, entrance_row) {
        (Some(s), Some(e)) => (s.min(e), s.max(e)),
        _ => (0, rows - 1),
    };
    let mid = (cols / 2).min(cols - 1);
    let aisle_clear = (lo..=hi).all(|cy| reachable[cy * cols + mid]);

    let value = fraction * if aisle_clear { 1.0 } else { 0.85 };
    let detail = if reached == input.placements.len() {
        "Every table can be reached from the entrance.".to_string()
    } else {
        format!(
            "{} of {} tables cannot be reached from the entrance.",
            input.placements.len() - reached,
            input.placements.len()
        )
    };
    (value, detail)
}

fn service_term(input: &ScoreInput) -> (f64, String) {
    let stations: Vec<&Zone> = input
        .zones
        .iter()
        .filter(|z| matches!(z.kind, ZoneKind::Buffet | ZoneKind::Bar))
        .collect();
    if stations.is_empty() {
        return (1.0, "No buffet or bar to serve from.".into());
    }
    if input.placements.is_empty() {
        return (0.0, "No tables placed.".into());
    }

    let mut total = 0.0;
    let mut weight = 0.0;
    let mut worst = 0.0_f64;
    for p in input.placements {
        let f = footprint_of(input, p);
        let d = stations
            .iter()
            .map(|z| gap_to_zone(&f, z).max(0.0))
            .fold(f64::INFINITY, f64::min);
        worst = worst.max(d);
        let s = 1.0 / (1.0 + d / 10.0);
        let w = input.tables[p.table].capacity.max(1) as f64;
        total += s * w;
        weight += w;
    }
    let value = if weight == 0.0 { 1.0 } else { total / weight };
    (
        value,
        format!("The furthest table is {worst:.0} m from the buffet or bar."),
    )
}

fn symmetry_term(input: &ScoreInput) -> (f64, String) {
    if input.placements.is_empty() {
        return (0.0, "No tables placed.".into());
    }
    let cx = input.width / 2.0;
    let key = |x: f64, y: f64| format!("{}:{}", js_round(x * 10.0), js_round(y * 10.0));
    let set: std::collections::HashSet<String> =
        input.placements.iter().map(|p| key(p.x, p.y)).collect();
    let mirrored = input
        .placements
        .iter()
        .filter(|p| set.contains(&key(2.0 * cx - p.x, p.y)))
        .count();
    let value = mirrored as f64 / input.placements.len() as f64;
    let detail = if mirrored == input.placements.len() {
        "The room is balanced left to right.".to_string()
    } else {
        format!(
            "{} of {} tables have a partner across the middle.",
            mirrored,
            input.placements.len()
        )
    };
    (value, detail)
}

fn comfort_term(input: &ScoreInput, grid: &Grid) -> (f64, String) {
    if input.placements.len() < 2 {
        return (1.0, "Only one table, so nothing to crowd.".into());
    }
    let mut min_gap = f64::INFINITY;
    let mut buf = Vec::new();
    for (i, p) in input.placements.iter().enumerate() {
        let f = footprint_of(input, p);
        grid.near_into(&f, input.gap, &mut buf);
        for &j in &buf {
            if j <= i {
                continue;
            }
            min_gap = min_gap.min(gap_between(&f, grid.get(j)));
        }
    }
    if !min_gap.is_finite() {
        return (1.0, "No two tables are close.".into());
    }
    let value = (min_gap / input.gap).clamp(0.0, 1.0);
    (
        value,
        format!(
            "The closest two tables are {min_gap:.1} m apart; you asked for {:.1} m.",
            input.gap
        ),
    )
}

fn egress_term(input: &ScoreInput) -> (f64, String) {
    let exits: Vec<&Zone> = input
        .zones
        .iter()
        .filter(|z| z.kind == ZoneKind::Entrance)
        .collect();
    if exits.is_empty() {
        return (
            0.0,
            "No exit marked, so the escape route is unknown.".into(),
        );
    }
    if input.placements.is_empty() {
        return (0.0, "No tables placed.".into());
    }
    let mut worst = 0.0_f64;
    for p in input.placements {
        let d = exits
            .iter()
            .map(|z| (p.x - z.x).hypot(p.y - z.y))
            .fold(f64::INFINITY, f64::min);
        worst = worst.max(d);
    }
    let value = (worst / EGRESS_LIMIT).clamp(0.0, 1.0);
    (
        value,
        format!(
            "The furthest table is {worst:.0} m from an exit; the limit is {EGRESS_LIMIT:.0} m."
        ),
    )
}

fn penalty_term(input: &ScoreInput, grid: &Grid) -> (f64, String) {
    let mut violations = 0usize;
    let mut buf = Vec::new();
    for (i, p) in input.placements.iter().enumerate() {
        let f = footprint_of(input, p);
        if gap_to_walls(&f, input.width, input.length) < 0.0 {
            violations += 1;
        }
        if input.zones.iter().any(|z| gap_to_zone(&f, z) < 0.0) {
            violations += 1;
        }
        grid.near_into(&f, 0.0, &mut buf);
        if buf
            .iter()
            .any(|&j| j != i && gap_between(&f, grid.get(j)) < 0.0)
        {
            violations += 1;
        }
    }
    let n = input.placements.len().max(1);
    let value = (violations as f64 / n as f64).clamp(0.0, 1.0);
    let detail = if violations == 0 {
        "No table overlaps another, crosses a wall or sits on an area.".to_string()
    } else {
        format!("{violations} problems: tables overlapping, through a wall, or on an area.")
    };
    (value, detail)
}

fn cell_of(x: f64, y: f64, cell: f64, cols: usize, rows: usize) -> (usize, usize) {
    let cx = (x / cell).floor().clamp(0.0, cols as f64 - 1.0) as usize;
    let cy = (y / cell).floor().clamp(0.0, rows as f64 - 1.0) as usize;
    (cx, cy)
}

fn mark(blocked: &mut [bool], cols: usize, rows: usize, cell: f64, f: &Footprint, pad: f64) {
    let (x, y) = f.centre();
    let (ex, ey) = extents(f);
    let (x0, y0) = cell_of(x - ex - pad, y - ey - pad, cell, cols, rows);
    let (x1, y1) = cell_of(x + ex + pad, y + ey + pad, cell, cols, rows);
    for cy in y0..=y1 {
        for cx in x0..=x1 {
            let point = Footprint::Circle {
                x: (cx as f64 + 0.5) * cell,
                y: (cy as f64 + 0.5) * cell,
                r: 0.0,
            };
            if gap_between(&point, f) < pad {
                blocked[cy * cols + cx] = true;
            }
        }
    }
}

/// The nearest cell to `start` that is not blocked, so a flood fill always has somewhere to begin.
fn free_near(
    blocked: &[bool],
    cols: usize,
    rows: usize,
    start: (usize, usize),
) -> Option<(usize, usize)> {
    if !blocked[start.1 * cols + start.0] {
        return Some(start);
    }
    let reach = cols.max(rows) as i64;
    for r in 1..=reach {
        for dy in -r..=r {
            for dx in -r..=r {
                let nx = start.0 as i64 + dx;
                let ny = start.1 as i64 + dy;
                if nx < 0 || ny < 0 || nx >= cols as i64 || ny >= rows as i64 {
                    continue;
                }
                let (nx, ny) = (nx as usize, ny as usize);
                if !blocked[ny * cols + nx] {
                    return Some((nx, ny));
                }
            }
        }
    }
    None
}

fn flood(blocked: &[bool], cols: usize, rows: usize, start: (usize, usize)) -> Vec<bool> {
    let mut seen = vec![false; cols * rows];
    let mut queue = std::collections::VecDeque::new();
    seen[start.1 * cols + start.0] = true;
    queue.push_back(start);
    while let Some((x, y)) = queue.pop_front() {
        for (dx, dy) in [(1i64, 0i64), (-1, 0), (0, 1), (0, -1)] {
            let nx = x as i64 + dx;
            let ny = y as i64 + dy;
            if nx < 0 || ny < 0 || nx >= cols as i64 || ny >= rows as i64 {
                continue;
            }
            let (nx, ny) = (nx as usize, ny as usize);
            let i = ny * cols + nx;
            if seen[i] || blocked[i] {
                continue;
            }
            seen[i] = true;
            queue.push_back((nx, ny));
        }
    }
    seen
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::archetype::Archetype;
    use crate::zones::{place_zones, STRATEGIES};

    fn tables(n: usize) -> Vec<ArrangeTable> {
        (0..n)
            .map(|i| ArrangeTable {
                id: format!("t{i}"),
                shape: "round".into(),
                capacity: 8,
                occupied: 0,
            })
            .collect()
    }

    fn room() -> Vec<Zone> {
        vec![
            Zone {
                id: "stage".into(),
                kind: ZoneKind::Stage,
                label: "Stage".into(),
                x: 15.0,
                y: 2.5,
                w: 9.0,
                h: 4.0,
                shape: None,
                rot: None,
            },
            Zone {
                id: "entrance".into(),
                kind: ZoneKind::Entrance,
                label: "Entrance".into(),
                x: 15.0,
                y: 19.5,
                w: 3.0,
                h: 1.0,
                shape: None,
                rot: None,
            },
            Zone {
                id: "buffet".into(),
                kind: ZoneKind::Buffet,
                label: "Buffet".into(),
                x: 1.3,
                y: 11.0,
                w: 1.6,
                h: 7.0,
                shape: None,
                rot: None,
            },
        ]
    }

    fn layout(n: usize) -> (Vec<ArrangeTable>, Vec<Zone>, Vec<Placement>) {
        let t = tables(n);
        let z = room();
        let placed = place_zones(30.0, 20.0, &z, &STRATEGIES[0]);
        let ctx = crate::archetype::GenContext {
            width: 30.0,
            length: 20.0,
            zones: &placed.working,
            tables: &t,
            gap: 0.6,
            front: (15.0, 2.5),
        };
        let g = Archetype::RoundsRows.generate(&ctx);
        (t, placed.room, g.placements)
    }

    fn input<'a>(t: &'a [ArrangeTable], z: &'a [Zone], p: &'a [Placement]) -> ScoreInput<'a> {
        ScoreInput {
            width: 30.0,
            length: 20.0,
            zones: z,
            tables: t,
            placements: p,
            chairs: &[],
            gap: 0.6,
        }
    }

    #[test]
    fn a_full_layout_scores_higher_than_an_empty_one() {
        let (t, z, p) = layout(20);
        let full = score(&input(&t, &z, &p), &Weights::default());
        let empty = score(&input(&t, &z, &[]), &Weights::default());
        assert!(full.total > empty.total);
    }

    #[test]
    fn every_term_is_present_and_explained() {
        let (t, z, p) = layout(20);
        let s = score(&input(&t, &z, &p), &Weights::default());
        let ids: Vec<&str> = s.terms.iter().map(|t| t.id.as_str()).collect();
        assert_eq!(
            ids,
            [
                "seats",
                "sightline",
                "circulation",
                "service",
                "symmetry",
                "comfort",
                "egress",
                "penalty"
            ]
        );
        for term in &s.terms {
            assert!(!term.detail.is_empty(), "{} has no explanation", term.id);
            assert!(
                (0.0..=1.0).contains(&term.value),
                "{} out of range",
                term.id
            );
        }
    }

    #[test]
    fn the_total_is_the_sum_of_the_contributions() {
        let (t, z, p) = layout(20);
        let s = score(&input(&t, &z, &p), &Weights::default());
        let sum: f64 = s.terms.iter().map(|t| t.contribution).sum();
        assert!((s.total - sum).abs() < 1e-9);
    }

    #[test]
    fn the_penalties_are_subtracted() {
        let (t, z, p) = layout(20);
        let s = score(&input(&t, &z, &p), &Weights::default());
        for id in ["egress", "penalty"] {
            let term = s.terms.iter().find(|t| t.id == id).expect("term");
            assert!(term.weight < 0.0, "{id} should be a penalty");
            assert!(term.contribution <= 0.0, "{id} should not add");
        }
    }

    #[test]
    fn a_table_behind_the_stage_has_no_sightline() {
        let stage = (15.0, 2.5);
        assert_eq!(sightline((15.0, 1.0), stage, &[]), 0.0);
    }

    #[test]
    fn a_table_straight_in_front_sees_best() {
        let stage = (15.0, 2.5);
        let straight = sightline((15.0, 10.0), stage, &[]);
        let sideways = sightline((28.0, 10.0), stage, &[]);
        assert!(straight > sideways);
        assert!((straight - 1.0).abs() < 1e-9);
    }

    #[test]
    fn a_pillar_in_the_way_costs_a_table_its_view() {
        let stage = (15.0, 2.5);
        let pillar = Footprint::Circle {
            x: 15.0,
            y: 6.0,
            r: 0.4,
        };
        let clear = sightline((15.0, 10.0), stage, &[]);
        let blocked = sightline((15.0, 10.0), stage, &[pillar]);
        assert!(blocked < clear);
    }

    #[test]
    fn a_table_through_the_wall_is_a_problem() {
        let t = tables(1);
        let z = room();
        let p = vec![Placement {
            table: 0,
            x: 0.2,
            y: 10.0,
            rot: 0.0,
        }];
        let s = score(&input(&t, &z, &p), &Weights::default());
        let penalty = s.terms.iter().find(|t| t.id == "penalty").expect("term");
        assert!(penalty.value > 0.0);
    }

    #[test]
    fn two_tables_on_top_of_each_other_are_a_problem() {
        let t = tables(2);
        let z = room();
        let p = vec![
            Placement {
                table: 0,
                x: 15.0,
                y: 10.0,
                rot: 0.0,
            },
            Placement {
                table: 1,
                x: 15.0,
                y: 10.0,
                rot: 0.0,
            },
        ];
        let s = score(&input(&t, &z, &p), &Weights::default());
        let penalty = s.terms.iter().find(|t| t.id == "penalty").expect("term");
        assert!(penalty.value > 0.0);
    }

    #[test]
    fn a_symmetric_layout_scores_full_marks_for_symmetry() {
        let t = tables(2);
        let z = room();
        let p = vec![
            Placement {
                table: 0,
                x: 10.0,
                y: 10.0,
                rot: 0.0,
            },
            Placement {
                table: 1,
                x: 20.0,
                y: 10.0,
                rot: 0.0,
            },
        ];
        let s = score(&input(&t, &z, &p), &Weights::default());
        let sym = s.terms.iter().find(|t| t.id == "symmetry").expect("term");
        assert!((sym.value - 1.0).abs() < 1e-9);
    }

    #[test]
    fn a_table_walled_off_from_the_entrance_is_not_reachable() {
        let t = tables(1);
        let mut z = room();
        // A wall of pillars across the room, with the table behind it.
        for i in 0..20 {
            z.push(Zone {
                id: format!("p{i}"),
                kind: ZoneKind::Pillar,
                label: String::new(),
                x: 0.75 + i as f64 * 1.5,
                y: 10.0,
                w: 1.4,
                h: 1.4,
                shape: None,
                rot: None,
            });
        }
        let p = vec![Placement {
            table: 0,
            x: 15.0,
            y: 5.0,
            rot: 0.0,
        }];
        let s = score(&input(&t, &z, &p), &Weights::default());
        let circ = s
            .terms
            .iter()
            .find(|t| t.id == "circulation")
            .expect("term");
        assert!(circ.value < 1.0, "the table should be cut off");
    }

    #[test]
    fn the_same_layout_always_scores_the_same() {
        let (t, z, p) = layout(20);
        let a = score(&input(&t, &z, &p), &Weights::default());
        let b = score(&input(&t, &z, &p), &Weights::default());
        assert_eq!(a.total, b.total);
    }
}
