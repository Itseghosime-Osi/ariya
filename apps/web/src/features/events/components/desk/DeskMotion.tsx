"use client";

import React from "react";
import {
  LazyMotion,
  MotionConfig,
  m,
  stagger,
  type Variants,
} from "motion/react";
import { domAnimation } from "../motion-features";

const container: Variants = {
  hidden: {},
  show: { transition: { delayChildren: stagger(0.06, { startDelay: 0.05 }) } },
};

export const deskItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", visualDuration: 0.45, bounce: 0.12 },
  },
};

/** The desk's one entrance: tiles rise in a short stagger, once, and stay put after that. */
export function DeskMotion({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <m.div
          className={className}
          variants={container}
          initial="hidden"
          animate="show"
        >
          {children}
        </m.div>
      </MotionConfig>
    </LazyMotion>
  );
}

export function DeskItem({
  children,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section";
}) {
  const Comp = as === "section" ? m.section : m.div;
  return (
    <Comp className={className} variants={deskItem}>
      {children}
    </Comp>
  );
}
