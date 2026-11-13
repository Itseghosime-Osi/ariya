//! The design engine against the card the app itself creates (`tests/fixtures/house.json` is what
//! the TypeScript `createInvitationDesign` returns for a sample event).

use ariya_design_core::model::{Design, LayerKind, Shape};
use ariya_design_core::ops::{self, Alignment, Handle, Rect, StackMove};
use ariya_design_core::validate::validate;
use ariya_design_core::wire::{dispatch, OP_EDIT, OP_GEOMETRY, OP_VALIDATE};
use serde_json::{json, Value};

const HOUSE: &str = include_str!("fixtures/house.json");

fn house() -> Design {
    serde_json::from_str(HOUSE).expect("the house design parses")
}

fn ok(text: &str) -> Value {
    let v: Value = serde_json::from_str(text).expect("json");
    assert_eq!(v["ok"], true, "{text}");
    v["data"].clone()
}

/// JSON equality where `8` and `8.0` are the same number, as they are to JavaScript.
fn same(a: &Value, b: &Value) -> bool {
    match (a, b) {
        (Value::Number(x), Value::Number(y)) => x.as_f64() == y.as_f64(),
        (Value::Array(x), Value::Array(y)) => {
            x.len() == y.len() && x.iter().zip(y).all(|(p, q)| same(p, q))
        }
        (Value::Object(x), Value::Object(y)) => {
            x.len() == y.len() && x.iter().all(|(k, v)| y.get(k).is_some_and(|w| same(v, w)))
        }
        _ => a == b,
    }
}

fn kinds(d: &Design) -> Vec<LayerKind> {
    d.layers.iter().map(|l| l.kind).collect()
}

#[test]
fn the_house_design_survives_a_round_trip_byte_for_byte() {
    // What the app saved comes back unchanged: nothing added, nothing dropped, nulls kept.
    let before: Value = serde_json::from_str(HOUSE).unwrap();
    let after = serde_json::to_value(house()).unwrap();
    assert!(same(&before, &after));
    assert_eq!(validate(&house()), Ok(()));
}

#[test]
fn a_design_with_the_new_fields_round_trips_too() {
    let mut d = house();
    d.layers
        .push(ops::create_shape(Shape::Ellipse, "c".into(), 1.0));
    d.layers.push(ops::create_image(
        "https://x.co/a.png".into(),
        "i".into(),
        0.7,
        2.0,
        false,
        None,
    ));
    let text = serde_json::to_string(&d).unwrap();
    let back: Design = serde_json::from_str(&text).unwrap();
    assert_eq!(d, back);
}

#[test]
fn validation_refuses_what_the_server_refuses() {
    let mut d = house();
    d.palette.ink = "red".into();
    assert!(validate(&d).unwrap_err().message.contains("hex"));

    let mut d = house();
    d.layers[0].width = 2.0;
    assert_eq!(validate(&d).unwrap_err().path, "layers[0].width");

    let mut d = house();
    d.layers[0].weight = 450;
    assert_eq!(validate(&d).unwrap_err().path, "layers[0].weight");

    let mut d = house();
    d.layers[0].image_url = Some("javascript:alert(1)".into());
    assert_eq!(validate(&d).unwrap_err().path, "layers[0].imageUrl");

    let mut d = house();
    d.theme = "neon".into();
    assert_eq!(validate(&d).unwrap_err().path, "theme");

    let mut d = house();
    d.canvas = Some(ariya_design_core::model::Canvas::new(9.0));
    assert_eq!(validate(&d).unwrap_err().path, "canvas.ratio");

    let mut d = house();
    let extra = d.layers[0].clone();
    while d.layers.len() <= 60 {
        d.layers.push(extra.clone());
    }
    assert_eq!(validate(&d).unwrap_err().path, "layers");
}

#[test]
fn duplicate_copies_just_above_and_never_the_entry_seal() {
    let d = house();
    let names = d
        .layers
        .iter()
        .find(|l| l.kind == LayerKind::Names)
        .unwrap()
        .clone();
    let out = ops::duplicate(&d, &names.id, "n2".into()).unwrap();
    let at = out.layers.iter().position(|l| l.id == names.id).unwrap();
    assert_eq!(out.layers[at + 1].id, "n2");
    assert_eq!(out.layers[at + 1].text, names.text);

    let with_seal = ops::ensure_entry_seal(&d, "s".into());
    assert!(ops::duplicate(&with_seal, "s", "s2".into()).is_none());
}

