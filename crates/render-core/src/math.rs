//! The easing vocabulary the film and the hall already use.
//!
//! These are exact ports of the helpers in `the-yes-controls.js`. The parity tests in
//! `story.rs` compare the composed result against values produced by the original JS.

pub fn clamp(value: f64, min: f64, max: f64) -> f64 {
    value.max(min).min(max)
}

pub fn smooth(x: f64) -> f64 {
    let x = clamp(x, 0.0, 1.0);
    x * x * (3.0 - 2.0 * x)
}

pub fn seg(p: f64, a: f64, b: f64) -> f64 {
    smooth((p - a) / (b - a))
}

pub fn bump(p: f64, a: f64, b: f64, c: f64, d: f64) -> f64 {
    seg(p, a, b) * (1.0 - seg(p, c, d))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn clamp_holds_the_range() {
        assert_eq!(clamp(-1.0, 0.0, 1.0), 0.0);
        assert_eq!(clamp(2.0, 0.0, 1.0), 1.0);
        assert_eq!(clamp(0.25, 0.0, 1.0), 0.25);
        assert_eq!(clamp(5.0, 2.0, 3.0), 3.0);
    }

    #[test]
    fn smooth_eases_between_zero_and_one() {
        assert_eq!(smooth(-1.0), 0.0);
        assert_eq!(smooth(0.0), 0.0);
        assert_eq!(smooth(0.5), 0.5);
        assert_eq!(smooth(1.0), 1.0);
        assert_eq!(smooth(2.0), 1.0);
    }

    #[test]
    fn seg_and_bump_hold_their_edges() {
        assert_eq!(seg(-1.0, 0.0, 1.0), 0.0);
        assert_eq!(seg(2.0, 0.0, 1.0), 1.0);
        assert_eq!(bump(0.5, -1.0, 0.0, 1.0, 2.0), 1.0);
        assert_eq!(bump(-1.0, 0.0, 0.2, 0.8, 1.0), 0.0);
        assert_eq!(bump(1.0, 0.0, 0.2, 0.8, 1.0), 0.0);
    }
}
