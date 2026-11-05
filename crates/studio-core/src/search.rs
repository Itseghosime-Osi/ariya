//! The search: try many arrangements, score each, keep the best few.
//!
//! Enumerates every archetype against every zone strategy, scores the result, then refines the
//! leaders with a short annealing pass. Deterministic: the same inputs and seed give the same
//! options on every device.
//!
//! Called from `wire.rs` (the `ARRANGE` operation) and declared in `lib.rs`. Reads `archetype`,
//! `zones`, `score` and `venue`; writes `LayoutOption`, which the studio renders as cards.

use serde::{Deserialize, Serialize};
#[cfg(feature = "ts")]
use ts_rs::TS;

use crate::archetype::{Archetype, ArrangeTable, ChairPlacement, GenContext, Placement};
use crate::score::{score, ScoreBreakdown, ScoreInput, Weights};
use crate::venue::{Zone, ZoneKind};
use crate::zones::{place_zones, ZoneStrategy, STRATEGIES};

/// How many options the studio shows by default.
pub const DEFAULT_KEEP: usize = 3;
/// Annealing steps per refined candidate. Kept modest so a 300-table room stays inside the
/// 150 ms budget; the enumeration is what finds the shape, the annealing only polishes it.
pub const DEFAULT_ANNEAL_ITERS: usize = 120;

/// One ranked arrangement, with everything the studio needs to explain it.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Debug, Serialize, Deserialize)]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub struct LayoutOption {
    /// The archetype's id, e.g. `rounds-rows`.
    pub archetype: String,
    pub archetype_label: String,
    /// The zone strategy's id, e.g. `stage-short-wall`.
    pub strategy: String,
    pub strategy_label: String,
    pub placements: Vec<Placement>,
    pub chairs: Vec<ChairPlacement>,
    /// The areas in room coordinates, after the strategy placed them.
    pub zones: Vec<Zone>,
    /// Indices into the request's table list that found no room.
    pub unplaced: Vec<usize>,
    pub score: ScoreBreakdown,
    /// One line naming what this option gives up, for the card.
    pub tradeoff: String,
}

/// Everything the search reads.
pub struct SearchInput<'a> {
    pub width: f64,
    pub length: f64,
    pub zones: &'a [Zone],
    pub tables: &'a [ArrangeTable],
    pub gap: f64,
    /// Same seed, same options. Derived from the event and layout version by the caller.
    pub seed: u64,
    pub keep: usize,
    pub anneal_iters: usize,
    pub weights: Weights,
}

impl<'a> SearchInput<'a> {
    pub fn new(
        width: f64,
        length: f64,
        zones: &'a [Zone],
        tables: &'a [ArrangeTable],
        gap: f64,
        seed: u64,
    ) -> Self {
        Self {
            width,
            length,
            zones,
            tables,
            gap,
            seed,
            keep: DEFAULT_KEEP,
            anneal_iters: DEFAULT_ANNEAL_ITERS,
            weights: Weights::default(),
        }
    }
}

/// The best `keep` arrangements, best first.
pub fn search(input: &SearchInput) -> Vec<LayoutOption> {
    let mut candidates: Vec<LayoutOption> =
        Vec::with_capacity(Archetype::ALL.len() * STRATEGIES.len());
    for &archetype in Archetype::ALL.iter() {
        for strategy in STRATEGIES.iter() {
            candidates.push(candidate(archetype, strategy, input));
        }
    }
    sort_by_score(&mut candidates);

    let refine = input.keep.max(1).min(candidates.len());
    let mut top: Vec<LayoutOption> = candidates.into_iter().take(refine).collect();
    for (i, opt) in top.iter_mut().enumerate() {
        let mut rng = Rng::new(input.seed ^ (i as u64).wrapping_mul(0x9E37_79B9_7F4A_7C15));
        anneal(opt, input, input.anneal_iters, &mut rng);
    }
    sort_by_score(&mut top);
    top.truncate(input.keep.max(1));
    top
}

fn sort_by_score(options: &mut [LayoutOption]) {
    options.sort_by(|a, b| {
        b.score
            .total
            .total_cmp(&a.score.total)
            .then_with(|| a.archetype.cmp(&b.archetype))
            .then_with(|| a.strategy.cmp(&b.strategy))
    });
}

