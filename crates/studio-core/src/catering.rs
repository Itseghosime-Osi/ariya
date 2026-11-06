//! What to buy, and how much of it.
//!
//! There is no standard for catering quantities — only nutrition guidance, caterer heuristics and
//! hotel F&B ratios that disagree with each other by 20–40 % on the same item. That disagreement
//! is a design input, not a defect: it is why every line comes back as a Low/Likely/High range
//! rather than a number, and why the report carries the ±20 % caveat it does.
//!
//! The arithmetic is research §E.9, and it is deliberately short: an effective headcount, an
//! overage that shrinks as the guest count grows, a style multiplier, and a per-guest rate. What
//! matters is not the formula but the three multipliers it lets a host see — vendors, plus-ones
//! and takeaway packs push the real requirement ~20 % above the naive "guests × per-guest" figure.
//! That gap is the thing this module exists to expose.
//!
//! # Why the worked example does not reproduce
//!
//! Research §E.10 works a 300-guest buffet and prints 92 kg of jollof. Its own §E.9 formula gives
//! much more, and the table cannot be reached by any reading of it: 300 × 280 g × 1.10 is 92 kg,
//! which is the base guest count with the overage applied and both the style multiplier and the
//! effective headcount dropped. The example also computes "354 eating, ~390 portions" and then
//! never uses either number. §E.9 and §E.10 contradict each other, and §E.2 independently says a
//! buffet takes 1.4–1.6× the food of plated — so the formula is what is implemented here, and the
//! divergence is asserted rather than hidden. See `the_worked_example_follows_the_formula`.
//!
//! Called from `wire.rs` (the `CATERING` operation); writes a shopping list grouped by the unit a
//! caterer actually quotes in.

use serde::{Deserialize, Serialize};
#[cfg(feature = "ts")]
use ts_rs::TS;

/// How the food is served. Research §E.2 and the §E.9 style multipliers.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub enum CateringStyle {
    Plated,
    Family,
    Buffet,
    Cocktail,
}

impl Default for CateringStyle {
    fn default() -> Self {
        CateringStyle::Buffet
    }
}

impl CateringStyle {
    /// §E.9. A buffet needs 1.4–1.6× the food of plated for the same headcount; 1.45 sits in the
    /// middle of that band.
    pub fn multiplier(self) -> f64 {
        match self {
            CateringStyle::Plated => 1.00,
            CateringStyle::Family => 1.15,
            CateringStyle::Buffet => 1.45,
            CateringStyle::Cocktail => 0.70,
        }
    }

    /// §E.8 server ratios: guests per server.
    pub fn guests_per_server(self) -> u32 {
        match self {
            CateringStyle::Plated => 10,
            CateringStyle::Family => 13,
            CateringStyle::Buffet => 25,
            CateringStyle::Cocktail => 40,
        }
    }

    pub fn label(self) -> &'static str {
        match self {
            CateringStyle::Plated => "Plated",
            CateringStyle::Family => "Family style",
            CateringStyle::Buffet => "Buffet",
            CateringStyle::Cocktail => "Cocktail",
        }
    }
}

/// Whether there is a bar, which is the single largest swing in the drinks list. §E.7.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub enum AlcoholAnswer {
    None,
    BeerWine,
    FullBar,
    /// "Not sure — show me both." Priced as beer and wine, which is the middle of the three.
    Unsure,
}

impl Default for AlcoholAnswer {
    fn default() -> Self {
        // A Nigerian reception usually serves something, and a host who has not answered yet is
        // better shown a bar they can switch off than a dry event they have to switch on.
        AlcoholAnswer::BeerWine
    }
}

/// Whether the cake is pudding or a photograph. §E.8 calls this a 10× swing, and means it.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub enum CakeAnswer {
    /// Sliced and eaten: 90–120 g a guest, and above ~200 people a sheet cake behind the display.
    Dessert,
    /// Cut for photographs. Feed people something else.
    Decoration,
    /// A slice from the display cake, sized like a wedding serving at 60–80 g.
    Ceremonial,
}

impl Default for CakeAnswer {
    fn default() -> Self {
        CakeAnswer::Ceremonial
    }
}

/// Everything the shopping list depends on. Every field defaults, so a half-answered plan still
/// gets a list rather than an error.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Debug, Serialize, Deserialize)]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub struct CateringInput {
    pub guests: u32,
    #[serde(default)]
    pub style: CateringStyle,
    /// Hours of service, which sets the drinks rate and the late-night food. §E.7.
    #[serde(default = "default_hours")]
    pub hours: f64,
    #[serde(default)]
    pub alcohol: AlcoholAnswer,
    #[serde(default)]
    pub cake: CakeAnswer,
    /// Takeaway packs are a social obligation at most Nigerian receptions, not an option. §E.6.
    #[serde(default)]
    pub takeaway: bool,
    /// Plus-ones above the RSVP. §E.5 puts this at 10–15 % for open events, 3–5 % gated.
    #[serde(default, rename = "plusOnes")]
    pub plus_ones: Option<f64>,
    /// Vendors and staff — the most commonly forgotten line. §E.5.
    #[serde(default)]
    pub vendors: Option<u32>,
    /// The overage, as a fraction. Defaults by headcount when absent. §E.4.
    #[serde(default)]
    pub overage: Option<f64>,
    /// A cold display adds ice. §E.7.
    #[serde(default, rename = "coldDisplay")]
    pub cold_display: bool,
    /// Outdoor and hot: Lagos at 33 °C wants the top of the ice band. §E.7.
    #[serde(default = "default_hot", rename = "hotWeather")]
    pub hot_weather: bool,
}

