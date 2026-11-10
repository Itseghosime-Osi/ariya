//! The JSON contract between the designer's TypeScript and this crate.
//!
//! One call per user action, JSON in and JSON out. The types here are the single definition of
//! the wire format: the TypeScript side is generated from them, never hand-written.

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
#[cfg(feature = "ts")]
use ts_rs::TS;

use crate::model::{Design, LayerKind, PaperEdge, Shape};
use crate::ops::{self, Alignment, Handle, Rect, StackMove};
use crate::validate::validate;

/// The ABI the crate and `packages/design` agree on.
pub const ABI_VERSION: u32 = 1;

pub const OP_VERSION: u32 = 0;
/// Check a design and hand it back normalised.
pub const OP_VALIDATE: u32 = 1;
/// One edit to a design.
pub const OP_EDIT: u32 = 2;
/// Pure geometry the canvas needs on every pointer move.
pub const OP_GEOMETRY: u32 = 3;

#[cfg_attr(feature = "ts", derive(TS))]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/design/src/generated/")
)]
#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum WireStack {
    Front,
    Back,
    Up,
    Down,
}

#[cfg_attr(feature = "ts", derive(TS))]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/design/src/generated/")
)]
#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum WireAlign {
    Left,
    Centre,
    Right,
    Top,
    Middle,
    Bottom,
}

#[cfg_attr(feature = "ts", derive(TS))]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/design/src/generated/")
)]
#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum WireHandle {
    Nw,
    N,
    Ne,
    E,
    Se,
    S,
    Sw,
    W,
}

/// One edit. Anything that makes a new layer carries its id, so the engine needs no random source.
#[cfg_attr(feature = "ts", derive(TS))]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/design/src/generated/")
)]
#[derive(Clone, Debug, Deserialize)]
#[serde(
    tag = "type",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum Edit {
    /// A new text, wax seal, rule or entry seal.
    AddLayer {
        kind: LayerKind,
        new_id: String,
    },
    AddShape {
        shape: Shape,
        new_id: String,
    },
    /// A picture. `image_ratio` is its width over its height.
    AddImage {
        url: String,
        new_id: String,
        image_ratio: f64,
    },
    Duplicate {
        id: String,
        new_id: String,
    },
    Stack {
        id: String,
        how: WireStack,
    },
    Align {
        id: String,
        how: WireAlign,
    },
    ImportCard {
        url: String,
        image_ratio: f64,
        new_id: String,
    },
    RemoveCard,
    ConstrainEntrySeals,
    EnsureEntrySeal {
        new_id: String,
    },
    ResizeCanvasPx {
        width_px: u32,
        height_px: u32,
    },
    SetPaperEdge {
        edge_style: PaperEdge,
        corner_radius_px: Option<f64>,
    },
    Nudge {
        id: String,
        dx_px: f64,
        dy_px: f64,
    },
    Flip {
        id: String,
        horizontal: bool,
    },
    AlignSelection {
        ids: Vec<String>,
        how: WireAlign,
    },
    Distribute {
        ids: Vec<String>,
        horizontal: bool,
    },
    Group {
        ids: Vec<String>,
        group_id: String,
    },
    Ungroup {
        ids: Vec<String>,
    },
}

#[cfg_attr(feature = "ts", derive(TS))]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/design/src/generated/")
)]
#[derive(Clone, Debug, Deserialize)]
pub struct EditRequest {
    pub design: Design,
    pub edit: Edit,
}

#[cfg_attr(feature = "ts", derive(TS))]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/design/src/generated/")
)]
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EditResponse {
    pub design: Design,
    /// The layer the designer should select next, when the edit made one.
    pub selected_id: Option<String>,
}

#[cfg_attr(feature = "ts", derive(TS))]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/design/src/generated/")
)]
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct WireRect {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

#[cfg_attr(feature = "ts", derive(TS))]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/design/src/generated/")
)]
#[derive(Clone, Debug, Deserialize)]
#[serde(
    tag = "kind",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum GeometryRequest {
    ResizeBox {
        start: WireRect,
        handle: WireHandle,
        dx: f64,
        dy: f64,
        keep_shape: bool,
    },
    SnapRotation {
        degrees: f64,
    },
    PxToPct {
        px: f64,
        total_px: f64,
    },
    PctToPx {
        pct: f64,
        total_px: f64,
    },
}

fn failure(code: &str, message: impl Into<String>) -> String {
    json!({ "ok": false, "code": code, "message": message.into() }).to_string()
}

fn success(data: Value) -> String {
    json!({ "ok": true, "data": data }).to_string()
}

fn stack(s: WireStack) -> StackMove {
    match s {
        WireStack::Front => StackMove::Front,
        WireStack::Back => StackMove::Back,
        WireStack::Up => StackMove::Up,
        WireStack::Down => StackMove::Down,
    }
}

fn alignment(a: WireAlign) -> Alignment {
    match a {
        WireAlign::Left => Alignment::Left,
        WireAlign::Centre => Alignment::Centre,
        WireAlign::Right => Alignment::Right,
        WireAlign::Top => Alignment::Top,
        WireAlign::Middle => Alignment::Middle,
        WireAlign::Bottom => Alignment::Bottom,
    }
}

fn handle(h: WireHandle) -> Handle {
    match h {
        WireHandle::Nw => Handle::Nw,
        WireHandle::N => Handle::N,
        WireHandle::Ne => Handle::Ne,
        WireHandle::E => Handle::E,
        WireHandle::Se => Handle::Se,
        WireHandle::S => Handle::S,
        WireHandle::Sw => Handle::Sw,
        WireHandle::W => Handle::W,
    }
}