/// Build and score one archetype × strategy.
fn candidate(archetype: Archetype, strategy: &ZoneStrategy, input: &SearchInput) -> LayoutOption {
    let placed = place_zones(input.width, input.length, input.zones, strategy);
    let frame = strategy.frame();
    let (w, l) = frame.extents(input.width, input.length);
    let front = placed
        .working
        .iter()
        .find(|z| z.kind == ZoneKind::Stage)
        .map(|z| (z.x, z.y))
        .unwrap_or((w / 2.0, 0.0));

    let ctx = GenContext {
        width: w,
        length: l,
        zones: &placed.working,
        tables: input.tables,
        gap: input.gap,
        front,
    };
    let generated = archetype.generate(&ctx);

    let placements: Vec<Placement> = generated
        .placements
        .iter()
        .map(|p| {
            let (x, y) = frame.to_room(p.x, p.y);
            Placement {
                table: p.table,
                x,
                y,
                rot: frame.rot_to_room(p.rot),
            }
        })
        .collect();
    let chairs: Vec<ChairPlacement> = generated
        .chairs
        .iter()
        .map(|c| {
            let (x, y) = frame.to_room(c.x, c.y);
            ChairPlacement {
                x,
                y,
                rot: frame.rot_to_room(c.rot),
            }
        })
        .collect();

    let score = score(
        &ScoreInput {
            width: input.width,
            length: input.length,
            zones: &placed.room,
            tables: input.tables,
            placements: &placements,
            chairs: &chairs,
            gap: input.gap,
        },
        &input.weights,
    );

    LayoutOption {
        archetype: archetype.id().to_string(),
        archetype_label: archetype.label().to_string(),
        strategy: strategy.id.to_string(),
        strategy_label: strategy.label.to_string(),
        placements,
        chairs,
        zones: placed.room,
        unplaced: generated.unplaced,
        tradeoff: tradeoff(&score),
        score,
    }
}

/// The weakest term, in the host's words, for the card's one-line trade-off.
fn tradeoff(score: &ScoreBreakdown) -> String {
    let weakest = score
        .terms
        .iter()
        .filter(|t| t.weight > 0.0)
        .min_by(|a, b| a.value.total_cmp(&b.value));
    match weakest {
        Some(t) if t.value < 0.999 => t.detail.clone(),
        _ => "No obvious weakness.".to_string(),
    }
}

/// A short annealing pass over one option: nudge a table, turn it, swap two, or shift an area.
/// Only the best state seen is kept, so the result is never worse than the input.
fn anneal(opt: &mut LayoutOption, input: &SearchInput, iters: usize, rng: &mut Rng) {
    if opt.placements.is_empty() || iters == 0 {
        return;
    }
    let mut current = opt.score.total;
    let mut best_total = current;
    let mut best_placements = opt.placements.clone();
    let mut best_zones = opt.zones.clone();
    let mut best_score = opt.score.clone();

    let mut temp = 0.05_f64;
    let cooling = (0.0005_f64 / temp).powf(1.0 / iters as f64);

    for _ in 0..iters {
        let mut trial_p = opt.placements.clone();
        let mut trial_z = opt.zones.clone();
        let n = trial_p.len();

        match rng.below(10) {
            0..=5 => {
                let i = rng.below(n);
                trial_p[i].x += (rng.next_f64() - 0.5) * 0.5;
                trial_p[i].y += (rng.next_f64() - 0.5) * 0.5;
            }
            6..=7 => {
                let i = rng.below(n);
                trial_p[i].rot = (trial_p[i].rot + 90.0).rem_euclid(360.0);
            }
            8 => {
                let i = rng.below(n);
                let j = rng.below(n);
                if i != j {
                    let (xi, yi, ri) = (trial_p[i].x, trial_p[i].y, trial_p[i].rot);
                    trial_p[i].x = trial_p[j].x;
                    trial_p[i].y = trial_p[j].y;
                    trial_p[i].rot = trial_p[j].rot;
                    trial_p[j].x = xi;
                    trial_p[j].y = yi;
                    trial_p[j].rot = ri;
                }
            }
            _ => {
                if trial_z.is_empty() {
                    continue;
                }
                let zi = rng.below(trial_z.len());
                trial_z[zi].x += (rng.next_f64() - 0.5) * 0.5;
                trial_z[zi].y += (rng.next_f64() - 0.5) * 0.5;
            }
        }

        let s = score(
            &ScoreInput {
                width: input.width,
                length: input.length,
                zones: &trial_z,
                tables: input.tables,
                placements: &trial_p,
                chairs: &opt.chairs,
                gap: input.gap,
            },
            &input.weights,
        );

        let delta = s.total - current;
        if delta >= 0.0 || rng.next_f64() < (delta / temp).exp() {
            opt.placements = trial_p;
            opt.zones = trial_z;
            current = s.total;
            if current > best_total {
                best_total = current;
                best_placements = opt.placements.clone();
                best_zones = opt.zones.clone();
                best_score = s;
            }
        }
        temp *= cooling;
    }

    opt.placements = best_placements;
    opt.zones = best_zones;
    opt.score = best_score;
    opt.tradeoff = tradeoff(&opt.score);
}

