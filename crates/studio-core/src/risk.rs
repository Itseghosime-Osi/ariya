//! What could go wrong, and what to do about it, by when.
//!
//! The register is research §D.1, minus the "Missing permits" row that §0 of the build checklist
//! removes from scope. Each rule carries a trigger, a mitigation with a number in it, and a
//! deadline that resolves to a real date from the event date.
//!
//! Two things this module is careful about:
//!
//! - **Likelihood and impact are practitioner judgement, not actuarial.** They rank what to look
//!   at first; they do not predict what will happen. The report says so, and the UI repeats it.
//! - **Safety-critical is not the same as important.** A blocked exit and a late cake are both
//!   "high", and they must never share a badge. `safety_critical` is the split.
//!
//! The engine is pure: the event date comes in as a string, and the due dates are civil-date
//! arithmetic on it. Nothing here reads the clock.

use serde::{Deserialize, Serialize};
#[cfg(feature = "ts")]
use ts_rs::TS;

use crate::venue::{Environment, VenueType, Zone, ZoneKind};

/// The seven families the register is grouped into. Research §D.1.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub enum RiskCategory {
    Venue,
    Weather,
    People,
    Vendors,
    Money,
    Programme,
    Compliance,
}

impl RiskCategory {
    pub fn label(self) -> &'static str {
        match self {
            RiskCategory::Venue => "Venue",
            RiskCategory::Weather => "Weather",
            RiskCategory::People => "People",
            RiskCategory::Vendors => "Vendors",
            RiskCategory::Money => "Money",
            RiskCategory::Programme => "Programme",
            RiskCategory::Compliance => "Compliance",
        }
    }
}

/// How likely, or how bad. `LowMedium` is the research's "Low–Med" band, kept rather than rounded
/// because rounding it up would put a site-visit check beside a structural failure.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub enum Level {
    Low,
    LowMedium,
    Medium,
    High,
}

impl Level {
    pub fn label(self) -> &'static str {
        match self {
            Level::Low => "Low",
            Level::LowMedium => "Low–Med",
            Level::Medium => "Med",
            Level::High => "High",
        }
    }
}

/// Everything the register reads from the plan. Every field but the venue defaults, so a
/// half-answered plan still gets the always-on rules rather than an error.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Debug, Serialize, Deserialize)]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub struct RiskInput {
    /// The event date, `yyyy-mm-dd` (an ISO timestamp is accepted and truncated). Absent means the
    /// due dates are blank, not that the risks are.
    #[serde(default, rename = "eventDate")]
    pub event_date: Option<String>,
    pub guests: u32,
    pub venue: VenueType,
    pub environment: Environment,
    #[serde(default)]
    pub tables: u32,
    #[serde(default)]
    pub zones: Vec<Zone>,
    /// The certified capacity, when the host has the written figure.
    #[serde(default)]
    pub capacity: Option<u32>,
    /// The month of the event, 1–12, for the harmattan rule.
    #[serde(default)]
    pub month: Option<u32>,
    #[serde(default)]
    pub alcohol: bool,
    /// `mains`, `generator` or `solar`.
    #[serde(default)]
    pub power: Option<String>,
    #[serde(default, rename = "generatorKva")]
    pub generator_kva: Option<f64>,
    #[serde(default)]
    pub toilets: Option<u32>,
    #[serde(default, rename = "designWindMph")]
    pub design_wind_mph: Option<f64>,
    #[serde(default)]
    pub floor: Option<String>,
    #[serde(default)]
    pub anchoring: Option<String>,
    #[serde(default)]
    pub chandeliers: bool,
}

/// One risk, with the number and the date the checklist asks for.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Debug, Serialize, Deserialize)]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub struct RiskItem {
    /// Stable key, so a checklist task can point back at the rule that made it.
    pub id: String,
    pub category: RiskCategory,
    pub title: String,
    pub likelihood: Level,
    pub impact: Level,
    /// A failure here can injure or kill someone. Kept apart from the experiential risks.
    #[serde(rename = "safetyCritical")]
    pub safety_critical: bool,
    /// What to do, with a number in it.
    pub mitigation: String,
    /// Where the advice comes from.
    pub source: String,
    /// The research's "when", in words.
    pub when: String,
    /// The same deadline as a date, resolved from the event date. `None` when no date was set.
    pub due: Option<String>,
    /// Why this rule fired for this plan: "because your hall has 30 tables".
    pub derivation: String,
}

/// The register, filtered to the plan.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Debug, Serialize, Deserialize)]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub struct RiskReport {
    pub items: Vec<RiskItem>,
    /// The judgement caveat, and anything the plan left unanswered.
    pub notes: Vec<String>,
    #[serde(rename = "eventDate")]
    pub event_date: Option<String>,
}

/// What makes a rule fire. `Always` is the baseline register — every event carries it.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum Trigger {
    Always,
    Capacity,
    Structure,
    HeavyZones,
    Rigging,
    Generator,
    Toilets,
    Outdoor,
    Harmattan,
    Band,
    Alcohol,
}

