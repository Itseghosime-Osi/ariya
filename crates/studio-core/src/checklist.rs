//! The checklist, generated from the plan rather than typed out by the couple.
//!
//! Research §F.5 asks for a short template — 25 to 40 rows — where most rows are generated and each
//! says why it exists. This module does two things:
//!
//! 1. **`template()`** lists the rows a plan earns right now: the baseline every event needs, plus
//!    the ones the hall, the season and the services add. Each row carries a stable `source_key`,
//!    the phase it belongs to, and a `derivation` sentence the UI shows verbatim.
//! 2. **`reconcile()`** compares that list with what is already in the database and says what to
//!    insert, what to re-date, and what no longer applies. It does not write anything: the caller
//!    applies the plan.
//!
//! Four rules that make regeneration safe, and that the database backs up (`public.tasks`):
//!
//! - **Idempotent.** A row is keyed by `source_key`. Running the generator twice inserts nothing
//!   the second time.
//! - **Never resurrect.** A task the host deleted is a tombstone (`deleted_at` is set), and a
//!   tombstoned key is never re-inserted. Deleting is a signal, not an error.
//! - **A ticked task keeps its state.** Regeneration moves a due date; it does not reopen a job
//!   the host has done.
//! - **A parent change invalidates its dependents.** If the guest count or the table count moves,
//!   the rows that quoted the old number are re-titled and re-derived in place (same key, same
//!   row), so the checklist never quietly says "confirm 30 linens" for a 24-table hall.
//!
//! The licensing rule in the research's template is deliberately absent: §0 of the build
//! checklist puts it out of scope.
//!
//! The engine is pure. The event date comes in as a string, and due dates are civil-date
//! arithmetic on it; nothing here reads the clock.

use serde::{Deserialize, Serialize};
#[cfg(feature = "ts")]
use ts_rs::TS;

use crate::civil::Date;
use crate::venue::{Environment, VenueType, ZoneKind};

/// The template's own version. Bump it when a row's meaning changes: a row written by an older
/// version keeps its text until the host edits it, rather than being rewritten under them.
///
/// Version history:
/// - 1 — first checklist, research §F.5 minus the licensing rule.
pub const TEMPLATE_VERSION: i32 = 1;

/// The seven phases, in order. Research §F.2.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub enum Phase {
    Foundations,
    Book,
    Build,
    Detail,
    Final,
    Day,
    After,
}

impl Phase {
    pub fn label(self) -> &'static str {
        match self {
            Phase::Foundations => "Foundations",
            Phase::Book => "Book the day",
            Phase::Build => "Build the room",
            Phase::Detail => "Detail",
            Phase::Final => "Final week",
            Phase::Day => "Day of",
            Phase::After => "After",
        }
    }

    /// Where a phase sits relative to the event, in the words the checklist header uses.
    pub fn window(self) -> &'static str {
        match self {
            Phase::Foundations => "T-12 to T-9 months",
            Phase::Book => "T-9 to T-6 months",
            Phase::Build => "T-6 to T-3 months",
            Phase::Detail => "T-3 months to T-2 weeks",
            Phase::Final => "T-7 to T-1 days",
            Phase::Day => "The day",
            Phase::After => "T+1 to T+30",
        }
    }

    pub const ALL: [Phase; 7] = [
        Phase::Foundations,
        Phase::Book,
        Phase::Build,
        Phase::Detail,
        Phase::Final,
        Phase::Day,
        Phase::After,
    ];
}

/// Everything the generator reads from the plan. Mirrors `RiskInput`: every other field defaults,
/// so a half-answered plan still gets the baseline rather than an error.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Debug, Serialize, Deserialize)]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub struct ChecklistInput {
    /// The event date, `yyyy-mm-dd` or an ISO timestamp. Absent means rows carry no due date.
    #[serde(default, rename = "eventDate")]
    pub event_date: Option<String>,
    #[serde(default)]
    pub guests: u32,
    pub venue: VenueType,
    pub environment: Environment,
    #[serde(default)]
    pub tables: u32,
    /// The kinds of zone drawn on the hall plan.
    #[serde(default, rename = "zoneKinds")]
    pub zone_kinds: Vec<ZoneKind>,
    /// The month of the event, 1–12, for the harmattan rows.
    #[serde(default)]
    pub month: Option<u32>,
    /// `mains`, `generator` or `solar`.
    #[serde(default)]
    pub power: Option<String>,
    #[serde(default, rename = "acUnits")]
    pub ac_units: bool,
    /// `plated`, `buffet` or `family-style`.
    #[serde(default)]
    pub service: Option<String>,
}

