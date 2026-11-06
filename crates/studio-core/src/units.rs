//! Split air conditioners: what the sticker says, and what the room actually gets.
//!
//! A "HP" on a split is a marketing label, not horsepower — 1 HP is 9,000 BTU/h, or 2.64 kW of
//! cooling. The sticker capacity is measured at 35 °C with a shaded condenser, so a unit bolted to
//! a sunlit wall delivers about 12 % less, and every unit loses more as the coil fouls.
//!
//! The catalogue is deliberately short: the four sizes sold locally. A screening tool that
//! pretends to know the difference between two brands' 1.5 HP units is lying; what matters is the
//! size, the derate, and the sensible heat ratio.
//!
//! Called from `load.rs`. Cited in research §C.3 and §C.9.

use serde::{Deserialize, Serialize};
#[cfg(feature = "ts")]
use ts_rs::TS;

/// Nameplate capacity is measured with the condenser in shade at 35 °C. A condenser in the sun
/// loses 10–15 %; 12 % is the middle of that band, and the number the host can move.
pub const DERATE: f64 = 0.12;

/// One size of split, at its sticker ratings.
#[cfg_attr(feature = "ts", derive(TS))]
#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
#[cfg_attr(
    feature = "ts",
    ts(export, export_to = "../../../packages/studio/src/generated/")
)]
pub struct SplitUnit {
    /// The label on the box, in "HP".
    pub hp: f64,
    pub btu: f64,
    /// Total cooling at rating conditions: sensible plus latent.
    #[serde(rename = "coolingKw")]
    pub cooling_kw: f64,
    /// Electrical draw at rating conditions.
    #[serde(rename = "inputKw")]
    pub input_kw: f64,
    pub amps: f64,
    /// The share of the sticker capacity that goes to sensible cooling in dry air. Higher is
    /// better for a hall that needs temperature more than humidity; no split made for this market
    /// is high enough for a Lagos hall, which is the finding.
    #[serde(rename = "shrRated")]
    pub shr_rated: f64,
    /// And in the air it will actually see. Humid air claws capacity away from the coil's sensible
    /// side, so a unit rated 0.78 behaves nearer 0.68.
    #[serde(rename = "shrHumid")]
    pub shr_humid: f64,
    /// Non-inverter units pull three to five times their running current on start. Nineteen of
    /// them starting together will trip the generator.
    #[serde(rename = "surgeFactor")]
    pub surge_factor: f64,
    /// Supply airflow at the high fan setting, m³/h. This is what mixes the room: a hall with
    /// more air moving has smaller hot spots, which is why the field model needs it.
    #[serde(rename = "airflowM3h")]
    pub airflow_m3h: f64,
}

impl SplitUnit {
    /// What one unit actually delivers, with the sun and a fouled coil taken off.
    pub fn installed_kw(&self, derate: f64) -> f64 {
        self.cooling_kw * (1.0 - derate)
    }

    /// The sensible share of what it delivers, in the damp air of an occupied hall.
    pub fn installed_sensible_kw(&self, derate: f64) -> f64 {
        self.installed_kw(derate) * self.shr_humid
    }

    pub fn installed_latent_kw(&self, derate: f64) -> f64 {
        self.installed_kw(derate) * (1.0 - self.shr_humid)
    }
}

/// The four sizes sold locally, smallest first.
pub const CATALOGUE: [SplitUnit; 4] = [
    SplitUnit {
        hp: 1.0,
        btu: 9_000.0,
        cooling_kw: 2.64,
        input_kw: 0.9,
        amps: 4.0,
        shr_rated: 0.78,
        shr_humid: 0.68,
        surge_factor: 4.0,
        airflow_m3h: 600.0,
    },
    SplitUnit {
        hp: 1.5,
        btu: 12_000.0,
        cooling_kw: 3.52,
        input_kw: 1.25,
        amps: 5.5,
        shr_rated: 0.77,
        shr_humid: 0.67,
        surge_factor: 4.0,
        airflow_m3h: 800.0,
    },
    SplitUnit {
        hp: 2.0,
        btu: 18_000.0,
        cooling_kw: 5.28,
        input_kw: 1.8,
        amps: 8.0,
        shr_rated: 0.76,
        shr_humid: 0.66,
        surge_factor: 4.0,
        airflow_m3h: 1100.0,
    },
    SplitUnit {
        hp: 2.5,
        btu: 24_000.0,
        cooling_kw: 7.03,
        input_kw: 2.2,
        amps: 10.0,
        shr_rated: 0.75,
        shr_humid: 0.65,
        surge_factor: 3.5,
        airflow_m3h: 1400.0,
    },
];

/// The catalogue entry for a given label, or the nearest size to it.
pub fn for_hp(hp: f64) -> SplitUnit {
    CATALOGUE
        .iter()
        .copied()
        .min_by(|a, b| {
            (a.hp - hp)
                .abs()
                .partial_cmp(&(b.hp - hp).abs())
                .unwrap_or(std::cmp::Ordering::Equal)
        })
        .unwrap_or(CATALOGUE[0])
}

/// The largest size, which is the one a hall needs and the one that argues against splits.
pub fn largest() -> SplitUnit {
    CATALOGUE[CATALOGUE.len() - 1]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_size_is_bigger_than_the_one_below_it() {
        for pair in CATALOGUE.windows(2) {
            assert!(pair[1].cooling_kw > pair[0].cooling_kw);
            assert!(pair[1].input_kw > pair[0].input_kw);
        }
    }

    /// The labels are conventions, not physics: 2.64 kW is 9,000 BTU/h, and 12,000 BTU/h is a ton.
    #[test]
    fn the_labels_match_the_btu_ratings() {
        assert!((CATALOGUE[0].btu / 3412.0 - 2.64).abs() < 0.01);
        assert!((CATALOGUE[3].btu / 3412.0 - 7.03).abs() < 0.01);
    }

    #[test]
    fn a_unit_in_the_sun_delivers_less_than_its_sticker() {
        let u = largest();
        assert!(u.installed_kw(DERATE) < u.cooling_kw);
        assert!(
            (u.installed_kw(DERATE) - 6.19).abs() < 0.01,
            "2.5 HP in the sun is about 6.2 kW"
        );
        assert!(
            (u.installed_sensible_kw(DERATE) + u.installed_latent_kw(DERATE)
                - u.installed_kw(DERATE))
            .abs()
                < 1e-9
        );
    }

    #[test]
    fn the_nearest_size_is_chosen_from_a_label() {
        assert_eq!(for_hp(1.6).hp, 1.5);
        assert_eq!(for_hp(2.4).hp, 2.5);
        assert_eq!(for_hp(9.0).hp, 2.5);
    }
}
