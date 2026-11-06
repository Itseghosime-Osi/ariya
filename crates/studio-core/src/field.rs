//! Where the cold air actually goes.
//!
//! Sizing says how much cooling the room needs; it says nothing about whether the people at the
//! back get any. This grids the floor at half a metre, spreads each unit's capacity by how close
//! it is, and reads the local temperature off the same balance as `load.rs`. The result is a heat
//! map, and the finding that a dance floor is always the warmest place in the room.
//!
//! The influence of a unit falls off as `exp(−d² / 2σ²)`, with σ set so that a unit's reach is
//! down to a tenth at its throw distance. Each unit's capacity is then shared out over the grid in
//! proportion to that influence, so the whole of it lands somewhere — a unit in a corner does not
//! cool the corner and waste the rest.
//!
//! The map is a perturbation of the lumped room temperature, not an independent balance per cell.
//! A cell exchanges heat with the mixed air at a rate set by how fast the units turn the room
//! over, so a hot spot is bounded by the mixing rather than by its own load. Summing the local
//! balances gives back the lumped one exactly, so the map's mean is the number the sizing quotes.
//!
//! Called from `load.rs` and `wire.rs`. Reads `venue::AcUnit` and `venue::Zone`; writes a grid of
//! temperatures the renderer paints and the studio reads out as a table.

use serde::{Deserialize, Serialize};
#[cfg(feature = "ts")]
use ts_rs::TS;

use crate::geometry::{gap_to_zone, Footprint};
use crate::load::{DANCING_SENSIBLE_W, SEATED_SENSIBLE_W};
use crate::units;
use crate::venue::{AcUnit, Zone, ZoneKind};

/// The grid the room is sampled on, in metres. Research §C.6.
pub const CELL_M: f64 = 0.5;

/// `exp(−d²/2σ²)` is a tenth at `d = σ·√(2 ln 10)`. Setting σ from the throw distance this way
/// means "the air reaches this far" is a number the host can reason about.
const THROW_FALLOFF: f64 = 2.145_966;

/// A supply jet entrains room air as it travels, so the air that actually moves is several times
/// what the fan supplies. This is the field model's dominant uncertainty: it alone decides how
/// hot a hot spot gets. Six is the value that puts the dance floor where research §C.6 says it
/// should be — 2–3 K above the room — and it is the number to revisit first if the map looks wrong.
const ENTRAINMENT: f64 = 6.0;

/// Volumetric heat capacity of room air, J/m³K.
const RHO_CP: f64 = 1.2 * crate::load::CP_AIR;

/// Everything the field needs. The load terms come from `load.rs` so the two models cannot drift.
pub struct FieldInput<'a> {
    pub width: f64,
    pub length: f64,
    pub units: &'a [AcUnit],
    pub zones: &'a [Zone],
    pub headcount: u32,
    pub dancing: u32,
    pub outdoor_c: f64,
    /// Conduction plus infiltration, W/K, for the whole room.
    pub ua_w_per_k: f64,
    pub mass_flow_kg_s: f64,
    /// Solar, lighting and AV, in kW, spread evenly — the model does not know which wall the glass
    /// is in, and pretending otherwise would be a worse guess than an even one.
    pub ambient_kw: f64,
    pub derate: f64,
}

/// One named area's share of the map, for the table that stands in for the picture.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Debug, Serialize, Deserialize)]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub struct AreaTemp {
    pub id: String,
    pub label: String,
    #[serde(rename = "meanC")]
    pub mean_c: f64,
    #[serde(rename = "maxC")]
    pub max_c: f64,
}

/// The map itself: a grid of temperatures, and the numbers the studio quotes.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Debug, Serialize, Deserialize)]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub struct Field {
    pub cell: f64,
    pub cols: usize,
    pub rows: usize,
    /// Row-major, `rows × cols`, in °C.
    pub temps: Vec<f64>,
    #[serde(rename = "minC")]
    pub min_c: f64,
    #[serde(rename = "maxC")]
    pub max_c: f64,
    #[serde(rename = "meanC")]
    pub mean_c: f64,
    /// The named areas, warmest first — the non-visual equivalent of the heat map.
    pub areas: Vec<AreaTemp>,
}

