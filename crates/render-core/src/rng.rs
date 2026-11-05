//! Deterministic randomness for procedural scene detail.
//!
//! Mirrors `rng` and `hash` in `public/hall3d/geo.js`, so a hall generated in Rust is
//! laid out exactly as it was in JavaScript.

#[derive(Clone, Debug)]
pub struct XorShift32 {
    state: u32,
}

impl XorShift32 {
    pub fn new(seed: u32) -> Self {
        Self {
            state: if seed == 0 { 1 } else { seed },
        }
    }

    pub fn next_unit(&mut self) -> f64 {
        let mut s = self.state;
        s ^= s.wrapping_shl(13);
        s ^= s >> 17;
        s ^= s.wrapping_shl(5);
        self.state = s;
        f64::from(s % 100_000) / 100_000.0
    }
}

/// FNV-1a over UTF-16 code units, matching JavaScript's `charCodeAt`.
pub fn hash_str(value: &str) -> u32 {
    let mut h: u32 = 2_166_136_261;
    for unit in value.encode_utf16() {
        h ^= u32::from(unit);
        h = h.wrapping_mul(16_777_619);
    }
    h
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sequence(seed: u32, count: usize) -> Vec<f64> {
        let mut rng = XorShift32::new(seed);
        (0..count).map(|_| rng.next_unit()).collect()
    }

    #[test]
    fn rng_matches_the_hall_implementation() {
        let cases: [(u32, [f64; 5]); 3] = [
            (1, [0.70369, 0.34689, 0.35461, 0.99695, 0.89233]),
            (42, [0.55432, 0.18348, 0.57059, 0.46016, 0.83556]),
            (123_456_789, [0.67881, 0.13396, 0.77441, 0.00336, 0.19686]),
        ];
        for (seed, expected) in cases {
            assert_eq!(sequence(seed, 5), expected.to_vec(), "seed {seed}");
        }
    }

    #[test]
    fn zero_seed_does_not_stick_at_zero() {
        assert_ne!(sequence(0, 3), vec![0.0, 0.0, 0.0]);
    }

    #[test]
    fn hash_matches_the_hall_implementation() {
        let cases = [
            ("", 2_166_136_261),
            ("Chidinma & Tunde", 2_232_047_884),
            ("Adaeze Okonkwo", 2_580_547_825),
            ("Table 1", 2_083_920_372),
        ];
        for (value, expected) in cases {
            assert_eq!(hash_str(value), expected, "{value:?}");
        }
    }
}
