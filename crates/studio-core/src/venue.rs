//! What kind of place the celebration is in, and the facts that follow from it.
//!
//! A venue type is not a theme: it changes the floor area a guest needs, how much air leaks in,
//! whether there is an envelope to cool at all, and which questions the studio has to ask. Those
//! differences live here so the solver, the thermal model and the checklist all read one answer.

use serde::{Deserialize, Serialize};
#[cfg(feature = "ts")]
use ts_rs::TS;

/// The eleven venue types the studio models. Each is a distinct set of constraints.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub enum VenueType {
    Hall,
    PillaredHall,
    Marquee,
    PoleTent,
    StretchTent,
    Garden,
    Field,
    Beach,
    Rooftop,
    Church,
    Hybrid,
}

/// Whether the room has walls and a roof, and how much of one.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub enum Environment {
    Indoor,
    Covered,
    Outdoor,
}

impl VenueType {
    pub const ALL: [VenueType; 11] = [
        VenueType::Hall,
        VenueType::PillaredHall,
        VenueType::Marquee,
        VenueType::PoleTent,
        VenueType::StretchTent,
        VenueType::Garden,
        VenueType::Field,
        VenueType::Beach,
        VenueType::Rooftop,
        VenueType::Church,
        VenueType::Hybrid,
    ];

    /// The name a host would use.
    pub fn label(self) -> &'static str {
        match self {
            VenueType::Hall => "Pillar-free hall",
            VenueType::PillaredHall => "Pillared hall",
            VenueType::Marquee => "Marquee",
            VenueType::PoleTent => "Pole tent",
            VenueType::StretchTent => "Stretch tent",
            VenueType::Garden => "Garden",
            VenueType::Field => "Open field",
            VenueType::Beach => "Beach",
            VenueType::Rooftop => "Rooftop",
            VenueType::Church => "Church",
            VenueType::Hybrid => "Two venues",
        }
    }

    /// The environment a type starts in, which the host can then override.
    pub fn environment(self) -> Environment {
        match self {
            VenueType::Hall | VenueType::PillaredHall | VenueType::Church => Environment::Indoor,
            VenueType::Marquee
            | VenueType::PoleTent
            | VenueType::StretchTent
            | VenueType::Rooftop => Environment::Covered,
            VenueType::Garden | VenueType::Field | VenueType::Beach => Environment::Outdoor,
            VenueType::Hybrid => Environment::Covered,
        }
    }

    /// Floor area one seated guest needs, in square metres.
    ///
    /// Banquet rounds need 1.4 m² for comfort; open ground needs more because the circulation is
    /// less tidy; pews are the one place a guest needs less than a square metre.
    pub fn area_per_diner(self) -> f64 {
        match self {
            VenueType::Church => 0.65,
            VenueType::Garden | VenueType::Field | VenueType::Beach => 1.5,
            _ => 1.4,
        }
    }

    /// Air changes per hour the thermal model starts from.
    ///
    /// A sealed hall with service doors runs about 1; a marquee is effectively open, so the
    /// infiltration term swamps any realistic cooling capacity.
    pub fn air_changes(self) -> f64 {
        match self {
            VenueType::Hall | VenueType::PillaredHall | VenueType::Hybrid => 1.0,
            VenueType::Church => 0.75,
            VenueType::Rooftop => 2.0,
            VenueType::Marquee => 5.0,
            VenueType::PoleTent | VenueType::StretchTent => 6.0,
            VenueType::Garden | VenueType::Field | VenueType::Beach => 8.0,
        }
    }

    /// Whether mechanical cooling can be sized at all. False means the honest answer is "not
    /// viable here", not a unit count.
    pub fn can_be_cooled(self) -> bool {
        matches!(
            self,
            VenueType::Hall
                | VenueType::PillaredHall
                | VenueType::Church
                | VenueType::Rooftop
                | VenueType::Hybrid
        )
    }

    /// Whether the layout has to snap to a structural module (marquee legs).
    pub fn leg_module(self) -> Option<f64> {
        match self {
            VenueType::Marquee | VenueType::PoleTent => Some(3.0),
            VenueType::StretchTent => None,
            _ => None,
        }
    }
}