/// One row the template says this plan should have.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Debug, Serialize, Deserialize)]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub struct TemplateTask {
    /// Stable across regenerations and across template versions where the row survives. This is
    /// the `source_key` the database is unique on.
    #[serde(rename = "sourceKey")]
    pub source_key: String,
    pub phase: Phase,
    pub title: String,
    /// What to actually do, for the detail sheet.
    #[serde(default)]
    pub detail: Option<String>,
    /// Why this row exists, in the host's words: "because your hall has 30 tables".
    pub derivation: String,
    /// Days before the event. `None` for the day itself and for anything after it.
    #[serde(rename = "daysBefore")]
    pub days_before: Option<u32>,
    /// The risk rule this row answers, when it answers one. The checklist links to it.
    #[serde(default, rename = "riskId")]
    pub risk_id: Option<String>,
    /// The date it is due, resolved from the event date. `None` with no event date, and for the
    /// day itself and anything after it.
    #[serde(default, rename = "dueDate")]
    pub due_date: Option<String>,
    /// The day-of run sheet owns its own ordering, so a day row carries a time slot in words.
    #[serde(default)]
    pub when: Option<String>,
    pub sort: i32,
}

/// What the plan holds today, and what is due.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Debug, Serialize, Deserialize)]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub struct ChecklistPlan {
    /// The template version these rows were written by.
    #[serde(rename = "templateVersion")]
    pub template_version: i32,
    pub tasks: Vec<TemplateTask>,
    pub notes: Vec<String>,
    /// The first row worth doing now, when one can be named from the plan alone.
    #[serde(default, rename = "nextBest")]
    pub next_best: Option<String>,
}

/// The row of the checklist as the database holds it. Carries only what reconciliation reads.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Debug, Serialize, Deserialize)]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub struct ExistingTask {
    pub id: String,
    #[serde(rename = "sourceKey")]
    pub source_key: String,
    pub title: String,
    pub derivation: String,
    #[serde(rename = "dueDate")]
    pub due_date: Option<String>,
    pub status: String,
    #[serde(rename = "templateVersion", default)]
    pub template_version: Option<i32>,
    /// A soft-deleted row. Its key is spent: regeneration must not put the task back.
    #[serde(default, rename = "isDeleted")]
    pub is_deleted: bool,
}

/// What a caller should do to bring the table in line with the template.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub struct Reconciliation {
    #[serde(rename = "templateVersion")]
    pub template_version: i32,
    pub insert: Vec<TemplateTask>,
    /// Rows whose text or due date changed, with the task it should become.
    pub update: Vec<TaskChange>,
    /// Live rows the template no longer produces — the plan changed under them. Marked skipped,
    /// never deleted, so the host can see what happened and undo it.
    pub retire: Vec<String>,
    /// Keys the host deleted. Skipped by `insert`, and listed so the caller can log why.
    pub skipped: Vec<String>,
}

/// An update to one existing row.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Debug, Serialize, Deserialize)]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub struct TaskChange {
    pub id: String,
    #[serde(rename = "sourceKey")]
    pub source_key: String,
    pub title: String,
    pub derivation: String,
    #[serde(rename = "dueDate")]
    pub due_date: Option<String>,
}

// ============================================================================
// WHAT A PLAN EARNS
// ============================================================================

