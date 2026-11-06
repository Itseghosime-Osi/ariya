//! Civil dates, without a dependency and without a clock.
//!
//! The risk register and the checklist both turn "the event is on this date" into "this task is due
//! this many days before it". Doing that in `f64` timestamps invites off-by-one days across a
//! leap year; doing it with a date library pulls a whole crate in for two functions. Howard
//! Hinnant's `days_from_civil` / `civil_from_days` are exact for the proleptic Gregorian calendar
//! and fit in twenty lines, so they live here.
//!
//! Nothing in this module reads the system clock. A date in is a date out.

/// A calendar date, with no time zone.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Date {
    pub year: i64,
    pub month: u32,
    pub day: u32,
}

impl Date {
    /// Read the date from the head of a string: `yyyy-mm-dd`, or an ISO timestamp, which is
    /// truncated to its date. Returns `None` for anything else, including a month or day out of
    /// range.
    pub fn parse(text: &str) -> Option<Date> {
        let head = text.get(..10)?;
        let mut parts = head.split('-');
        let year: i64 = parts.next()?.parse().ok()?;
        let month: u32 = parts.next()?.parse().ok()?;
        let day: u32 = parts.next()?.parse().ok()?;
        if !(1..=12).contains(&month) || !(1..=31).contains(&day) {
            return None;
        }
        Some(Date { year, month, day })
    }

    /// The date `days` before this one. A negative `days` moves forward.
    pub fn minus_days(self, days: i64) -> Date {
        let (year, month, day) =
            civil_from_days(days_from_civil(self.year, self.month, self.day) - days);
        Date { year, month, day }
    }

    /// `yyyy-mm-dd`.
    pub fn iso(self) -> String {
        format!("{:04}-{:02}-{:02}", self.year, self.month, self.day)
    }
}

/// Days since 1970-01-01. Exact for the proleptic Gregorian calendar.
pub fn days_from_civil(y: i64, m: u32, d: u32) -> i64 {
    let y = if m <= 2 { y - 1 } else { y };
    let era = if y >= 0 { y } else { y - 399 } / 400;
    let yoe = y - era * 400;
    let mp = if m > 2 { m - 3 } else { m + 9 } as i64;
    let doy = (153 * mp + 2) / 5 + d as i64 - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    era * 146_097 + doe - 719_468
}

/// The inverse of [`days_from_civil`].
pub fn civil_from_days(z: i64) -> (i64, u32, u32) {
    let z = z + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let m = if mp < 10 { mp + 3 } else { mp - 9 } as u32;
    (if m <= 2 { y + 1 } else { y }, m, d)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_a_date_and_an_iso_timestamp_alike() {
        let d = Date::parse("2026-12-12T18:30:00Z").unwrap();
        assert_eq!(
            d,
            Date {
                year: 2026,
                month: 12,
                day: 12
            }
        );
        assert_eq!(d.iso(), "2026-12-12");
    }

    #[test]
    fn refuses_what_is_not_a_date() {
        assert!(Date::parse("12/12/2026").is_none());
        assert!(Date::parse("2026-13-01").is_none());
        assert!(Date::parse("2026-12").is_none());
        assert!(Date::parse("").is_none());
    }

    #[test]
    fn counts_back_over_a_leap_day() {
        let march_first = Date {
            year: 2028,
            month: 3,
            day: 1,
        };
        assert_eq!(
            march_first.minus_days(1),
            Date {
                year: 2028,
                month: 2,
                day: 29
            }
        );
        assert_eq!(
            march_first.minus_days(30),
            Date {
                year: 2028,
                month: 1,
                day: 31
            }
        );
    }

    #[test]
    fn counts_back_over_a_year_boundary() {
        let january_second = Date {
            year: 2027,
            month: 1,
            day: 2,
        };
        assert_eq!(
            january_second.minus_days(3),
            Date {
                year: 2026,
                month: 12,
                day: 30
            }
        );
    }

    #[test]
    fn moves_forward_for_a_negative_count() {
        let d = Date {
            year: 2026,
            month: 12,
            day: 31,
        };
        assert_eq!(
            d.minus_days(-1),
            Date {
                year: 2027,
                month: 1,
                day: 1
            }
        );
    }

    #[test]
    fn the_two_conversions_undo_each_other() {
        for z in [-1_000_000, -1, 0, 1, 20_700, 1_000_000] {
            let (y, m, d) = civil_from_days(z);
            assert_eq!(days_from_civil(y, m, d), z, "{y}-{m}-{d}");
        }
    }
}
