//! What the room asks for, and what a pile of splits can actually do about it.
//!
//! Two balances, both steady state. The sensible balance decides temperature; the latent balance
//! decides humidity; and their ratio — the sensible heat ratio — decides whether any split can do
//! the job at all. In Lagos it usually cannot: outdoor air at 33 °C and 80 % humidity carries more
//! than twice the moisture the room can hold, and a split recirculates room air with no outdoor
//! intake, so the latent load it removes is fixed by its coil, not by the load.
//!
//! This is a screening tool, not a design. Research §C.9 lists where it diverges from a real
//! HVAC calculation; the honest verdict is "roughly this much, and splits are the wrong
//! technology", never a unit schedule.
//!
//! Called from `wire.rs` (the `THERMAL` operation). Reads a room, a crowd and a venue; writes a
//! breakdown the studio can show line by line.

use serde::{Deserialize, Serialize};
#[cfg(feature = "ts")]
use ts_rs::TS;

use crate::field::{self, Field};
use crate::units::{self, SplitUnit, DERATE};
use crate::venue::{AcUnit, VenueType, Zone};

/// Standard atmospheric pressure, in pascals. Lagos is near sea level; the model ignores altitude.
pub const P_ATM: f64 = 101_325.0;
/// Latent heat of vaporisation of water at room temperature, J/kg.
pub const H_FG: f64 = 2.45e6;
/// Specific heat of moist air per kilogram of dry air, J/kg·K.
pub const CP_AIR: f64 = 1005.0;
/// Gas constant of dry air, J/kg·K.
pub const R_DRY_AIR: f64 = 287.05;

/// Seated, quiet, at 24 °C. Research §C.2.
pub const SEATED_SENSIBLE_W: f64 = 70.0;
pub const SEATED_LATENT_W: f64 = 35.0;
/// Dancing, moderate. Four times the latent output of a seated guest, and the reason a dance floor
/// is a zone of its own.
pub const DANCING_SENSIBLE_W: f64 = 150.0;
pub const DANCING_LATENT_W: f64 = 130.0;

/// The humidity ratio a hall can hold, from ASHRAE 55's graphic method. Above this, people feel
/// damp however cold the room is.
pub const HUMIDITY_CEILING: f64 = 0.012;

/// Evaporative cooling can only approach the outdoor wet-bulb, so it is worth recommending only
/// where that stays under about 22 °C. Lagos never gets there. Research §C.7.
pub const EVAPORATIVE_WET_BULB_C: f64 = 22.0;

/// Saturation vapour pressure over water, in pascals (Magnus).
fn p_sat(t_c: f64) -> f64 {
    610.94 * (17.625 * t_c / (t_c + 243.04)).exp()
}

/// Moisture content of the air, in kg of water per kg of dry air.
pub fn humidity_ratio(t_c: f64, rh_percent: f64) -> f64 {
    let p_w = (rh_percent.clamp(1.0, 100.0) / 100.0) * p_sat(t_c);
    0.621_98 * p_w / (P_ATM - p_w)
}

/// Relative humidity, in percent, from a moisture content and a temperature — the inverse of
/// [`humidity_ratio`].
pub fn relative_humidity(t_c: f64, w: f64) -> f64 {
    let p_w = w * P_ATM / (0.621_98 + w);
    (100.0 * p_w / p_sat(t_c)).clamp(0.0, 100.0)
}

/// Wet-bulb temperature (Stull 2011), which is what evaporative cooling is limited by.
pub fn wet_bulb(t_c: f64, rh_percent: f64) -> f64 {
    let rh = rh_percent.clamp(1.0, 100.0);
    t_c * (0.151_977 * (rh + 8.313_659).sqrt()).atan() + (t_c + rh).atan() - (rh - 1.676_331).atan()
        + 0.003_918_38 * rh.powf(1.5) * (0.023_101 * rh).atan()
        - 4.686_035
}

/// Everything the model reads. The defaults are the worked example in research §C.5: a Lagos
/// afternoon, single-glazed, uninsulated roof, lighting and AV on.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Debug, Serialize, Deserialize)]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub struct LoadInput {
    pub width: f64,
    pub length: f64,
    pub height: f64,
    pub venue: VenueType,
    pub headcount: u32,
    /// How many of them are on the dance floor. The rest are seated.
    pub dancing: u32,
    #[serde(rename = "outdoorC")]
    pub outdoor_c: f64,
    #[serde(rename = "outdoorRh")]
    pub outdoor_rh: f64,
    #[serde(rename = "targetC")]
    pub target_c: f64,
    #[serde(rename = "targetRh")]
    pub target_rh: f64,
    /// Air changes per hour. The dominant uncertainty in the whole model: a factor of three here
    /// swings the load by about 40 %, so it is a visible input rather than a hidden constant.
    pub ach: f64,
    #[serde(rename = "glazingM2")]
    pub glazing_m2: f64,
    #[serde(rename = "glazingU")]
    pub glazing_u: f64,
    pub shgc: f64,
    #[serde(rename = "incidentWm2")]
    pub incident_w_m2: f64,
    #[serde(rename = "wallU")]
    pub wall_u: f64,
    #[serde(rename = "roofU")]
    pub roof_u: f64,
    #[serde(rename = "lightingWm2")]
    pub lighting_w_m2: f64,
    #[serde(rename = "equipmentKw")]
    pub equipment_kw: f64,
    /// The size of split the host is considering. The model never picks one for them.
    pub unit: SplitUnit,
    pub derate: f64,
}