/// Every row this plan earns, in phase order. Research §F.5, minus the licensing rule.
pub fn template(input: &ChecklistInput) -> ChecklistPlan {
    let event = input.event_date.as_deref().and_then(Date::parse);
    let mut tasks: Vec<TemplateTask> = Vec::new();

    // The baseline: what any celebration needs, whatever its room.
    for spec in BASELINE {
        tasks.push(spec.to_task(event));
    }

    // The room.
    if input.tables > 0 {
        tasks.push(counted(
            event,
            "build.linens",
            Phase::Build,
            format!("Confirm {}", plural(input.tables, "table linen")),
            format!("Confirm {} table linens and the colour they will be", input.tables),
            because_tables(input.tables),
            Some(90),
            None,
        ));
        tasks.push(counted(
            event,
            "build.centrepieces",
            Phase::Build,
            format!("Book {} centrepieces", input.tables),
            format!(
                "One centrepiece per table, plus two spare for the high table. Order {} and keep the spares in a box.",
                input.tables
            ),
            because_tables(input.tables),
            Some(75),
            None,
        ));
    }

    if input.guests > 0 && input.tables > 0 {
        tasks.push(counted(
            event,
            "detail.seat-guests",
            Phase::Detail,
            format!(
                "Seat {} guests across {} tables",
                input.guests, input.tables
            ),
            format!(
                "The hall plan seats {} guests across {} tables. Check the party sizes and the family groupings before you lock it.",
                input.guests, input.tables
            ),
            format!(
                "because your hall has {} tables and {} guests",
                input.tables, input.guests
            ),
            Some(21),
            None,
        ));
    }

    if is_open_air(input.environment) {
        let why = match input.venue {
            VenueType::Marquee | VenueType::PoleTent | VenueType::StretchTent => {
                "because your venue is a tent".to_string()
            }
            VenueType::Garden | VenueType::Field | VenueType::Beach => {
                "because your venue is open-air".to_string()
            }
            _ => "because your venue is not fully indoors".to_string(),
        };
        tasks.push(counted(
            event,
            "build.rain-plan",
            Phase::Build,
            "Write the rain plan".to_string(),
            "Say where the ceremony moves to, who gives the instruction, and how long it takes. Give everyone a signal that means it is happening."
                .to_string(),
            why.clone(),
            Some(60),
            Some("weather.rain"),
        ));
        tasks.push(counted(
            event,
            "build.wind-plan",
            Phase::Build,
            "Write the wind plan".to_string(),
            "Agree the mph at which the side walls go up or the marquee is cleared, and who watches the forecast on the day."
                .to_string(),
            why.clone(),
            Some(60),
            Some("weather.rain"),
        ));
        tasks.push(counted(
            event,
            "build.side-walls",
            Phase::Build,
            "Confirm side walls and who raises them".to_string(),
            "A tent with no side walls loses the décor and the guests' warmth to one squall. Price them now, not on the day."
                .to_string(),
            why,
            Some(75),
            None,
        ));
    }

    if matches!(input.month, Some(11 | 12 | 1 | 2 | 3)) {
        tasks.push(counted(
            event,
            "final.harmattan",
            Phase::Final,
            "Read the harmattan forecast".to_string(),
            "Dust settles on linen and in eyes, and drops the evening temperature. Plan covers, lip balm for the bridal party, and a gentle rehydration station."
                .to_string(),
            "because your date falls in the harmattan".to_string(),
            Some(10),
            Some("weather.harmattan"),
        ));
    }

    if input.power.as_deref() == Some("generator") {
        tasks.push(counted(
            event,
            "build.generator-fuel",
            Phase::Build,
            "Book the fuel, not just the generator".to_string(),
            "Price the litres for the full run plus the load-in, and agree who delivers them. A generator with an empty tank is a generator."
                .to_string(),
            "because the plan runs on a generator".to_string(),
            Some(45),
            Some("venue.generator"),
        ));
        tasks.push(counted(
            event,
            "final.generator-service",
            Phase::Final,
            "Have the generator serviced and test-loaded".to_string(),
            "Oil, filters, and a run under the plan's real load. Do it a week out, so a fault still has time to be fixed."
                .to_string(),
            "because the plan runs on a generator".to_string(),
            Some(7),
            Some("venue.generator"),
        ));
        tasks.push(counted(
            event,
            "build.generator-backup",
            Phase::Build,
            "Name the backup".to_string(),
            "A second set, or a clear answer about which circuits go dark. Write the answer down."
                .to_string(),
            "because the plan runs on a generator".to_string(),
            Some(45),
            Some("venue.power-outage"),
        ));
    }

    if input.guests > 250 {
        tasks.push(counted(
            event,
            "final.first-aider",
            Phase::Final,
            "Book a first-aider for the full day".to_string(),
            "Above 250 guests the room needs someone whose only job is medical. Confirm they carry a kit and know where the nearest hospital is.".to_string(),
            format!("because {} guests is above 250", input.guests),
            Some(30),
            Some("people.medical"),
        ));
        tasks.push(counted(
            event,
            "final.security",
            Phase::Final,
            "Book extra security for the gates and the gifts".to_string(),
            "Match the number to the crowd and the car park, and agree radio channels with the venue."
                .to_string(),
            format!("because {} guests is above 250", input.guests),
            Some(30),
            Some("people.security"),
        ));
        tasks.push(counted(
            event,
            "build.toilets",
            Phase::Build,
            "Check the toilet ratio".to_string(),
            format!(
                "{} guests needs more toilets than the venue will admit to having. Count them on a site visit and hire the shortfall.",
                input.guests
            ),
            format!("because {} guests is above 250", input.guests),
            Some(45),
            Some("venue.toilets"),
        ));
    }

    if input.ac_units {
        tasks.push(counted(
            event,
            "build.ac-load",
            Phase::Build,
            "Work out the AC load".to_string(),
            "Add the units' running load to the catering and lighting, then check the generator still has headroom."
                .to_string(),
            "because the plan has AC units".to_string(),
            Some(60),
            Some("venue.power-outage"),
        ));
        tasks.push(counted(
            event,
            "build.ac-drainage",
            Phase::Build,
            "Agree where the AC water goes".to_string(),
            "Condensate drips into the room when nobody agrees a drain. Decide before the units arrive."
                .to_string(),
            "because the plan has AC units".to_string(),
            Some(45),
            None,
        ));
    }

    if input.service.as_deref() == Some("buffet") {
        tasks.push(counted(
            event,
            "build.buffet",
            Phase::Build,
            "Plan the buffet stations and the queue".to_string(),
            "One station per 60 guests, chafing dishes priced in, and enough aisle that the queue does not block the dance floor."
                .to_string(),
            "because you chose buffet service".to_string(),
            Some(60),
            None,
        ));
    }

    if input.zone_kinds.contains(&ZoneKind::Dance) {
        tasks.push(counted(
            event,
            "detail.floor-structure",
            Phase::Detail,
            "Check the dance floor goes on solid ground".to_string(),
            "A floor on soft ground or over a bund sinks by the second set. Ask the venue where the slab ends."
                .to_string(),
            "because your plan has a dance floor".to_string(),
            Some(30),
            Some("venue.floor-load"),
        ));
    }

    tasks.sort_by(|a, b| a.phase.cmp(&b.phase).then(a.sort.cmp(&b.sort)));

    let next_best = tasks
        .first()
        .map(|t| t.source_key.clone())
        .filter(|_| !tasks.is_empty());

    let mut notes = vec![
        "Every generated task says why it exists. If one is wrong, delete it: the checklist will not put it back.".to_string(),
        "A task's due date moves when the event date moves. A task you have ticked stays ticked.".to_string(),
    ];
    if event.is_none() {
        notes.push(
            "No event date is set, so no task has a due date yet. Add the date and every task gets one."
                .to_string(),
        );
    }
    if input.guests == 0 {
        notes.push(
            "No guest count yet, so the rows that depend on it (linens, centrepieces, seating, first-aider, security) are waiting. Add the count and they appear."
                .to_string(),
        );
    }

    ChecklistPlan {
        template_version: TEMPLATE_VERSION,
        tasks,
        notes,
        next_best,
    }
}