#[test]
fn stacking_moves_and_stops_at_the_ends() {
    let d = house();
    let first = d.layers[0].id.clone();
    let front = ops::move_in_stack(&d, &first, StackMove::Front);
    assert_eq!(front.layers.last().unwrap().id, first);
    assert_eq!(ops::move_in_stack(&front, &first, StackMove::Up), front);
    assert_eq!(
        ops::move_in_stack(&front, &first, StackMove::Back).layers[0].id,
        first
    );
    assert_eq!(ops::move_in_stack(&d, "missing", StackMove::Front), d);
}

#[test]
fn aligning_uses_the_cards_edges_and_centre() {
    let d = house();
    let id = d
        .layers
        .iter()
        .find(|l| l.kind == LayerKind::Names)
        .unwrap()
        .id
        .clone();
    let centred = ops::align(&d, &id, Alignment::Centre);
    let l = centred.layers.iter().find(|l| l.id == id).unwrap();
    assert!((l.x + l.width / 2.0 - 50.0).abs() < 1e-9);
    let right = ops::align(&d, &id, Alignment::Right);
    let l = right.layers.iter().find(|l| l.id == id).unwrap();
    assert!((l.x + l.width - 100.0).abs() < 1e-9);
}

#[test]
fn resizing_can_bleed_outside_card_or_gets_narrower_than_a_card_can_save() {
    let start = Rect {
        x: 20.0,
        y: 20.0,
        width: 40.0,
        height: 20.0,
    };
    assert_eq!(
        ops::resize_box(start, Handle::E, 10.0, 0.0, false).width,
        50.0
    );
    let wide = ops::resize_box(start, Handle::E, 500.0, 0.0, false);
    assert_eq!((wide.x, wide.width), (20.0, 540.0));
    let corner = ops::resize_box(start, Handle::Nw, -30.0, -30.0, false);
    assert_eq!((corner.x, corner.y), (-10.0, -10.0));
    assert_eq!(corner.x + corner.width, 60.0);
    // Dragged past the other edge, a box stops at the minimum width, which the server accepts.
    let squeezed = ops::resize_box(start, Handle::E, -500.0, 0.0, false);
    assert_eq!(squeezed.width, 5.0);
    let kept = ops::resize_box(start, Handle::Se, 20.0, 0.0, true);
    assert!((kept.width / kept.height - 2.0).abs() < 1e-9);
}

#[test]
fn rotation_snaps_near_fifteen_degree_steps() {
    assert_eq!(ops::snap_rotation(88.0), 90.0);
    assert_eq!(ops::snap_rotation(52.0), 52.0);
    assert_eq!(ops::snap_rotation(370.0), 10.0);
    assert_eq!(ops::snap_rotation(-88.0), -90.0);
    assert_eq!(ops::snap_rotation(180.0), -180.0);
}

#[test]
fn an_imported_card_fills_the_card_and_comes_off_again() {
    let mut d = house();
    d = ops::ensure_entry_seal(&d, "seal2".into());
    let on = ops::apply_imported_card(&d, "https://x.co/card.png".into(), 0.8, "card".into());
    assert_eq!(on.canvas.unwrap().ratio, 0.8);
    assert_eq!(on.chrome, Some(false));
    assert_eq!(on.layers[0].kind, LayerKind::Image);
    assert!(on
        .layers
        .iter()
        .filter(|l| l.kind == LayerKind::Names)
        .all(|l| !l.visible));
    assert!(
        on.layers
            .iter()
            .find(|l| l.kind == LayerKind::Code)
            .unwrap()
            .visible
    );
    assert_eq!(validate(&on), Ok(()));

    let again = ops::apply_imported_card(&on, "https://x.co/b.png".into(), 1.0, "card2".into());
    let cards = again
        .layers
        .iter()
        .filter(|l| l.name.as_deref() == Some(ops::CARD_NAME))
        .count();
    assert_eq!(cards, 1);

    let off = ops::remove_imported_card(&on);
    assert!(!ops::has_imported_card(&off));
    assert!(off.canvas.is_none());
    assert_eq!(off.chrome, Some(true));
    assert!(
        off.layers
            .iter()
            .find(|l| l.kind == LayerKind::Names)
            .unwrap()
            .visible
    );
    assert_eq!(ops::remove_imported_card(&d), d);
}

