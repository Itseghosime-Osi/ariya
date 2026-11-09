export interface GuideLine {
  type: "vertical" | "horizontal";
  posPct: number;
  label?: string;
}

export interface SnapBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SnapTarget {
  id: string;
  x: number;
  y: number;
  width: number;
  height?: number;
}

const DEFAULT_THRESHOLD_PCT = 1.0;

/**
 * Computes magnetic alignment snap coordinates and visual guides
 * for canvas objects. Snaps to:
 * 1. Card horizontal and vertical center (50%)
 * 2. Card margins (5% and 95%)
 * 3. Left, center, and right edges of other layers
 * 4. Top, center, and bottom edges of other layers
 */
export interface UserSnapGuide {
  axis: "horizontal" | "vertical";
  posPct: number;
  label?: string;
}

export function calculateSnaps(
  current: SnapBox,
  otherLayers: SnapTarget[],
  thresholdPct = DEFAULT_THRESHOLD_PCT,
  userGuides: UserSnapGuide[] = []
): {
  x: number;
  y: number;
  guides: GuideLine[];
} {
  let snappedX = current.x;
  let snappedY = current.y;
  const guides: GuideLine[] = [];

  const currCenterX = current.x + current.width / 2;
  const currRightX = current.x + current.width;

  const currCenterY = current.y + current.height / 2;
  const currBottomY = current.y + current.height;

  // ------------------------------------------------------------- Vertical Snaps (X Axis)
  let bestDiffX = thresholdPct + 0.001;
  let chosenX: number | null = null;
  let vGuide: GuideLine | null = null;

  // 0. User Created Ruler Guides (highest priority)
  for (const ug of userGuides.filter((g) => g.axis === "vertical")) {
    const leftDiff = Math.abs(current.x - ug.posPct);
    if (leftDiff < bestDiffX) {
      bestDiffX = leftDiff;
      chosenX = ug.posPct;
      vGuide = {
        type: "vertical",
        posPct: ug.posPct,
        label: ug.label ?? "Guide",
      };
    }
    const centerDiff = Math.abs(currCenterX - ug.posPct);
    if (centerDiff < bestDiffX) {
      bestDiffX = centerDiff;
      chosenX = ug.posPct - current.width / 2;
      vGuide = {
        type: "vertical",
        posPct: ug.posPct,
        label: ug.label ?? "Guide Center",
      };
    }
    const rightDiff = Math.abs(currRightX - ug.posPct);
    if (rightDiff < bestDiffX) {
      bestDiffX = rightDiff;
      chosenX = ug.posPct - current.width;
      vGuide = {
        type: "vertical",
        posPct: ug.posPct,
        label: ug.label ?? "Guide",
      };
    }
  }

  // 1. Center of card (50%)
  const cardCenterXDiff = Math.abs(currCenterX - 50);
  if (cardCenterXDiff < bestDiffX) {
    bestDiffX = cardCenterXDiff;
    chosenX = 50 - current.width / 2;
    vGuide = { type: "vertical", posPct: 50, label: "Center" };
  }

  // 2. Card margins
  const leftMarginDiff = Math.abs(current.x - 5);
  if (leftMarginDiff < bestDiffX) {
    bestDiffX = leftMarginDiff;
    chosenX = 5;
    vGuide = { type: "vertical", posPct: 5, label: "Margin" };
  }

  const rightMarginDiff = Math.abs(currRightX - 95);
  if (rightMarginDiff < bestDiffX) {
    bestDiffX = rightMarginDiff;
    chosenX = 95 - current.width;
    vGuide = { type: "vertical", posPct: 95, label: "Margin" };
  }

  // 3. Other layers
  for (const other of otherLayers) {
    const otherCenterX = other.x + other.width / 2;
    const otherRightX = other.x + other.width;

    // Center to center
    const c2cDiff = Math.abs(currCenterX - otherCenterX);
    if (c2cDiff < bestDiffX) {
      bestDiffX = c2cDiff;
      chosenX = otherCenterX - current.width / 2;
      vGuide = {
        type: "vertical",
        posPct: otherCenterX,
        label: "Align Center",
      };
    }

    // Left to left
    const l2lDiff = Math.abs(current.x - other.x);
    if (l2lDiff < bestDiffX) {
      bestDiffX = l2lDiff;
      chosenX = other.x;
      vGuide = { type: "vertical", posPct: other.x, label: "Align Left" };
    }

    // Right to right
    const r2rDiff = Math.abs(currRightX - otherRightX);
    if (r2rDiff < bestDiffX) {
      bestDiffX = r2rDiff;
      chosenX = otherRightX - current.width;
      vGuide = { type: "vertical", posPct: otherRightX, label: "Align Right" };
    }
  }

  if (chosenX != null && vGuide != null) {
    snappedX = chosenX;
    guides.push(vGuide);
  }

  // ----------------------------------------------------------- Horizontal Snaps (Y Axis)
  let bestDiffY = thresholdPct + 0.001;
  let chosenY: number | null = null;
  let hGuide: GuideLine | null = null;

  // 0. User Created Ruler Guides (highest priority)
  for (const ug of userGuides.filter((g) => g.axis === "horizontal")) {
    const topDiff = Math.abs(current.y - ug.posPct);
    if (topDiff < bestDiffY) {
      bestDiffY = topDiff;
      chosenY = ug.posPct;
      hGuide = {
        type: "horizontal",
        posPct: ug.posPct,
        label: ug.label ?? "Guide",
      };
    }
    const centerDiff = Math.abs(currCenterY - ug.posPct);
    if (centerDiff < bestDiffY) {
      bestDiffY = centerDiff;
      chosenY = ug.posPct - current.height / 2;
      hGuide = {
        type: "horizontal",
        posPct: ug.posPct,
        label: ug.label ?? "Guide Center",
      };
    }
    const bottomDiff = Math.abs(currBottomY - ug.posPct);
    if (bottomDiff < bestDiffY) {
      bestDiffY = bottomDiff;
      chosenY = ug.posPct - current.height;
      hGuide = {
        type: "horizontal",
        posPct: ug.posPct,
        label: ug.label ?? "Guide",
      };
    }
  }

  // 1. Center of card (50%)
  const cardCenterYDiff = Math.abs(currCenterY - 50);
  if (cardCenterYDiff < bestDiffY) {
    bestDiffY = cardCenterYDiff;
    chosenY = 50 - current.height / 2;
    hGuide = { type: "horizontal", posPct: 50, label: "Center" };
  }

  // 2. Card margins
  const topMarginDiff = Math.abs(current.y - 5);
  if (topMarginDiff < bestDiffY) {
    bestDiffY = topMarginDiff;
    chosenY = 5;
    hGuide = { type: "horizontal", posPct: 5, label: "Margin" };
  }

  const bottomMarginDiff = Math.abs(currBottomY - 95);
  if (bottomMarginDiff < bestDiffY) {
    bestDiffY = bottomMarginDiff;
    chosenY = 95 - current.height;
    hGuide = { type: "horizontal", posPct: 95, label: "Margin" };
  }

  // 3. Other layers
  for (const other of otherLayers) {
    const otherH = other.height ?? 4;
    const otherCenterY = other.y + otherH / 2;
    const otherBottomY = other.y + otherH;

    // Center to center
    const c2cDiff = Math.abs(currCenterY - otherCenterY);
    if (c2cDiff < bestDiffY) {
      bestDiffY = c2cDiff;
      chosenY = otherCenterY - current.height / 2;
      hGuide = {
        type: "horizontal",
        posPct: otherCenterY,
        label: "Align Middle",
      };
    }

    // Top to top
    const t2tDiff = Math.abs(current.y - other.y);
    if (t2tDiff < bestDiffY) {
      bestDiffY = t2tDiff;
      chosenY = other.y;
      hGuide = { type: "horizontal", posPct: other.y, label: "Align Top" };
    }

    // Bottom to bottom
    const b2bDiff = Math.abs(currBottomY - otherBottomY);
    if (b2bDiff < bestDiffY) {
      bestDiffY = b2bDiff;
      chosenY = otherBottomY - current.height;
      hGuide = {
        type: "horizontal",
        posPct: otherBottomY,
        label: "Align Bottom",
      };
    }
  }

  if (chosenY != null && hGuide != null) {
    snappedY = chosenY;
    guides.push(hGuide);
  }

  return {
    x: snappedX,
    y: snappedY,
    guides,
  };
}