fn plural(count: u32, word: &str) -> String {
    if count == 1 {
        format!("1 {word}")
    } else {
        format!("{count} {word}s")
    }
}

fn because_tables(tables: u32) -> String {
    format!("because your hall has {} tables", tables)
}

fn is_open_air(environment: Environment) -> bool {
    matches!(environment, Environment::Covered | Environment::Outdoor)
}

/// A row generator: a fixed template entry with its text resolved.
struct Spec {
    key: &'static str,
    phase: Phase,
    title: &'static str,
    detail: &'static str,
    derivation: &'static str,
    days_before: Option<u32>,
    risk_id: Option<&'static str>,
    when: Option<&'static str>,
}

impl Spec {
    fn to_task(&self, event: Option<Date>) -> TemplateTask {
        counted(
            event,
            self.key,
            self.phase,
            self.title.to_string(),
            self.detail.to_string(),
            self.derivation.to_string(),
            self.days_before,
            self.risk_id,
        )
        .with_when(self.when)
    }
}

fn counted(
    event: Option<Date>,
    key: &str,
    phase: Phase,
    title: String,
    detail: String,
    derivation: String,
    days_before: Option<u32>,
    risk_id: Option<&str>,
) -> TemplateTask {
    let sort = SORT_ORDER
        .iter()
        .position(|k| *k == key)
        .map(|i| i as i32)
        .unwrap_or(1000);
    TemplateTask {
        source_key: key.to_string(),
        phase,
        title,
        detail: Some(detail),
        derivation,
        days_before,
        risk_id: risk_id.map(str::to_string),
        due_date: days_before.and_then(|d| event.map(|e| e.minus_days(d as i64).iso())),
        when: None,
        sort,
    }
}

impl TemplateTask {
    fn with_when(mut self, when: Option<&str>) -> Self {
        self.when = when.map(str::to_string);
        self
    }
}

/// The order rows appear within a phase. First mention wins; anything absent sorts last.
const SORT_ORDER: &[&str] = &[
    // foundations
    "foundations.set-date",
    "foundations.guest-count",
    "foundations.budget",
    "foundations.insurance",
    "foundations.venue-contract",
    "book.vendors",
    "book.deposits",
    "book.caterer-tasting",
    "book.photographer",
    "build.linens",
    "build.centrepieces",
    "build.rain-plan",
    "build.wind-plan",
    "build.side-walls",
    "build.generator-fuel",
    "build.generator-backup",
    "build.ac-load",
    "build.ac-drainage",
    "build.buffet",
    "build.toilets",
    "detail.guest-list",
    "detail.rsvp-close",
    "detail.seat-guests",
    "detail.floor-structure",
    "detail.accessibility",
    "detail.transport",
    "detail.run-sheet",
    "final.confirmations",
    "final.generator-service",
    "final.first-aider",
    "final.security",
    "final.weather",
    "final.harmattan",
    "final.printouts",
    "day.brief",
    "day.hard-stops",
    "after.returns",
    "after.thank-yous",
    "after.balance",
    "after.reviews",
];