impl LoadInput {
    /// A hall-sized room with the worked example's fabric and weather. Everything is a public
    /// field, so the studio overrides what the host has answered and leaves the rest.
    pub fn new(width: f64, length: f64, height: f64, venue: VenueType) -> Self {
        Self {
            width,
            length,
            height,
            venue,
            headcount: 0,
            dancing: 0,
            outdoor_c: 33.0,
            outdoor_rh: 80.0,
            target_c: 24.0,
            target_rh: 55.0,
            ach: venue.air_changes(),
            glazing_m2: (width * length * 0.10).round(),
            glazing_u: 5.8,
            shgc: 0.6,
            incident_w_m2: 450.0,
            wall_u: 1.0,
            roof_u: 0.5,
            lighting_w_m2: 12.0,
            equipment_kw: 5.0,
            unit: units::largest(),
            derate: DERATE,
        }
    }

    pub fn floor_m2(&self) -> f64 {
        self.width * self.length
    }

    pub fn volume_m3(&self) -> f64 {
        self.floor_m2() * self.height
    }

    pub fn perimeter_m(&self) -> f64 {
        2.0 * (self.width + self.length)
    }

    fn wall_m2(&self) -> f64 {
        (self.perimeter_m() * self.height - self.glazing_m2).max(0.0)
    }
}

/// The load, component by component, in kilowatts.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Debug, Serialize, Deserialize)]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub struct Loads {
    #[serde(rename = "roofKw")]
    pub roof_kw: f64,
    #[serde(rename = "wallKw")]
    pub wall_kw: f64,
    #[serde(rename = "glazingKw")]
    pub glazing_kw: f64,
    #[serde(rename = "solarKw")]
    pub solar_kw: f64,
    #[serde(rename = "peopleSensibleKw")]
    pub people_sensible_kw: f64,
    #[serde(rename = "peopleLatentKw")]
    pub people_latent_kw: f64,
    #[serde(rename = "infiltrationSensibleKw")]
    pub infiltration_sensible_kw: f64,
    #[serde(rename = "infiltrationLatentKw")]
    pub infiltration_latent_kw: f64,
    #[serde(rename = "lightingKw")]
    pub lighting_kw: f64,
    #[serde(rename = "equipmentKw")]
    pub equipment_kw: f64,
    #[serde(rename = "sensibleKw")]
    pub sensible_kw: f64,
    #[serde(rename = "latentKw")]
    pub latent_kw: f64,
    #[serde(rename = "totalKw")]
    pub total_kw: f64,
    /// The sensible share of the total load. Every split is compared against this number.
    pub shr: f64,
    /// Conduction plus infiltration, in W/K — how fast the room gives its cooling away.
    #[serde(rename = "uaWPerK")]
    pub ua_w_per_k: f64,
    #[serde(rename = "massFlowKgS")]
    pub mass_flow_kg_s: f64,
    #[serde(rename = "wOut")]
    pub w_out: f64,
    #[serde(rename = "wInTarget")]
    pub w_in_target: f64,
    /// The gains the room makes itself, with the walls and the outside air left out. This is what
    /// the cooling has to beat to hold a temperature.
    #[serde(rename = "internalSensibleKw")]
    pub internal_sensible_kw: f64,
}