/// The kinds of area a plan can contain.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub enum ZoneKind {
    Stage,
    Dance,
    Buffet,
    Bar,
    Dj,
    Entrance,
    Gifts,
    Photo,
    Pillar,
    Cake,
    Custom,
}

#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub enum ZoneShape {
    Rect,
    Round,
    Oval,
    Hexagon,
    Octagon,
    Heart,
}

/// An area in the room: a stage, a dance floor, a buffet, a pillar.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Debug, Serialize, Deserialize)]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub struct Zone {
    pub id: String,
    pub kind: ZoneKind,
    #[serde(default)]
    pub label: String,
    /// Centre, in metres from the top-left corner of the room.
    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub h: f64,
    #[serde(default)]
    pub shape: Option<ZoneShape>,
    /// Rotation in degrees.
    #[serde(default)]
    pub rot: Option<f64>,
}

impl Zone {
    pub fn rotation(&self) -> f64 {
        self.rot.unwrap_or(0.0)
    }
}

/// How a unit is fixed to the room, which decides how far its air reaches.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub enum Mount {
    /// High on a wall, throwing along the ceiling.
    Wall,
    /// In the ceiling, throwing in four directions.
    Cassette,
    /// Standing on the floor, which is what a hall with no wall space ends up with.
    Floor,
}

impl Mount {
    /// How far the supply jet carries, in metres. Research §C.6: no occupied zone should be more
    /// than about 5–6 m from a jet, and a cassette reaches further than a wall unit.
    pub fn throw_m(self) -> f64 {
        match self {
            Mount::Wall => 6.0,
            Mount::Cassette => 8.0,
            Mount::Floor => 5.0,
        }
    }

    pub fn label(self) -> &'static str {
        match self {
            Mount::Wall => "Wall",
            Mount::Cassette => "Ceiling cassette",
            Mount::Floor => "Floor standing",
        }
    }
}

/// One air conditioner, where the host put it.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Debug, Serialize, Deserialize)]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub struct AcUnit {
    pub id: String,
    /// Centre, in metres from the top-left corner of the room.
    pub x: f64,
    pub y: f64,
    /// The size, in "HP".
    pub hp: f64,
    pub mount: Mount,
    /// An inverter unit starts gently, so a roomful of them does not need a bigger generator.
    #[serde(default)]
    pub inverter: bool,
}

/// The cooling the host has planned: the units, and the two numbers they can move.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub struct Cooling {
    #[serde(default)]
    pub units: Vec<AcUnit>,
    /// Air changes per hour. The dominant uncertainty in the load, so it is the host's to move.
    #[serde(default)]
    pub ach: Option<f64>,
    #[serde(default, rename = "targetC")]
    pub target_c: Option<f64>,
}

/// The venue facts a plan carries. Everything is optional except the type, so a document written
/// before the studio knew about venues still reads.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Debug, Serialize, Deserialize)]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub struct VenueProfile {
    #[serde(rename = "type")]
    pub kind: VenueType,
    pub environment: Environment,
    #[serde(default)]
    pub structure: Option<Structure>,
    #[serde(default)]
    pub services: Option<Services>,
    #[serde(default)]
    pub capacity: Option<Capacity>,
    #[serde(default)]
    pub climate: Option<Climate>,
    #[serde(default)]
    pub cooling: Option<Cooling>,
    #[serde(default)]
    pub sun: Option<Sun>,
    #[serde(default)]
    pub wind: Option<Wind>,
}

impl Default for VenueProfile {
    fn default() -> Self {
        Self {
            kind: VenueType::Hall,
            environment: Environment::Indoor,
            structure: None,
            services: None,
            capacity: None,
            climate: None,
            cooling: None,
            sun: None,
            wind: None,
        }
    }
}