/// What every celebration needs, whatever its room. Research §F.2's phases, in order.
const BASELINE: &[Spec] = &[
    Spec {
        key: "foundations.set-date",
        phase: Phase::Foundations,
        title: "Fix the date and the second date",
        detail: "Pick the main date, and a fallback in case the venue falls through. Write both down.",
        derivation: "every event needs a date",
        days_before: Some(300),
        risk_id: None,
        when: None,
    },
    Spec {
        key: "foundations.guest-count",
        phase: Phase::Foundations,
        title: "Agree the guest count",
        detail: "A working number, not a final one. Most of the hall's numbers follow from it.",
        derivation: "every event needs a head count",
        days_before: Some(280),
        risk_id: None,
        when: None,
    },
    Spec {
        key: "foundations.budget",
        phase: Phase::Foundations,
        title: "Lock the budget",
        detail: "One figure, and the ten per cent that stays in reserve.",
        derivation: "every event needs a budget",
        days_before: Some(270),
        risk_id: None,
        when: None,
    },
    Spec {
        key: "foundations.insurance",
        phase: Phase::Foundations,
        title: "Check the venue and event insurance",
        detail: "Who is covered for what, and what the venue requires from you in writing.",
        derivation: "every event carries venue liability",
        days_before: Some(240),
        risk_id: Some("compliance.insurance"),
        when: None,
    },
    Spec {
        key: "foundations.venue-contract",
        phase: Phase::Foundations,
        title: "Sign the venue contract",
        detail: "Confirm capacity, access times, power, toilets and what happens if it rains.",
        derivation: "every event needs a room",
        days_before: Some(240),
        risk_id: Some("venue.capacity"),
        when: None,
    },
    Spec {
        key: "book.vendors",
        phase: Phase::Book,
        title: "Book the core vendors",
        detail: "Caterer, photographer, DJ or band, and the décor house. In that order in December.",
        derivation: "every event needs its vendors",
        days_before: Some(180),
        risk_id: Some("money.cancellation"),
        when: None,
    },
    Spec {
        key: "book.deposits",
        phase: Phase::Book,
        title: "Pay the deposits, and get receipts",
        detail: "A deposit without a receipt is a gift. Keep them together in one place.",
        derivation: "every event pays deposits",
        days_before: Some(165),
        risk_id: Some("money.deposit"),
        when: None,
    },
    Spec {
        key: "book.caterer-tasting",
        phase: Phase::Book,
        title: "Do the tasting, and agree portions",
        detail: "Agree the portion size per guest, and whether the vendor plates or serves.",
        derivation: "every event is catered",
        days_before: Some(120),
        risk_id: Some("vendors.food-runs-out"),
        when: None,
    },
    Spec {
        key: "book.photographer",
        phase: Phase::Book,
        title: "Agree the photography brief",
        detail: "The list of must-have shots, and who from the family is in them.",
        derivation: "every event is photographed",
        days_before: Some(120),
        risk_id: None,
        when: None,
    },
    Spec {
        key: "detail.guest-list",
        phase: Phase::Detail,
        title: "Send the invitations",
        detail: "One list, one link, and a reply-by date the caterer can hold you to.",
        derivation: "every event has a guest list",
        days_before: Some(90),
        risk_id: None,
        when: None,
    },
    Spec {
        key: "detail.rsvp-close",
        phase: Phase::Detail,
        title: "Close the replies",
        detail: "Chase the undecided once, then count what you have.",
        derivation: "seating cannot start before replies close",
        days_before: Some(42),
        risk_id: Some("people.overflow"),
        when: None,
    },
    Spec {
        key: "detail.run-sheet",
        phase: Phase::Detail,
        title: "Write the run sheet",
        detail: "Times, who gives each signal, and the number for every vendor.",
        derivation: "every event needs a run sheet",
        days_before: Some(21),
        risk_id: Some("programme.overrun"),
        when: None,
    },
    Spec {
        key: "detail.accessibility",
        phase: Phase::Detail,
        title: "Walk the room for accessibility",
        detail: "Steps at the entrance, a toilet someone can reach, and a seat for an elder who cannot stand long.",
        derivation: "every event has guests who need it",
        days_before: Some(28),
        risk_id: Some("people.accessibility"),
        when: None,
    },
    Spec {
        key: "detail.transport",
        phase: Phase::Detail,
        title: "Plan the transport home",
        detail: "Who is driving, who is not, and how the last guests get home.",
        derivation: "every event ends at night",
        days_before: Some(21),
        risk_id: Some("vendors.transport"),
        when: None,
    },
    Spec {
        key: "final.confirmations",
        phase: Phase::Final,
        title: "Confirm every vendor, in writing",
        detail: "Time, address, load-in door, contact number. One message each.",
        derivation: "every event confirms its vendors",
        days_before: Some(7),
        risk_id: Some("people.late-vendors"),
        when: None,
    },
    Spec {
        key: "final.weather",
        phase: Phase::Final,
        title: "Read the five-day forecast",
        detail: "Rain, heat, wind. Decide now whether the plan changes.",
        derivation: "every event is outdoors somewhere",
        days_before: Some(5),
        risk_id: Some("weather.rain"),
        when: None,
    },
    Spec {
        key: "final.printouts",
        phase: Phase::Final,
        title: "Print the run sheet and the seating plan",
        detail: "Two copies: one for the venue, one for you. A phone dies on the day.",
        derivation: "the network may not reach the venue",
        days_before: Some(2),
        risk_id: Some("programme.overrun"),
        when: None,
    },
    Spec {
        key: "day.brief",
        phase: Phase::Day,
        title: "Brief the team",
        detail: "One page, one walk through the room, every name and number read out.",
        derivation: "the day starts with a briefing",
        days_before: None,
        risk_id: None,
        when: Some("Morning, before load-in"),
    },
    Spec {
        key: "day.hard-stops",
        phase: Phase::Day,
        title: "Hold the hard stops",
        detail: "The times that cannot move: caterer on site, guests in, cake, last set.",
        derivation: "the day has fixed times",
        days_before: None,
        risk_id: Some("programme.overrun"),
        when: Some("All day"),
    },
    Spec {
        key: "after.returns",
        phase: Phase::After,
        title: "Return the hired things",
        detail: "Whatever came from the venue or the décor house goes back, and the deposit comes with it.",
        derivation: "hired equipment comes back",
        days_before: None,
        risk_id: Some("money.deposit"),
        when: None,
    },
    Spec {
        key: "after.thank-yous",
        phase: Phase::After,
        title: "Send the thank-you notes",
        detail: "To the vendors, and to the family who carried the day.",
        derivation: "the people who helped deserve a note",
        days_before: None,
        risk_id: None,
        when: None,
    },
    Spec {
        key: "after.balance",
        phase: Phase::After,
        title: "Clear the balances",
        detail: "Every final invoice, paid and filed where you can find it.",
        derivation: "final invoices land after the day",
        days_before: None,
        risk_id: Some("money.hidden-fees"),
        when: None,
    },
    Spec {
        key: "after.reviews",
        phase: Phase::After,
        title: "Review the vendors you would book again",
        detail: "A line each. It helps the next couple, and it helps you remember.",
        derivation: "vendor trust is built by reviews",
        days_before: None,
        risk_id: None,
        when: None,
    },
];