struct Rule {
    id: &'static str,
    category: RiskCategory,
    title: &'static str,
    likelihood: Level,
    impact: Level,
    safety_critical: bool,
    mitigation: &'static str,
    when: &'static str,
    /// The primary deadline, in days before the event. The research's "when" often names two
    /// milestones; this is the one the mitigation has to be done by.
    days_before: u32,
    source: &'static str,
    trigger: Trigger,
}

const SOURCE: &str = "Research §D.1–D.2";

/// The register, in the research's order. Research §D.1, minus "Missing permits" (build
/// checklist §0).
const RULES: [Rule; 43] = [
    // ---------------------------------------------------------------- Venue
    Rule {
        id: "venue.capacity",
        category: RiskCategory::Venue,
        title: "Guest count exceeds certified capacity",
        likelihood: Level::Medium,
        impact: Level::High,
        safety_critical: true,
        mitigation: "Compare the final RSVP against the written capacity; hold a 5–10 % buffer; name an overflow room.",
        when: "Booking; 3 weeks before",
        days_before: 21,
        source: SOURCE,
        trigger: Trigger::Capacity,
    },
    Rule {
        id: "venue.exits",
        category: RiskCategory::Venue,
        title: "Blocked, locked or inward-opening exits",
        likelihood: Level::Medium,
        impact: Level::High,
        safety_critical: true,
        mitigation: "Walk every exit at 2 points in the day — at setup and again before doors; unlocked, unobstructed, opening outward; no storage in escape routes.",
        when: "Site visit; day before",
        days_before: 1,
        source: SOURCE,
        trigger: Trigger::Always,
    },
    Rule {
        id: "venue.marquee-wind",
        category: RiskCategory::Venue,
        title: "Marquee wind or rain failure",
        likelihood: Level::Medium,
        impact: Level::High,
        safety_critical: true,
        mitigation: "Engineer-certified structure and anchoring spec; side walls; a pre-agreed evacuation trigger at 80 % of the design wind speed.",
        when: "Contract; 72 hours before",
        days_before: 3,
        source: SOURCE,
        trigger: Trigger::Structure,
    },
    Rule {
        id: "venue.floor-load",
        category: RiskCategory::Venue,
        title: "Floor load or collapse (dance floor, stage, bars)",
        likelihood: Level::LowMedium,
        impact: Level::High,
        safety_critical: true,
        mitigation: "Ask for floor loading figures; spread heavy items; cap raised staging at 4 people per m².",
        when: "Site visit",
        days_before: 28,
        source: SOURCE,
        trigger: Trigger::HeavyZones,
    },
    Rule {
        id: "venue.rigging",
        category: RiskCategory::Venue,
        title: "Ceiling rigging failure",
        likelihood: Level::Low,
        impact: Level::High,
        safety_critical: true,
        mitigation: "Rig only from certified points; request the rigging certificate and weight schedule 2 weeks before.",
        when: "Vendor contract",
        days_before: 84,
        source: SOURCE,
        trigger: Trigger::Rigging,
    },
    Rule {
        id: "venue.power-outage",
        category: RiskCategory::Venue,
        title: "Power outage",
        likelihood: Level::High,
        impact: Level::High,
        safety_critical: true,
        mitigation: "Dual supply; UPS on sound and AV; rehearse the changeover 2 times.",
        when: "Booking; day before",
        days_before: 1,
        source: SOURCE,
        trigger: Trigger::Always,
    },
    Rule {
        id: "venue.generator",
        category: RiskCategory::Venue,
        title: "Generator failure or fuel exhaustion",
        likelihood: Level::High,
        impact: Level::High,
        safety_critical: true,
        mitigation: "Size with 30–40 % headroom; fuel for the day plus 4 hours; a second smaller backup; service log.",
        when: "2 weeks before; day of",
        days_before: 0,
        source: SOURCE,
        trigger: Trigger::Generator,
    },
    Rule {
        id: "venue.water",
        category: RiskCategory::Venue,
        title: "Water supply or tanker failure",
        likelihood: Level::Medium,
        impact: Level::Medium,
        safety_critical: false,
        mitigation: "Confirm the source and tank capacity; book a tanker backup on 24-hour call; separate potable storage for catering.",
        when: "Booking",
        days_before: 112,
        source: SOURCE,
        trigger: Trigger::Always,
    },
    Rule {
        id: "venue.toilets",
        category: RiskCategory::Venue,
        title: "Insufficient or unusable toilets",
        likelihood: Level::Medium,
        impact: Level::Medium,
        safety_critical: false,
        mitigation: "Ratio check; at least one accessible unit; one attendant per 2 units, with consumables.",
        when: "6 weeks before",
        days_before: 42,
        source: SOURCE,
        trigger: Trigger::Toilets,
    },
    // ---------------------------------------------------------------- Weather
    Rule {
        id: "weather.rain",
        category: RiskCategory::Weather,
        title: "Rain",
        likelihood: Level::High,
        impact: Level::High,
        safety_critical: false,
        mitigation: "A covered route between ceremony and reception; an indoor fallback of equal capacity; drainage; umbrellas for 1 in 5 guests.",
        when: "Date choice; 72 hours before",
        days_before: 3,
        source: SOURCE,
        trigger: Trigger::Outdoor,
    },
    Rule {
        id: "weather.heat",
        category: RiskCategory::Weather,
        title: "Heat",
        likelihood: Level::High,
        impact: Level::Medium,
        safety_critical: false,
        mitigation: "Shade on all seating; one water station per 50 guests; fans or misting; outdoor segments early or late; medical standby.",
        when: "3 months before",
        days_before: 90,
        source: SOURCE,
        trigger: Trigger::Always,
    },
    Rule {
        id: "weather.wind",
        category: RiskCategory::Weather,
        title: "Wind",
        likelihood: Level::Medium,
        impact: Level::High,
        safety_critical: false,
        mitigation: "Weighted centrepieces; no open flame; secure linens and signage; show the forecast at 72 hours.",
        when: "72 hours before",
        days_before: 3,
        source: SOURCE,
        trigger: Trigger::Outdoor,
    },
    Rule {
        id: "weather.harmattan",
        category: RiskCategory::Weather,
        title: "Harmattan dust (Nov–Mar)",
        likelihood: Level::High,
        impact: Level::Medium,
        safety_critical: false,
        mitigation: "Prefer indoor or covered; dust covers for cake and plated food; seal AV; warn guests 72 hours out about visibility, travel delays, dry eyes and respiratory effects.",
        when: "Date selection",
        days_before: 140,
        source: SOURCE,
        trigger: Trigger::Harmattan,
    },
    Rule {
        id: "weather.flooding",
        category: RiskCategory::Weather,
        title: "Flooding or access-road failure",
        likelihood: Level::LowMedium,
        impact: Level::High,
        safety_critical: false,
        mitigation: "Check flood history and the access road; raised flooring; a shuttle contingency for 1 in 3 guests; hardstanding parking.",
        when: "Booking",
        days_before: 112,
        source: SOURCE,
        trigger: Trigger::Outdoor,
    },
    Rule {
        id: "weather.sun",
        category: RiskCategory::Weather,
        title: "Sun position and glare",
        likelihood: Level::High,
        impact: Level::Low,
        safety_critical: false,
        mitigation: "Model the sun path at the actual ceremony hour and 2 hours either side; place the backdrop and shade accordingly.",
        when: "Design",
        days_before: 70,
        source: SOURCE,
        trigger: Trigger::Always,
    },
    // ---------------------------------------------------------------- People
    Rule {
        id: "people.overflow",
        category: RiskCategory::People,
        title: "Guest overflow",
        likelihood: Level::High,
        impact: Level::Medium,
        safety_critical: false,
        mitigation: "A 10 % RSVP buffer; overflow seating; a standing area; a second room.",
        when: "4 weeks before",
        days_before: 28,
        source: SOURCE,
        trigger: Trigger::Always,
    },
    Rule {
        id: "people.uninvited",
        category: RiskCategory::People,
        title: "Uninvited guests, unearned plus-ones",
        likelihood: Level::High,
        impact: Level::Medium,
        safety_critical: false,
        mitigation: "A named list at the door, checked at 2 points; RSVP codes; a plus-one policy on the invite.",
        when: "Invitations; day of",
        days_before: 0,
        source: SOURCE,
        trigger: Trigger::Always,
    },
    Rule {
        id: "people.seating-conflicts",
        category: RiskCategory::People,
        title: "Seating conflicts and family feuds",
        likelihood: Level::High,
        impact: Level::Medium,
        safety_critical: false,
        mitigation: "\"Keep apart\" tags on the chart; buffer tables by 1 m; a discreet re-seat plan.",
        when: "3 weeks before",
        days_before: 21,
        source: SOURCE,
        trigger: Trigger::Always,
    },
    Rule {
        id: "people.vip",
        category: RiskCategory::People,
        title: "VIP protocol",
        likelihood: Level::Medium,
        impact: Level::Medium,
        safety_critical: false,
        mitigation: "A one-page protocol sheet; a named handler per VIP; reserved seating; arrival windows of 15 minutes.",
        when: "2 weeks before",
        days_before: 14,
        source: SOURCE,
        trigger: Trigger::Always,
    },
    Rule {
        id: "people.late-vendors",
        category: RiskCategory::People,
        title: "Late vendors",
        likelihood: Level::High,
        impact: Level::Medium,
        safety_critical: false,
        mitigation: "A written setup window and venue access time; a 2-hour buffer before guest arrival.",
        when: "Contract",
        days_before: 84,
        source: SOURCE,
        trigger: Trigger::Always,
    },
    Rule {
        id: "people.no-shows",
        category: RiskCategory::People,
        title: "No-shows",
        likelihood: Level::Medium,
        impact: Level::Medium,
        safety_critical: false,
        mitigation: "Confirmation calls at 7 and 2 days out; deposit-backed contracts; a backup contact per critical vendor.",
        when: "1–2 weeks before",
        days_before: 10,
        source: SOURCE,
        trigger: Trigger::Always,
    },
    Rule {
        id: "people.children",
        category: RiskCategory::People,
        title: "Children",
        likelihood: Level::High,
        impact: Level::Low,
        safety_critical: false,
        mitigation: "A kids' area, activity packs, a planned early exit, one supervisor per 10 children.",
        when: "6 weeks before",
        days_before: 42,
        source: SOURCE,
        trigger: Trigger::Always,
    },
    Rule {
        id: "people.accessibility",
        category: RiskCategory::People,
        title: "Accessibility needs unmet",
        likelihood: Level::Medium,
        impact: Level::High,
        safety_critical: true,
        mitigation: "A step-free route; one accessible toilet; 2 reserved seats per 50 guests; MC and sign-language provision.",
        when: "At RSVP",
        days_before: 42,
        source: SOURCE,
        trigger: Trigger::Always,
    },
    Rule {
        id: "people.medical",
        category: RiskCategory::People,
        title: "Medical emergency",
        likelihood: Level::Low,
        impact: Level::High,
        safety_critical: true,
        mitigation: "One first-aider per 250 guests; the AED location; an ambulance access route; the nearest hospital printed.",
        when: "4 weeks before",
        days_before: 28,
        source: SOURCE,
        trigger: Trigger::Always,
    },
    Rule {
        id: "people.security",
        category: RiskCategory::People,
        title: "Security, theft or gatecrashing",
        likelihood: Level::Medium,
        impact: Level::High,
        safety_critical: true,
        mitigation: "One vetted guard per 100 guests; a guest list at the gate; a bag policy; a secure point for gifts and cash.",
        when: "6 weeks before",
        days_before: 42,
        source: SOURCE,
        trigger: Trigger::Always,
    },
    // ---------------------------------------------------------------- Vendors
    Rule {
        id: "vendors.food-runs-out",
        category: RiskCategory::Vendors,
        title: "Food runs out",
        likelihood: Level::Medium,
        impact: Level::High,
        safety_critical: false,
        mitigation: "A guaranteed headcount plus 5–10 %; model plated against buffet; count vendor and crew meals.",
        when: "Contract; 7 days before",
        days_before: 7,
        source: SOURCE,
        trigger: Trigger::Always,
    },
    Rule {
        id: "vendors.sound",
        category: RiskCategory::Vendors,
        title: "DJ or sound failure",
        likelihood: Level::Medium,
        impact: Level::Medium,
        safety_critical: false,
        mitigation: "A backup PA; an offline playlist on two phones; a UPS; a sound check 2 hours before doors.",
        when: "2 weeks before",
        days_before: 14,
        source: SOURCE,
        trigger: Trigger::Always,
    },
    Rule {
        id: "vendors.photographer",
        category: RiskCategory::Vendors,
        title: "Photographer no-show or lost files",
        likelihood: Level::Low,
        impact: Level::High,
        safety_critical: false,
        mitigation: "A backup-photographer clause; a second shooter; dual-card backup; confirm insurance 2 weeks out.",
        when: "Contract",
        days_before: 84,
        source: SOURCE,
        trigger: Trigger::Always,
    },
    Rule {
        id: "vendors.decor-delays",
        category: RiskCategory::Vendors,
        title: "Decor setup delays",
        likelihood: Level::High,
        impact: Level::Medium,
        safety_critical: false,
        mitigation: "Access time in writing; crew size specified; pre-build; a venue-ready deadline 2 hours before doors.",
        when: "1 week before",
        days_before: 7,
        source: SOURCE,
        trigger: Trigger::Always,
    },
    Rule {
        id: "vendors.cake",
        category: RiskCategory::Vendors,
        title: "Cake delivery failure or melt",
        likelihood: Level::Medium,
        impact: Level::Medium,
        safety_critical: false,
        mitigation: "A delivery window 4 hours before the cutting; refrigerated transport; an indoor display away from heat; a backup dessert.",
        when: "2 weeks before",
        days_before: 14,
        source: SOURCE,
        trigger: Trigger::Always,
    },
    Rule {
        id: "vendors.transport",
        category: RiskCategory::Vendors,
        title: "Transport or shuttle failure",
        likelihood: Level::Medium,
        impact: Level::High,
        safety_critical: false,
        mitigation: "A confirmed fleet with driver contacts; one spare vehicle; departures staggered 15 minutes apart; a return schedule.",
        when: "2 weeks before",
        days_before: 14,
        source: SOURCE,
        trigger: Trigger::Always,
    },
    // ---------------------------------------------------------------- Money
    Rule {
        id: "money.deposit",
        category: RiskCategory::Money,
        title: "Deposit loss or vendor insolvency",
        likelihood: Level::LowMedium,
        impact: Level::High,
        safety_critical: false,
        mitigation: "Pay by card; staged payments, no more than 50 % before the event; verify registration; event insurance covering supplier failure.",
        when: "Booking",
        days_before: 112,
        source: SOURCE,
        trigger: Trigger::Always,
    },
    Rule {
        id: "money.hidden-fees",
        category: RiskCategory::Money,
        title: "Hidden fees (service, corkage, overtime, power)",
        likelihood: Level::High,
        impact: Level::Medium,
        safety_critical: false,
        mitigation: "An itemised quote; an all-in comparison of 3 quotes; overtime and power rates in writing.",
        when: "Contract",
        days_before: 84,
        source: SOURCE,
        trigger: Trigger::Always,
    },
    Rule {
        id: "money.cancellation",
        category: RiskCategory::Money,
        title: "Vendor cancellation",
        likelihood: Level::Medium,
        impact: Level::High,
        safety_critical: false,
        mitigation: "A cancellation clause with a refund schedule; a tight force-majeure; a backup list of 2 vendors per category.",
        when: "Contract",
        days_before: 84,
        source: SOURCE,
        trigger: Trigger::Always,
    },
    Rule {
        id: "money.currency",
        category: RiskCategory::Money,
        title: "Currency and inflation",
        likelihood: Level::High,
        impact: Level::Medium,
        safety_critical: false,
        mitigation: "Lock prices at booking; pay early; cap adjustment clauses; a 10 % contingency.",
        when: "Booking",
        days_before: 112,
        source: SOURCE,
        trigger: Trigger::Always,
    },
    // ---------------------------------------------------------------- Programme
    Rule {
        id: "programme.overrun",
        category: RiskCategory::Programme,
        title: "Schedule overrun",
        likelihood: Level::High,
        impact: Level::Medium,
        safety_critical: false,
        mitigation: "A run sheet with a 10-minute buffer between segments; hard stops; the MC has written authority to cut.",
        when: "2 weeks before",
        days_before: 14,
        source: SOURCE,
        trigger: Trigger::Always,
    },
    Rule {
        id: "programme.mc-gaps",
        category: RiskCategory::Programme,
        title: "MC gaps and dead air",
        likelihood: Level::Medium,
        impact: Level::Medium,
        safety_critical: false,
        mitigation: "Scripted transitions; 2 filler segments ready; an MC brief with names and pronunciations.",
        when: "1 week before",
        days_before: 7,
        source: SOURCE,
        trigger: Trigger::Always,
    },
    Rule {
        id: "programme.speeches",
        category: RiskCategory::Programme,
        title: "Speeches overrun",
        likelihood: Level::High,
        impact: Level::Low,
        safety_critical: false,
        mitigation: "A 5-minute limit per speaker; a speaker briefing; cue cards with a countdown.",
        when: "2 weeks before",
        days_before: 14,
        source: SOURCE,
        trigger: Trigger::Always,
    },
    Rule {
        id: "programme.service-timing",
        category: RiskCategory::Programme,
        title: "Food service timing fails",
        likelihood: Level::Medium,
        impact: Level::High,
        safety_critical: false,
        mitigation: "Tie service calls to the run sheet, 15 minutes before each course, not the caterer's convenience.",
        when: "2 weeks before",
        days_before: 14,
        source: SOURCE,
        trigger: Trigger::Always,
    },
    Rule {
        id: "programme.band-power",
        category: RiskCategory::Programme,
        title: "Power for the band",
        likelihood: Level::Medium,
        impact: Level::High,
        safety_critical: false,
        mitigation: "A dedicated 32 A circuit; a load calculation; a sound check at full load.",
        when: "2 weeks before",
        days_before: 14,
        source: SOURCE,
        trigger: Trigger::Band,
    },
    // ---------------------------------------------------------------- Compliance
    Rule {
        id: "compliance.noise-curfew",
        category: RiskCategory::Compliance,
        title: "Noise curfew",
        likelihood: Level::Medium,
        impact: Level::Medium,
        safety_critical: false,
        mitigation: "Confirm in writing; a sound taper over the last 30 minutes; an indoor option; notify neighbours.",
        when: "Contract",
        days_before: 84,
        source: SOURCE,
        trigger: Trigger::Always,
    },
    Rule {
        id: "compliance.fire-safety",
        category: RiskCategory::Compliance,
        title: "Fire safety gaps",
        likelihood: Level::Medium,
        impact: Level::High,
        safety_critical: true,
        mitigation: "A venue fire risk assessment; extinguisher count; one trained marshal per 100 guests; an MC briefing line.",
        when: "Site visit",
        days_before: 28,
        source: SOURCE,
        trigger: Trigger::Always,
    },
    Rule {
        id: "compliance.insurance",
        category: RiskCategory::Compliance,
        title: "Insurance gaps",
        likelihood: Level::Medium,
        impact: Level::High,
        safety_critical: false,
        mitigation: "Venue public liability; vendor PL certificates for all suppliers; an event policy for cancellation and supplier failure, checked 6 weeks out.",
        when: "6–12 weeks before",
        days_before: 63,
        source: SOURCE,
        trigger: Trigger::Always,
    },
];

