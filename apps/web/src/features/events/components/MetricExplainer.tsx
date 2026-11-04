"use client";

import React from "react";
import * as Popover from "@radix-ui/react-popover";
import { Icon } from "@/components/ui/icon";

/**
 * Accessible Radix Popover (ⓘ) explaining the difference between
 * invitation parties and headcount people.
 */
export function MetricExplainer() {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="What is the difference between parties and people?"
          className="inline-flex min-h-[28px] min-w-[28px] items-center justify-center rounded-full text-label-2 hover:bg-burgundy/10 hover:text-burgundy transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
        >
          <Icon name="info" size={15} />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          sideOffset={6}
          align="end"
          className="glass z-50 max-w-[260px] rounded-xl p-3 text-xs leading-relaxed text-night shadow-lg focus:outline-none"
        >
          <p className="font-semibold text-night mb-1">Parties vs. people</p>
          <p className="text-label-2">
            A <strong>party</strong> is one invitation (a couple or family);{" "}
            <strong>people</strong> is the total headcount across parties.
          </p>
          <Popover.Arrow className="fill-ivory" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
