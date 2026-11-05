//! The ten ways a room can be laid out.
//!
//! Each archetype proposes candidate positions for the tables; a shared assignment step packs the
//! host's actual tables into them, biggest first, so a small table can use what a large one could
//! not. Nothing here scores or searches — `score.rs` judges the result and `search.rs` picks
//! between them.
//!
//! Called from `search.rs`, one `generate` per archetype × zone strategy × lattice offset, and
//! declared in `lib.rs`. `wire.rs` reports `Archetype::id()` and `label()` on each option. No
//! existing module does this: `fit.rs` packs one table type into a lattice and never assigns
//! identities, and the TypeScript `autoArrange` in `apps/web/src/features/seating/hall/arrange.ts`
//! has a single archetype.
//!
//! Reads `ArrangeTable` (`id`, `shape`, `capacity`, `occupied`) and `venue::Zone`; writes
//! `Placement` and `ChairPlacement` in the working frame, in metres.

use serde::{Deserialize, Serialize};
#[cfg(feature = "ts")]
use ts_rs::TS;

use crate::fit::{zone_clearance, MAIN_AISLE, WALL_MARGIN};
use crate::geometry::{
    extents, footprint, gap_between, gap_to_walls, gap_to_zone, round2, Footprint,
};
use crate::venue::Zone;

/// One table the host owns, as the generator sees it.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Debug, Serialize, Deserialize)]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub struct ArrangeTable {
    pub id: String,
    pub shape: String,
    pub capacity: i32,
    #[serde(default)]
    pub occupied: i32,
}

/// Where one table ended up.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Debug, Serialize, Deserialize)]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub struct Placement {
    /// Index into the request's table list.
    pub table: usize,
    pub x: f64,
    pub y: f64,
    pub rot: f64,
}

/// A chair standing on its own, for the archetypes that seat people without a table.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub struct ChairPlacement {
    pub x: f64,
    pub y: f64,
    pub rot: f64,
}

/// What one archetype produced.
#[derive(Clone, Debug, Default)]
pub struct Generated {
    pub placements: Vec<Placement>,
    pub chairs: Vec<ChairPlacement>,
    /// Indices into the request's table list that found no room.
    pub unplaced: Vec<usize>,
}

/// The ten arrangements.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub enum Archetype {
    RoundsRows,
    RoundsStaggered,
    LongTables,
    UShape,
    Theatre,
    Cocktail,
    Cabaret,
    Chevron,
    Perimeter,
    LongBanquet,
}

impl Archetype {
    pub const ALL: [Archetype; 10] = [
        Archetype::RoundsRows,
        Archetype::RoundsStaggered,
        Archetype::LongTables,
        Archetype::UShape,
        Archetype::Theatre,
        Archetype::Cocktail,
        Archetype::Cabaret,
        Archetype::Chevron,
        Archetype::Perimeter,
        Archetype::LongBanquet,
    ];

