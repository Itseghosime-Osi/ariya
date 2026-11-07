//! Every edit the designer offers, as a pure function from one design to the next.
//!
//! Percentages are shares of the card: x and width of its width, y and height of its height.
//! Later layers draw on top.

use crate::model::{ColorRole, Design, Fit, Font, Layer, LayerKind, Shape};
use crate::validate::{MAX_LAYERS, MIN_WIDTH};

/// The smallest height a drag can shrink a box to.
const MIN_HEIGHT_DRAG: f64 = 1.0;
/// The most a card may hold; the same limit the validator enforces.
const LIMIT: usize = MAX_LAYERS;

/// The name an imported card layer carries, so it can be found, replaced and taken off again.
pub const CARD_NAME: &str = "Your card";

const FOIL: &str = "#b8864b";

/// `min(hi, max(lo, v))`: unlike `f64::clamp`, never panics when the bounds cross.
fn clamp(v: f64, lo: f64, hi: f64) -> f64 {
    v.max(lo).min(hi)
}

/// JavaScript's `Math.round`, which rounds halves up. The designer's TypeScript fallback uses it,
/// and the two must agree to the last digit.
fn round_js(v: f64) -> f64 {
    (v + 0.5).floor()
}

fn text_layer_template(id: String, kind: LayerKind) -> Layer {
    Layer {
        text: "Your words".into(),
        x: 20.0,
        y: 40.0,
        width: 60.0,
        font: Font::Display,
        size: 5.0,
        weight: 600,
        ..Layer::blank(id, kind)
    }
}

/// A new text, wax seal, rule or entry seal, placed where the house card has it.
pub fn create_layer(kind: LayerKind, id: String) -> Layer {
    let base = text_layer_template(id, kind);
    match kind {
        LayerKind::Code => Layer {
            text: String::new(),
            x: 5.0,
            y: 81.0,
            width: 19.0,
            size: 3.0,
            color_role: ColorRole::Title,
            ..base
        },
        LayerKind::Seal => Layer {
            text: String::new(),
            x: 42.0,
            y: 36.0,
            width: 16.0,
            size: 8.0,
            color_role: ColorRole::Custom,
            ..base
        },
        LayerKind::Divider => Layer {
            text: String::new(),
            x: 20.0,
            y: 50.0,
            width: 60.0,
            size: 3.0,
            weight: 400,
            color_role: ColorRole::Foil,
            ..base
        },
        _ => base,
    }
}

fn plain(id: String, kind: LayerKind) -> Layer {
    Layer {
        text: String::new(),
        x: 30.0,
        y: 30.0,
        width: 40.0,
        font: Font::Sans,
        size: 4.0,
        weight: 400,
        ..Layer::blank(id, kind)
    }
}

pub fn create_shape(shape: Shape, id: String, ratio: f64) -> Layer {
    let base = plain(id, LayerKind::Shape);
    if shape == Shape::Line {
        return Layer {
            shape: Some(shape),
            x: 20.0,
            y: 50.0,
            width: 60.0,
            height: Some(0.4),
            stroke: Some(FOIL.into()),
            stroke_width: Some(0.4),
            color_role: ColorRole::Custom,
            ..base
        };
    }
    let width = 34.0;
    let height = clamp(width * ratio, 5.0, 80.0);
    Layer {
        shape: Some(shape),
        x: 33.0,
        y: clamp(50.0 - height / 2.0, 0.0, 100.0 - height),
        width,
        height: Some(height),
        fill: Some(FOIL.into()),
        stroke_width: Some(0.4),
        radius: Some(if shape == Shape::Rect { 1.5 } else { 0.0 }),
        color_role: ColorRole::Custom,
        ..base
    }
}

