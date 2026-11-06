//! A uniform grid of footprints, so a neighbour query looks at a handful of cells rather than
//! every item in the room.
//!
//! Called from `archetype.rs` (overlap checks while packing) and `score.rs` (comfort, penalties),
//! and declared in `lib.rs`. No existing module indexes footprints: `fit.rs` compares every pair,
//! which is fine for one table type but not for a 300-table search. Reads and writes
//! `geometry::Footprint`; holds no other state.

use crate::geometry::{extents, Footprint};

/// Footprints bucketed by the cell their centre falls in.
pub struct Grid {
    cell: f64,
    cols: usize,
    rows: usize,
    buckets: Vec<Vec<usize>>,
    items: Vec<Footprint>,
}

impl Grid {
    /// A grid covering a `width` × `length` room. `cell` should be at least the largest footprint
    /// plus the gap, so a query never misses a neighbour.
    pub fn new(width: f64, length: f64, cell: f64) -> Self {
        let cell = cell.max(0.25);
        let cols = (width / cell).ceil() as usize + 1;
        let rows = (length / cell).ceil() as usize + 1;
        Self {
            cell,
            cols,
            rows,
            buckets: vec![Vec::new(); cols * rows],
            items: Vec::new(),
        }
    }

    fn key(&self, x: f64, y: f64) -> (usize, usize) {
        let cx = (x / self.cell).floor().clamp(0.0, self.cols as f64 - 1.0) as usize;
        let cy = (y / self.cell).floor().clamp(0.0, self.rows as f64 - 1.0) as usize;
        (cx, cy)
    }

    /// Add a footprint and return its index.
    pub fn insert(&mut self, f: Footprint) -> usize {
        let (x, y) = f.centre();
        let (cx, cy) = self.key(x, y);
        let i = self.items.len();
        self.buckets[cy * self.cols + cx].push(i);
        self.items.push(f);
        i
    }

    /// Indices of every item whose cell overlaps `f` grown by `pad`, written into `out`.
    ///
    /// The buffer is reused so a hot loop does not allocate per query.
    pub fn near_into(&self, f: &Footprint, pad: f64, out: &mut Vec<usize>) {
        out.clear();
        let (x, y) = f.centre();
        let (ex, ey) = extents(f);
        let (x0, y0) = self.key(x - ex - pad, y - ey - pad);
        let (x1, y1) = self.key(x + ex + pad, y + ey + pad);
        for cy in y0..=y1 {
            for cx in x0..=x1 {
                out.extend_from_slice(&self.buckets[cy * self.cols + cx]);
            }
        }
    }

    pub fn get(&self, i: usize) -> &Footprint {
        &self.items[i]
    }

    pub fn len(&self) -> usize {
        self.items.len()
    }

    pub fn is_empty(&self) -> bool {
        self.items.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::geometry::footprint;

    #[test]
    fn a_query_finds_a_neighbour_that_is_close() {
        let mut grid = Grid::new(30.0, 20.0, 3.0);
        let a = footprint("round", 8, 5.0, 5.0, 0.0);
        let b = footprint("round", 8, 6.0, 5.0, 0.0);
        grid.insert(a);
        grid.insert(b);
        let mut out = Vec::new();
        grid.near_into(&a, 0.0, &mut out);
        assert!(out.contains(&1), "the neighbour should be found");
    }

    #[test]
    fn a_query_does_not_find_a_far_neighbour() {
        let mut grid = Grid::new(30.0, 20.0, 3.0);
        let a = footprint("round", 8, 2.0, 2.0, 0.0);
        let b = footprint("round", 8, 25.0, 17.0, 0.0);
        grid.insert(a);
        grid.insert(b);
        let mut out = Vec::new();
        grid.near_into(&a, 0.0, &mut out);
        assert!(!out.contains(&1));
    }

    #[test]
    fn the_buffer_is_cleared_between_queries() {
        let mut grid = Grid::new(30.0, 20.0, 3.0);
        grid.insert(footprint("round", 8, 5.0, 5.0, 0.0));
        let mut out = vec![99];
        grid.near_into(&footprint("round", 8, 25.0, 17.0, 0.0), 0.0, &mut out);
        assert!(!out.contains(&99));
    }

    #[test]
    fn a_footprint_outside_the_room_is_clamped_not_panicked() {
        let mut grid = Grid::new(30.0, 20.0, 3.0);
        grid.insert(footprint("round", 8, -5.0, -5.0, 0.0));
        let mut out = Vec::new();
        grid.near_into(&footprint("round", 8, 40.0, 40.0, 0.0), 0.0, &mut out);
        assert!(out.is_empty());
    }
}