/// Whether a rule fires for this plan, and the sentence that says why.
fn fires(trigger: Trigger, input: &RiskInput) -> Option<String> {
    match trigger {
        Trigger::Always => Some("every event".to_string()),
        Trigger::Capacity => {
            let certified = input.capacity?;
            if input.guests > certified {
                Some(format!(
                    "your venue is certified for {certified} and you have {} guests",
                    input.guests
                ))
            } else if (input.guests as f64) > certified as f64 * 0.9 {
                Some(format!(
                    "you have {} guests against a certified {certified} — inside the 10 % buffer",
                    input.guests
                ))
            } else {
                None
            }
        }
        Trigger::Structure => match input.venue {
            VenueType::Marquee | VenueType::PoleTent | VenueType::StretchTent => Some(format!(
                "your {} is a temporary structure",
                input.venue.label().to_lowercase()
            )),
            _ => None,
        },
        Trigger::HeavyZones => {
            let mut heavy = Vec::new();
            if has_zone(input, ZoneKind::Dance) {
                heavy.push("a dance floor");
            }
            if has_zone(input, ZoneKind::Stage) {
                heavy.push("a stage");
            }
            if has_zone(input, ZoneKind::Bar) {
                heavy.push("a bar");
            }
            if heavy.is_empty() {
                None
            } else {
                Some(format!("your plan has {}", join_and(&heavy)))
            }
        }
        Trigger::Rigging => {
            if input.chandeliers {
                Some("your plan hangs chandeliers".to_string())
            } else if has_zone(input, ZoneKind::Stage) {
                Some("your plan has a stage to rig".to_string())
            } else {
                None
            }
        }
        Trigger::Generator => match input.power.as_deref() {
            Some("generator") => Some(match input.generator_kva {
                Some(kva) => format!("you are running on a {kva} kVA generator"),
                None => "you are running on a generator".to_string(),
            }),
            _ => None,
        },
        Trigger::Toilets => match input.toilets {
            None => Some("no toilet count is recorded".to_string()),
            Some(0) => Some("no toilets are recorded".to_string()),
            Some(n) => {
                let per = input.guests as f64 / n as f64;
                if per > 50.0 {
                    Some(format!(
                        "{} guests to {n} toilets is {:.0} per unit",
                        input.guests, per
                    ))
                } else {
                    None
                }
            }
        },
        Trigger::Outdoor => match input.environment {
            Environment::Indoor => None,
            Environment::Covered => Some("your venue is covered but open to the weather".to_string()),
            Environment::Outdoor => Some("your venue is outdoors".to_string()),
        },
        Trigger::Harmattan => match input.month {
            Some(m) if (11..=12).contains(&m) || (1..=3).contains(&m) => {
                Some(format!("your event is in {}, inside the harmattan", month_name(m)))
            }
            _ => None,
        },
        Trigger::Band => {
            if has_zone(input, ZoneKind::Stage) {
                Some("your plan has a stage for a band".to_string())
            } else {
                None
            }
        }
        Trigger::Alcohol => {
            if input.alcohol {
                Some("you are serving alcohol".to_string())
            } else {
                None
            }
        }
    }
}