/// A picture on the card. `full_bleed` makes it the whole card (an imported card); otherwise it is
/// a half-width picture in the middle, as tall as its own shape needs.
pub fn create_image(
    url: String,
    id: String,
    card_ratio: f64,
    image_ratio: f64,
    full_bleed: bool,
    name: Option<String>,
) -> Layer {
    let base = plain(id, LayerKind::Image);
    if full_bleed {
        return Layer {
            name: Some(name.unwrap_or_else(|| CARD_NAME.into())),
            x: 0.0,
            y: 0.0,
            width: 100.0,
            height: Some(100.0),
            image_url: Some(url),
            fit: Some(Fit::Cover),
            radius: Some(0.0),
            ..base
        };
    }
    let width = 50.0;
    let image_ratio = if image_ratio > 0.0 { image_ratio } else { 1.0 };
    let height = clamp(width * card_ratio / image_ratio, 5.0, 90.0);
    Layer {
        name,
        x: 25.0,
        y: clamp(50.0 - height / 2.0, 0.0, 100.0 - height),
        width,
        height: Some(height),
        image_url: Some(url),
        fit: Some(Fit::Cover),
        radius: Some(0.0),
        ..base
    }
}

/// Puts a layer on top. Refused (`None`) when the card is full.
pub fn add_layer(design: &Design, layer: Layer) -> Option<Design> {
    if design.layers.len() >= LIMIT {
        return None;
    }
    let mut next = design.clone();
    next.layers.push(layer);
    Some(next)
}