/// Work the balances.
pub fn loads(input: &LoadInput) -> Loads {
    let floor = input.floor_m2();
    let volume = input.volume_m3();
    let d_t = input.outdoor_c - input.target_c;

    let roof_kw = floor * input.roof_u * d_t / 1000.0;
    let wall_kw = input.wall_m2() * input.wall_u * d_t / 1000.0;
    let glazing_kw = input.glazing_m2 * input.glazing_u * d_t / 1000.0;
    let solar_kw = input.glazing_m2 * input.shgc * input.incident_w_m2 / 1000.0;

    let dancing = input.dancing.min(input.headcount) as f64;
    let seated = input.headcount as f64 - dancing;
    let people_sensible_kw = (seated * SEATED_SENSIBLE_W + dancing * DANCING_SENSIBLE_W) / 1000.0;
    let people_latent_kw = (seated * SEATED_LATENT_W + dancing * DANCING_LATENT_W) / 1000.0;

    // Warmer air is lighter, and it is the outdoor air that leaks in.
    let rho = P_ATM / (R_DRY_AIR * (input.outdoor_c + 273.15));
    let mass_flow = input.ach * volume * rho / 3600.0;
    let w_out = humidity_ratio(input.outdoor_c, input.outdoor_rh);
    let w_in_target = humidity_ratio(input.target_c, input.target_rh);

    let infiltration_sensible_kw = mass_flow * CP_AIR * d_t / 1000.0;
    let infiltration_latent_kw = mass_flow * H_FG * (w_out - w_in_target).max(0.0) / 1000.0;

    let lighting_kw = floor * input.lighting_w_m2 / 1000.0;
    let equipment_kw = input.equipment_kw;

    let internal_sensible_kw = people_sensible_kw + solar_kw + lighting_kw + equipment_kw;

    let sensible_kw = roof_kw
        + wall_kw
        + glazing_kw
        + solar_kw
        + people_sensible_kw
        + infiltration_sensible_kw
        + lighting_kw
        + equipment_kw;
    let latent_kw = people_latent_kw + infiltration_latent_kw;
    let total_kw = sensible_kw + latent_kw;
    let shr = if total_kw > 0.0 {
        sensible_kw / total_kw
    } else {
        1.0
    };

    Loads {
        roof_kw,
        wall_kw,
        glazing_kw,
        solar_kw,
        people_sensible_kw,
        people_latent_kw,
        infiltration_sensible_kw,
        infiltration_latent_kw,
        lighting_kw,
        equipment_kw,
        sensible_kw,
        latent_kw,
        total_kw,
        shr,
        ua_w_per_k: floor * input.roof_u
            + input.wall_m2() * input.wall_u
            + input.glazing_m2 * input.glazing_u,
        mass_flow_kg_s: mass_flow,
        w_out,
        w_in_target,
        internal_sensible_kw,
    }
}

/// A set of splits, sized on the sticker and delivering less than it.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub struct Sizing {
    pub unit: SplitUnit,
    /// Units needed at sticker capacity — what a supplier would quote.
    pub count: u32,
    /// What the room actually gets once the sun and the coil are accounted for.
    #[serde(rename = "installedKw")]
    pub installed_kw: f64,
    #[serde(rename = "deliveredSensibleKw")]
    pub delivered_sensible_kw: f64,
    #[serde(rename = "deliveredLatentKw")]
    pub delivered_latent_kw: f64,
    /// Running draw of the whole set.
    #[serde(rename = "inputKw")]
    pub input_kw: f64,
    /// Draw with every compressor starting at once, which is what trips a generator.
    #[serde(rename = "surgeKw")]
    pub surge_kw: f64,
}

/// Size a set of splits against the total load.
///
/// The count is on the sticker, because that is the number on the quote. The derate is not
/// hidden by oversizing — it shows up in the room temperature the model then predicts, which is
/// the number the host is actually asking about.
pub fn size(loads: &Loads, unit: SplitUnit, derate: f64) -> Sizing {
    let count = if unit.cooling_kw > 0.0 && loads.total_kw > 0.0 {
        (loads.total_kw / unit.cooling_kw).ceil() as u32
    } else {
        0
    };
    let n = count as f64;
    Sizing {
        unit,
        count,
        installed_kw: n * unit.installed_kw(derate),
        delivered_sensible_kw: n * unit.installed_sensible_kw(derate),
        delivered_latent_kw: n * unit.installed_latent_kw(derate),
        input_kw: n * unit.input_kw,
        surge_kw: n * unit.input_kw * unit.surge_factor,
    }
}

/// What a set of units delivers, once the sun and the coil are accounted for. The sized set and
/// the placed set both reduce to this, so the prediction cannot disagree with the map.
#[derive(Clone, Copy, Debug)]
pub struct Delivered {
    pub count: u32,
    pub sensible_kw: f64,
    pub latent_kw: f64,
    pub input_kw: f64,
    pub surge_kw: f64,
}

impl Sizing {
    fn delivered(&self) -> Delivered {
        Delivered {
            count: self.count,
            sensible_kw: self.delivered_sensible_kw,
            latent_kw: self.delivered_latent_kw,
            input_kw: self.input_kw,
            surge_kw: self.surge_kw,
        }
    }
}

/// What the units the host has actually placed deliver. Mixed sizes are allowed; the count is how
/// many are on the wall, which is the number the host can see.
pub fn placed_delivered(units: &[AcUnit], derate: f64) -> Delivered {
    let mut d = Delivered {
        count: units.len() as u32,
        sensible_kw: 0.0,
        latent_kw: 0.0,
        input_kw: 0.0,
        surge_kw: 0.0,
    };
    for u in units {
        let unit = units::for_hp(u.hp);
        d.sensible_kw += unit.installed_sensible_kw(derate);
        d.latent_kw += unit.installed_latent_kw(derate);
        d.input_kw += unit.input_kw;
        d.surge_kw += unit.input_kw * unit.surge_factor;
    }
    d
}

