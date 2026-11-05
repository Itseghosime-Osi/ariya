//! Where the areas go, per archetype.
//!
//! A zone strategy is a small set of candidate positions for the stage, the dance floor, the
//! buffet, the bar and the entrance — not one hardcoded point. The generators read the result, so
//! "stage on the long wall" is a different room, not a different label.
//!
//! Called from `search.rs` (one `place_zones` per archetype × strategy × offset) and declared in
//! `lib.rs`. `wire.rs` reports the strategy's `id` and `label` on each option. No existing module
//! does this: `fit.rs` packs one table type into a room but never moves a zone, and the
//! TypeScript `arrangeZones` in `apps/web/src/features/seating/hall/arrange.ts` hardcodes a single
//! placement, which this replaces on the Rust path.
//!
//! Reads `venue::Zone` (`id`, `kind`, `label`, `x`, `y`, `w`, `h`, `shape`, `rot`) and writes the
//! same type back in room coordinates.

use serde::{Deserialize, Serialize};
#[cfg(feature = "ts")]
use ts_rs::TS;

use crate::geometry::round2;
use crate::venue::{Zone, ZoneKind};

/// Clear band kept between a zone and the wall.
const EDGE: f64 = 0.5;
/// Room left between the stage and the dance floor for the high table.
const HIGH_TABLE_BAND: f64 = 3.2;
/// How far forward a free-standing stage sits, as a share of the room's depth.
const CENTRED_STAGE: f64 = 0.28;
/// Where a side station sits along the wall, as a share of the room's depth.
const SIDE_STATION: f64 = 0.55;

/// Which wall the stage stands against.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub enum StageWall {
    /// Against the wall the room is narrower along. The usual end-on arrangement.
    Short,
    /// Against a long wall, so the room is used side-on.
    Long,
    /// Free-standing, pulled forward into the room.
    Centred,
}

/// Which side of the room a station runs along.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub enum Side {
    Left,
    Right,
}

/// The frame a generator works in.
///
/// Most strategies work in the room as drawn. A stage on a long wall turns the room a quarter
/// turn, so the seating runs along the room's length instead of across it. Working in a turned
/// frame keeps every generator written once, for a room whose front is at the top.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Frame {
    Room,
    Turned,
}

impl Frame {
    /// The working extents for a room of `width` × `length`.
    pub fn extents(self, width: f64, length: f64) -> (f64, f64) {
        match self {
            Frame::Room => (width, length),
            Frame::Turned => (length, width),
        }
    }

    /// A working-frame point, in room coordinates. The transform is its own inverse.
    pub fn to_room(self, x: f64, y: f64) -> (f64, f64) {
        match self {
            Frame::Room => (x, y),
            Frame::Turned => (y, x),
        }
    }

    /// A working-frame table rotation, in room degrees.
    pub fn rot_to_room(self, rot: f64) -> f64 {
        match self {
            Frame::Room => rot,
            Frame::Turned => (90.0 - rot).rem_euclid(180.0),
        }
    }
}

/// One candidate arrangement of the areas.
#[derive(Clone, Copy, Debug)]
pub struct ZoneStrategy {
    pub id: &'static str,
    pub label: &'static str,
    pub stage: StageWall,
    pub buffet: Side,
    pub bar: Side,
}

impl ZoneStrategy {
    pub fn frame(&self) -> Frame {
        match self.stage {
            StageWall::Long => Frame::Turned,
            _ => Frame::Room,
        }
    }
}

/// The strategies the search tries. Three stage positions, each with the buffet on either side.
pub const STRATEGIES: [ZoneStrategy; 6] = [
    ZoneStrategy {
        id: "stage-short-wall",
        label: "Stage on the short wall",
        stage: StageWall::Short,
        buffet: Side::Left,
        bar: Side::Right,
    },
    ZoneStrategy {
        id: "stage-short-wall-buffet-right",
        label: "Stage on the short wall, buffet on the right",
        stage: StageWall::Short,
        buffet: Side::Right,
        bar: Side::Left,
    },
    ZoneStrategy {
        id: "stage-long-wall",
        label: "Stage on the long wall",
        stage: StageWall::Long,
        buffet: Side::Left,
        bar: Side::Right,
    },
    ZoneStrategy {
        id: "stage-long-wall-buffet-right",
        label: "Stage on the long wall, buffet on the right",
        stage: StageWall::Long,
        buffet: Side::Right,
        bar: Side::Left,
    },
    ZoneStrategy {
        id: "stage-pulled-forward",
        label: "Stage pulled forward into the room",
        stage: StageWall::Centred,
        buffet: Side::Left,
        bar: Side::Right,
    },
    ZoneStrategy {
        id: "stage-pulled-forward-buffet-right",
        label: "Stage pulled forward, buffet on the right",
        stage: StageWall::Centred,
        buffet: Side::Right,
        bar: Side::Left,
    },
];