    pub fn id(self) -> &'static str {
        match self {
            Archetype::RoundsRows => "rounds-rows",
            Archetype::RoundsStaggered => "rounds-staggered",
            Archetype::LongTables => "long-tables",
            Archetype::UShape => "u-shape",
            Archetype::Theatre => "theatre",
            Archetype::Cocktail => "cocktail",
            Archetype::Cabaret => "cabaret",
            Archetype::Chevron => "chevron",
            Archetype::Perimeter => "perimeter",
            Archetype::LongBanquet => "long-banquet",
        }
    }

    /// The name a host would use.
    pub fn label(self) -> &'static str {
        match self {
            Archetype::RoundsRows => "Rounds in rows",
            Archetype::RoundsStaggered => "Rounds, staggered",
            Archetype::LongTables => "Long tables",
            Archetype::UShape => "U-shape",
            Archetype::Theatre => "Theatre rows",
            Archetype::Cocktail => "Cocktail",
            Archetype::Cabaret => "Cabaret",
            Archetype::Chevron => "Chevron",
            Archetype::Perimeter => "Perimeter",
            Archetype::LongBanquet => "One long table",
        }
    }

    /// What the arrangement is for, in the host's terms.
    pub fn use_case(self) -> &'static str {
        match self {
            Archetype::RoundsRows => "The banquet default",
            Archetype::RoundsStaggered => "A denser banquet",
            Archetype::LongTables => "Western, intimate",
            Archetype::UShape => "Small and formal",
            Archetype::Theatre => "A ceremony",
            Archetype::Cocktail => "Drinks and standing",
            Archetype::Cabaret => "Mixed: long tables in front, rounds behind",
            Archetype::Chevron => "A feature layout",
            Archetype::Perimeter => "Dancing in the middle",
            Archetype::LongBanquet => "One table for everyone",
        }
    }

    pub fn generate(self, ctx: &GenContext) -> Generated {
        match self {
            Archetype::RoundsRows => rounds(ctx, false),
            Archetype::RoundsStaggered => rounds(ctx, true),
            Archetype::LongTables => long_tables(ctx),
            Archetype::UShape => u_shape(ctx),
            Archetype::Theatre => theatre(ctx),
            Archetype::Cocktail => cocktail(ctx),
            Archetype::Cabaret => cabaret(ctx),
            Archetype::Chevron => chevron(ctx),
            Archetype::Perimeter => perimeter(ctx),
            Archetype::LongBanquet => long_banquet(ctx),
        }
    }
}

/// Everything a generator needs, in the working frame.
pub struct GenContext<'a> {
    pub width: f64,
    pub length: f64,
    pub zones: &'a [Zone],
    pub tables: &'a [ArrangeTable],
    pub gap: f64,
    /// The stage centre, which the seating faces.
    pub front: (f64, f64),
}

/// A candidate position, before a table is put in it.
#[derive(Clone, Copy, Debug)]
struct Slot {
    x: f64,
    y: f64,
    rot: f64,
    /// The table shape this slot accepts, or `None` for any.
    shape: Option<&'static str>,
}

fn accepts(slot: Option<&str>, table: &str) -> bool {
    match slot {
        None => true,
        Some(s) => s == table || (s == "rectangular" && table == "head"),
    }
}

/// The largest footprint in the inventory at a given rotation.
///
/// A head table is one long table for the couple; sizing the whole lattice to it would space
/// every slot for a four-metre table and leave the room almost empty. Size to the ordinary
/// tables instead, falling back to all of them when the inventory is only head tables.
fn max_extent(tables: &[ArrangeTable], rot: f64) -> (f64, f64) {
    let extent = |t: &ArrangeTable| extents(&footprint(&t.shape, t.capacity, 0.0, 0.0, rot));
    let fold = |it: &mut dyn Iterator<Item = &ArrangeTable>| {
        it.map(extent)
            .fold((0.0_f64, 0.0_f64), |a, b| (a.0.max(b.0), a.1.max(b.1)))
    };
    let ordinary: Vec<&ArrangeTable> = tables.iter().filter(|t| t.shape != "head").collect();
    if ordinary.is_empty() {
        fold(&mut tables.iter())
    } else {
        fold(&mut ordinary.into_iter())
    }
}

/// A rectangular lattice of slots, first centre at `(ox, oy)`.
#[derive(Clone, Copy)]
struct Grid {
    pitch_x: f64,
    pitch_y: f64,
    ox: f64,
    oy: f64,
    stagger: bool,
    rot: f64,
    shape: Option<&'static str>,
}

fn lattice(ctx: &GenContext, g: Grid) -> Vec<Slot> {
    let mut slots = Vec::new();
    let mut row = 0usize;
    let mut y = g.oy;
    while y <= ctx.length - g.oy + 1e-6 {
        let shift = if g.stagger && row % 2 == 1 { 0.5 } else { 0.0 };
        let mut x = g.ox + shift * g.pitch_x;
        while x <= ctx.width - g.ox + 1e-6 {
            slots.push(Slot {
                x,
                y,
                rot: g.rot,
                shape: g.shape,
            });
            x += g.pitch_x;
        }
        row += 1;
        y += g.pitch_y;
    }
    slots
}