#[test]
fn the_pass_is_added_once_and_a_placed_seal_stays_put() {
    let d = house();
    assert!(!kinds(&d).contains(&LayerKind::Code));
    let sealed = ops::ensure_entry_seal(&d, "s".into());
    assert_eq!(
        kinds(&sealed)
            .iter()
            .filter(|k| **k == LayerKind::Code)
            .count(),
        1
    );
    let mut moved = sealed.clone();
    let seal = moved
        .layers
        .iter_mut()
        .find(|l| l.kind == LayerKind::Code)
        .unwrap();
    seal.x = 60.0;
    seal.y = 70.0;
    seal.visible = false;
    let again = ops::ensure_entry_seal(&moved, "s3".into());
    let seal = again
        .layers
        .iter()
        .find(|l| l.kind == LayerKind::Code)
        .unwrap();
    assert_eq!((seal.x, seal.y, seal.visible), (60.0, 70.0, true));
    assert_eq!(
        kinds(&again)
            .iter()
            .filter(|k| **k == LayerKind::Code)
            .count(),
        1
    );
}

#[test]
fn a_full_card_refuses_another_layer() {
    let mut d = house();
    let extra = d.layers[0].clone();
    while d.layers.len() < 60 {
        d.layers.push(extra.clone());
    }
    assert!(ops::add_layer(&d, ops::create_layer(LayerKind::Text, "t".into())).is_none());
}

#[test]
fn the_wire_speaks_json_both_ways() {
    let design: Value = serde_json::from_str(HOUSE).unwrap();

    let data = ok(&dispatch(OP_VALIDATE, HOUSE.as_bytes()));
    assert!(same(&data["design"], &design));

    let request = json!({
        "design": design,
        "edit": { "type": "addShape", "shape": "ellipse", "newId": "shape-1" }
    });
    let data = ok(&dispatch(OP_EDIT, request.to_string().as_bytes()));
    assert_eq!(data["selectedId"], "shape-1");
    assert_eq!(
        data["design"]["layers"].as_array().unwrap().last().unwrap()["shape"],
        "ellipse"
    );

    let request = json!({ "kind": "resizeBox", "start": {"x":20,"y":20,"width":40,"height":20},
        "handle": "e", "dx": 10, "dy": 0, "keepShape": false });
    let data = ok(&dispatch(OP_GEOMETRY, request.to_string().as_bytes()));
    assert_eq!(data["width"], 50.0);
}

#[test]
fn a_bad_request_is_an_error_envelope_never_a_crash() {
    for (op, body) in [
        (OP_VALIDATE, "{oops"),
        (OP_EDIT, "{}"),
        (OP_GEOMETRY, "[]"),
        (99, ""),
    ] {
        let v: Value = serde_json::from_str(&dispatch(op, body.as_bytes())).unwrap();
        assert_eq!(v["ok"], false);
        assert!(v["message"].is_string());
    }
    let mut bad: Value = serde_json::from_str(HOUSE).unwrap();
    bad["palette"]["ink"] = json!("nope");
    let v: Value =
        serde_json::from_str(&dispatch(OP_VALIDATE, bad.to_string().as_bytes())).unwrap();
    assert_eq!(v["code"], "invalid");
}

#[test]
fn canvas_pixel_sizing_and_paper_edges_operate_cleanly() {
    let d = house();
    let resized = ops::resize_canvas_px(&d, 1080, 1350);
    let c = resized.canvas.unwrap();
    assert_eq!(c.width_px, Some(1080));
    assert_eq!(c.height_px, Some(1350));
    assert!((c.ratio - 0.8).abs() < 1e-4);
    assert_eq!(resized.canvas_width_px(), 1080);
    assert_eq!(resized.canvas_height_px(), 1350);

    let sharp = ops::set_paper_edge(&resized, ariya_design_core::model::PaperEdge::Sharp, None);
    assert_eq!(
        sharp.canvas.unwrap().edge_style,
        Some(ariya_design_core::model::PaperEdge::Sharp)
    );
    assert_eq!(sharp.canvas.unwrap().corner_radius_px, Some(0.0));

    let deckled = ops::set_paper_edge(&sharp, ariya_design_core::model::PaperEdge::Deckled, None);
    assert_eq!(
        deckled.canvas.unwrap().edge_style,
        Some(ariya_design_core::model::PaperEdge::Deckled)
    );

    let rounded = ops::set_paper_edge(
        &deckled,
        ariya_design_core::model::PaperEdge::Rounded,
        Some(24.0),
    );
    assert_eq!(
        rounded.canvas.unwrap().edge_style,
        Some(ariya_design_core::model::PaperEdge::Rounded)
    );
    assert_eq!(rounded.canvas.unwrap().corner_radius_px, Some(24.0));

    // Nudge layer by 10.8 px (which is exactly 1% on 1080px canvas)
    let first_id = d.layers[0].id.clone();
    let orig_x = d.layers[0].x;
    let nudged = ops::nudge(&resized, &first_id, 10.8, 0.0);
    let new_x = nudged.layers[0].x;
    assert!((new_x - (orig_x + 1.0)).abs() < 0.05);

    // Geometry conversions
    assert_eq!(ops::px_to_pct(540.0, 1080.0), 50.0);
    assert_eq!(ops::pct_to_px(50.0, 1080.0), 540.0);
}