/// A small deterministic PRNG (splitmix64), so the search needs no dependency and repeats exactly.
struct Rng(u64);

impl Rng {
    fn new(seed: u64) -> Self {
        Self(seed)
    }

    fn next_u64(&mut self) -> u64 {
        self.0 = self.0.wrapping_add(0x9E37_79B9_7F4A_7C15);
        let mut z = self.0;
        z = (z ^ (z >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9);
        z = (z ^ (z >> 27)).wrapping_mul(0x94D0_49BB_1331_11EB);
        z ^ (z >> 31)
    }

    fn next_f64(&mut self) -> f64 {
        (self.next_u64() >> 11) as f64 / (1u64 << 53) as f64
    }

    fn below(&mut self, n: usize) -> usize {
        if n == 0 {
            0
        } else {
            (self.next_u64() % n as u64) as usize
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::geometry::{footprint, gap_between, gap_to_walls};
    use crate::venue::ZoneKind;

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

    fn run(n: usize, seed: u64) -> Vec<LayoutOption> {
        let t = tables(n);
        let z = room();
        let input = SearchInput::new(30.0, 20.0, &z, &t, 0.6, seed);
        search(&input)
    }

    #[test]
    fn the_search_returns_the_requested_number_of_options() {
        let opts = run(20, 1);
        assert_eq!(opts.len(), DEFAULT_KEEP);
    }

    #[test]
    fn the_options_are_ranked_best_first() {
        let opts = run(20, 1);
        for pair in opts.windows(2) {
            assert!(pair[0].score.total >= pair[1].score.total);
        }
    }

    #[test]
    fn the_same_seed_gives_the_same_options() {
        let a = run(20, 42);
        let b = run(20, 42);
        assert_eq!(a.len(), b.len());
        for (x, y) in a.iter().zip(b.iter()) {
            assert_eq!(x.archetype, y.archetype);
            assert_eq!(x.strategy, y.strategy);
            assert_eq!(x.score.total, y.score.total);
            assert_eq!(x.placements.len(), y.placements.len());
        }
    }

    #[test]
    fn every_option_has_a_label_and_a_tradeoff() {
        for opt in run(20, 7) {
            assert!(!opt.archetype_label.is_empty());
            assert!(!opt.strategy_label.is_empty());
            assert!(!opt.tradeoff.is_empty());
        }
    }

    #[test]
    fn no_option_places_a_table_through_a_wall() {
        for opt in run(20, 3) {
            for p in &opt.placements {
                let t = &tables(20)[p.table];
                let f = footprint(&t.shape, t.capacity, p.x, p.y, p.rot);
                assert!(
                    gap_to_walls(&f, 30.0, 20.0) >= -1e-6,
                    "{} put a table through a wall",
                    opt.archetype
                );
            }
        }
    }

    #[test]
    fn the_best_option_has_no_overlapping_tables() {
        let opts = run(20, 5);
        let best = &opts[0];
        let t = tables(20);
        for (i, a) in best.placements.iter().enumerate() {
            let fa = footprint(&t[a.table].shape, t[a.table].capacity, a.x, a.y, a.rot);
            for b in best.placements.iter().skip(i + 1) {
                let fb = footprint(&t[b.table].shape, t[b.table].capacity, b.x, b.y, b.rot);
                assert!(
                    gap_between(&fa, &fb) >= -1e-6,
                    "{} overlaps two tables",
                    best.archetype
                );
            }
        }
    }

    #[test]
    fn a_room_with_no_tables_still_returns_options() {
        let opts = run(0, 1);
        assert_eq!(opts.len(), DEFAULT_KEEP);
        for opt in &opts {
            assert!(opt.placements.is_empty());
        }
    }

    #[test]
    fn three_hundred_tables_finish_inside_the_budget() {
        let t = tables(300);
        let z = room();
        let input = SearchInput::new(60.0, 40.0, &z, &t, 0.6, 9);
        let start = std::time::Instant::now();
        let opts = search(&input);
        let elapsed = start.elapsed();
        assert_eq!(opts.len(), DEFAULT_KEEP);
        // Debug builds are far slower than the wasm release build this budget is written for.
        if !cfg!(debug_assertions) {
            assert!(
                elapsed.as_millis() < 150,
                "300 tables took {} ms, over the 150 ms budget",
                elapsed.as_millis()
            );
        }
    }
}