/// Nearest the stage first, so the best positions are taken before the leftovers.
fn by_front(mut slots: Vec<Slot>, front: (f64, f64)) -> Vec<Slot> {
    slots.sort_by(|a, b| {
        let da = (a.x - front.0).hypot((a.y - front.1) * 1.2);
        let db = (b.x - front.0).hypot((b.y - front.1) * 1.2);
        da.partial_cmp(&db).unwrap_or(std::cmp::Ordering::Equal)
    });
    slots
}

fn rounds(ctx: &GenContext, stagger: bool) -> Generated {
    let (ex, ey) = max_extent(ctx.tables, 0.0);
    let px = 2.0 * ex + ctx.gap;
    let py = 2.0 * ey + ctx.gap;
    let slots = lattice(
        ctx,
        Grid {
            pitch_x: px,
            pitch_y: py,
            ox: WALL_MARGIN + ex,
            oy: WALL_MARGIN + ey,
            stagger,
            rot: 0.0,
            shape: Some("round"),
        },
    );
    assign(ctx, &by_front(slots, ctx.front))
}

fn long_tables(ctx: &GenContext) -> Generated {
    let (ex, ey) = max_extent(ctx.tables, 0.0);
    // Tables touch end to end along a row, with a wider gap between rows to walk down.
    let px = 2.0 * ex + 0.1;
    let py = 2.0 * ey + ctx.gap + 0.6;
    let slots = lattice(
        ctx,
        Grid {
            pitch_x: px,
            pitch_y: py,
            ox: WALL_MARGIN + ex,
            oy: WALL_MARGIN + ey,
            stagger: false,
            rot: 0.0,
            shape: Some("rectangular"),
        },
    );
    assign(ctx, &by_front(slots, ctx.front))
}

fn u_shape(ctx: &GenContext) -> Generated {
    let (ex, ey) = max_extent(ctx.tables, 0.0);
    let (ex90, ey90) = max_extent(ctx.tables, 90.0);
    let px = 2.0 * ex + 0.1;
    let py = 2.0 * ey90 + 0.1;
    let mut slots = Vec::new();

    // The top of the U, facing the stage.
    let mut x = WALL_MARGIN + ex;
    while x <= ctx.width - WALL_MARGIN - ex + 1e-6 {
        slots.push(Slot {
            x,
            y: WALL_MARGIN + ey,
            rot: 0.0,
            shape: Some("rectangular"),
        });
        x += px;
    }

    // The two arms, running back from the top.
    let mut y = WALL_MARGIN + ey + py;
    while y <= ctx.length - WALL_MARGIN - ey90 + 1e-6 {
        slots.push(Slot {
            x: WALL_MARGIN + ex90,
            y,
            rot: 90.0,
            shape: Some("rectangular"),
        });
        slots.push(Slot {
            x: ctx.width - WALL_MARGIN - ex90,
            y,
            rot: 90.0,
            shape: Some("rectangular"),
        });
        y += py;
    }
    assign(ctx, &slots)
}

fn theatre(ctx: &GenContext) -> Generated {
    let (ex, ey) = max_extent(ctx.tables, 0.0);
    let px = 2.0 * ex + ctx.gap;
    let py = 2.0 * ey + ctx.gap + 0.4;
    let mut slots = lattice(
        ctx,
        Grid {
            pitch_x: px,
            pitch_y: py,
            ox: WALL_MARGIN + ex,
            oy: WALL_MARGIN + ey,
            stagger: false,
            rot: 0.0,
            shape: None,
        },
    );
    // A centre aisle, so the room reads as rows facing the stage rather than a solid block.
    slots.retain(|s| (s.x - ctx.width / 2.0).abs() >= MAIN_AISLE / 2.0 + ex);
    assign(ctx, &by_front(slots, ctx.front))
}