#[test]
fn wire_speaks_px_and_paper_edits() {
    let design: Value = serde_json::from_str(HOUSE).unwrap();

    let request = json!({
        "design": design,
        "edit": { "type": "resizeCanvasPx", "widthPx": 1080, "heightPx": 1350 }
    });
    let data = ok(&dispatch(OP_EDIT, request.to_string().as_bytes()));
    assert_eq!(data["design"]["canvas"]["widthPx"], 1080);
    assert_eq!(data["design"]["canvas"]["heightPx"], 1350);

    let request = json!({
        "design": data["design"],
        "edit": { "type": "setPaperEdge", "edgeStyle": "sharp", "cornerRadiusPx": 0.0 }
    });
    let data = ok(&dispatch(OP_EDIT, request.to_string().as_bytes()));
    assert_eq!(data["design"]["canvas"]["edgeStyle"], "sharp");

    let req_px = json!({ "kind": "pxToPct", "px": 270.0, "totalPx": 1080.0 });
    let geo = ok(&dispatch(OP_GEOMETRY, req_px.to_string().as_bytes()));
    assert_eq!(geo["pct"], 25.0);

    let req_pct = json!({ "kind": "pctToPx", "pct": 25.0, "totalPx": 1080.0 });
    let geo = ok(&dispatch(OP_GEOMETRY, req_pct.to_string().as_bytes()));
    assert_eq!(geo["px"], 270.0);
}

#[test]
fn multi_select_align_distribute_and_groups() {
    let mut d = house();
    let id1 = d.layers[0].id.clone();
    let id2 = d.layers[1].id.clone();
    let id3 = d.layers[2].id.clone();
    let ids = vec![id1.clone(), id2.clone(), id3.clone()];

    // Grouping
    let grouped = ops::group_layers(&d, &ids, "group_header".into());
    assert_eq!(grouped.layers[0].group_id.as_deref(), Some("group_header"));
    assert_eq!(grouped.layers[1].group_id.as_deref(), Some("group_header"));

    // Ungrouping
    let ungrouped = ops::ungroup_layers(&grouped, &ids);
    assert!(ungrouped.layers[0].group_id.is_none());

    // Align selection to left
    d.layers[0].x = 10.0;
    d.layers[1].x = 25.0;
    d.layers[2].x = 30.0;
    let aligned = ops::align_selection(&d, &ids, Alignment::Left);
    assert_eq!(aligned.layers[0].x, 10.0);
    assert_eq!(aligned.layers[1].x, 10.0);
    assert_eq!(aligned.layers[2].x, 10.0);

    // Distribute vertically
    d.layers[0].y = 10.0;
    d.layers[0].height = Some(10.0);
    d.layers[1].y = 40.0;
    d.layers[1].height = Some(10.0);
    d.layers[2].y = 70.0;
    d.layers[2].height = Some(10.0);

    let distributed = ops::distribute_layers(&d, &ids, false);
    // Span = 80 - 10 = 70. Heights = 30. Gap = 40 / 2 = 20.
    // L0: 10..20, gap 20 -> L1: 40..50, gap 20 -> L2: 70..80.
    assert_eq!(distributed.layers[0].y, 10.0);
    assert_eq!(distributed.layers[1].y, 40.0);
    assert_eq!(distributed.layers[2].y, 70.0);
}

