//! What a valid design is. These are the same limits the web app's schema enforces on save, so a
//! design this crate accepts is a design the server will store.

use crate::model::{Design, Layer, Palette};

pub const MAX_LAYERS: usize = 60;
pub const THEMES: [&str; 4] = [
    "royal_gold",
    "emerald_regal",
    "sunset_asoebi",
    "monochrome_velvet",
];

/// The smallest a layer may be, as a share of the card. A narrower box is refused on save.
pub const MIN_WIDTH: f64 = 5.0;
pub const MIN_HEIGHT: f64 = 0.2;

/// The first thing wrong with a design, and where.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Issue {
    pub path: String,
    pub message: String,
}

impl Issue {
    fn new(path: impl Into<String>, message: impl Into<String>) -> Self {
        Issue {
            path: path.into(),
            message: message.into(),
        }
    }
}

type Check = Result<(), Issue>;

fn range(path: &str, value: f64, lo: f64, hi: f64) -> Check {
    if value.is_finite() && value >= lo && value <= hi {
        Ok(())
    } else {
        Err(Issue::new(
            path,
            format!("{path} must be between {lo} and {hi}"),
        ))
    }
}

fn hex(path: &str, value: &str) -> Check {
    let b = value.as_bytes();
    if b.len() == 7 && b[0] == b'#' && b[1..].iter().all(u8::is_ascii_hexdigit) {
        Ok(())
    } else {
        Err(Issue::new(path, "Use a six-digit hex colour"))
    }
}

fn opt_hex(path: &str, value: &Option<String>) -> Check {
    value.as_deref().map_or(Ok(()), |v| hex(path, v))
}

fn web_url(path: &str, value: &str) -> Check {
    let ok = value.len() <= 100_000
        && (value.starts_with("https://")
            || value.starts_with("http://")
            || value.starts_with("data:image/")
            || value.starts_with("blob:"))
        && !value.contains("javascript:")
        && !value.chars().any(char::is_whitespace);
    if ok {
        Ok(())
    } else {
        Err(Issue::new(
            path,
            "Image links must start with http, https, data:image, or blob",
        ))
    }
}

fn palette(p: &Palette) -> Check {
    for (name, value) in [
        ("paper", &p.paper),
        ("paperEdge", &p.paper_edge),
        ("ink", &p.ink),
        ("title", &p.title),
        ("body", &p.body),
        ("accent", &p.accent),
        ("foil", &p.foil),
        ("ribbonA", &p.ribbon_a),
        ("ribbonB", &p.ribbon_b),
        ("stageFrom", &p.stage_from),
        ("stageTo", &p.stage_to),
    ] {
        hex(&format!("palette.{name}"), value)?;
    }
    Ok(())
}

fn layer(i: usize, l: &Layer) -> Check {
    let at = |field: &str| format!("layers[{i}].{field}");
    if l.id.is_empty() || l.id.chars().count() > 48 {
        return Err(Issue::new(at("id"), "A layer id is 1 to 48 characters"));
    }
    if l.text.chars().count() > 600 {
        return Err(Issue::new(at("text"), "Text can be at most 600 characters"));
    }
    range(&at("x"), l.x, -500.0, 500.0)?;
    range(&at("y"), l.y, -500.0, 500.0)?;
    range(&at("width"), l.width, MIN_WIDTH, 1000.0)?;
    range(&at("size"), l.size, 1.0, 20.0)?;
    if ![400, 500, 600, 700].contains(&l.weight) {
        return Err(Issue::new(at("weight"), "Weight is 400, 500, 600 or 700"));
    }
    range(&at("tracking"), l.tracking, 0.0, 1.0)?;
    opt_hex(&at("color"), &l.color)?;
    if let Some(name) = &l.name {
        if name.trim().chars().count() > 60 {
            return Err(Issue::new(
                at("name"),
                "A layer name is at most 60 characters",
            ));
        }
    }
    if let Some(v) = l.height {
        range(&at("height"), v, MIN_HEIGHT, 1000.0)?;
    }
    if let Some(v) = l.rotation {
        range(&at("rotation"), v, -360.0, 360.0)?;
    }
    if let Some(v) = l.opacity {
        range(&at("opacity"), v, 0.0, 1.0)?;
    }
    opt_hex(&at("fill"), &l.fill)?;
    opt_hex(&at("stroke"), &l.stroke)?;
    if let Some(v) = l.stroke_width {
        range(&at("strokeWidth"), v, 0.0, 10.0)?;
    }
    if let Some(v) = l.radius {
        range(&at("radius"), v, 0.0, 2000.0)?;
    }
    if let Some(url) = &l.image_url {
        web_url(&at("imageUrl"), url)?;
    }
    Ok(())
}

/// Checks a design against every limit. Returns the first problem, so the person is told one
/// thing to fix at a time.
pub fn validate(d: &Design) -> Check {
    if d.version != 1 {
        return Err(Issue::new("version", "Unknown design version"));
    }
    if !THEMES.contains(&d.theme.as_str()) {
        return Err(Issue::new("theme", "Unknown theme"));
    }
    if let Some(c) = d.canvas {
        range("canvas.ratio", c.ratio, 0.4, 2.5)?;
        if let Some(w) = c.width_px {
            if !(200..=10000).contains(&w) {
                return Err(Issue::new("canvas.widthPx", "Canvas width must be 200 to 10000 px"));
            }
        }
        if let Some(h) = c.height_px {
            if !(200..=10000).contains(&h) {
                return Err(Issue::new("canvas.heightPx", "Canvas height must be 200 to 10000 px"));
            }
        }
        if let Some(r) = c.corner_radius_px {
            range("canvas.cornerRadiusPx", r, 0.0, 500.0)?;
        }
    }
    palette(&d.palette)?;
    range("background.overlay", d.background.overlay, 0.0, 0.9)?;
    opt_hex("background.color", &d.background.color)?;
    if let Some(url) = &d.background.image_url {
        web_url("background.imageUrl", url)?;
    }
    if d.layers.len() > MAX_LAYERS {
        return Err(Issue::new(
            "layers",
            format!("A card holds at most {MAX_LAYERS} layers"),
        ));
    }
    d.layers
        .iter()
        .enumerate()
        .try_for_each(|(i, l)| layer(i, l))
}
