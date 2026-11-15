import type { Transition } from "motion/react";

/**
 * How the dock's More menu opens, shared by the host dashboard and the admin desk: like an
 * invitation card drawn out of its envelope. It rises a little from the dock, is revealed from the
 * bottom edge up, and a gold rule is drawn across its top. Quick (about a third of a second in,
 * under a fifth out) and with no wobble.
 */
const OUT_QUINT = [0.22, 1, 0.36, 1] as const;
const IN_CUBIC = [0.55, 0, 1, 0.45] as const;

export const SHEET_MOTION = {
  initial: {
    opacity: 0,
    y: 18,
    scale: 0.97,
    clipPath: "inset(100% 0% 0% 0% round 28px)",
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    clipPath: "inset(0% 0% 0% 0% round 28px)",
    transition: {
      duration: 0.32,
      ease: OUT_QUINT,
      opacity: { duration: 0.18 },
    } satisfies Transition,
  },
  exit: {
    opacity: 0,
    y: 12,
    scale: 0.98,
    transition: { duration: 0.16, ease: IN_CUBIC } satisfies Transition,
  },
} as const;

/** The gold rule across the sheet's top edge, drawn from the middle outwards. */
export const SHEET_RULE_MOTION = {
  initial: { scaleX: 0, opacity: 0 },
  animate: {
    scaleX: 1,
    opacity: 1,
    transition: { duration: 0.42, ease: OUT_QUINT, delay: 0.08 },
  },
} as const;

/** Each link in the sheet settles in just behind the reveal, a few hundredths of a second apart. */
export function sheetItemMotion(i: number) {
  return {
    initial: { opacity: 0, y: 8 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.24, ease: OUT_QUINT, delay: 0.1 + i * 0.03 },
    },
  } as const;
}