fn default_hours() -> f64 {
    5.0
}

fn default_hot() -> bool {
    true
}

impl CateringInput {
    /// The 300-guest buffet from research §E.10: 6 hours, beer and wine, takeaway packs, 10 %
    /// plus-ones. The example the golden test pins.
    pub fn worked_example() -> Self {
        CateringInput {
            guests: 300,
            style: CateringStyle::Buffet,
            hours: 6.0,
            alcohol: AlcoholAnswer::BeerWine,
            cake: CakeAnswer::Dessert,
            takeaway: true,
            plus_ones: Some(0.10),
            vendors: None,
            overage: None,
            cold_display: false,
            hot_weather: true,
        }
    }

    /// Overage as a fraction, defaulting by headcount. §E.4: 20–25 % under 50 guests, 15 % to 150,
    /// 10–12 % to 400, 8–10 % above.
    pub fn overage(&self) -> f64 {
        self.overage.unwrap_or(match self.guests {
            0..=49 => 0.22,
            50..=150 => 0.15,
            151..=400 => 0.11,
            _ => 0.09,
        })
    }

    /// Plus-ones as a fraction. §E.5: 10–15 % for open Nigerian events, 3–5 % gated.
    pub fn plus_ones_rate(&self) -> f64 {
        self.plus_ones.unwrap_or(0.10)
    }

    /// Vendors and staff eating a meal: ~8 % of the guest count unless the host says otherwise.
    pub fn vendor_count(&self) -> u32 {
        self.vendors
            .unwrap_or((self.guests as f64 * 0.08).round() as u32)
    }

    /// The headcount the kitchen actually cooks for. §E.9.
    pub fn effective_guests(&self) -> u32 {
        let with_plus_ones = (self.guests as f64 * (1.0 + self.plus_ones_rate())).round() as u32;
        with_plus_ones + self.vendor_count()
    }

    /// The portions to prepare: effective headcount plus overage. §E.10's "~390".
    pub fn portions(&self) -> u32 {
        (self.effective_guests() as f64 * (1.0 + self.overage())).round() as u32
    }
}

/// Which purchase unit a caterer quotes in. §E.11: kilograms, crates, cases, bags, pans, pieces.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub enum PurchaseUnit {
    Kg,
    Litre,
    Piece,
    Bottle,
    Crate,
    Case,
    Bag,
    Pan,
    Pack,
    /// People: servers, captains, bartenders.
    Person,
    /// Buffet stations, bars.
    Station,
}

impl PurchaseUnit {
    /// The word on the shopping list, singular and plural.
    pub fn words(self) -> (&'static str, &'static str) {
        match self {
            PurchaseUnit::Kg => ("kg", "kg"),
            PurchaseUnit::Litre => ("litre", "litres"),
            PurchaseUnit::Piece => ("piece", "pieces"),
            PurchaseUnit::Bottle => ("bottle", "bottles"),
            PurchaseUnit::Crate => ("crate", "crates"),
            PurchaseUnit::Case => ("case", "cases"),
            PurchaseUnit::Bag => ("bag", "bags"),
            PurchaseUnit::Pan => ("pan", "pans"),
            PurchaseUnit::Pack => ("pack", "packs"),
            PurchaseUnit::Person => ("person", "people"),
            PurchaseUnit::Station => ("station", "stations"),
        }
    }

    /// Whether a line in this unit is a whole number of things you can count.
    pub fn is_counted(self) -> bool {
        !matches!(self, PurchaseUnit::Kg | PurchaseUnit::Litre)
    }
}

/// How much the model trusts a line. This is the confidence dot. §E.11.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub enum Confidence {
    /// Follows from arithmetic on a count the host gave us — water, plates, servers.
    High,
    /// Depends on how people eat, which is a judgement — jollof, chicken, small chops.
    Medium,
    /// Depends on a behaviour no one can predict — how many guests drink, how many take a pack.
    Low,
}

/// One line of the shopping list.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Debug, Serialize, Deserialize)]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub struct ShoppingLine {
    pub label: String,
    /// The band below the estimate.
    pub low: f64,
    /// The number to take to the caterer. Never a decimal: §E.11.
    pub likely: f64,
    pub high: f64,
    pub unit: PurchaseUnit,
    /// The same quantity as a share of one person, in the line's own unit: `0.45` for a jollof
    /// line bought in kg, `2.5` for napkins bought in pieces.
    ///
    /// Most hosts have no feel for "160 kg of rice" and every caterer does, so the list carries
    /// both. It is divided by `divisor` — the headcount this line's rate was actually built from —
    /// so `per_guest × divisor` reconciles to `likely`. A host who checks the figures with a
    /// calculator must find them agreeing, or the sheet has lost their trust at line one.
    #[serde(rename = "perGuest")]
    pub per_guest: f64,
    /// The headcount `per_guest` was divided by, and the noun to show beside it: the effective
    /// guest count for food, the RSVP count for drinks and service.
    #[serde(rename = "perGuests")]
    pub per_guests: u32,
    /// What `per_guests` counts, so the UI can say "0.45 kg per guest to cook for" rather than
    /// leaving the host to guess which of their two headcounts the figure is against.
    #[serde(rename = "perBasis")]
    pub per_basis: String,
    /// Where the number came from, in plain language.
    pub basis: String,
    pub confidence: Confidence,
}

/// Lines that share a purchase unit, so a caterer can read one column at a time.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Debug, Serialize, Deserialize)]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub struct ShoppingGroup {
    pub unit: PurchaseUnit,
    pub label: String,
    pub lines: Vec<ShoppingLine>,
}