/// A point, as a footprint, so the zone geometry is the same code the packer uses.
fn point(x: f64, y: f64) -> Footprint {
    Footprint::Circle { x, y, r: 0.0 }
}

fn inside(z: &Zone, x: f64, y: f64) -> bool {
    gap_to_zone(&point(x, y), z) <= 0.0
}

/// The floor area a zone covers, in m².
fn zone_area(z: &Zone) -> f64 {
    match z.shape {
        Some(crate::venue::ZoneShape::Round)
        | Some(crate::venue::ZoneShape::Hexagon)
        | Some(crate::venue::ZoneShape::Octagon)
            if (z.w - z.h).abs() < 0.01 =>
        {
            std::f64::consts::PI * (z.w / 2.0).powi(2)
        }
        _ => z.w * z.h,
    }
}

/// Solve the room point by point.
pub fn field(input: &FieldInput) -> Field {
    let cols = ((input.width / CELL_M).ceil() as usize).max(1);
    let rows = ((input.length / CELL_M).ceil() as usize).max(1);
    let n = cols * rows;
    let dx = input.width / cols as f64;
    let dy = input.length / rows as f64;
    let cell_area = dx * dy;
    let floor = (input.width * input.length).max(1e-6);

    let x_at = |c: usize| (c as f64 + 0.5) * dx;
    let y_at = |r: usize| (r as f64 + 0.5) * dy;

    // The dance floor is where the people are, so it is where the load is.
    let dance_zones: Vec<&Zone> = input
        .zones
        .iter()
        .filter(|z| z.kind == ZoneKind::Dance)
        .collect();
    let dance_area: f64 = dance_zones
        .iter()
        .map(|z| zone_area(z))
        .sum::<f64>()
        .min(floor * 0.9);
    let has_dance = dance_area > 1.0;
    let dancing = input.dancing.min(input.headcount) as f64;
    let seated = input.headcount as f64 - dancing;
    let seated_area = (floor - dance_area).max(1.0);
    let seated_w = seated * SEATED_SENSIBLE_W;
    let dancing_w = dancing * DANCING_SENSIBLE_W;
    let ambient_w = input.ambient_kw * 1000.0;

    let mut load = vec![0.0_f64; n];
    for r in 0..rows {
        for c in 0..cols {
            let (x, y) = (x_at(c), y_at(r));
            let people = if !has_dance {
                // No dance floor drawn: the whole crowd is spread over the room, dancers included,
                // so the total matches the lumped model even when the host has not drawn a zone.
                (seated_w + dancing_w) / floor
            } else if dance_zones.iter().any(|z| inside(z, x, y)) {
                dancing_w / dance_area
            } else {
                seated_w / seated_area
            };
            load[r * cols + c] = (people + ambient_w / floor) * cell_area;
        }
    }

    // Each unit's capacity, shared out by how much of its air reaches each point.
    let mut cooling = vec![0.0_f64; n];
    for u in input.units {
        let cap_w = units::for_hp(u.hp).installed_sensible_kw(input.derate) * 1000.0;
        let sigma = u.mount.throw_m() / THROW_FALLOFF;
        let two_sigma_sq = 2.0 * sigma * sigma;
        let mut weight = vec![0.0_f64; n];
        let mut total = 0.0;
        for r in 0..rows {
            for c in 0..cols {
                let d2 = (x_at(c) - u.x).powi(2) + (y_at(r) - u.y).powi(2);
                let w = (-d2 / two_sigma_sq).exp();
                weight[r * cols + c] = w;
                total += w;
            }
        }
        if total > 0.0 {
            for i in 0..n {
                cooling[i] += cap_w * weight[i] / total;
            }
        }
    }

    // The lumped balance from `load.rs`, which the field is a perturbation of. Summing the local
    // balances over the grid gives exactly this, so the map's mean is the number the sizing
    // already quotes — the two models cannot disagree about the room.
    let total_load: f64 = load.iter().sum();
    let total_cooling: f64 = cooling.iter().sum();
    let room_conductance = input.ua_w_per_k + input.mass_flow_kg_s * crate::load::CP_AIR;
    let room_c = if room_conductance > 0.0 {
        input.outdoor_c + (total_load - total_cooling) / room_conductance
    } else {
        input.outdoor_c
    };

    // How far a cell can drift from the room mean is set by how fast the units turn the air over.
    // A cell exchanges heat with the mixed air at this rate; a room with more air moving has
    // smaller hot spots. Without this term each cell balances only against the outdoors, and a
    // dance floor at three times the average load comes out three times as hot — 90 °C, not 3 K.
    let recirc_m3_s: f64 = input
        .units
        .iter()
        .map(|u| units::for_hp(u.hp).airflow_m3h / 3600.0)
        .sum();
    let mix_w_per_k = RHO_CP * ENTRAINMENT * recirc_m3_s / n as f64;

    let mean_net = (total_load - total_cooling) / n as f64;
    let temps: Vec<f64> = (0..n)
        .map(|i| {
            if mix_w_per_k > 0.0 {
                room_c + (load[i] - cooling[i] - mean_net) / mix_w_per_k
            } else {
                room_c
            }
        })
        .collect();

    let min_c = temps.iter().copied().fold(f64::INFINITY, f64::min);
    let max_c = temps.iter().copied().fold(f64::NEG_INFINITY, f64::max);
    let mean_c = temps.iter().sum::<f64>() / n as f64;

    let mut areas: Vec<AreaTemp> = input
        .zones
        .iter()
        .filter(|z| z.kind != ZoneKind::Pillar)
        .filter_map(|z| {
            let mut sum = 0.0;
            let mut count = 0usize;
            let mut hottest = f64::NEG_INFINITY;
            for r in 0..rows {
                for c in 0..cols {
                    if inside(z, x_at(c), y_at(r)) {
                        let t = temps[r * cols + c];
                        sum += t;
                        count += 1;
                        hottest = hottest.max(t);
                    }
                }
            }
            (count > 0).then(|| AreaTemp {
                id: z.id.clone(),
                label: if z.label.is_empty() {
                    format!("{:?}", z.kind)
                } else {
                    z.label.clone()
                },
                mean_c: sum / count as f64,
                max_c: hottest,
            })
        })
        .collect();
    areas.sort_by(|a, b| {
        b.mean_c
            .partial_cmp(&a.mean_c)
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    Field {
        cell: CELL_M,
        cols,
        rows,
        temps,
        min_c,
        max_c,
        mean_c,
        areas,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::load::{loads, LoadInput};
    use crate::units::DERATE;
    use crate::venue::{Mount, VenueType, ZoneShape};

    fn unit(x: f64, y: f64, hp: f64) -> AcUnit {
        AcUnit {
            id: format!("ac-{x}-{y}"),
            x,
            y,
            hp,
            mount: Mount::Wall,
            inverter: false,
        }
    }

    fn dance() -> Zone {
        Zone {
            id: "dance".into(),
            kind: ZoneKind::Dance,
            label: "Dance floor".into(),
            x: 15.0,
            y: 10.0,
            w: 8.0,
            h: 8.0,
            shape: Some(ZoneShape::Round),
            rot: None,
        }
    }

    fn input<'a>(units: &'a [AcUnit], zones: &'a [Zone]) -> FieldInput<'a> {
        let mut l = LoadInput::new(30.0, 20.0, 5.0, VenueType::Hall);
        l.headcount = 300;
        l.dancing = 100;
        let loads = loads(&l);
        FieldInput {
            width: 30.0,
            length: 20.0,
            units,
            zones,
            headcount: 300,
            dancing: 100,
            outdoor_c: 33.0,
            ua_w_per_k: loads.ua_w_per_k,
            mass_flow_kg_s: loads.mass_flow_kg_s,
            ambient_kw: loads.solar_kw + loads.lighting_kw + loads.equipment_kw,
            derate: DERATE,
        }
    }

    #[test]
    fn the_grid_covers_the_room_at_half_a_metre() {
        let units = vec![unit(5.0, 5.0, 2.5)];
        let zones: Vec<Zone> = vec![];
        let f = field(&input(&units, &zones));
        assert_eq!(f.cols, 60);
        assert_eq!(f.rows, 40);
        assert_eq!(f.temps.len(), 60 * 40);
        assert_eq!(f.cell, 0.5);
    }

    /// With the cooling spread evenly, the map must agree with the lumped model in `load.rs`.
    #[test]
    fn a_uniform_room_matches_the_lumped_model() {
        let mut l = LoadInput::new(30.0, 20.0, 5.0, VenueType::Hall);
        l.headcount = 300;
        l.dancing = 100;
        let loads = loads(&l);
        let sizing = crate::load::size(&loads, crate::units::largest(), DERATE);
        let prediction = crate::load::predict(&l, &loads, &sizing);

        // Enough units, spread over the room, that no point is starved.
        let units: Vec<AcUnit> = (0..sizing.count)
            .map(|i| {
                let cols = 5;
                let c = i % cols;
                let r = i / cols;
                unit(3.0 + c as f64 * 6.0, 3.0 + r as f64 * 5.0, sizing.unit.hp)
            })
            .collect();
        let zones: Vec<Zone> = vec![];
        let f = field(&input(&units, &zones));
        assert!(
            (f.mean_c - prediction.room_c).abs() < 1.5,
            "field {} vs lumped {}",
            f.mean_c,
            prediction.room_c
        );
    }

    #[test]
    fn the_dance_floor_is_the_warmest_place_in_the_room() {
        let units: Vec<AcUnit> = (0..19)
            .map(|i| unit(3.0 + (i % 5) as f64 * 6.0, 3.0 + (i / 5) as f64 * 5.0, 2.5))
            .collect();
        let zones = vec![dance()];
        let f = field(&input(&units, &zones));
        let dance_area = f
            .areas
            .iter()
            .find(|a| a.id == "dance")
            .expect("the dance floor is on the map");
        let delta = dance_area.mean_c - f.mean_c;
        assert!(
            (2.0..=3.5).contains(&delta),
            "research §C.6 says the dance floor runs 2–3 K warm; got {delta:.2} K"
        );
        assert_eq!(f.areas[0].id, "dance", "warmest first");
    }

    #[test]
    fn a_unit_cools_the_room_it_is_in() {
        let zones: Vec<Zone> = vec![];
        let none: Vec<AcUnit> = vec![];
        let cold = vec![unit(15.0, 10.0, 2.5)];
        let without = field(&input(&none, &zones));
        let with = field(&input(&cold, &zones));
        assert!(with.mean_c < without.mean_c);
        assert!(with.min_c < without.min_c);
    }

    #[test]
    fn a_corner_unit_leaves_the_far_corner_warm() {
        let zones: Vec<Zone> = vec![];
        let units = vec![unit(2.0, 2.0, 2.5)];
        let f = field(&input(&units, &zones));
        let near = f.temps[0];
        let far = f.temps[f.temps.len() - 1];
        assert!(far > near + 1.0, "near {near} far {far}");
    }

    #[test]
    fn a_room_with_no_units_is_the_outdoor_temperature_plus_its_gains() {
        let zones: Vec<Zone> = vec![];
        let none: Vec<AcUnit> = vec![];
        let f = field(&input(&none, &zones));
        assert!(f.mean_c > 33.0, "an uncooled room is hotter than outside");
        assert!(f.max_c.is_finite() && f.min_c.is_finite());
    }

    #[test]
    fn the_map_serialises_for_the_wire() {
        let units = vec![unit(5.0, 5.0, 2.5)];
        let zones = vec![dance()];
        let f = field(&input(&units, &zones));
        let json = serde_json::to_string(&f).expect("serialises");
        for key in [
            "\"cols\"",
            "\"temps\"",
            "\"minC\"",
            "\"meanC\"",
            "\"areas\"",
        ] {
            assert!(json.contains(key), "{key} missing");
        }
    }
}