/// What the room does with that set running flat out.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub struct Prediction {
    /// Predicted air temperature with the splits running, °C.
    #[serde(rename = "roomC")]
    pub room_c: f64,
    /// Predicted moisture content, kg/kg.
    #[serde(rename = "wIn")]
    pub w_in: f64,
    /// Predicted relative humidity, percent.
    #[serde(rename = "rhIn")]
    pub rh_in: f64,
    /// True when the splits cannot take out the moisture the room makes.
    pub damp: bool,
}

/// Predict the room from the two balances.
///
/// Temperature and humidity are solved separately, each against the internal gains: the walls and
/// the leaking air are the baseline the room drifts back to, and the cooling is what holds it
/// short of that.
pub fn predict(input: &LoadInput, loads: &Loads, sizing: &Sizing) -> Prediction {
    predict_delivered(
        input,
        loads,
        sizing.delivered_sensible_kw,
        sizing.delivered_latent_kw,
    )
}

/// The same balance, for any set of units — the sized one or the one on the wall.
pub fn predict_delivered(
    input: &LoadInput,
    loads: &Loads,
    delivered_sensible_kw: f64,
    delivered_latent_kw: f64,
) -> Prediction {
    let capacity = loads.ua_w_per_k + loads.mass_flow_kg_s * CP_AIR;
    let room_c = if capacity > 0.0 {
        input.outdoor_c + (loads.internal_sensible_kw - delivered_sensible_kw) * 1000.0 / capacity
    } else {
        input.outdoor_c
    };

    let w_in = if loads.mass_flow_kg_s > 0.0 {
        loads.w_out
            + (loads.people_latent_kw - delivered_latent_kw) * 1000.0
                / (loads.mass_flow_kg_s * H_FG)
    } else {
        loads.w_out
    }
    .max(0.0);

    Prediction {
        room_c,
        w_in,
        rh_in: relative_humidity(room_c, w_in),
        damp: w_in > HUMIDITY_CEILING,
    }
}

/// How the answer reads to a host.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub enum AdviceLevel {
    /// Splits will hold the room at the target.
    Viable,
    /// They will chill the air and leave it damp — the wrong technology for the job.
    Damp,
    /// It would take more units than a room can hold or a generator can start.
    TooMany,
    /// The units placed cannot hold the target — the room stays hot. Only reachable when the host
    /// has placed fewer (or smaller) units than the room needs.
    UnderCooled,
    /// The building cannot be closed, so there is nothing to size.
    NotViable,
}

/// The sentence the studio leads with, and the workings behind it.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Debug, Serialize, Deserialize)]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub struct Advice {
    pub level: AdviceLevel,
    /// Plain language, no numbers the breakdown does not already carry.
    pub headline: String,
    /// Why, in the order that matters.
    pub reasons: Vec<String>,
    /// Outdoor wet-bulb, °C — what decides whether evaporative cooling is worth mentioning.
    #[serde(rename = "wetBulbC")]
    pub wet_bulb_c: f64,
    /// Only true where outdoor wet-bulb stays under about 22 °C. Lagos never qualifies.
    pub evaporative: bool,
}

/// What the AC set asks of the plant: the generator, and the water it pulls out of the air.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub struct Plant {
    /// Running draw of the whole set, kW.
    #[serde(rename = "runningKw")]
    pub running_kw: f64,
    /// Draw with every compressor starting at once, kW — what trips a generator.
    #[serde(rename = "surgeKw")]
    pub surge_kw: f64,
    /// Condensate the coils pull out, litres per hour. Research §C.8: this is a drain, not a tray.
    #[serde(rename = "condensateLph")]
    pub condensate_lph: f64,
}

/// The whole answer the studio renders.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Debug, Serialize, Deserialize)]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub struct ThermalReport {
    pub loads: Loads,
    /// Absent where the venue cannot be closed — there is no honest number to give.
    pub sizing: Option<Sizing>,
    pub prediction: Option<Prediction>,
    pub advice: Advice,
    /// The heat map, when the host has placed units. Absent otherwise — there is nothing to map.
    pub field: Option<Field>,
    /// What the set asks of the generator and the drain. Absent where there is no set.
    pub plant: Option<Plant>,
}

/// Units beyond this are not a design, whatever the arithmetic says.
pub const MAX_SENSIBLE_UNITS: u32 = 12;

/// Assess a room and print a verdict with its workings.
pub fn assess(input: &LoadInput) -> ThermalReport {
    assess_placed(input, &[], &[])
}