fn edit(request: EditRequest) -> Result<EditResponse, String> {
    let EditRequest { design, edit } = request;
    let full = "That is the most layers a card can hold.";
    let (next, selected) = match edit {
        Edit::AddLayer { kind, new_id } => {
            if !matches!(
                kind,
                LayerKind::Text | LayerKind::Seal | LayerKind::Code | LayerKind::Divider
            ) {
                return Err("That kind of layer is added another way.".into());
            }
            if kind == LayerKind::Code && design.layers.iter().any(|l| l.kind == LayerKind::Code) {
                return Ok(EditResponse {
                    design,
                    selected_id: None,
                });
            }
            let layer = ops::create_layer(kind, new_id.clone());
            (ops::add_layer(&design, layer).ok_or(full)?, Some(new_id))
        }
        Edit::AddShape { shape, new_id } => {
            let layer = ops::create_shape(shape, new_id.clone(), design.ratio());
            (ops::add_layer(&design, layer).ok_or(full)?, Some(new_id))
        }
        Edit::AddImage {
            url,
            new_id,
            image_ratio,
        } => {
            let layer = ops::create_image(
                url,
                new_id.clone(),
                design.ratio(),
                image_ratio,
                false,
                None,
            );
            (ops::add_layer(&design, layer).ok_or(full)?, Some(new_id))
        }
        Edit::Duplicate { id, new_id } => match ops::duplicate(&design, &id, new_id.clone()) {
            Some(d) => (d, Some(new_id)),
            None => (design, None),
        },
        Edit::Stack { id, how } => (ops::move_in_stack(&design, &id, stack(how)), None),
        Edit::Align { id, how } => (ops::align(&design, &id, alignment(how)), None),
        Edit::ImportCard {
            url,
            image_ratio,
            new_id,
        } => (
            ops::apply_imported_card(&design, url, image_ratio, new_id),
            None,
        ),
        Edit::ConstrainEntrySeals => (ops::constrain_entry_seals(&design), None),
        Edit::RemoveCard => (ops::remove_imported_card(&design), None),
        Edit::EnsureEntrySeal { new_id } => (ops::ensure_entry_seal(&design, new_id), None),
        Edit::ResizeCanvasPx {
            width_px,
            height_px,
        } => (ops::resize_canvas_px(&design, width_px, height_px), None),
        Edit::SetPaperEdge {
            edge_style,
            corner_radius_px,
        } => (
            ops::set_paper_edge(&design, edge_style, corner_radius_px),
            None,
        ),
        Edit::Nudge { id, dx_px, dy_px } => {
            let next = ops::nudge(&design, &id, dx_px, dy_px);
            (next, Some(id))
        }
        Edit::Flip { id, horizontal } => {
            let next = ops::flip_layer(&design, &id, horizontal);
            (next, Some(id))
        }
        Edit::AlignSelection { ids, how } => {
            let next = ops::align_selection(&design, &ids, alignment(how));
            (next, None)
        }
        Edit::Distribute { ids, horizontal } => {
            let next = ops::distribute_layers(&design, &ids, horizontal);
            (next, None)
        }
        Edit::Group { ids, group_id } => {
            let next = ops::group_layers(&design, &ids, group_id);
            (next, None)
        }
        Edit::Ungroup { ids } => {
            let next = ops::ungroup_layers(&design, &ids);
            (next, None)
        }
    };
    validate(&next).map_err(|i| i.message)?;
    Ok(EditResponse {
        design: next,
        selected_id: selected,
    })
}

fn geometry(request: GeometryRequest) -> Value {
    match request {
        GeometryRequest::ResizeBox {
            start,
            handle: h,
            dx,
            dy,
            keep_shape,
        } => {
            let r = ops::resize_box(
                Rect {
                    x: start.x,
                    y: start.y,
                    width: start.width,
                    height: start.height,
                },
                handle(h),
                dx,
                dy,
                keep_shape,
            );
            json!({ "x": r.x, "y": r.y, "width": r.width, "height": r.height })
        }
        GeometryRequest::SnapRotation { degrees } => {
            json!({ "degrees": ops::snap_rotation(degrees) })
        }
        GeometryRequest::PxToPct { px, total_px } => {
            json!({ "pct": ops::px_to_pct(px, total_px) })
        }
        GeometryRequest::PctToPx { pct, total_px } => {
            json!({ "px": ops::pct_to_px(pct, total_px) })
        }
    }
}

/// Runs one operation. The answer is always a JSON envelope, including for a malformed request.
pub fn dispatch(op: u32, input: &[u8]) -> String {
    let parse_error = |e: serde_json::Error| failure("bad_request", e.to_string());
    match op {
        OP_VERSION => success(json!({ "abi": ABI_VERSION })),
        OP_VALIDATE => match serde_json::from_slice::<Design>(input) {
            Ok(design) => match validate(&design) {
                Ok(()) => success(json!({ "design": design })),
                Err(issue) => failure("invalid", format!("{}: {}", issue.path, issue.message)),
            },
            Err(e) => parse_error(e),
        },
        OP_EDIT => match serde_json::from_slice::<EditRequest>(input) {
            Ok(request) => match edit(request) {
                Ok(response) => success(serde_json::to_value(response).unwrap_or(Value::Null)),
                Err(message) => failure("refused", message),
            },
            Err(e) => parse_error(e),
        },
        OP_GEOMETRY => match serde_json::from_slice::<GeometryRequest>(input) {
            Ok(request) => success(geometry(request)),
            Err(e) => parse_error(e),
        },
        _ => failure("unknown_op", format!("No operation {op}")),
    }
}