impl VenueProfile {
    pub fn new(kind: VenueType) -> Self {
        Self {
            kind,
            environment: kind.environment(),
            ..Self::default()
        }
    }
}

/// The structure itself: clearspan, leg module, wind rating, anchoring, floor.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub struct Structure {
    #[serde(default)]
    pub clearspan: Option<f64>,
    #[serde(default, rename = "legModule")]
    pub leg_module: Option<f64>,
    #[serde(default, rename = "designWindMph")]
    pub design_wind_mph: Option<f64>,
    #[serde(default)]
    pub anchoring: Option<String>,
    #[serde(default)]
    pub floor: Option<String>,
}

/// Power, water, toilets, parking.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub struct Services {
    #[serde(default)]
    pub power: Option<String>,
    #[serde(default, rename = "generatorKva")]
    pub generator_kva: Option<f64>,
    #[serde(default)]
    pub water: Option<String>,
    #[serde(default)]
    pub toilets: Option<u32>,
    #[serde(default)]
    pub parking: Option<u32>,
}

/// The certified capacity, and where the number came from.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub struct Capacity {
    #[serde(default)]
    pub certified: Option<u32>,
    #[serde(default)]
    pub source: Option<String>,
}

/// The weather the plan is designed for.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub struct Climate {
    #[serde(default)]
    pub city: Option<String>,
    #[serde(default)]
    pub month: Option<u32>,
    #[serde(default, rename = "outdoorC")]
    pub outdoor_c: Option<f64>,
    #[serde(default)]
    pub rh: Option<f64>,
}

/// Where the sun is at the hour the plan is drawn for. Degrees, clockwise from north.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Copy, Debug, Default, Serialize, Deserialize)]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub struct Sun {
    #[serde(default)]
    pub azimuth: Option<f64>,
    #[serde(default)]
    pub elevation: Option<f64>,
}

/// The prevailing wind, which decides where the generator and the open sides go.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Copy, Debug, Default, Serialize, Deserialize)]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub struct Wind {
    /// Degrees, clockwise from north: the direction the wind blows *from*.
    #[serde(default)]
    pub direction: Option<f64>,
    #[serde(default, rename = "speedMph")]
    pub speed_mph: Option<f64>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_type_has_a_label_and_a_sane_area() {
        for kind in VenueType::ALL {
            assert!(!kind.label().is_empty());
            let area = kind.area_per_diner();
            assert!((0.5..=2.0).contains(&area), "{kind:?} area {area}");
            assert!(kind.air_changes() > 0.0, "{kind:?} ach");
        }
    }

    #[test]
    fn open_ground_leaks_more_air_than_a_hall() {
        assert!(VenueType::Field.air_changes() > VenueType::Hall.air_changes());
        assert!(VenueType::Marquee.air_changes() > VenueType::Hall.air_changes());
    }

    #[test]
    fn a_marquee_cannot_be_sized_for_mechanical_cooling() {
        assert!(!VenueType::Marquee.can_be_cooled());
        assert!(!VenueType::Beach.can_be_cooled());
        assert!(VenueType::Hall.can_be_cooled());
    }

    #[test]
    fn a_default_profile_is_a_hall() {
        let profile = VenueProfile::default();
        assert_eq!(profile.kind, VenueType::Hall);
        assert_eq!(profile.environment, Environment::Indoor);
    }

    #[test]
    fn a_profile_round_trips_through_json() {
        let profile = VenueProfile::new(VenueType::Marquee);
        let json = serde_json::to_string(&profile).expect("serialise");
        let back: VenueProfile = serde_json::from_str(&json).expect("deserialise");
        assert_eq!(back.kind, VenueType::Marquee);
        assert_eq!(back.environment, Environment::Covered);
    }

    #[test]
    fn a_minimal_document_still_reads() {
        let back: VenueProfile =
            serde_json::from_str(r#"{"type":"beach","environment":"outdoor"}"#).expect("read");
        assert_eq!(back.kind, VenueType::Beach);
        assert!(back.structure.is_none());
    }
}