fn has_zone(input: &RiskInput, kind: ZoneKind) -> bool {
    input.zones.iter().any(|z| z.kind == kind)
}

fn join_and(items: &[&str]) -> String {
    match items {
        [] => String::new(),
        [one] => one.to_string(),
        [a, b] => format!("{a} and {b}"),
        [rest @ .., last] => format!("{} and {last}", rest.join(", ")),
    }
}

fn month_name(m: u32) -> &'static str {
    match m {
        1 => "January",
        2 => "February",
        3 => "March",
        4 => "April",
        5 => "May",
        6 => "June",
        7 => "July",
        8 => "August",
        9 => "September",
        10 => "October",
        11 => "November",
        12 => "December",
        _ => "an unknown month",
    }
}

/// The register, filtered to the plan.
pub fn plan(input: &RiskInput) -> RiskReport {
    let items = RULES
        .iter()
        .filter_map(|rule| {
            let derivation = fires(rule.trigger, input)?;
            Some(RiskItem {
                id: rule.id.to_string(),
                category: rule.category,
                title: rule.title.to_string(),
                likelihood: rule.likelihood,
                impact: rule.impact,
                safety_critical: rule.safety_critical,
                mitigation: rule.mitigation.to_string(),
                source: rule.source.to_string(),
                when: rule.when.to_string(),
                due: input
                    .event_date
                    .as_deref()
                    .and_then(|d| resolve_due(d, rule.days_before)),
                derivation,
            })
        })
        .collect();

    RiskReport {
        items,
        notes: notes(input),
        event_date: input.event_date.clone(),
    }
}

