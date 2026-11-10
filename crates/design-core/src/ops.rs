//! Every edit the designer offers, as a pure function from one design to the next.
//!
//! Percentages are shares of the card: x and width of its width, y and height of its height.
//! Later layers draw on top.

use crate::model::{Canvas, ColorRole, Design, Fit, Font, Layer, LayerKind, PaperEdge, Shape};
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
            y: 83.5,
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
    if shape == Shape::Arch {
        let width = 36.0;
        let height = clamp(width * ratio * 1.35, 10.0, 80.0);
        return Layer {
            shape: Some(shape),
            x: 32.0,
            y: clamp(50.0 - height / 2.0, 0.0, 100.0 - height),
            width,
            height: Some(height),
            fill: Some(FOIL.into()),
            stroke_width: Some(0.4),
            radius: Some(18.0),
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

pub fn align_selection(design: &Design, ids: &[String], how: Alignment) -> Design {
    if ids.is_empty() {
        return design.clone();
    }
    if ids.len() == 1 {
        return align(design, &ids[0], how);
    }
    let mut next = design.clone();
    let selected_layers: Vec<&crate::model::Layer> = next
        .layers
        .iter()
        .filter(|l| ids.iter().any(|id| id == &l.id))
        .collect();

    if selected_layers.is_empty() {
        return design.clone();
    }

    let min_x = selected_layers
        .iter()
        .map(|l| l.x)
        .fold(f64::INFINITY, f64::min);
    let max_right = selected_layers
        .iter()
        .map(|l| l.x + l.width)
        .fold(f64::NEG_INFINITY, f64::max);
    let min_y = selected_layers
        .iter()
        .map(|l| l.y)
        .fold(f64::INFINITY, f64::min);
    let max_bottom = selected_layers
        .iter()
        .map(|l| l.y + l.height.unwrap_or(4.0))
        .fold(f64::NEG_INFINITY, f64::max);

    let box_width = max_right - min_x;
    let box_height = max_bottom - min_y;

    for l in next.layers.iter_mut() {
        if ids.iter().any(|id| id == &l.id) {
            let h = l.height.unwrap_or(4.0);
            match how {
                Alignment::Left => l.x = min_x,
                Alignment::Centre => l.x = min_x + (box_width - l.width) / 2.0,
                Alignment::Right => l.x = max_right - l.width,
                Alignment::Top => l.y = min_y,
                Alignment::Middle => l.y = min_y + (box_height - h) / 2.0,
                Alignment::Bottom => l.y = max_bottom - h,
            }
        }
    }
    next
}

pub fn distribute_layers(design: &Design, ids: &[String], horizontal: bool) -> Design {
    if ids.len() < 3 {
        return design.clone();
    }
    let mut next = design.clone();

    if horizontal {
        let mut indices: Vec<usize> = next
            .layers
            .iter()
            .enumerate()
            .filter(|(_, l)| ids.iter().any(|id| id == &l.id))
            .map(|(i, _)| i)
            .collect();

        indices.sort_by(|&a, &b| {
            next.layers[a]
                .x
                .partial_cmp(&next.layers[b].x)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        let first = &next.layers[indices[0]];
        let last = &next.layers[indices[indices.len() - 1]];
        let start_x = first.x;
        let end_x = last.x + last.width;

        let total_widths: f64 = indices.iter().map(|&i| next.layers[i].width).sum();
        let span = end_x - start_x;
        if span <= total_widths {
            return next;
        }

        let gap = (span - total_widths) / (indices.len() - 1) as f64;
        let mut curr_x = start_x;
        for &idx in &indices {
            next.layers[idx].x = curr_x;
            curr_x += next.layers[idx].width + gap;
        }
    } else {
        let mut indices: Vec<usize> = next
            .layers
            .iter()
            .enumerate()
            .filter(|(_, l)| ids.iter().any(|id| id == &l.id))
            .map(|(i, _)| i)
            .collect();

        indices.sort_by(|&a, &b| {
            next.layers[a]
                .y
                .partial_cmp(&next.layers[b].y)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        let first = &next.layers[indices[0]];
        let last = &next.layers[indices[indices.len() - 1]];
        let start_y = first.y;
        let last_h = last.height.unwrap_or(4.0);
        let end_y = last.y + last_h;

        let total_heights: f64 = indices
            .iter()
            .map(|&i| next.layers[i].height.unwrap_or(4.0))
            .sum();
        let span = end_y - start_y;
        if span <= total_heights {
            return next;
        }

        let gap = (span - total_heights) / (indices.len() - 1) as f64;
        let mut curr_y = start_y;
        for &idx in &indices {
            let h = next.layers[idx].height.unwrap_or(4.0);
            next.layers[idx].y = curr_y;
            curr_y += h + gap;
        }
    }

    next
}

pub fn group_layers(design: &Design, ids: &[String], group_id: String) -> Design {
    let mut next = design.clone();
    for l in next.layers.iter_mut() {
        if ids.iter().any(|id| id == &l.id) {
            l.group_id = Some(group_id.clone());
        }
    }
    next
}

pub fn ungroup_layers(design: &Design, ids: &[String]) -> Design {
    let mut next = design.clone();
    for l in next.layers.iter_mut() {
        if ids.iter().any(|id| id == &l.id) {
            l.group_id = None;
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
        x += dx;
        width = right - x;
        if width < MIN_WIDTH {
            width = MIN_WIDTH;
            x = right - width;
        }
        if width > 1000.0 {
            width = 1000.0;
            x = right - width;
        }
    }
    if handle.east() {
        width = clamp(width + dx, MIN_WIDTH, 1000.0);
    }
    if handle.north() {
        y += dy;
        height = bottom - y;
        if height < MIN_HEIGHT_DRAG {
            height = MIN_HEIGHT_DRAG;
            y = bottom - height;
        }
        if height > 1000.0 {
            height = 1000.0;
            y = bottom - height;
        }
    }
    if handle.south() {
        height = clamp(height + dy, MIN_HEIGHT_DRAG, 1000.0);
    }
    if keep_shape && start.height > 0.0 && start.width > 0.0 {
        let aspect = start.width / start.height;
        let use_width = handle.east() || handle.west();
        let width_drives = use_width
            && (!handle.corner() || (dx / start.width).abs() >= (dy / start.height).abs());
        if width_drives {
            width = clamp(
                width,
                MIN_WIDTH.max(MIN_HEIGHT_DRAG * aspect),
                1000.0_f64.min(1000.0 * aspect),
            );
            height = width / aspect;
        } else {
            height = clamp(
                height,
                MIN_HEIGHT_DRAG.max(MIN_WIDTH / aspect),
                1000.0_f64.min(1000.0 / aspect),
            );
            width = height * aspect;
        }
        x = if handle.west() {
            right - width
        } else if !use_width {
            start.x + (start.width - width) / 2.0
        } else {
            start.x
        };
        y = if handle.north() {
            bottom - height
        } else if !handle.north() && !handle.south() {
            start.y + (start.height - height) / 2.0
        } else {
            start.y
        };
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
    next.canvas = Some(crate::model::Canvas::new(ratio));
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

/// Resizes the canvas in pixels and updates its aspect ratio.
pub fn resize_canvas_px(design: &Design, width_px: u32, height_px: u32) -> Design {
    let width_px = width_px.clamp(200, 10000);
    let height_px = height_px.clamp(200, 10000);
    let ratio = round_js((width_px as f64 / height_px as f64) * 1000.0) / 1000.0;
    let mut next = design.clone();
    let existing = next.canvas.unwrap_or(Canvas {
        ratio,
        width_px: Some(width_px),
        height_px: Some(height_px),
        edge_style: None,
        corner_radius_px: None,
    });
    next.canvas = Some(Canvas {
        ratio,
        width_px: Some(width_px),
        height_px: Some(height_px),
        edge_style: existing.edge_style,
        corner_radius_px: existing.corner_radius_px,
    });
    next
}

/// Sets the paper edge style and corner radius in pixels.
pub fn set_paper_edge(
    design: &Design,
    edge_style: PaperEdge,
    corner_radius_px: Option<f64>,
) -> Design {
    let mut next = design.clone();
    let ratio = design.ratio();
    let width_px = design.canvas_width_px();
    let height_px = design.canvas_height_px();
    let corner_radius_px = match edge_style {
        PaperEdge::Sharp => Some(0.0),
        PaperEdge::Rounded => corner_radius_px
            .map(|r| clamp(r, 0.0, 500.0))
            .or(Some(16.0)),
        PaperEdge::Deckled => Some(0.0),
    };
    next.canvas = Some(Canvas {
        ratio,
        width_px: Some(width_px),
        height_px: Some(height_px),
        edge_style: Some(edge_style),
        corner_radius_px,
    });
    next
}

/// Nudges a layer by (dx_px, dy_px) in canvas pixels.
pub fn nudge(design: &Design, id: &str, dx_px: f64, dy_px: f64) -> Design {
    let w_px = design.canvas_width_px() as f64;
    let h_px = design.canvas_height_px() as f64;
    let dx_pct = if w_px > 0.0 {
        (dx_px / w_px) * 100.0
    } else {
        0.0
    };
    let dy_pct = if h_px > 0.0 {
        (dy_px / h_px) * 100.0
    } else {
        0.0
    };
    let mut next = design.clone();
    if let Some(l) = next
        .layers
        .iter_mut()
        .find(|l| l.id == id && is_editable(l))
    {
        let max_x = clamp(100.0 - l.width, 0.0, 100.0);
        let max_y = clamp(100.0 - l.height.unwrap_or(5.0), 0.0, 100.0);
        l.x = clamp(round_js((l.x + dx_pct) * 100.0) / 100.0, 0.0, max_x);
        l.y = clamp(round_js((l.y + dy_pct) * 100.0) / 100.0, 0.0, max_y);
    }
    next
}

/// Flips a layer horizontally or vertically.
pub fn flip_layer(design: &Design, id: &str, horizontal: bool) -> Design {
    let mut next = design.clone();
    if let Some(l) = next
        .layers
        .iter_mut()
        .find(|l| l.id == id && is_editable(l))
    {
        if horizontal {
            let rot = l.rotation.unwrap_or(0.0);
            l.rotation = Some(snap_rotation(-rot));
        } else {
            let rot = l.rotation.unwrap_or(0.0);
            l.rotation = Some(snap_rotation(180.0 - rot));
        }
    }
    next
}

/// Converts a pixel measurement into canvas percentage.
pub fn px_to_pct(px: f64, total_px: f64) -> f64 {
    if total_px > 0.0 {
        round_js((px / total_px) * 10000.0) / 100.0
    } else {
        0.0
    }
}

/// Converts a canvas percentage into pixels.
pub fn pct_to_px(pct: f64, total_px: f64) -> f64 {
    round_js((pct / 100.0) * total_px)
}
