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
    d.canvas = Some(ariya_design_core::model::Canvas { ratio: 9.0 });
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
fn resizing_never_leaves_the_card_or_gets_narrower_than_a_card_can_save() {
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
    assert_eq!((wide.x, wide.width), (20.0, 80.0));
    let corner = ops::resize_box(start, Handle::Nw, -30.0, -30.0, false);
    assert_eq!((corner.x, corner.y), (0.0, 0.0));
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