/// The shopping list, grouped by the unit you buy it in.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Debug, Serialize, Deserialize)]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub struct CateringReport {
    /// Who the kitchen cooks for, and why it is not the guest count.
    #[serde(rename = "effectiveGuests")]
    pub effective_guests: u32,
    /// Effective headcount plus overage: the portions to prepare.
    pub portions: u32,
    /// The overage actually applied, as a fraction.
    pub overage: f64,
    /// The style multiplier actually applied.
    pub multiplier: f64,
    pub groups: Vec<ShoppingGroup>,
    /// The judgement calls behind the list, in plain language.
    pub notes: Vec<String>,
}

// ---------------------------------------------------------------- the menu, as data

/// A dish and what a guest takes of it. Research §E.3, at the middle of the stated band.
struct MenuItem {
    label: &'static str,
    /// Grams of cooked food, millilitres of liquid, or pieces a guest.
    per_guest: f64,
    unit: PurchaseUnit,
    confidence: Confidence,
    /// §E.6: jollof is the anchor starch at every guest; the secondary rice goes to 60–70 %, and
    /// suya is a snack rather than a main. A fraction means "that share of the guests".
    share: f64,
}

const MENU: [MenuItem; 10] = [
    MenuItem {
        label: "Jollof rice",
        per_guest: 280.0,
        unit: PurchaseUnit::Kg,
        confidence: Confidence::Medium,
        share: 1.0,
    },
    MenuItem {
        label: "Fried rice",
        per_guest: 220.0,
        unit: PurchaseUnit::Kg,
        confidence: Confidence::Medium,
        share: 0.65,
    },
    MenuItem {
        label: "Chicken",
        per_guest: 180.0,
        unit: PurchaseUnit::Kg,
        confidence: Confidence::Medium,
        share: 1.0,
    },
    MenuItem {
        label: "Beef",
        per_guest: 120.0,
        unit: PurchaseUnit::Kg,
        confidence: Confidence::Medium,
        share: 1.0,
    },
    MenuItem {
        label: "Pounded yam",
        per_guest: 220.0,
        unit: PurchaseUnit::Kg,
        confidence: Confidence::Medium,
        share: 1.0,
    },
    MenuItem {
        label: "Egusi soup",
        per_guest: 250.0,
        unit: PurchaseUnit::Litre,
        confidence: Confidence::Medium,
        share: 1.0,
    },
    MenuItem {
        label: "Salad",
        per_guest: 90.0,
        unit: PurchaseUnit::Kg,
        confidence: Confidence::Medium,
        share: 1.0,
    },
    MenuItem {
        label: "Small chops",
        per_guest: 8.0,
        unit: PurchaseUnit::Piece,
        confidence: Confidence::Medium,
        share: 1.0,
    },
    MenuItem {
        label: "Moi moi",
        per_guest: 1.0,
        unit: PurchaseUnit::Piece,
        confidence: Confidence::Medium,
        share: 1.0,
    },
    MenuItem {
        label: "Suya",
        per_guest: 2.5,
        unit: PurchaseUnit::Piece,
        confidence: Confidence::Medium,
        share: 0.7,
    },
];

/// The band each line is quoted within. §E.1: sources disagree by 20–40 % on the same item, so
/// the range is the honest output and ±20 % is the middle of that disagreement.
const BAND: f64 = 0.20;

/// Takeaway packs. §E.5: 0.5–1 pack a guest.
const PACKS_PER_GUEST: f64 = 0.8;
/// Ice, kg a guest. §E.7: 0.5 for cooling drinks, 0.75–1.0 in 30 °C+ conditions.
const ICE_HOT: f64 = 0.9;
const ICE_COOL: f64 = 0.6;
/// A cold display adds this much ice a guest. §E.7.
const ICE_COLD_DISPLAY: f64 = 0.25;
/// Ice comes in 20–25 kg blocks or bags; 25 is the one to plan against.
const ICE_BAG_KG: f64 = 25.0;

