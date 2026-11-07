//! The design document, in the exact JSON the app saves.
//!
//! Field names are camelCase on the wire. Optional fields are left out when empty, so a design
//! saved before the designer existed loads and saves back unchanged.

use serde::{Deserialize, Serialize};
#[cfg(feature = "ts")]
use ts_rs::TS;

#[cfg_attr(feature = "ts", derive(TS))]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/design/src/generated/")
)]
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum LayerKind {
    Seal,
    Kicker,
    Names,
    Message,
    Divider,
    Date,
    Venue,
    DressCode,
    Footer,
    Text,
    /// Carries a guest's entry code as a pattern in the design.
    Code,
    Shape,
    Image,
}

#[cfg_attr(feature = "ts", derive(TS))]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/design/src/generated/")
)]
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Align {
    Left,
    Center,
    Right,
}

#[cfg_attr(feature = "ts", derive(TS))]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/design/src/generated/")
)]
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Font {
    Display,
    Sans,
}

#[cfg_attr(feature = "ts", derive(TS))]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/design/src/generated/")
)]
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ColorRole {
    Ink,
    Title,
    Body,
    Accent,
    Foil,
    Custom,
}

#[cfg_attr(feature = "ts", derive(TS))]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/design/src/generated/")
)]
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Shape {
    Rect,
    Ellipse,
    Line,
}

#[cfg_attr(feature = "ts", derive(TS))]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/design/src/generated/")
)]
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Fit {
    Cover,
    Contain,
}

#[cfg_attr(feature = "ts", derive(TS))]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/design/src/generated/")
)]
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum BackgroundKind {
    Paper,
    Velvet,
    Image,
    Color,
}

#[cfg_attr(feature = "ts", derive(TS))]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/design/src/generated/")
)]
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Palette {
    pub paper: String,
    pub paper_edge: String,
    pub ink: String,
    pub title: String,
    pub body: String,
    pub accent: String,
    pub foil: String,
    pub ribbon_a: String,
    pub ribbon_b: String,
    pub stage_from: String,
    pub stage_to: String,
}

#[cfg_attr(feature = "ts", derive(TS))]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/design/src/generated/")
)]
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Background {
    pub kind: BackgroundKind,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub color: Option<String>,
    /// Always written, as `null` when there is no picture.
    #[serde(default)]
    pub image_url: Option<String>,
    pub overlay: f64,
}

#[cfg_attr(feature = "ts", derive(TS))]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/design/src/generated/")
)]
#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Canvas {
    /// Width divided by height.
    pub ratio: f64,
}

#[cfg_attr(feature = "ts", derive(TS))]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/design/src/generated/")
)]
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Layer {
    pub id: String,
    pub kind: LayerKind,
    pub text: String,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub align: Align,
    pub font: Font,
    pub size: f64,
    pub weight: u16,
    pub italic: bool,
    pub tracking: f64,
    pub color_role: ColorRole,
    /// Always written, as `null` when the colour comes from the palette.
    #[serde(default)]
    pub color: Option<String>,
    pub visible: bool,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub height: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub rotation: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub opacity: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fill: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub stroke: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub stroke_width: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub radius: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub shape: Option<Shape>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub image_url: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fit: Option<Fit>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub locked: Option<bool>,
}

#[cfg_attr(feature = "ts", derive(TS))]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/design/src/generated/")
)]
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Design {
    pub version: u8,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub canvas: Option<Canvas>,
    /// False hides the house ribbon, border and sheen.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub chrome: Option<bool>,
    pub theme: String,
    pub palette: Palette,
    pub background: Background,
    pub layers: Vec<Layer>,
}

/// The house card is a portrait 5:7, like printed stationery.
pub const HOUSE_RATIO: f64 = 5.0 / 7.0;

impl Design {
    /// Width divided by height.
    pub fn ratio(&self) -> f64 {
        self.canvas.map_or(HOUSE_RATIO, |c| c.ratio)
    }
}

impl Layer {
    /// A plain layer of one kind, with the house defaults. Callers set what differs.
    pub fn blank(id: impl Into<String>, kind: LayerKind) -> Self {
        Layer {
            id: id.into(),
            kind,
            text: String::new(),
            x: 30.0,
            y: 30.0,
            width: 40.0,
            align: Align::Center,
            font: Font::Sans,
            size: 4.0,
            weight: 400,
            italic: false,
            tracking: 0.0,
            color_role: ColorRole::Ink,
            color: None,
            visible: true,
            name: None,
            height: None,
            rotation: None,
            opacity: None,
            fill: None,
            stroke: None,
            stroke_width: None,
            radius: None,
            shape: None,
            image_url: None,
            fit: None,
            locked: None,
        }
    }
}