/// Assess a room with the units the host has actually placed, and map where the cold lands.
///
/// The sizing is the same either way — it is a property of the room and the crowd. The field is
/// only there when there are units to place, because a map of a room with no cooling is a map of
/// the outdoors.
pub fn assess_placed(input: &LoadInput, units: &[AcUnit], zones: &[Zone]) -> ThermalReport {
    let l = loads(input);
    let wb = wet_bulb(input.outdoor_c, input.outdoor_rh);
    let evaporative = wb < EVAPORATIVE_WET_BULB_C;

    if !input.venue.can_be_cooled() {
        return ThermalReport {
            advice: Advice {
                level: AdviceLevel::NotViable,
                headline: format!(
                    "Mechanical cooling is not viable here. This space leaks about {} air changes an hour, so the air you cool leaves before it reaches anyone.",
                    trim(input.ach)
                ),
                reasons: vec![
                    format!(
                        "It would take {} kW to hold {} °C, and the space cannot hold it.",
                        trim(l.total_kw),
                        trim(input.target_c)
                    ),
                    "There is nowhere to reject condenser heat without pulling it back into the room."
                        .into(),
                    if evaporative {
                        format!("Outdoor wet-bulb is {} °C, so evaporative cooling could help.", trim(wb))
                    } else {
                        format!(
                            "Evaporative cooling is worse here: outdoor wet-bulb is {} °C, so it would add humidity without lowering the temperature much.",
                            trim(wb)
                        )
                    },
                    "Fans, shade and cross-ventilation do more than any cooler you could hire.".into(),
                ],
                wet_bulb_c: wb,
                evaporative,
            },
            loads: l,
            sizing: None,
            prediction: None,
            field: None,
            plant: None,
        };
    }

    let sizing = size(&l, input.unit, input.derate);
    // What the room actually gets: the placed set if the host has placed one, else the sized set.
    // The prediction and the map then describe the same units, so the report cannot contradict
    // itself — a host who has placed six of the nineteen the room needs sees a hot room, not a
    // cool one with a hot map.
    let delivered = if units.is_empty() {
        sizing.delivered()
    } else {
        placed_delivered(units, input.derate)
    };
    let prediction = predict_delivered(input, &l, delivered.sensible_kw, delivered.latent_kw);

    // The coils pull out the latent load up to their capacity; whatever is left stays in the air.
    // Research §C.8 quotes 22–38 L/h for 55 kW, which does not follow from its own latent heat —
    // 55 kW is nearer 80 L/h. The model does the multiplication and lands where the physics does.
    let latent_removed_kw = delivered.latent_kw.min(l.latent_kw);
    let plant = Plant {
        running_kw: delivered.input_kw,
        surge_kw: delivered.surge_kw,
        condensate_lph: latent_removed_kw * 1000.0 / H_FG * 3600.0,
    };

    let field = (!units.is_empty()).then(|| {
        field::field(&field::FieldInput {
            width: input.width,
            length: input.length,
            units,
            zones,
            headcount: input.headcount,
            dancing: input.dancing,
            outdoor_c: input.outdoor_c,
            ua_w_per_k: l.ua_w_per_k,
            mass_flow_kg_s: l.mass_flow_kg_s,
            ambient_kw: l.solar_kw + l.lighting_kw + l.equipment_kw,
            derate: input.derate,
        })
    });

    let mut reasons = Vec::new();
    reasons.push(format!(
        "{} kW of load: {} kW through the walls, roof and glass, {} kW from people, {} kW through the air that leaks in.",
        trim(l.total_kw),
        trim(l.roof_kw + l.wall_kw + l.glazing_kw + l.solar_kw),
        trim(l.people_sensible_kw + l.people_latent_kw),
        trim(l.infiltration_sensible_kw + l.infiltration_latent_kw)
    ));
    reasons.push(format!(
        "It needs a sensible heat ratio of {}, and a {} HP split delivers {}.",
        round2(l.shr),
        trim(sizing.unit.hp),
        round2(sizing.unit.shr_humid)
    ));

    // A room that never reaches the target is hot, not damp, whatever its moisture content — the
    // damp verdict is about what happens once the air is cold enough to feel it.
    let level = if prediction.room_c > input.target_c + 1.5 {
        AdviceLevel::UnderCooled
    } else if prediction.damp {
        AdviceLevel::Damp
    } else if sizing.count > MAX_SENSIBLE_UNITS {
        AdviceLevel::TooMany
    } else {
        AdviceLevel::Viable
    };

    let headline = match level {
        AdviceLevel::UnderCooled => format!(
            "{} splits would leave the room at {} °C, well above the {} °C target. The room needs about {}.",
            delivered.count,
            trim(prediction.room_c),
            trim(input.target_c),
            sizing.count
        ),
        AdviceLevel::Damp => format!(
            "{} splits would bring the room to {} °C and {} % humidity. They chill the air but cannot dry it.",
            delivered.count,
            trim(prediction.room_c),
            trim(prediction.rh_in)
        ),
        AdviceLevel::TooMany => format!(
            "{} splits is not a design. The room needs roughly {} kW, and no one wants {} condensers outside.",
            sizing.count,
            trim(l.total_kw),
            sizing.count
        ),
        _ => format!(
            "{} splits should hold the room near {} °C and {} % humidity.",
            delivered.count,
            trim(prediction.room_c),
            trim(prediction.rh_in)
        ),
    };

    if level == AdviceLevel::UnderCooled {
        let needed_kw = l.internal_sensible_kw
            - (input.target_c - input.outdoor_c) * (l.ua_w_per_k + l.mass_flow_kg_s * CP_AIR)
                / 1000.0;
        reasons.push(format!(
            "The {} units placed deliver {} kW of sensible cooling; the room needs about {} kW to hold {} °C.",
            delivered.count,
            trim(delivered.sensible_kw),
            trim(needed_kw),
            trim(input.target_c)
        ));
    }
    if level == AdviceLevel::Damp {
        reasons.push(format!(
            "The room takes on {} kW of moisture; the splits can take out {}. The rest stays in the air, so it gets cold and stays damp.",
            trim(l.latent_kw),
            trim(delivered.latent_kw)
        ));
        reasons.push(
            "The answer is a packaged unit or a chiller with outdoor air and a reheat or desiccant coil, not more splits."
                .into(),
        );
    }
    if sizing.count > MAX_SENSIBLE_UNITS {
        reasons.push(format!(
            "{} units running together draw {} kW, and starting them all draws {} kW. Stagger the starts or specify inverter units.",
            sizing.count,
            trim(sizing.input_kw),
            trim(sizing.surge_kw)
        ));
    }

    // Where the host has placed the units, say where the room is warmest — the map is the point.
    if let Some(f) = &field {
        if let Some(warmest) = f.areas.first() {
            let delta = warmest.mean_c - f.mean_c;
            if delta >= 1.0 {
                reasons.push(format!(
                    "The {} runs {} K warmer than the room at {} °C, because the crowd is the load and the cold air thins out before it gets there.",
                    warmest.label.to_lowercase(),
                    trim(delta),
                    trim(warmest.mean_c)
                ));
            }
        }
    }

    ThermalReport {
        loads: l,
        sizing: Some(sizing),
        prediction: Some(prediction),
        advice: Advice {
            level,
            headline,
            reasons,
            wet_bulb_c: wb,
            evaporative,
        },
        field,
        plant: Some(plant),
    }
}