/// Copies a layer just above itself. The entry seal is the one thing a card carries once, so it
/// is never copied.
pub fn duplicate(design: &Design, id: &str, new_id: String) -> Option<Design> {
    if design.layers.len() >= LIMIT {
        return None;
    }
    let at = design.layers.iter().position(|l| l.id == id)?;
    let source = &design.layers[at];
    if source.kind == LayerKind::Code {
        return None;
    }
    let mut copy = source.clone();
    copy.id = new_id;
    copy.x = clamp(source.x + 3.0, 0.0, 100.0 - source.width);
    copy.y = clamp(source.y + 3.0, 0.0, 98.0);
    copy.name = source.name.as_ref().map(|n| format!("{n} copy"));
    copy.locked = Some(false);
    let mut next = design.clone();
    next.layers.insert(at + 1, copy);
    Some(next)
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum StackMove {
    Front,
    Back,
    Up,
    Down,
}

pub fn move_in_stack(design: &Design, id: &str, how: StackMove) -> Design {
    let Some(from) = design.layers.iter().position(|l| l.id == id) else {
        return design.clone();
    };
    let last = design.layers.len() - 1;
    let to = match how {
        StackMove::Front => last,
        StackMove::Back => 0,
        StackMove::Up => (from + 1).min(last),
        StackMove::Down => from.saturating_sub(1),
    };
    let mut next = design.clone();
    if to != from {
        let layer = next.layers.remove(from);
        next.layers.insert(to, layer);
    }
    next
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Alignment {
    Left,
    Centre,
    Right,
    Top,
    Middle,
    Bottom,
}

pub fn align(design: &Design, id: &str, how: Alignment) -> Design {
    let mut next = design.clone();
    if let Some(l) = next.layers.iter_mut().find(|l| l.id == id) {
        let h = l.height.unwrap_or(0.0);
        match how {
            Alignment::Left => l.x = 0.0,
            Alignment::Centre => l.x = (100.0 - l.width) / 2.0,
            Alignment::Right => l.x = 100.0 - l.width,
            Alignment::Top => l.y = 0.0,
            Alignment::Middle => l.y = clamp((100.0 - h) / 2.0, 0.0, 98.0),
            Alignment::Bottom => l.y = clamp(100.0 - h, 0.0, 98.0),
        }
    }
    next
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Handle {
    Nw,
    N,
    Ne,
    E,
    Se,
    S,
    Sw,
    W,
}

impl Handle {
    fn north(self) -> bool {
        matches!(self, Handle::Nw | Handle::N | Handle::Ne)
    }
    fn south(self) -> bool {
        matches!(self, Handle::Sw | Handle::S | Handle::Se)
    }
    fn east(self) -> bool {
        matches!(self, Handle::Ne | Handle::E | Handle::Se)
    }
    fn west(self) -> bool {
        matches!(self, Handle::Nw | Handle::W | Handle::Sw)
    }
    fn corner(self) -> bool {
        matches!(self, Handle::Nw | Handle::Ne | Handle::Se | Handle::Sw)
    }
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Rect {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

/// Drags one handle by (dx, dy), in percent of the card. A box never leaves the card and never
/// gets narrower than the validator allows. With `keep_shape`, a corner keeps the box's shape.
pub fn resize_box(start: Rect, handle: Handle, dx: f64, dy: f64, keep_shape: bool) -> Rect {
    let Rect {
        mut x,
        mut y,
        mut width,
        mut height,
    } = start;
    let right = x + width;
    let bottom = y + height;
    if handle.west() {
        x = clamp(x + dx, 0.0, right - MIN_WIDTH);
        width = right - x;
    }
    if handle.east() {
        width = clamp(width + dx, MIN_WIDTH, 100.0 - x);
    }
    if handle.north() {
        y = clamp(y + dy, 0.0, bottom - MIN_HEIGHT_DRAG);
        height = bottom - y;
    }
    if handle.south() {
        height = clamp(height + dy, MIN_HEIGHT_DRAG, 100.0 - y);
    }
    if keep_shape && handle.corner() && start.height > 0.0 {
        let aspect = start.width / start.height;
        let by_width = width / aspect;
        if (by_width - height).abs() > 0.01 {
            height = clamp(by_width, MIN_HEIGHT_DRAG, 100.0);
            if handle.north() {
                y = bottom - height;
            }
        }
    }
    Rect {
        x,
        y,
        width,
        height,
    }
}

/// Snaps a turn to 15 degree steps when within 4 degrees of one, so a card can be set straight by
/// hand. The answer is in -180..180, to one decimal.
pub fn snap_rotation(degrees: f64) -> f64 {
    let mut d = ((degrees + 180.0) % 360.0 + 360.0) % 360.0 - 180.0;
    let nearest = round_js(d / 15.0) * 15.0;
    if (d - nearest).abs() < 4.0 {
        d = nearest;
    }
    round_js(d * 10.0) / 10.0
}

pub fn has_imported_card(design: &Design) -> bool {
    design
        .layers
        .iter()
        .any(|l| l.kind == LayerKind::Image && l.name.as_deref() == Some(CARD_NAME))
}

/// Makes an imported card the whole design: the picture fills the card, the card takes the
/// picture's shape, and the house decoration steps aside. The host's words stay in the document
/// but hidden, so they can bring back the ones they want. The entry seal is left as it was.
pub fn apply_imported_card(design: &Design, url: String, image_ratio: f64, id: String) -> Design {
    let ratio = clamp(image_ratio, 0.4, 2.5);
    let kept: Vec<Layer> = design
        .layers
        .iter()
        .filter(|l| !(l.kind == LayerKind::Image && l.name.as_deref() == Some(CARD_NAME)))
        .map(|l| {
            let mut l = l.clone();
            if l.kind != LayerKind::Code {
                l.visible = false;
            }
            l
        })
        .collect();
    let mut next = design.clone();
    next.canvas = Some(crate::model::Canvas { ratio });
    next.chrome = Some(false);
    next.layers = std::iter::once(create_image(url, id, ratio, ratio, true, None))
        .chain(kept)
        .collect();
    next
}

/// Takes an imported card off and brings the host's own design back.
pub fn remove_imported_card(design: &Design) -> Design {
    if !has_imported_card(design) {
        return design.clone();
    }
    let mut next = design.clone();
    next.canvas = None;
    next.chrome = Some(true);
    next.layers = design
        .layers
        .iter()
        .filter(|l| !(l.kind == LayerKind::Image && l.name.as_deref() == Some(CARD_NAME)))
        .map(|l| {
            let mut l = l.clone();
            if !l.visible && l.kind != LayerKind::Code {
                l.visible = !l.text.trim().is_empty()
                    || matches!(l.kind, LayerKind::Divider | LayerKind::Seal);
            }
            l
        })
        .collect();
    next
}

/// The card as a guest receives it when the access pass is on: if the host did not place an entry
/// seal, one is added in the house spot. A seal they placed is left exactly where they put it.
pub fn ensure_entry_seal(design: &Design, id: String) -> Design {
    let mut next = design.clone();
    if let Some(seal) = next.layers.iter_mut().find(|l| l.kind == LayerKind::Code) {
        seal.visible = true;
    } else {
        next.layers.push(create_layer(LayerKind::Code, id));
    }
    next
}

/// True for a layer the canvas may move: shown, and not locked.
pub fn is_editable(layer: &Layer) -> bool {
    layer.visible && layer.locked != Some(true)
}