// ============================================================================
// RECONCILIATION
// ============================================================================

/// Compare the template with what the table already holds, and say what to do about it.
///
/// This is the whole of regeneration's safety: it never resurrects a tombstone, never reopens a
/// ticked row, and never leaves a stale number in a title. See the module docs.
pub fn reconcile(plan: &ChecklistPlan, existing: &[ExistingTask]) -> Reconciliation {
    let mut out = Reconciliation {
        template_version: plan.template_version,
        ..Reconciliation::default()
    };

    for task in &plan.tasks {
        match existing.iter().find(|e| e.source_key == task.source_key) {
            // The host deleted it. Deleting is a signal: leave it deleted, and say so.
            Some(e) if e.is_deleted => out.skipped.push(task.source_key.clone()),
            Some(e) => {
                let due_moved = e.due_date != task.due_date;
                let text_changed = e.title != task.title || e.derivation != task.derivation;
                // A ticked row keeps its wording: rewriting a job the host has already done is
                // confusing, and a row written by an older template keeps its words until the
                // plan's numbers actually move under it.
                let finished = e.status == "done" || e.status == "skipped";

                if due_moved || (text_changed && !finished) {
                    out.update.push(TaskChange {
                        id: e.id.clone(),
                        source_key: task.source_key.clone(),
                        title: task.title.clone(),
                        derivation: task.derivation.clone(),
                        due_date: task.due_date.clone(),
                    });
                }
            }
            None => out.insert.push(task.clone()),
        }
    }

    // Live rows whose key the template no longer produces: the plan changed (guests dropped below
    // a threshold, the venue went indoors). Retire them visibly rather than deleting them.
    let keys: Vec<&str> = plan.tasks.iter().map(|t| t.source_key.as_str()).collect();
    for e in existing {
        if !e.is_deleted && e.status != "done" && e.status != "skipped" && !keys.contains(&e.source_key.as_str()) {
            out.retire.push(e.id.clone());
        }
    }

    out
}

#[cfg(test)]
mod tests {
    use super::*;

    fn wedding() -> ChecklistInput {
        ChecklistInput {
            event_date: Some("2026-12-12".to_string()),
            guests: 300,
            venue: VenueType::Hall,
            environment: Environment::Indoor,
            tables: 30,
            zone_kinds: vec![ZoneKind::Dance, ZoneKind::Buffet],
            month: Some(12),
            power: Some("generator".to_string()),
            ac_units: false,
            service: Some("buffet".to_string()),
        }
    }