fn cocktail(ctx: &GenContext) -> Generated {
    let (ex, ey) = max_extent(ctx.tables, 0.0);
    // Sparse: people stand and move between the tables.
    let px = 2.0 * ex + ctx.gap + 1.2;
    let py = 2.0 * ey + ctx.gap + 1.2;
    let slots = lattice(
        ctx,
        Grid {
            pitch_x: px,
            pitch_y: py,
            ox: WALL_MARGIN + ex,
            oy: WALL_MARGIN + ey,
            stagger: false,
            rot: 0.0,
            shape: None,
        },
    );
    assign(ctx, &by_front(slots, ctx.front))
}

fn cabaret(ctx: &GenContext) -> Generated {
    let (ex, ey) = max_extent(ctx.tables, 0.0);
    let px = 2.0 * ex + ctx.gap;
    let py = 2.0 * ey + ctx.gap;
    let split = ctx.length * 0.45;
    let mut slots = Vec::new();
    let mut y = WALL_MARGIN + ey;
    while y <= ctx.length - WALL_MARGIN - ey + 1e-6 {
        let shape = if y < split {
            Some("rectangular")
        } else {
            Some("round")
        };
        let mut x = WALL_MARGIN + ex;
        while x <= ctx.width - WALL_MARGIN - ex + 1e-6 {
            slots.push(Slot {
                x,
                y,
                rot: 0.0,
                shape,
            });
            x += px;
        }
        y += py;
    }
    assign(ctx, &by_front(slots, ctx.front))
}

fn chevron(ctx: &GenContext) -> Generated {
    let (ex, ey) = max_extent(ctx.tables, 0.0);
    let px = 2.0 * ex + ctx.gap;
    let py = 2.0 * ey + ctx.gap;
    let angle = 15.0_f64.to_radians();
    let mut slots = Vec::new();
    let mut y = WALL_MARGIN + ey;
    while y <= ctx.length - WALL_MARGIN - ey + 1e-6 {
        let n = ((ctx.width / 2.0 - WALL_MARGIN - ex) / px).floor() as i64;
        for i in -n..=n {
            let dx = i as f64 * px;
            // Each row is a shallow V pointing at the stage.
            let yy = y + dx.abs() * angle.tan();
            if yy > ctx.length - WALL_MARGIN - ey + 1e-6 {
                continue;
            }
            slots.push(Slot {
                x: ctx.width / 2.0 + dx,
                y: yy,
                rot: if i < 0 { -15.0 } else { 15.0 },
                shape: None,
            });
        }
        y += py;
    }
    assign(ctx, &by_front(slots, ctx.front))
}

fn perimeter(ctx: &GenContext) -> Generated {
    let (ex, ey) = max_extent(ctx.tables, 0.0);
    let px = 2.0 * ex + ctx.gap;
    let py = 2.0 * ey + ctx.gap;
    let mut slots = Vec::new();

    // Along the top and bottom walls.
    for y in [WALL_MARGIN + ey, ctx.length - WALL_MARGIN - ey] {
        let mut x = WALL_MARGIN + ex;
        while x <= ctx.width - WALL_MARGIN - ex + 1e-6 {
            slots.push(Slot {
                x,
                y,
                rot: 0.0,
                shape: None,
            });
            x += px;
        }
    }

    // Along the two side walls, between the corners.
    let mut y = WALL_MARGIN + ey + py;
    while y <= ctx.length - WALL_MARGIN - ey - py + 1e-6 {
        slots.push(Slot {
            x: WALL_MARGIN + ex,
            y,
            rot: 0.0,
            shape: None,
        });
        slots.push(Slot {
            x: ctx.width - WALL_MARGIN - ex,
            y,
            rot: 0.0,
            shape: None,
        });
        y += py;
    }
    assign(ctx, &by_front(slots, ctx.front))
}