/// One decimal place, without a trailing `.0`.
fn trim(v: f64) -> String {
    let s = format!("{v:.1}");
    s.strip_suffix(".0").unwrap_or(&s).to_string()
}

fn round2(v: f64) -> f64 {
    (v * 100.0).round() / 100.0
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::units::{largest, CATALOGUE};
    use crate::venue::{Mount, ZoneKind, ZoneShape};

    fn placed_units(count: u32) -> Vec<AcUnit> {
        (0..count)
            .map(|i| AcUnit {
                id: format!("ac-{i}"),
                x: 3.0 + (i % 5) as f64 * 6.0,
                y: 3.0 + (i / 5) as f64 * 5.0,
                hp: 2.5,
                mount: Mount::Wall,
                inverter: false,
            })
            .collect()
    }

    fn dance_floor() -> Zone {
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

    /// The worked example from research §C.5: 30 × 20 × 5 m, 300 guests, Lagos.
    fn worked_example() -> LoadInput {
        let mut i = LoadInput::new(30.0, 20.0, 5.0, VenueType::Hall);
        i.headcount = 300;
        i.dancing = 100;
        i
    }

    #[test]
    fn the_psychrometrics_match_the_tables() {
        // 33 °C at 80 % RH is W ≈ 0.025 kg/kg, and 24 °C at 55 % is W ≈ 0.010.
        assert!((humidity_ratio(33.0, 80.0) - 0.0257).abs() < 0.001);
        assert!((humidity_ratio(24.0, 55.0) - 0.0102).abs() < 0.001);
        // And back again.
        let w = humidity_ratio(28.0, 65.0);
        assert!((relative_humidity(28.0, w) - 65.0).abs() < 0.5);
    }

    #[test]
    fn lagos_wet_bulb_is_above_the_evaporative_threshold() {
        // The research rounds this to "about 28 °C"; the saturation line puts it at 29.8, and the
        // 2 °C matters, because it is the gap between cooling and just adding moisture.
        let wb = wet_bulb(33.0, 80.0);
        assert!(wb > 29.0 && wb < 30.5, "wet-bulb {wb}");
        assert!(!assess(&worked_example()).advice.evaporative);
    }

    /// Every component of the research table, to the accuracy the table itself is quoted.
    #[test]
    fn the_worked_example_reproduces_the_breakdown() {
        let l = loads(&worked_example());
        assert!((l.roof_kw - 2.7).abs() < 0.01, "roof {}", l.roof_kw);
        assert!((l.wall_kw - 4.0).abs() < 0.05, "wall {}", l.wall_kw);
        assert!(
            (l.glazing_kw - 3.1).abs() < 0.05,
            "glazing {}",
            l.glazing_kw
        );
        assert!((l.solar_kw - 16.2).abs() < 0.01, "solar {}", l.solar_kw);
        assert!((l.people_sensible_kw - 29.0).abs() < 0.01);
        assert!((l.people_latent_kw - 20.0).abs() < 0.01);
        assert!((l.infiltration_sensible_kw - 8.7).abs() < 0.05);
        assert!((l.lighting_kw - 7.2).abs() < 0.01);
        assert!((l.equipment_kw - 5.0).abs() < 0.01);
        // The one row the research multiplies loosely: 0.96 × 2.45 MJ × 0.015 is 35.3 kW, not the
        // 34.8 kW printed, and the moisture difference is 0.0154 rather than 0.015. The model does
        // the multiplication, so it lands at 36.3.
        assert!(
            (l.infiltration_latent_kw - 36.3).abs() < 0.5,
            "infiltration latent {}",
            l.infiltration_latent_kw
        );
    }

    /// The headline the checklist pins: 130.5 kW, SHR 0.58, 19 × 2.5 HP.
    #[test]
    fn the_worked_example_lands_on_130_kw_and_nineteen_units() {
        let report = assess(&worked_example());
        assert!(
            (report.loads.total_kw - 130.5).abs() < 2.0,
            "total {} kW",
            report.loads.total_kw
        );
        assert!(
            (report.loads.shr - 0.58).abs() < 0.02,
            "SHR {}",
            report.loads.shr
        );
        let sizing = report.sizing.expect("a hall can be sized");
        assert_eq!(sizing.unit.hp, 2.5);
        assert_eq!(sizing.count, 19);
    }

    /// The finding the whole phase exists for: the room gets cold and stays damp.
    #[test]
    fn the_worked_example_is_told_splits_are_the_wrong_technology() {
        let report = assess(&worked_example());
        assert_eq!(report.advice.level, AdviceLevel::Damp);
        assert!(report.advice.headline.contains("chill the air"));
        let p = report.prediction.expect("a hall gets a prediction");
        assert!(p.damp, "W = {} should be over the ceiling", p.w_in);
        assert!(p.rh_in > 70.0, "{} % relative humidity", p.rh_in);
        assert!(
            p.room_c < 26.0,
            "the room is cold ({} °C) but wet — that is the point",
            p.room_c
        );
    }

    /// An empty hall at noon still carries the sun and the lights; an empty hall at night, sealed,
    /// carries almost nothing. Both are the model behaving, not failing.
    #[test]
    fn an_empty_room_carries_only_what_is_turned_on() {
        let mut i = worked_example();
        i.headcount = 0;
        i.dancing = 0;
        i.outdoor_c = 24.0;
        let day = assess(&i);
        assert!(day.loads.people_sensible_kw == 0.0 && day.loads.people_latent_kw == 0.0);
        assert!(
            (day.loads.total_kw
                - (day.loads.solar_kw
                    + day.loads.lighting_kw
                    + day.loads.equipment_kw
                    + day.loads.infiltration_latent_kw))
                .abs()
                < 1e-9,
            "an empty room carries the sun, the lights and the AV"
        );

        i.incident_w_m2 = 0.0;
        i.lighting_w_m2 = 0.0;
        i.equipment_kw = 0.0;
        i.outdoor_rh = 50.0;
        let night = assess(&i);
        assert!(night.loads.total_kw < 0.5, "{}", night.loads.total_kw);
        assert!(!night.prediction.expect("prediction").damp);
    }

    #[test]
    fn more_leakage_is_more_load() {
        let tight = loads(&worked_example());
        let mut leaky = worked_example();
        leaky.ach = 3.0;
        let drafty = loads(&leaky);
        assert!(drafty.infiltration_sensible_kw > tight.infiltration_sensible_kw);
        assert!(drafty.infiltration_latent_kw > tight.infiltration_latent_kw);
        assert!(drafty.total_kw > tight.total_kw);
        assert!(drafty.shr < tight.shr, "leakage is mostly latent");
    }

    #[test]
    fn a_marquee_is_told_not_to_bother() {
        let mut i = LoadInput::new(30.0, 20.0, 5.0, VenueType::Marquee);
        i.headcount = 300;
        i.dancing = 100;
        let report = assess(&i);
        assert_eq!(report.advice.level, AdviceLevel::NotViable);
        assert!(report.sizing.is_none(), "no fantasy unit count");
        assert!(report.prediction.is_none());
        assert!(report.advice.headline.contains("not viable"));
        assert!((i.ach - 5.0).abs() < 1e-9, "a marquee leaks 5 ACH");
    }

    #[test]
    fn every_catalogue_size_is_sized_consistently() {
        let l = loads(&worked_example());
        for unit in CATALOGUE {
            let s = size(&l, unit, DERATE);
            assert_eq!(
                s.count,
                (l.total_kw / unit.cooling_kw).ceil() as u32,
                "{}",
                unit.hp
            );
            assert!(s.installed_kw < s.count as f64 * unit.cooling_kw);
        }
    }

    #[test]
    fn the_report_serialises_for_the_wire() {
        let report = assess(&worked_example());
        let json = serde_json::to_string(&report).expect("serialises");
        for key in [
            "\"totalKw\"",
            "\"sensibleKw\"",
            "\"latentKw\"",
            "\"infiltrationLatentKw\"",
            "\"deliveredSensibleKw\"",
            "\"roomC\"",
            "\"wetBulbC\"",
            "\"damp\"",
        ] {
            assert!(json.contains(key), "{key} missing from {json}");
        }
    }

    #[test]
    fn a_room_with_no_air_leak_has_no_extra_load() {
        let mut i = worked_example();
        i.ach = 0.0;
        let l = loads(&i);
        assert_eq!(l.infiltration_sensible_kw, 0.0);
        assert_eq!(l.mass_flow_kg_s, 0.0);
        // And the model does not divide by zero predicting it.
        let s = size(&l, largest(), DERATE);
        let p = predict(&i, &l, &s);
        assert!(p.room_c.is_finite() && p.w_in.is_finite());
    }

    /// Research §C.8: the set draws ~42 kW running and ~146 kW starting, and the coils pull out
    /// enough water to need a drain, not a tray.
    #[test]
    fn the_plant_reports_the_generator_and_the_drain() {
        let report = assess(&worked_example());
        let plant = report.plant.expect("a sized hall has a plant");
        assert!((plant.running_kw - 41.8).abs() < 0.5, "{}", plant.running_kw);
        assert!((plant.surge_kw - 146.3).abs() < 1.0, "{}", plant.surge_kw);
        // 41.1 kW of latent removal is ~60 L/h. The research's 22–38 L/h does not follow from its
        // own 55 kW; the model does the multiplication.
        assert!(
            (plant.condensate_lph - 60.0).abs() < 5.0,
            "{} L/h",
            plant.condensate_lph
        );
    }

    #[test]
    fn a_room_with_no_units_has_no_heat_map() {
        let report = assess(&worked_example());
        assert!(report.field.is_none(), "nothing placed, nothing to map");
    }

    #[test]
    fn a_placed_set_puts_a_heat_map_in_the_report() {
        let units = placed_units(19);
        let zones = vec![dance_floor()];
        let report = assess_placed(&worked_example(), &units, &zones);
        let f = report.field.expect("placed units get a map");
        assert_eq!(f.cols, 60);
        assert_eq!(f.rows, 40);
        assert_eq!(f.areas[0].id, "dance", "the dance floor is warmest");
        assert!(
            report
                .advice
                .reasons
                .iter()
                .any(|r| r.contains("dance floor")),
            "the verdict names the warmest place: {:?}",
            report.advice.reasons
        );
    }

    /// A host who has placed six of the nineteen the room needs is told the room is hot, not that
    /// it is damp — and the map agrees with the prediction, because both describe the same six.
    #[test]
    fn too_few_units_reads_as_under_cooled_not_damp() {
        let report = assess_placed(&worked_example(), &placed_units(6), &[]);
        assert_eq!(report.advice.level, AdviceLevel::UnderCooled);
        assert!(
            report.advice.headline.contains("above the 24 °C target"),
            "{}",
            report.advice.headline
        );
        let p = report.prediction.expect("a placed set gets a prediction");
        assert!(p.room_c > 40.0, "{} °C", p.room_c);
        let f = report.field.expect("a placed set gets a map");
        assert!(
            (f.mean_c - p.room_c).abs() < 1.0,
            "map {} vs prediction {}",
            f.mean_c,
            p.room_c
        );
    }

    #[test]
    fn a_marquee_gets_no_heat_map_even_with_units_placed() {
        let mut i = LoadInput::new(30.0, 20.0, 5.0, VenueType::Marquee);
        i.headcount = 300;
        let report = assess_placed(&i, &placed_units(19), &[]);
        assert!(report.field.is_none());
        assert!(report.plant.is_none());
    }
}