/// The areas in both frames: the working frame the generators read, and the room the host sees.
pub struct PlacedZones {
    pub working: Vec<Zone>,
    pub room: Vec<Zone>,
}

/// Put every area where this strategy wants it.
///
/// Areas the strategy has no opinion about — pillars, custom items — stay exactly where the host
/// put them. Sizes are kept unless a station has to turn to run along a side wall.
pub fn place_zones(
    width: f64,
    length: f64,
    zones: &[Zone],
    strategy: &ZoneStrategy,
) -> PlacedZones {
    let frame = strategy.frame();
    let (w, l) = frame.extents(width, length);
    let mut working: Vec<Zone> = zones.to_vec();
    let mut room: Vec<Zone> = zones.to_vec();

    let index = |kind: ZoneKind| zones.iter().position(|z| z.kind == kind);

    // The stage, and how far forward its front edge sits.
    let mut stage_front = 0.0;
    let mut stage_span = (w / 2.0, w / 2.0);
    if let Some(i) = index(ZoneKind::Stage) {
        let z = &zones[i];
        let y = match strategy.stage {
            StageWall::Short | StageWall::Long => EDGE + z.h / 2.0,
            StageWall::Centred => l * CENTRED_STAGE,
        };
        let x = w / 2.0;
        working[i] = at(
            z,
            Spot {
                x,
                y,
                w: z.w,
                h: z.h,
                rot: 0.0,
            },
            w,
            l,
        );
        room[i] = to_room(
            frame,
            z,
            Spot {
                x,
                y,
                w: z.w,
                h: z.h,
                rot: 0.0,
            },
            w,
            l,
        );
        stage_front = y + z.h / 2.0;
        stage_span = (x - z.w / 2.0, x + z.w / 2.0);
    }

    // The dance floor sits in front of the stage, with room for the high table between them.
    if let Some(i) = index(ZoneKind::Dance) {
        let z = &zones[i];
        let y = stage_front + HIGH_TABLE_BAND + z.h / 2.0;
        working[i] = at(
            z,
            Spot {
                x: w / 2.0,
                y,
                w: z.w,
                h: z.h,
                rot: 0.0,
            },
            w,
            l,
        );
        room[i] = to_room(
            frame,
            z,
            Spot {
                x: w / 2.0,
                y,
                w: z.w,
                h: z.h,
                rot: 0.0,
            },
            w,
            l,
        );
    }

    // Long stations run along the side walls, so their long axis turns to face the room.
    for (kind, side) in [
        (ZoneKind::Buffet, strategy.buffet),
        (ZoneKind::Bar, strategy.bar),
    ] {
        if let Some(i) = index(kind) {
            let z = &zones[i];
            let (zw, zh) = if z.w > z.h { (z.h, z.w) } else { (z.w, z.h) };
            let x = match side {
                Side::Left => EDGE + zw / 2.0,
                Side::Right => w - EDGE - zw / 2.0,
            };
            let y = l * SIDE_STATION;
            working[i] = at(
                z,
                Spot {
                    x,
                    y,
                    w: zw,
                    h: zh,
                    rot: 0.0,
                },
                w,
                l,
            );
            room[i] = to_room(
                frame,
                z,
                Spot {
                    x,
                    y,
                    w: zw,
                    h: zh,
                    rot: 0.0,
                },
                w,
                l,
            );
        }
    }

    // The entrance is at the back, on the centre line.
    if let Some(i) = index(ZoneKind::Entrance) {
        let z = &zones[i];
        let y = l - EDGE - z.h / 2.0;
        working[i] = at(
            z,
            Spot {
                x: w / 2.0,
                y,
                w: z.w,
                h: z.h,
                rot: 0.0,
            },
            w,
            l,
        );
        room[i] = to_room(
            frame,
            z,
            Spot {
                x: w / 2.0,
                y,
                w: z.w,
                h: z.h,
                rot: 0.0,
            },
            w,
            l,
        );
    }

    // The DJ and the cake flank the stage.
    if let Some(i) = index(ZoneKind::Dj) {
        let z = &zones[i];
        let x = stage_span.1 + 1.0 + z.w / 2.0;
        let y = EDGE + z.h / 2.0;
        working[i] = at(
            z,
            Spot {
                x,
                y,
                w: z.w,
                h: z.h,
                rot: 0.0,
            },
            w,
            l,
        );
        room[i] = to_room(
            frame,
            z,
            Spot {
                x,
                y,
                w: z.w,
                h: z.h,
                rot: 0.0,
            },
            w,
            l,
        );
    }
    if let Some(i) = index(ZoneKind::Cake) {
        let z = &zones[i];
        let x = stage_span.0 - 1.2 - z.w / 2.0;
        let y = EDGE + 1.0 + z.h / 2.0;
        working[i] = at(
            z,
            Spot {
                x,
                y,
                w: z.w,
                h: z.h,
                rot: 0.0,
            },
            w,
            l,
        );
        room[i] = to_room(
            frame,
            z,
            Spot {
                x,
                y,
                w: z.w,
                h: z.h,
                rot: 0.0,
            },
            w,
            l,
        );
    }

    // Gifts and the photo spot take the two back corners.
    if let Some(i) = index(ZoneKind::Photo) {
        let z = &zones[i];
        let x = EDGE + z.w / 2.0 + 1.0;
        let y = l - EDGE - z.h / 2.0;
        working[i] = at(
            z,
            Spot {
                x,
                y,
                w: z.w,
                h: z.h,
                rot: 0.0,
            },
            w,
            l,
        );
        room[i] = to_room(
            frame,
            z,
            Spot {
                x,
                y,
                w: z.w,
                h: z.h,
                rot: 0.0,
            },
            w,
            l,
        );
    }
    if let Some(i) = index(ZoneKind::Gifts) {
        let z = &zones[i];
        let x = w - EDGE - z.w / 2.0 - 1.0;
        let y = l - EDGE - z.h / 2.0;
        working[i] = at(
            z,
            Spot {
                x,
                y,
                w: z.w,
                h: z.h,
                rot: 0.0,
            },
            w,
            l,
        );
        room[i] = to_room(
            frame,
            z,
            Spot {
                x,
                y,
                w: z.w,
                h: z.h,
                rot: 0.0,
            },
            w,
            l,
        );
    }

    PlacedZones { working, room }
}