#[test]
fn aspect_lock_applies_to_side_handles_and_respects_limits() {
    let start = Rect {
        x: 20.0,
        y: 30.0,
        width: 40.0,
        height: 20.0,
    };
    let east = ops::resize_box(start, Handle::E, 10.0, 0.0, true);
    assert_eq!(east.width, 50.0);
    assert_eq!(east.height, 25.0);
    assert_eq!(east.y, 27.5);
    let north = ops::resize_box(start, Handle::N, 0.0, -10.0, true);
    assert_eq!(north.width, 60.0);
    assert_eq!(north.height, 30.0);
    assert_eq!(north.x, 10.0);
    assert_eq!(north.y, 20.0);
    let huge = ops::resize_box(start, Handle::Se, 50000.0, 50000.0, true);
    assert!(huge.width <= 1000.0 && huge.height <= 1000.0);
    assert!((huge.width / huge.height - 2.0).abs() < 0.0001);
}

#[test]
fn the_pass_boundary_edit_preserves_artwork_and_rotated_corners() {
    use ariya_design_core::model::{Canvas, PaperEdge};
    for ratio in [0.4_f64, 5.0 / 7.0, 1.0, 2.5] {
        for angle in [0.0_f64, 15.0, 45.0, 90.0, 135.0] {
            let mut design = ops::ensure_entry_seal(&house(), "pass-boundary".into());
            design.canvas = Some(Canvas {
                ratio,
                width_px: Some(1080),
                height_px: Some((1080.0 / ratio).round() as u32),
                edge_style: Some(PaperEdge::Rounded),
                corner_radius_px: Some(500.0),
            });
            let pass = design.layers.last_mut().unwrap();
            pass.x = -400.0;
            pass.y = 400.0;
            pass.width = 1000.0;
            pass.rotation = Some(angle);
            let response = ok(&dispatch(
                OP_EDIT,
                json!({"design": design, "edit": {"type": "constrainEntrySeals"}})
                    .to_string()
                    .as_bytes(),
            ));
            let next: Design = serde_json::from_value(response["design"].clone()).unwrap();
            validate(&next).unwrap();
            assert!(same(
                &serde_json::to_value(&design.layers[0]).unwrap(),
                &serde_json::to_value(&next.layers[0]).unwrap()
            ));
            assert!(same(
                &serde_json::to_value(&next).unwrap(),
                &serde_json::to_value(ops::constrain_entry_seals(&next)).unwrap()
            ));
            let pass = next.layers.last().unwrap();
            let height = 1080.0 / ratio;
            let cx = (pass.x + pass.width / 2.0) / 100.0 * 1080.0;
            let cy = (pass.y + pass.width * ratio / 2.0) / 100.0 * height;
            let half = pass.width / 100.0 * 1080.0 / 2.0;
            for x in [-half, half] {
                for y in [-half, half] {
                    let px = cx + x * angle.to_radians().cos() - y * angle.to_radians().sin();
                    let py = cy + x * angle.to_radians().sin() + y * angle.to_radians().cos();
                    assert!((-1e-5..=1080.0 + 1e-5).contains(&px));
                    assert!((-1e-5..=height + 1e-5).contains(&py));
                }
            }
        }
    }
}

#[test]
fn a_text_fit_choice_survives_validation_and_stays_absent_when_not_chosen() {
    let mut value: Value = serde_json::from_str(HOUSE).unwrap();
    value["layers"][0]["textFit"] = json!("shrink");
    let out = ok(&dispatch(OP_VALIDATE, value.to_string().as_bytes()));
    assert_eq!(out["design"]["layers"][0]["textFit"], "shrink");
    // The other layers never chose one, so none is written for them.
    assert!(out["design"]["layers"][1].get("textFit").is_none());
}

#[test]
fn brand_styles_and_the_layers_that_follow_them_survive_validation() {
    let mut value: Value = serde_json::from_str(HOUSE).unwrap();
    value["textStyles"] = json!([{
        "id": "s1", "name": "Detail", "font": "sans", "size": 3.2, "weight": 500,
        "italic": false, "tracking": 0.1, "colorRole": "body"
    }]);
    value["layers"][2]["styleId"] = json!("s1");
    let out = ok(&dispatch(OP_VALIDATE, value.to_string().as_bytes()));
    assert_eq!(out["design"]["textStyles"][0]["name"], "Detail");
    assert_eq!(out["design"]["layers"][2]["styleId"], "s1");
}