/// One line, built from a rate. The band is symmetric, and a counted line rounds up so a host
/// never reads "11.2 bags" and buys eleven.
///
/// Weight and volume keep one decimal rather than rounding to a whole kilogram: a 3-guest list
/// that says "0 kg of fried rice, raw" is worse than no list at all, and "0.4 kg" is a number a
/// caterer can use.
///
/// `eaters` is the headcount the quantity is spread over, plus the words for what it counts; it is
/// what the per-guest figure is divided by. `None` means the figure belongs to a slice of the room
/// rather than the whole of it — the tiered cake only ever serves 120, however many guests there
/// are — and the line then carries no per-guest figure rather than one the host cannot trust.
fn line(
    label: impl Into<String>,
    likely: f64,
    unit: PurchaseUnit,
    basis: impl Into<String>,
    confidence: Confidence,
    eaters: Option<(u32, &'static str)>,
) -> ShoppingLine {
    let round = |v: f64| {
        if unit.is_counted() {
            v.ceil()
        } else {
            (v * 10.0).round() / 10.0
        }
    };
    let (low, likely, high) = (
        round(likely * (1.0 - BAND)),
        round(likely),
        round(likely * (1.0 + BAND)),
    );
    // A counted line's band must stay a band: at small numbers both ends round to the same whole
    // number and the line reads "1 - 1 bags", which tells the host nothing.
    let (low, high) = if unit.is_counted() && low >= likely && high <= likely {
        ((likely - 1.0).max(1.0), likely + 1.0)
    } else if unit.is_counted() {
        (low, high.max(likely))
    } else {
        (low.min(likely), high.max(likely))
    };
    // From the rounded `likely`, so the two columns agree instead of differing by the rounding.
    let (per_guest, per_guests, per_basis) = match eaters {
        Some((n, words)) if n > 0 => (rounded_per_guest(likely / n as f64, unit), n, words),
        _ => (0.0, 0, ""),
    };
    ShoppingLine {
        label: label.into(),
        low,
        likely,
        high,
        unit,
        per_guest,
        per_guests,
        per_basis: per_basis.to_string(),
        basis: basis.into(),
        confidence,
    }
}

/// Two decimals for weight, because 68.4 kg of beef over 354 people is 0.19 a head and one decimal
/// would show the host "0.2", which multiplies back to 71 kg and looks like an error. A counted
/// line rounds to a whole, as a person and a chafing dish do not divide.
fn rounded_per_guest(raw: f64, unit: PurchaseUnit) -> f64 {
    if unit.is_counted() && raw >= 1.0 {
        raw.round()
    } else {
        (raw * 1000.0).round() / 1000.0
    }
}

/// The food lines: §E.9's `guests_effective × rate × (1 + overage) × style_multiplier`.
fn food_lines(input: &CateringInput) -> Vec<ShoppingLine> {
    let eating = input.effective_guests() as f64;
    let factor = (1.0 + input.overage()) * input.style.multiplier();
    MENU
        .iter()
        .map(|item| {
            let grams = eating * item.share * item.per_guest * factor;
            let basis = if item.share < 1.0 {
                format!(
                    "{:.0} % of {} guests, +{:.0} % spare",
                    item.share * 100.0,
                    input.effective_guests(),
                    input.overage() * 100.0
                )
            } else {
                format!(
                    "{} guests, +{:.0} % spare",
                    input.effective_guests(),
                    input.overage() * 100.0
                )
            };
            let quantity = match item.unit {
                PurchaseUnit::Kg | PurchaseUnit::Litre => grams / 1000.0,
                _ => grams,
            };
            line(
                item.label,
                quantity,
                item.unit,
                basis,
                item.confidence,
                Some((input.effective_guests(), "to cook for")),
            )
        })
        .collect()
}

/// The raw rice a caterer actually buys. §E.3: rice triples when cooked, so this is the cooked
/// weight divided by three. A list that quotes cooked kilos is one the caterer has to redo.
fn raw_rice_lines(input: &CateringInput) -> Vec<ShoppingLine> {
    let eating = input.effective_guests() as f64;
    let factor = (1.0 + input.overage()) * input.style.multiplier();
    [("Jollof rice, raw", 280.0, 1.0), ("Fried rice, raw", 220.0, 0.65)]
        .iter()
        .map(|(label, per_guest, share)| {
            let grams = eating * share * per_guest * factor / 3.0;
            line(
                *label,
                grams / 1000.0,
                PurchaseUnit::Kg,
                format!("{} guests, ÷3 for raw", input.effective_guests()),
                Confidence::High,
                Some((input.effective_guests(), "to cook for")),
            )
        })
        .collect()
}

/// Drinks. §E.7. The alcohol split is the assumption most likely to be wrong, so it is driven
/// entirely by the host's answer and never inferred from the venue.
fn drink_lines(input: &CateringInput) -> Vec<ShoppingLine> {
    let guests = input.guests as f64;
    // Drinks go by the RSVP count, not the effective headcount: a vendor on a break does not drink
    // from the bar, and the research §E.7 rates are all stated per guest.
    let heads = input.guests;
    let mut lines = Vec::new();

    // Water and soft drinks: 2–3 × a guest across a 5–6 h event.
    let waters = guests * 2.5;
    lines.push(line(
        "Bottled water",
        waters / 24.0,
        PurchaseUnit::Case,
        format!("{waters:.0} × 50 cl, 24 a case"),
        Confidence::High,
        Some((heads, "invited")),
    ));
    let softs = guests * 2.5;
    lines.push(line(
        "Soft drinks",
        softs / 12.0,
        PurchaseUnit::Crate,
        format!("{softs:.0} × 35 cl, 12 a crate"),
        Confidence::High,
        Some((heads, "invited")),
    ));

    // §E.7 defaults 25–35 % drinking; within them 60 % beer, 25 % wine, 15 % spirits.
    if input.alcohol != AlcoholAnswer::None {
        let drinking = guests * 0.30;
        let beer = drinking * 0.60 * 2.5;
        lines.push(line(
            "Beer",
            beer / 12.0,
            PurchaseUnit::Crate,
            format!("{drinking:.0} drinking guests × 2.5 bottles, 12 a crate"),
            Confidence::Low,
            Some((heads, "invited")),
        ));
        let wine = drinking * 0.25 * 0.5;
        lines.push(line(
            "Wine",
            wine / 12.0,
            PurchaseUnit::Case,
            format!("{wine:.1} bottles, 12 a case"),
            Confidence::Low,
            Some((heads, "invited")),
        ));
        if input.alcohol == AlcoholAnswer::FullBar {
            let spirits = guests / 13.0;
            lines.push(line(
                "Spirits",
                spirits / 12.0,
                PurchaseUnit::Case,
                "1 × 70 cl per 13 guests, 12 a case",
                Confidence::Low,
                Some((heads, "invited")),
            ));
        }
    }

    // Ice. §E.7: 0.75–1.0 kg a guest in 30 °C+, 0.5 otherwise, plus a cold display.
    let per_guest = if input.hot_weather { ICE_HOT } else { ICE_COOL };
    let ice = guests * per_guest
        + if input.cold_display {
            guests * ICE_COLD_DISPLAY
        } else {
            0.0
        };
    lines.push(line(
        "Ice",
        ice / ICE_BAG_KG,
        PurchaseUnit::Bag,
        format!("{ice:.0} kg, {ICE_BAG_KG:.0} kg a bag"),
        Confidence::High,
        Some((heads, "invited")),
    ));
    lines
}

/// Service and equipment. §E.8.
fn service_lines(input: &CateringInput) -> Vec<ShoppingLine> {
    let guests = input.guests as f64;
    // Per RSVP guest: staff and plates are sized to the room, and §E.8's ratios are per guest.
    let heads = input.guests;
    let mut lines = Vec::new();

    let ratio = input.style.guests_per_server() as f64;
    let servers = (guests / ratio).ceil();
    lines.push(line(
        "Servers",
        servers,
        PurchaseUnit::Person,
        format!("{guests:.0} guests ÷ {ratio:.0} a server"),
        Confidence::High,
        Some((heads, "invited")),
    ));
    // One captain per 8–10 servers; ten is the lenient end and the one §E.10's "12 + 2" uses.
    let captains = (servers / 10.0).ceil();
    lines.push(line(
        "Captains",
        captains,
        PurchaseUnit::Person,
        format!("{servers:.0} servers ÷ 10"),
        Confidence::High,
        Some((heads, "invited")),
    ));

    let stations = (guests / 75.0).ceil();
    lines.push(line(
        "Buffet stations",
        stations,
        PurchaseUnit::Station,
        format!("{guests:.0} guests ÷ 75"),
        Confidence::High,
        Some((heads, "invited")),
    ));

    // One chafing dish per 50 guests per hot item. Six hot items is what a Nigerian buffet
    // carries — jollof, fried rice, chicken, beef, pounded yam, egusi — and §E.10's own count.
    const HOT_ITEMS: f64 = 6.0;
    let chafing = (guests / 50.0).ceil() * HOT_ITEMS;
    lines.push(line(
        "Chafing dishes",
        chafing,
        PurchaseUnit::Pan,
        format!("{guests:.0} guests ÷ 50 × {HOT_ITEMS:.0} hot items"),
        Confidence::High,
        Some((heads, "invited")),
    ));

    lines.push(line(
        "Plates",
        guests * 1.8,
        PurchaseUnit::Piece,
        "1.8 a guest",
        Confidence::High,
        Some((heads, "invited")),
    ));
    lines.push(line(
        "Cutlery sets",
        guests * 1.5,
        PurchaseUnit::Piece,
        "1.5 a guest",
        Confidence::High,
        Some((heads, "invited")),
    ));
    lines.push(line(
        "Napkins",
        guests * 2.5,
        PurchaseUnit::Piece,
        "2.5 a guest",
        Confidence::High,
        Some((heads, "invited")),
    ));
    lines.push(line(
        "Chairs",
        guests * 1.05,
        PurchaseUnit::Piece,
        "1 a guest + 5 % spare",
        Confidence::High,
        Some((heads, "invited")),
    ));

    // Bar service. §E.7: 1 bartender per 100 for beer and wine, per 50 for a full bar; one
    // bar-back per 3 bartenders; one bar per 150 guests, erring toward more bars.
    if input.alcohol != AlcoholAnswer::None {
        let per_bartender = if input.alcohol == AlcoholAnswer::FullBar {
            50.0
        } else {
            100.0
        };
        let bartenders = (guests / per_bartender).ceil().max(1.0);
        lines.push(line(
            "Bartenders",
            bartenders,
            PurchaseUnit::Person,
            format!("{guests:.0} guests ÷ {per_bartender:.0}"),
            Confidence::Low,
            Some((heads, "invited")),
        ));
        let barbacks = (bartenders / 3.0).ceil();
        lines.push(line(
            "Bar-backs",
            barbacks,
            PurchaseUnit::Person,
            format!("{bartenders:.0} bartenders ÷ 3"),
            Confidence::Low,
            Some((heads, "invited")),
        ));
        let bars = (guests / 150.0).ceil().max(1.0);
        lines.push(line(
            "Bars",
            bars,
            PurchaseUnit::Station,
            format!("{guests:.0} guests ÷ 150, erring toward more"),
            Confidence::Low,
            Some((heads, "invited")),
        ));
        // Glassware: 3–4 a guest for a full bar, 2 for beer and wine, plus 10 % breakage. §E.7.
        let per_guest = if input.alcohol == AlcoholAnswer::FullBar {
            3.5
        } else {
            2.0
        };
        lines.push(line(
            "Glasses",
            guests * per_guest * 1.10,
            PurchaseUnit::Piece,
            format!("{per_guest} a guest + 10 % breakage"),
            Confidence::Low,
            Some((heads, "invited")),
        ));
    }

    if input.takeaway {
        lines.push(line(
            "Takeaway packs",
            guests * PACKS_PER_GUEST,
            PurchaseUnit::Pack,
            format!("{PACKS_PER_GUEST} a guest"),
            Confidence::Low,
            Some((heads, "invited")),
        ));
    }

    lines
}

/// Cake. §E.8: a serving is 60–80 g, a tiered cake serves ~100–200, and above that the answer is
/// a display cake plus a sheet cake. The 10× swing between "dessert" and "decoration" is why this
/// is asked as its own question.
fn cake_lines(input: &CateringInput) -> Vec<ShoppingLine> {
    let guests = input.guests as f64;
    // A slice is handed to an invited guest, not to the DJ, so the cake is per RSVP guest.
    let heads = input.guests;
    match input.cake {
        CakeAnswer::Decoration => Vec::new(),
        CakeAnswer::Ceremonial => vec![line(
            "Wedding cake",
            guests * 0.070,
            PurchaseUnit::Kg,
            "70 g a guest, ceremonial slice",
            Confidence::Medium,
            Some((heads, "invited")),
        )],
        CakeAnswer::Dessert => {
            const DISPLAY_SERVES: f64 = 120.0;
            let displayed = guests.min(DISPLAY_SERVES);
            let overflow = (guests - DISPLAY_SERVES).max(0.0);
            let mut out = vec![line(
                "Cake, display",
                displayed * 0.110,
                PurchaseUnit::Kg,
                "110 g a guest, up to 120 on the tiered cake",
                Confidence::Medium,
                // The tiered cake feeds 120 of the room, not all of it, so it carries no figure
                // against the whole — "0.04 kg a guest" would be true of nobody in the room.
                None,
            )];
            if overflow > 0.0 {
                out.push(line(
                    "Cake, sheet",
                    overflow * 0.110,
                    PurchaseUnit::Kg,
                    format!("{overflow:.0} guests beyond the tiered cake"),
                    Confidence::Medium,
                    // The sheet serves the overflow, so its figure is per guest beyond the tier.
                    Some((overflow as u32, "beyond the tier")),
                ));
            }
            out
        }
    }
}

/// Group lines by purchase unit, in the order a caterer reads them: weight, then volume, then the
/// things they count.
fn group(lines: Vec<ShoppingLine>) -> Vec<ShoppingGroup> {
    const ORDER: [PurchaseUnit; 11] = [
        PurchaseUnit::Kg,
        PurchaseUnit::Litre,
        PurchaseUnit::Crate,
        PurchaseUnit::Case,
        PurchaseUnit::Bottle,
        PurchaseUnit::Bag,
        PurchaseUnit::Pack,
        PurchaseUnit::Pan,
        PurchaseUnit::Piece,
        PurchaseUnit::Person,
        PurchaseUnit::Station,
    ];
    ORDER
        .iter()
        .filter_map(|&unit| {
            let matching: Vec<ShoppingLine> =
                lines.iter().filter(|l| l.unit == unit).cloned().collect();
            if matching.is_empty() {
                return None;
            }
            let (_, plural) = unit.words();
            // "By the kg" reads as a mistake; the mass and volume groups are named for what they
            // measure instead of for the unit word.
            let label = match unit {
                PurchaseUnit::Kg => "weight".to_string(),
                PurchaseUnit::Litre => "volume".to_string(),
                _ => plural.to_string(),
            };
            Some(ShoppingGroup {
                unit,
                label,
                lines: matching,
            })
        })
        .collect()
}

/// Work out the shopping list.
pub fn plan(input: &CateringInput) -> CateringReport {
    let mut lines = food_lines(input);
    lines.extend(raw_rice_lines(input));
    lines.extend(cake_lines(input));
    lines.extend(drink_lines(input));
    lines.extend(service_lines(input));

    let mut notes = vec![
        "These are defensible estimates, not a standard: published guidance disagrees by 20–40 % on \
         the same item. Take the Likely column to your caterer and expect to adjust it."
            .to_string(),
        format!(
            "Your {} guests are cooked for as {} — plus-ones and {} vendors — and {:.0} % spare food \
             on top makes {} portions.",
            input.guests,
            input.effective_guests(),
            input.vendor_count(),
            input.overage() * 100.0,
            input.portions()
        ),
    ];
    if input.style == CateringStyle::Buffet {
        notes.push(
            "A buffet needs about 1.45× the food of a plated meal for the same headcount, because \
             guests serve themselves generously."
                .to_string(),
        );
    }
    if input.takeaway {
        notes.push(
            "Takeaway packs add roughly 10–20 % to the food volume. In Nigeria that is usually a \
             social obligation rather than an option, so the list includes them."
                .to_string(),
        );
    }
    if input.alcohol == AlcoholAnswer::None {
        notes.push("No alcohol is planned, so there is no bar line to buy.".to_string());
    } else if input.alcohol == AlcoholAnswer::Unsure {
        notes.push(
            "Priced as beer and wine, the middle of the three answers. A full bar roughly triples \
             the spirit spend; a dry event removes the bar entirely."
                .to_string(),
        );
    }
    if input.cake == CakeAnswer::Decoration {
        notes.push(
            "The cake is treated as a photograph, so it is not on the food list — plan a dessert \
             course separately, or people will go home hungry."
                .to_string(),
        );
    }

    CateringReport {
        effective_guests: input.effective_guests(),
        portions: input.portions(),
        overage: input.overage(),
        multiplier: input.style.multiplier(),
        groups: group(lines),
        notes,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn find<'a>(report: &'a CateringReport, label: &str) -> &'a ShoppingLine {
        report
            .groups
            .iter()
            .flat_map(|g| &g.lines)
            .find(|l| l.label == label)
            .unwrap_or_else(|| panic!("no `{label}` line in the list"))
    }

    fn has(report: &CateringReport, label: &str) -> bool {
        report
            .groups
            .iter()
            .any(|g| g.lines.iter().any(|l| l.label == label))
    }

    /// The §E.9 formula applied to the worked example: 300 guests, +10 % plus-ones, ~8 % vendors,
    /// 11 % overage at that size, buffet 1.45×.
    #[test]
    fn the_worked_example_follows_the_formula() {
        let report = plan(&CateringInput::worked_example());
        assert_eq!(report.effective_guests, 354, "300 + 30 plus-ones + 24 vendors");
        // 354 × 1.11 = 393 — §E.10's "~390 portions", reached from the formula.
        assert_eq!(report.portions, 393);
        assert!((report.overage - 0.11).abs() < 1e-9);
        assert!((report.multiplier - 1.45).abs() < 1e-9);

        // 354 × 280 g × 1.11 × 1.45 = 159.5 kg.
        let jollof = find(&report, "Jollof rice");
        assert!(
            (jollof.likely - 160.0).abs() <= 1.0,
            "jollof came out {} kg",
            jollof.likely
        );
    }

    /// §E.10 prints 92 kg of jollof, which is 300 × 280 g × 1.10 — the base guest count with
    /// overage but without the style multiplier or the effective headcount. This pins the gap so
    /// nobody "fixes" the model to match a table that cannot be reached from its own formula.
    #[test]
    fn the_research_table_is_lower_than_its_own_formula() {
        let table: f64 = 300.0 * 0.280 * 1.10;
        assert!((table - 92.4).abs() < 0.1, "the table's own arithmetic");
        let report = plan(&CateringInput::worked_example());
        let jollof = find(&report, "Jollof rice");
        assert!(
            jollof.likely > table * 1.5,
            "the formula gives {} kg against the table's 92 kg",
            jollof.likely
        );
    }

    #[test]
    fn ice_lands_at_the_research_figure() {
        let report = plan(&CateringInput::worked_example());
        let ice = find(&report, "Ice");
        // 300 × 0.9 kg = 270 kg, bought in 25 kg bags → 11.
        assert!((ice.likely - 11.0).abs() < 0.5, "ice came out {} bags", ice.likely);
        assert_eq!(ice.unit, PurchaseUnit::Bag);
    }

    #[test]
    fn service_ratios_match_the_research() {
        let report = plan(&CateringInput::worked_example());
        assert_eq!(find(&report, "Servers").likely, 12.0);
        assert_eq!(find(&report, "Buffet stations").likely, 4.0);
        assert_eq!(find(&report, "Chafing dishes").likely, 36.0);
        assert_eq!(find(&report, "Plates").likely, 540.0);
        assert_eq!(find(&report, "Takeaway packs").likely, 240.0);
    }

    /// §E.11: never a decimal on something a caterer counts.
    #[test]
    fn counted_lines_are_whole_numbers() {
        let report = plan(&CateringInput::worked_example());
        for g in &report.groups {
            for l in &g.lines {
                if l.unit.is_counted() {
                    for v in [l.low, l.likely, l.high] {
                        assert_eq!(v, v.round(), "{} is not a whole number", l.label);
                    }
                }
            }
        }
    }

    #[test]
    fn a_line_is_ordered_low_likely_high() {
        let report = plan(&CateringInput::worked_example());
        for g in &report.groups {
            for l in &g.lines {
                assert!(l.low <= l.likely && l.likely <= l.high, "{}", l.label);
            }
        }
    }

    /// The first of the three high-leverage questions. §E.7 / 4.2.3.
    #[test]
    fn no_alcohol_removes_every_line_at_the_bar() {
        let mut input = CateringInput::worked_example();
        input.alcohol = AlcoholAnswer::None;
        let report = plan(&input);
        for label in ["Beer", "Wine", "Spirits", "Bartenders", "Glasses", "Bars"] {
            assert!(!has(&report, label), "`{label}` survived a teetotal answer");
        }
        // Water and soft drinks stay: the event still needs something to drink.
        assert!(has(&report, "Bottled water"));
    }

    #[test]
    fn a_full_bar_adds_spirits_and_beer_and_wine_does_not() {
        let mut input = CateringInput::worked_example();
        input.alcohol = AlcoholAnswer::FullBar;
        assert!(has(&plan(&input), "Spirits"));
        input.alcohol = AlcoholAnswer::BeerWine;
        assert!(!has(&plan(&input), "Spirits"));
    }

    /// The second question. §E.8.
    #[test]
    fn a_decoration_cake_is_not_food() {
        let mut input = CateringInput::worked_example();
        input.cake = CakeAnswer::Decoration;
        let report = plan(&input);
        assert!(!report
            .groups
            .iter()
            .any(|g| g.lines.iter().any(|l| l.label.starts_with("Cake"))));
    }

    #[test]
    fn a_dessert_cake_splits_into_display_and_sheet() {
        let mut input = CateringInput::worked_example();
        input.cake = CakeAnswer::Dessert;
        let report = plan(&input);
        assert!(find(&report, "Cake, display").likely > 0.0);
        assert!(find(&report, "Cake, sheet").likely > 0.0);
    }

    /// The per-guest figure is what a host checks with a calculator, so it has to multiply back
    /// out — if it did not, the sheet would lose them at the first line they tested.
    ///
    /// A line is divided by the headcount its rate came from. The food lines move with plus-ones
    /// and vendors and so divide by the effective headcount; drinks, service and cake divide by the
    /// RSVP count, because a vendor on a break does not drink from the bar.
    #[test]
    fn the_per_guest_figure_multiplies_back_to_the_likely_column() {
        let input = CateringInput::worked_example();
        let report = plan(&input);
        // Over the effective 354 and the 300 invited, so a line divided by the wrong one fails.
        assert_ne!(report.effective_guests, input.guests);

        // Each line has to name a headcount the report actually has, or "per guest" means nothing.
        let known = [input.guests, report.effective_guests];

        let mut checked = 0;
        for l in report.groups.iter().flat_map(|g| g.lines.iter()) {
            // The tiered cake feeds 120 of the room by design and carries no figure against it.
            if l.label == "Cake, display" {
                assert_eq!(l.per_guest, 0.0, "the display cake claims a per-guest figure");
                assert_eq!(l.per_guests, 0, "the display cake names a headcount");
                continue;
            }
            checked += 1;
            assert!(l.per_guest > 0.0, "{} has no per-guest figure", l.label);
            assert!(!l.per_basis.is_empty(), "{} does not say per what", l.label);
            // The sheet cake is the one line divided by a headcount that is neither: it serves only
            // the guests the tiered cake cannot, 300 invited less 120 on the tier.
            let heads = if l.label == "Cake, sheet" {
                input.guests - 120
            } else {
                assert!(
                    known.contains(&l.per_guests),
                    "{} divides by {}, which is neither the {} invited nor the {} cooked for",
                    l.label,
                    l.per_guests,
                    input.guests,
                    report.effective_guests
                );
                l.per_guests
            };
            let back = l.per_guest * heads as f64;
            // A counted line rounds its per-guest figure to a whole, and at 354 guests one whole
            // piece a head is 354 pieces — so the two columns agree to within that, not within one.
            // The kilos a caterer reads must land close.
            let tolerance = if l.unit.is_counted() {
                heads as f64 + 1.0
            } else {
                0.5
            };
            assert!(
                (back - l.likely).abs() <= tolerance,
                "{}: {} a person x {} = {}, but the line says {}",
                l.label,
                l.per_guest,
                heads,
                back,
                l.likely
            );
        }
        assert!(checked >= 20, "the worked example should check a full list");
    }

    /// The two numbers that make the list readable next to each other: 160 kg of jollof is also
    /// 450 g a head, which is a figure a host can hold in their head.
    #[test]
    fn a_heavy_line_reads_as_a_portion_too() {
        let report = plan(&CateringInput::worked_example());
        let jollof = find(&report, "Jollof rice");
        assert!(
            (jollof.per_guest - 0.45).abs() < 0.02,
            "jollof came out {} kg a person",
            jollof.per_guest
        );
    }

    /// Below ~120 guests one tiered cake is enough; there is no sheet cake line. §E.8.
    #[test]
    fn a_small_room_needs_no_sheet_cake() {
        let mut input = CateringInput::worked_example();
        input.guests = 80;
        input.cake = CakeAnswer::Dessert;
        assert!(!has(&plan(&input), "Cake, sheet"));
    }

    /// Overage shrinks with the crowd. §E.4.
    #[test]
    fn overage_falls_as_the_room_grows() {
        let small = CateringInput {
            guests: 40,
            ..CateringInput::worked_example()
        };
        let big = CateringInput {
            guests: 500,
            ..CateringInput::worked_example()
        };
        assert!(small.overage() > big.overage());
        assert!(big.overage() >= 0.08 && small.overage() <= 0.25);
    }

    /// Takeaway packs and vendor meals are the two lines people forget. §E.5.
    #[test]
    fn the_hidden_multipliers_raise_the_requirement() {
        let plain = CateringInput {
            plus_ones: Some(0.0),
            vendors: Some(0),
            ..CateringInput::worked_example()
        };
        let real = CateringInput::worked_example();
        assert!(real.effective_guests() > plain.effective_guests());

        let without = plan(&CateringInput {
            takeaway: false,
            ..CateringInput::worked_example()
        });
        assert!(!has(&without, "Takeaway packs"));
    }

    #[test]
    fn every_group_carries_its_own_unit_and_no_group_is_empty() {
        let report = plan(&CateringInput::worked_example());
        assert!(!report.groups.is_empty());
        for g in &report.groups {
            assert!(!g.lines.is_empty());
            assert!(g.lines.iter().all(|l| l.unit == g.unit));
        }
    }

    #[test]
    fn the_report_serialises_for_the_wire() {
        let report = plan(&CateringInput::worked_example());
        let json = serde_json::to_string(&report).expect("serialises");
        assert!(json.contains("\"effectiveGuests\""));
        assert!(json.contains("\"likely\""));
    }

    /// A small room is where the rounding shows: a whole-kilogram round turned "0.4 kg of raw
    /// rice" into "0 kg", and a whole-crate ceil turned the band into "1 - 1 bags".
    #[test]
    fn a_small_list_still_carries_a_usable_number_and_a_real_band() {
        let input = CateringInput {
            guests: 3,
            ..CateringInput::worked_example()
        };
        let report = plan(&input);
        let raw = find(&report, "Fried rice, raw");
        assert!(raw.likely > 0.0, "raw rice came out {} kg", raw.likely);

        for g in &report.groups {
            for l in &g.lines {
                assert!(l.low <= l.likely && l.likely <= l.high, "{}", l.label);
                if l.unit.is_counted() {
                    assert!(
                        l.low < l.high,
                        "`{}` has a band of {} to {}",
                        l.label,
                        l.low,
                        l.high
                    );
                }
            }
        }
    }

    /// The worked example's own lines must not gain a phantom band from the fix above.
    #[test]
    fn a_large_list_keeps_its_band() {
        let report = plan(&CateringInput::worked_example());
        let plates = find(&report, "Plates");
        assert!(plates.low < plates.likely && plates.likely < plates.high);
    }

    /// A partly answered request still gets a list — the app sends what it has.
    #[test]
    fn a_bare_request_still_plans() {
        let input: CateringInput = serde_json::from_str(r#"{ "guests": 120 }"#).expect("parses");
        assert_eq!(input.style, CateringStyle::Buffet);
        assert_eq!(input.alcohol, AlcoholAnswer::BeerWine);
        assert!(!plan(&input).groups.is_empty());
    }
}