/// Where a zone goes, in the working frame.
#[derive(Clone, Copy)]
struct Spot {
    x: f64,
    y: f64,
    w: f64,
    h: f64,
    rot: f64,
}

/// A zone at a centre in the working frame, kept inside the walls.
fn at(z: &Zone, spot: Spot, room_w: f64, room_l: f64) -> Zone {
    let (x, y) = clamp_centre(spot.x, spot.y, spot.w, spot.h, room_w, room_l);
    Zone {
        id: z.id.clone(),
        kind: z.kind,
        label: z.label.clone(),
        x: round2(x),
        y: round2(y),
        w: round2(spot.w),
        h: round2(spot.h),
        shape: z.shape,
        rot: Some(round2(spot.rot)),
    }
}

/// The same zone, in room coordinates.
///
/// A quarter turn keeps the zone's size and turns it to run along the wall it now sits on: a stage
/// that was 9 m across the short wall is 9 m along the long wall, not 9 m deep into the room.
fn to_room(frame: Frame, z: &Zone, spot: Spot, room_w: f64, room_l: f64) -> Zone {
    let (x, y) = clamp_centre(spot.x, spot.y, spot.w, spot.h, room_w, room_l);
    let (rx, ry) = frame.to_room(x, y);
    let rrot = match frame {
        Frame::Room => spot.rot,
        Frame::Turned => spot.rot + 90.0,
    };
    Zone {
        id: z.id.clone(),
        kind: z.kind,
        label: z.label.clone(),
        x: round2(rx),
        y: round2(ry),
        w: round2(spot.w),
        h: round2(spot.h),
        shape: z.shape,
        rot: Some(round2(rrot.rem_euclid(180.0))),
    }
}