    fn keyed<'a>(plan: &'a ChecklistPlan, key: &str) -> &'a TemplateTask {
        plan.tasks
            .iter()
            .find(|t| t.source_key == key)
            .unwrap_or_else(|| panic!("no task `{key}` in the plan"))
    }

    fn has(plan: &ChecklistPlan, key: &str) -> bool {
        plan.tasks.iter().any(|t| t.source_key == key)
    }

    #[test]
    fn a_plain_event_still_gets_its_baseline() {
        let mut input = wedding();
        input.guests = 0;
        input.tables = 0;
        input.zone_kinds.clear();
        input.power = None;
        input.service = None;
        let plan = template(&input);
        assert!(has(&plan, "foundations.set-date"));
        assert!(has(&plan, "detail.run-sheet"));
        assert!(has(&plan, "after.thank-yous"));
        assert!(!has(&plan, "build.linens"), "no tables, no linens");
    }

    #[test]
    fn the_template_stays_short() {
        let plan = template(&wedding());
        assert!(
            (25..=40).contains(&plan.tasks.len()),
            "the research asks for 25–40 rows, this plan has {}",
            plan.tasks.len()
        );
    }

    #[test]
    fn every_row_says_why_it_exists() {
        let plan = template(&wedding());
        for task in &plan.tasks {
            assert!(
                !task.derivation.trim().is_empty(),
                "`{}` has no derivation",
                task.source_key
            );
        }
    }

    #[test]
    fn keys_are_unique() {
        let plan = template(&wedding());
        let mut keys: Vec<&str> = plan.tasks.iter().map(|t| t.source_key.as_str()).collect();
        keys.sort_unstable();
        let before = keys.len();
        keys.dedup();
        assert_eq!(before, keys.len(), "a duplicate key would be inserted twice");
    }

    #[test]
    fn the_table_count_reaches_the_text() {
        let plan = template(&wedding());
        assert_eq!(keyed(&plan, "build.linens").title, "Confirm 30 table linens");
        assert_eq!(
            keyed(&plan, "build.linens").derivation,
            "because your hall has 30 tables"
        );
    }

    #[test]
    fn one_table_is_written_as_one() {
        let mut input = wedding();
        input.tables = 1;
        let plan = template(&input);
        assert_eq!(keyed(&plan, "build.linens").title, "Confirm 1 table linen");
    }

    #[test]
    fn due_dates_count_back_from_the_event() {
        let plan = template(&wedding());
        assert_eq!(
            keyed(&plan, "build.linens").due_date.as_deref(),
            Some("2026-09-13")
        );
        assert_eq!(
            keyed(&plan, "final.confirmations").due_date.as_deref(),
            Some("2026-12-05")
        );
    }

    #[test]
    fn a_plan_with_no_date_has_no_due_dates() {
        let mut input = wedding();
        input.event_date = None;
        let plan = template(&input);
        assert!(plan.tasks.iter().all(|t| t.due_date.is_none()));
        assert!(plan.notes.iter().any(|n| n.contains("No event date")));
    }

    #[test]
    fn open_air_brings_weather_rows() {
        let mut input = wedding();
        input.venue = VenueType::Marquee;
        input.environment = Environment::Covered;
        let plan = template(&input);
        assert!(has(&plan, "build.rain-plan"));
        assert!(has(&plan, "build.wind-plan"));
        assert_eq!(
            keyed(&plan, "build.rain-plan").derivation,
            "because your venue is a tent"
        );
    }

    #[test]
    fn an_indoor_hall_does_not_get_a_rain_plan() {
        let plan = template(&wedding());
        assert!(!has(&plan, "build.rain-plan"));
    }

    #[test]
    fn a_harmattan_date_brings_the_dust_row() {
        let plan = template(&wedding());
        assert!(has(&plan, "final.harmattan"));
        let mut input = wedding();
        input.month = Some(6);
        assert!(!has(&template(&input), "final.harmattan"));
    }

    #[test]
    fn a_generator_brings_fuel_and_service() {
        let plan = template(&wedding());
        assert!(has(&plan, "build.generator-fuel"));
        assert!(has(&plan, "final.generator-service"));
        let mut input = wedding();
        input.power = Some("mains".to_string());
        assert!(!has(&template(&input), "build.generator-fuel"));
    }

    #[test]
    fn a_big_crowd_brings_first_aid_and_security() {
        let plan = template(&wedding());
        assert!(has(&plan, "final.first-aider"));
        assert!(has(&plan, "final.security"));
        let mut input = wedding();
        input.guests = 250;
        assert!(
            !has(&template(&input), "final.first-aider"),
            "250 is not above 250"
        );
    }

    #[test]
    fn a_buffet_brings_its_stations() {
        assert!(has(&template(&wedding()), "build.buffet"));
        let mut input = wedding();
        input.service = Some("plated".to_string());
        assert!(!has(&template(&input), "build.buffet"));
    }

    #[test]
    fn every_generated_row_points_at_a_risk_the_register_knows() {
        let known = crate::risk::known_ids();
        // A wide plan, so every conditional row is present and gets checked.
        let mut input = wedding();
        input.venue = VenueType::Marquee;
        input.environment = Environment::Covered;
        input.ac_units = true;
        for task in &template(&input).tasks {
            if let Some(id) = &task.risk_id {
                assert!(
                    known.contains(&id.as_str()),
                    "`{}` points at risk `{id}`, which the register does not have",
                    task.source_key
                );
            }
        }
    }

    // ---- reconciliation ----

    fn held(task: &TemplateTask, status: &str) -> ExistingTask {
        ExistingTask {
            id: format!("id-{}", task.source_key),
            source_key: task.source_key.clone(),
            title: task.title.clone(),
            derivation: task.derivation.clone(),
            due_date: task.due_date.clone(),
            status: status.to_string(),
            template_version: Some(TEMPLATE_VERSION),
            is_deleted: false,
        }
    }

    #[test]
    fn a_first_run_inserts_everything_and_skips_nothing() {
        let plan = template(&wedding());
        let out = reconcile(&plan, &[]);
        assert_eq!(out.insert.len(), plan.tasks.len());
        assert!(out.update.is_empty());
        assert!(out.retire.is_empty());
    }

    #[test]
    fn a_second_run_inserts_nothing() {
        let plan = template(&wedding());
        let held: Vec<ExistingTask> = plan
            .tasks
            .iter()
            .map(|t| held(t, "todo"))
            .collect();
        let out = reconcile(&plan, &held);
        assert!(out.insert.is_empty(), "regeneration is idempotent");
        assert!(out.update.is_empty());
        assert!(out.retire.is_empty());
    }

    #[test]
    fn a_deleted_row_is_never_resurrected() {
        let plan = template(&wedding());
        let mut held: Vec<ExistingTask> = plan
            .tasks
            .iter()
            .map(|t| held(t, "todo"))
            .collect();
        let linen = held.iter_mut().find(|e| e.source_key == "build.linens").unwrap();
        linen.is_deleted = true;
        held.retain(|e| e.source_key != "build.linens" || e.is_deleted);

        let out = reconcile(&plan, &held);
        assert!(!out.insert.iter().any(|t| t.source_key == "build.linens"));
        assert!(out.skipped.contains(&"build.linens".to_string()));
    }

    #[test]
    fn a_moved_event_date_moves_the_due_dates() {
        let mut held_input = wedding();
        held_input.event_date = Some("2026-12-12".to_string());
        let old = template(&held_input);
        let held: Vec<ExistingTask> = old
            .tasks
            .iter()
            .map(|t| held(t, "todo"))
            .collect();

        let mut moved = wedding();
        moved.event_date = Some("2027-01-09".to_string());
        let out = reconcile(&template(&moved), &held);
        assert!(out.insert.is_empty());
        assert!(out.update.iter().any(|c| c.source_key == "build.linens"
            && c.due_date.as_deref() == Some("2026-10-11")));
    }

    #[test]
    fn a_table_change_rewrites_the_title_that_quoted_it() {
        let held: Vec<ExistingTask> = template(&wedding())
            .tasks
            .iter()
            .map(|t| held(t, "todo"))
            .collect();

        let mut smaller = wedding();
        smaller.tables = 24;
        let out = reconcile(&template(&smaller), &held);
        let change = out
            .update
            .iter()
            .find(|c| c.source_key == "build.linens")
            .expect("linens should be rewritten");
        assert_eq!(change.title, "Confirm 24 table linens");
        assert_eq!(change.derivation, "because your hall has 24 tables");
    }

    #[test]
    fn a_row_the_plan_no_longer_earns_is_retired_not_deleted() {
        let held: Vec<ExistingTask> = template(&wedding())
            .tasks
            .iter()
            .map(|t| held(t, "todo"))
            .collect();

        let mut plated = wedding();
        plated.service = Some("plated".to_string());
        let out = reconcile(&template(&plated), &held);
        assert!(
            out.retire.contains(&"id-build.buffet".to_string()),
            "the buffet stations the plan no longer earns should be retired"
        );
        assert!(
            !out.retire.contains(&"id-foundations.set-date".to_string()),
            "a row still in the template is not retired"
        );
    }

    #[test]
    fn a_ticked_row_keeps_its_wording_and_its_date() {
        let held: Vec<ExistingTask> = template(&wedding())
            .tasks
            .iter()
            .map(|t| held(t, "done"))
            .collect();

        let mut smaller = wedding();
        smaller.tables = 24;
        let out = reconcile(&template(&smaller), &held);
        assert!(
            !out.update.iter().any(|c| c.source_key == "build.linens"),
            "a job already done is not reopened or rewritten"
        );
    }
}