fn notes(input: &RiskInput) -> Vec<String> {
    let mut notes = vec![
        "Likelihood and impact are practitioner judgement, not actuarial. They rank what to look at first; they do not predict what will happen.".to_string(),
        "Safety-critical risks are marked apart from experiential ones: a blocked exit and a late cake are not the same kind of problem.".to_string(),
        "Where the research gives no figure, the number in a mitigation is a planning heuristic, not a standard. Treat it as a starting point and adjust it to the venue.".to_string(),
    ];
    if input.event_date.is_none() {
        notes.push(
            "No event date is set, so the due dates are blank. Add the date and every risk gets a deadline."
                .to_string(),
        );
    }
    notes
}

/// Resolve a deadline to a date. Accepts `yyyy-mm-dd` or an ISO timestamp, which is truncated.
fn resolve_due(event_date: &str, days_before: u32) -> Option<String> {
    let date = event_date.get(..10)?;
    let mut parts = date.split('-');
    let y: i64 = parts.next()?.parse().ok()?;
    let m: u32 = parts.next()?.parse().ok()?;
    let d: u32 = parts.next()?.parse().ok()?;
    if !(1..=12).contains(&m) || !(1..=31).contains(&d) {
        return None;
    }
    let (y, m, d) = civil_from_days(days_from_civil(y, m, d) - days_before as i64);
    Some(format!("{y:04}-{m:02}-{d:02}"))
}