fn clamp_centre(x: f64, y: f64, w: f64, h: f64, room_w: f64, room_l: f64) -> (f64, f64) {
    // A zone wider than the room cannot be clamped symmetrically; centre it instead of panicking.
    let lo_x = (w / 2.0).min(room_w / 2.0);
    let hi_x = (room_w - w / 2.0).max(lo_x);
    let lo_y = (h / 2.0).min(room_l / 2.0);
    let hi_y = (room_l - h / 2.0).max(lo_y);
    (x.clamp(lo_x, hi_x), y.clamp(lo_y, hi_y))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::geometry::{extents, zone_footprint};
    use crate::venue::ZoneShape;

    fn zone(id: &str, kind: ZoneKind, w: f64, h: f64) -> Zone {
        Zone {
            id: id.into(),
            kind,
            label: String::new(),
            x: 0.0,
            y: 0.0,
            w,
            h,
            shape: None,
            rot: None,
        }
    }

    fn room() -> Vec<Zone> {
        vec![
            zone("stage", ZoneKind::Stage, 9.0, 4.0),
            zone("dance", ZoneKind::Dance, 8.0, 7.0),
            zone("buffet", ZoneKind::Buffet, 7.0, 1.6),
            zone("bar", ZoneKind::Bar, 4.0, 1.4),
            zone("entrance", ZoneKind::Entrance, 3.0, 1.0),
        ]
    }

    fn find<'a>(zones: &'a [Zone], id: &str) -> &'a Zone {
        zones.iter().find(|z| z.id == id).expect("zone")
    }

    #[test]
    fn every_strategy_keeps_every_zone_inside_the_walls() {
        for strategy in &STRATEGIES {
            let placed = place_zones(30.0, 20.0, &room(), strategy).room;
            assert_eq!(placed.len(), 5, "{}", strategy.id);
            for z in &placed {
                let (ex, ey) = extents(&zone_footprint(z));
                assert!(
                    z.x - ex >= -1e-6
                        && z.y - ey >= -1e-6
                        && z.x + ex <= 30.0 + 1e-6
                        && z.y + ey <= 20.0 + 1e-6,
                    "{} put {} outside the room: {z:?}",
                    strategy.id,
                    z.id
                );
            }
        }
    }

    #[test]
    fn the_stage_goes_where_the_strategy_says() {
        let short = place_zones(30.0, 20.0, &room(), &STRATEGIES[0]).room;
        let stage = find(&short, "stage");
        assert!((stage.y - (EDGE + stage.h / 2.0)).abs() < 1e-6);
        assert!((stage.x - 15.0).abs() < 1e-6);

        let forward = place_zones(30.0, 20.0, &room(), &STRATEGIES[4]).room;
        let stage = find(&forward, "stage");
        assert!(stage.y > 4.0, "a pulled-forward stage sits off the wall");
    }

    #[test]
    fn a_stage_on_the_long_wall_turns_the_room() {
        let placed = place_zones(30.0, 20.0, &room(), &STRATEGIES[2]).room;
        let stage = find(&placed, "stage");
        // The room is 30 wide and 20 deep. On the long wall the stage's 9 m side runs along the
        // depth, so it is 4 m across and 9 m deep, hard against the left wall.
        assert_eq!(stage.rot, Some(90.0));
        let (ex, ey) = extents(&zone_footprint(stage));
        assert!((ex - 2.0).abs() < 1e-6, "4 m across, got {ex}");
        assert!((ey - 4.5).abs() < 1e-6, "9 m deep, got {ey}");
        assert!((stage.x - ex - EDGE).abs() < 1e-6, "against the left wall");
    }

    #[test]
    fn the_buffet_and_bar_take_opposite_walls() {
        let placed = place_zones(30.0, 20.0, &room(), &STRATEGIES[0]).room;
        let buffet = find(&placed, "buffet");
        let bar = find(&placed, "bar");
        assert!(buffet.x < 5.0, "buffet on the left: {buffet:?}");
        assert!(bar.x > 25.0, "bar on the right: {bar:?}");
    }

    #[test]
    fn a_pillar_stays_where_the_host_put_it() {
        let mut zones = room();
        let mut pillar = zone("p1", ZoneKind::Pillar, 0.6, 0.6);
        pillar.x = 12.0;
        pillar.y = 9.0;
        zones.push(pillar);
        let placed = place_zones(30.0, 20.0, &zones, &STRATEGIES[0]).room;
        let p = find(&placed, "p1");
        assert_eq!((p.x, p.y), (12.0, 9.0));
    }

    #[test]
    fn a_zone_keeps_its_shape_and_label() {
        let mut zones = room();
        zones[0].shape = Some(ZoneShape::Round);
        zones[0].label = "Main stage".into();
        let placed = place_zones(30.0, 20.0, &zones, &STRATEGIES[0]).room;
        assert_eq!(placed[0].shape, Some(ZoneShape::Round));
        assert_eq!(placed[0].label, "Main stage");
    }

    #[test]
    fn a_zone_wider_than_the_room_is_centred_not_panicked() {
        let zones = vec![zone("stage", ZoneKind::Stage, 40.0, 4.0)];
        let placed = place_zones(30.0, 20.0, &zones, &STRATEGIES[0]).room;
        assert!((placed[0].x - 15.0).abs() < 1e-6);
    }

    #[test]
    fn the_working_frame_is_the_room_turned() {
        let placed = place_zones(30.0, 20.0, &room(), &STRATEGIES[2]);
        // The working frame is 20 wide and 30 deep, and the stage sits across its top.
        let stage = find(&placed.working, "stage");
        assert!((stage.x - 10.0).abs() < 1e-6);
        assert!((stage.y - (EDGE + stage.h / 2.0)).abs() < 1e-6);
        assert_eq!(stage.rot, Some(0.0));
    }
}