fn long_banquet(ctx: &GenContext) -> Generated {
    let (ex, _) = max_extent(ctx.tables, 0.0);
    let px = 2.0 * ex + 0.05;
    let mut slots = Vec::new();
    let y = ctx.length / 2.0;
    let mut x = WALL_MARGIN + ex;
    while x <= ctx.width - WALL_MARGIN - ex + 1e-6 {
        slots.push(Slot {
            x,
            y,
            rot: 0.0,
            shape: Some("rectangular"),
        });
        x += px;
    }
    assign(ctx, &slots)
}

/// Pack the host's tables into the slots, biggest first.
fn assign(ctx: &GenContext, slots: &[Slot]) -> Generated {
    // Drop the slots no table could use, whatever its size: a box of the largest footprint at that
    // slot's own rotation keeps the inner loop down to a grid lookup. The box is the footprint's
    // bounding rectangle, so it is never smaller than the table that lands in the slot.
    let mut rots: Vec<f64> = slots.iter().map(|s| s.rot).collect();
    rots.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    rots.dedup_by(|a, b| (*a - *b).abs() < 1e-9);
    let by_rot: Vec<(f64, f64, f64)> = rots
        .iter()
        .map(|&r| {
            let (ex, ey) = max_extent(ctx.tables, r);
            (r, ex, ey)
        })
        .collect();
    let extent_at = |rot: f64| {
        by_rot
            .iter()
            .find(|(r, _, _)| (r - rot).abs() < 1e-9)
            .map(|&(_, ex, ey)| (ex, ey))
            .unwrap_or((0.0, 0.0))
    };

    let usable: Vec<&Slot> = slots
        .iter()
        .filter(|s| {
            let (ex, ey) = extent_at(s.rot);
            let box_ = Footprint::Rect {
                x: s.x,
                y: s.y,
                hw: ex,
                hh: ey,
                rot: 0.0,
            };
            gap_to_walls(&box_, ctx.width, ctx.length) >= WALL_MARGIN
                && ctx
                    .zones
                    .iter()
                    .all(|z| gap_to_zone(&box_, z) >= zone_clearance(z))
        })
        .collect();

    let (ex, ey) = max_extent(ctx.tables, 0.0);
    let cell = (2.0 * ex.max(ey) + ctx.gap).max(1.0);
    let mut placed = Placed::new(ctx.width, ctx.length, cell);
    let mut used = vec![false; usable.len()];
    let mut out = Generated::default();

    // Biggest tables first: they are the hardest to fit, and the small ones can use what is left.
    let mut order: Vec<usize> = (0..ctx.tables.len()).collect();
    order.sort_by(|&a, &b| {
        ctx.tables[b]
            .capacity
            .cmp(&ctx.tables[a].capacity)
            .then(a.cmp(&b))
    });

    for ti in order {
        let t = &ctx.tables[ti];
        let mut done = false;
        for (si, slot) in usable.iter().enumerate() {
            if used[si] || !accepts(slot.shape, &t.shape) {
                continue;
            }
            let f = footprint(&t.shape, t.capacity, slot.x, slot.y, slot.rot);
            if placed.clashes(&f, ctx.gap) {
                continue;
            }
            used[si] = true;
            placed.add(f);
            out.placements.push(Placement {
                table: ti,
                x: round2(slot.x),
                y: round2(slot.y),
                rot: slot.rot,
            });
            done = true;
            break;
        }
        if !done {
            out.unplaced.push(ti);
        }
    }
    out
}

/// A uniform grid of placed footprints, so an overlap check looks at a handful of neighbours
/// rather than every table in the room.
struct Placed {
    cell: f64,
    cols: usize,
    rows: usize,
    buckets: Vec<Vec<usize>>,
    items: Vec<Footprint>,
}

impl Placed {
    fn new(width: f64, length: f64, cell: f64) -> Self {
        let cols = (width / cell).ceil() as usize + 1;
        let rows = (length / cell).ceil() as usize + 1;
        Self {
            cell,
            cols,
            rows,
            buckets: vec![Vec::new(); cols * rows],
            items: Vec::new(),
        }
    }