/// Days since 1970-01-01 for a civil date. Howard Hinnant's algorithm, which is exact for the
/// proleptic Gregorian calendar and needs no dependency.
fn days_from_civil(y: i64, m: u32, d: u32) -> i64 {
    let y = if m <= 2 { y - 1 } else { y };
    let era = if y >= 0 { y } else { y - 399 } / 400;
    let yoe = y - era * 400;
    let mp = if m > 2 { m - 3 } else { m + 9 } as i64;
    let doy = (153 * mp + 2) / 5 + d as i64 - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    era * 146_097 + doe - 719_468
}

/// The inverse of `days_from_civil`.
fn civil_from_days(z: i64) -> (i64, u32, u32) {
    let z = z + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let m = if mp < 10 { mp + 3 } else { mp - 9 } as u32;
    (if m <= 2 { y + 1 } else { y }, m, d)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn hall() -> RiskInput {
        RiskInput {
            event_date: Some("2026-12-12".to_string()),
            guests: 300,
            venue: VenueType::Hall,
            environment: Environment::Indoor,
            tables: 30,
            zones: vec![],
            capacity: Some(250),
            month: Some(12),
            alcohol: true,
            power: Some("mains".to_string()),
            generator_kva: None,
            toilets: Some(8),
            design_wind_mph: None,
            floor: None,
            anchoring: None,
            chandeliers: false,
        }
    }

    fn find<'a>(report: &'a RiskReport, id: &str) -> &'a RiskItem {
        report
            .items
            .iter()
            .find(|i| i.id == id)
            .unwrap_or_else(|| panic!("no risk `{id}` in the report"))
    }

    fn has(report: &RiskReport, id: &str) -> bool {
        report.items.iter().any(|i| i.id == id)
    }

    #[test]
    fn every_rule_carries_a_number_and_a_deadline() {
        for rule in RULES {
            assert!(
                rule.mitigation.chars().any(|c| c.is_ascii_digit()),
                "`{}` has no number in its mitigation",
                rule.id
            );
            assert!(!rule.when.is_empty(), "`{}` has no when", rule.id);
            assert!(!rule.title.is_empty(), "`{}` has no title", rule.id);
        }
    }

    #[test]
    fn the_register_has_no_permits_row() {
        for rule in RULES {
            let text = format!("{} {}", rule.id, rule.title).to_lowercase();
            assert!(
                !text.contains("permit") && !text.contains("licen"),
                "`{}` reintroduces licensing, which is out of scope",
                rule.id
            );
        }
    }

    #[test]
    fn a_bare_plan_still_gets_the_always_on_register() {
        let report = plan(&hall());
        assert!(has(&report, "venue.exits"));
        assert!(has(&report, "people.medical"));
        assert!(has(&report, "compliance.fire-safety"));
        assert!(!report.items.is_empty());
    }

    #[test]
    fn a_certified_capacity_that_is_too_small_fires_the_capacity_rule() {
        let mut input = hall();
        input.capacity = Some(250);
        let report = plan(&input);
        let item = find(&report, "venue.capacity");
        assert!(item.safety_critical);
        assert!(item.derivation.contains("250"));
        assert!(item.derivation.contains("300"));
    }

    #[test]
    fn a_room_well_inside_its_capacity_does_not_fire_it() {
        let mut input = hall();
        input.capacity = Some(600);
        let report = plan(&input);
        assert!(!has(&report, "venue.capacity"));
    }

    #[test]
    fn a_marquee_fires_the_wind_rule_and_a_hall_does_not() {
        let mut input = hall();
        input.venue = VenueType::Marquee;
        input.environment = Environment::Covered;
        assert!(has(&plan(&input), "venue.marquee-wind"));
        assert!(!has(&plan(&hall()), "venue.marquee-wind"));
    }

    #[test]
    fn a_dance_floor_fires_the_floor_load_rule() {
        let mut input = hall();
        input.zones = vec![Zone {
            id: "dance".to_string(),
            kind: ZoneKind::Dance,
            label: "Dance floor".to_string(),
            x: 15.0,
            y: 10.0,
            w: 8.0,
            h: 8.0,
            shape: None,
            rot: None,
        }];
        let report = plan(&input);
        assert!(has(&report, "venue.floor-load"));
        assert!(find(&report, "venue.floor-load")
            .derivation
            .contains("dance floor"));
    }

    #[test]
    fn a_generator_fires_the_generator_rule() {
        let mut input = hall();
        input.power = Some("generator".to_string());
        input.generator_kva = Some(100.0);
        let report = plan(&input);
        assert!(find(&report, "venue.generator")
            .derivation
            .contains("100 kVA"));
    }

    #[test]
    fn a_december_event_fires_harmattan_and_a_june_event_does_not() {
        let mut december = hall();
        december.month = Some(12);
        assert!(has(&plan(&december), "weather.harmattan"));

        let mut june = hall();
        june.month = Some(6);
        assert!(!has(&plan(&june), "weather.harmattan"));
    }

    #[test]
    fn an_indoor_venue_does_not_fire_the_rain_rule() {
        assert!(!has(&plan(&hall()), "weather.rain"));
        let mut outdoor = hall();
        outdoor.environment = Environment::Outdoor;
        assert!(has(&plan(&outdoor), "weather.rain"));
    }

    #[test]
    fn too_few_toilets_fires_the_ratio_rule() {
        let mut input = hall();
        input.toilets = Some(4);
        let report = plan(&input);
        assert!(find(&report, "venue.toilets")
            .derivation
            .contains("75 per unit"));
    }

    #[test]
    fn a_due_date_resolves_from_the_event_date() {
        let report = plan(&hall());
        // 2026-12-12 minus 21 days is 2026-11-21.
        assert_eq!(
            find(&report, "venue.capacity").due.as_deref(),
            Some("2026-11-21")
        );
        // 2026-12-12 minus 1 day is 2026-12-11.
        assert_eq!(
            find(&report, "venue.exits").due.as_deref(),
            Some("2026-12-11")
        );
    }

    #[test]
    fn a_due_date_crosses_a_year_boundary() {
        let mut input = hall();
        input.event_date = Some("2027-01-05".to_string());
        let report = plan(&input);
        // 2027-01-05 minus 21 days is 2026-12-15.
        assert_eq!(
            find(&report, "venue.capacity").due.as_deref(),
            Some("2026-12-15")
        );
    }

    #[test]
    fn an_iso_timestamp_is_accepted() {
        let mut input = hall();
        input.event_date = Some("2026-12-12T18:00:00+01:00".to_string());
        let report = plan(&input);
        assert_eq!(
            find(&report, "venue.capacity").due.as_deref(),
            Some("2026-11-21")
        );
    }

    #[test]
    fn no_event_date_leaves_the_due_dates_blank_and_says_so() {
        let mut input = hall();
        input.event_date = None;
        let report = plan(&input);
        assert!(report.items.iter().all(|i| i.due.is_none()));
        assert!(report.notes.iter().any(|n| n.contains("No event date")));
    }

    #[test]
    fn safety_critical_risks_are_marked_apart() {
        let report = plan(&hall());
        assert!(find(&report, "venue.exits").safety_critical);
        assert!(!find(&report, "vendors.cake").safety_critical);
        assert!(!find(&report, "programme.speeches").safety_critical);
    }

    #[test]
    fn the_report_serialises_for_the_wire() {
        let report = plan(&hall());
        let json = serde_json::to_string(&report).expect("serialise");
        assert!(json.contains("\"safetyCritical\""));
        assert!(json.contains("\"eventDate\""));
        assert!(json.contains("\"due\""));
    }

    #[test]
    fn civil_dates_round_trip() {
        for (y, m, d) in [
            (1970, 1, 1),
            (2000, 2, 29),
            (2026, 12, 12),
            (2027, 1, 5),
            (1999, 12, 31),
        ] {
            let days = days_from_civil(y, m, d);
            assert_eq!(civil_from_days(days), (y, m, d));
        }
    }
}