    fn key(&self, x: f64, y: f64) -> (usize, usize) {
        let cx = (x / self.cell).floor().clamp(0.0, self.cols as f64 - 1.0) as usize;
        let cy = (y / self.cell).floor().clamp(0.0, self.rows as f64 - 1.0) as usize;
        (cx, cy)
    }

    fn clashes(&self, f: &Footprint, gap: f64) -> bool {
        let (x, y) = f.centre();
        let (ex, ey) = extents(f);
        let (x0, y0) = self.key(x - ex - gap, y - ey - gap);
        let (x1, y1) = self.key(x + ex + gap, y + ey + gap);
        for cy in y0..=y1 {
            for cx in x0..=x1 {
                for &i in &self.buckets[cy * self.cols + cx] {
                    if gap_between(f, &self.items[i]) < gap {
                        return true;
                    }
                }
            }
        }
        false
    }

    fn add(&mut self, f: Footprint) {
        let (x, y) = f.centre();
        let (cx, cy) = self.key(x, y);
        self.buckets[cy * self.cols + cx].push(self.items.len());
        self.items.push(f);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::venue::ZoneKind;

    fn tables(n: usize, shape: &str, capacity: i32) -> Vec<ArrangeTable> {
        (0..n)
            .map(|i| ArrangeTable {
                id: format!("t{i}"),
                shape: shape.into(),
                capacity,
                occupied: 0,
            })
            .collect()
    }

    fn stage() -> Zone {
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
        }
    }

    fn ctx<'a>(tables: &'a [ArrangeTable], zones: &'a [Zone]) -> GenContext<'a> {
        GenContext {
            width: 30.0,
            length: 20.0,
            zones,
            tables,
            gap: 0.6,
            front: (15.0, 2.5),
        }
    }

    /// A mixed inventory, so the archetypes that only take one table shape have something to use.
    fn mixed() -> Vec<ArrangeTable> {
        let mut t = tables(20, "round", 8);
        t.extend(tables(20, "rectangular", 8));
        t
    }

    #[test]
    fn every_archetype_places_something_in_an_empty_room() {
        let t = mixed();
        let z = vec![stage()];
        let c = ctx(&t, &z);
        for a in Archetype::ALL {
            let g = a.generate(&c);
            assert!(
                !g.placements.is_empty(),
                "{} placed nothing in a 30 × 20 room",
                a.id()
            );
        }
    }

    #[test]
    fn no_two_placements_overlap() {
        let t = tables(40, "round", 8);
        let z = vec![stage()];
        let c = ctx(&t, &z);
        for a in Archetype::ALL {
            let g = a.generate(&c);
            for (i, p) in g.placements.iter().enumerate() {
                let fa = footprint(&t[p.table].shape, t[p.table].capacity, p.x, p.y, p.rot);
                for q in g.placements.iter().skip(i + 1) {
                    let fb = footprint(&t[q.table].shape, t[q.table].capacity, q.x, q.y, q.rot);
                    assert!(
                        gap_between(&fa, &fb) >= c.gap - 0.02,
                        "{} overlapped two tables",
                        a.id()
                    );
                }
            }
        }
    }

    #[test]
    fn every_placement_is_inside_the_walls_and_clear_of_the_stage() {
        let t = tables(40, "round", 8);
        let z = vec![stage()];
        let c = ctx(&t, &z);
        for a in Archetype::ALL {
            let g = a.generate(&c);
            for p in &g.placements {
                let f = footprint(&t[p.table].shape, t[p.table].capacity, p.x, p.y, p.rot);
                assert!(
                    gap_to_walls(&f, c.width, c.length) >= WALL_MARGIN - 1e-6,
                    "{} put a table through a wall",
                    a.id()
                );
                assert!(
                    gap_to_zone(&f, &z[0]) >= zone_clearance(&z[0]) - 1e-6,
                    "{} put a table on the stage",
                    a.id()
                );
            }
        }
    }

    #[test]
    fn every_table_is_either_placed_or_reported() {
        let t = tables(30, "round", 8);
        let z = vec![stage()];
        let c = ctx(&t, &z);
        for a in Archetype::ALL {
            let g = a.generate(&c);
            let mut seen: Vec<usize> = g.placements.iter().map(|p| p.table).collect();
            seen.extend(g.unplaced.iter().copied());
            seen.sort_unstable();
            assert_eq!(seen, (0..t.len()).collect::<Vec<_>>(), "{}", a.id());
        }
    }

    #[test]
    fn the_same_room_always_gives_the_same_layout() {
        let t = tables(25, "round", 8);
        let z = vec![stage()];
        let c = ctx(&t, &z);
        for a in Archetype::ALL {
            let one = a.generate(&c);
            let two = a.generate(&c);
            assert_eq!(one.placements.len(), two.placements.len(), "{}", a.id());
            for (p, q) in one.placements.iter().zip(two.placements.iter()) {
                assert_eq!((p.table, p.x, p.y), (q.table, q.x, q.y), "{}", a.id());
            }
        }
    }

    #[test]
    fn a_rounds_layout_only_uses_round_tables() {
        let mut t = tables(10, "round", 8);
        t.extend(tables(10, "rectangular", 8));
        let z = vec![stage()];
        let c = ctx(&t, &z);
        let g = Archetype::RoundsRows.generate(&c);
        for p in &g.placements {
            assert_eq!(t[p.table].shape, "round");
        }
    }

    #[test]
    fn a_long_banquet_is_one_line() {
        let t = tables(12, "rectangular", 8);
        let z = vec![stage()];
        let c = ctx(&t, &z);
        let g = Archetype::LongBanquet.generate(&c);
        assert!(g.placements.len() > 1);
        let y = g.placements[0].y;
        for p in &g.placements {
            assert!((p.y - y).abs() < 1e-6, "the long table should be one line");
        }
    }

    #[test]
    fn a_u_shape_leaves_its_middle_open() {
        let t = tables(20, "rectangular", 8);
        let z = vec![stage()];
        let c = ctx(&t, &z);
        let g = Archetype::UShape.generate(&c);
        assert!(!g.placements.is_empty());
        for p in &g.placements {
            let in_middle = p.x > 8.0 && p.x < 22.0 && p.y > 6.0 && p.y < 18.0;
            assert!(!in_middle, "the U should be open in the middle: {p:?}");
        }
    }

    #[test]
    fn a_chevron_angles_its_rows() {
        let t = tables(20, "round", 8);
        let z = vec![stage()];
        let c = ctx(&t, &z);
        let g = Archetype::Chevron.generate(&c);
        assert!(g.placements.iter().any(|p| p.rot != 0.0));
    }

    #[test]
    fn a_perimeter_leaves_the_centre_for_dancing() {
        let t = tables(20, "round", 8);
        let z = vec![stage()];
        let c = ctx(&t, &z);
        let g = Archetype::Perimeter.generate(&c);
        assert!(!g.placements.is_empty());
        for p in &g.placements {
            let central = p.x > 8.0 && p.x < 22.0 && p.y > 6.0 && p.y < 14.0;
            assert!(
                !central,
                "the perimeter should leave the middle free: {p:?}"
            );
        }
    }

    #[test]
    fn a_cocktail_layout_is_sparser_than_a_banquet() {
        let t = tables(60, "round", 8);
        let z = vec![stage()];
        let c = ctx(&t, &z);
        let banquet = Archetype::RoundsRows.generate(&c).placements.len();
        let cocktail = Archetype::Cocktail.generate(&c).placements.len();
        assert!(cocktail < banquet);
    }

    #[test]
    fn a_room_too_small_for_anything_reports_every_table_unplaced() {
        let t = tables(5, "round", 8);
        let z = vec![stage()];
        let c = GenContext {
            width: 2.0,
            length: 2.0,
            zones: &z,
            tables: &t,
            gap: 0.6,
            front: (1.0, 1.0),
        };
        let g = Archetype::RoundsRows.generate(&c);
        assert!(g.placements.is_empty());
        assert_eq!(g.unplaced.len(), 5);
    }
}
