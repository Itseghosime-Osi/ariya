import React from "react";
import type { NeedsAttentionAlert } from "../lib/needs-attention";
import { NeedsAttentionItem } from "./NeedsAttentionItem";

interface NeedsAttentionStripProps {
  items: NeedsAttentionAlert[];
}

export function NeedsAttentionStrip({ items }: NeedsAttentionStripProps) {
  if (items.length === 0) return null;

  return (
    <section
      aria-labelledby="needs-attention-heading"
      data-testid="needs-attention-strip"
      className="space-y-3"
    >
      <div className="flex items-center justify-between gap-2">
        <h2
          id="needs-attention-heading"
          className="text-xs font-semibold uppercase tracking-[0.06em] text-coral flex items-center gap-2"
        >
          <span
            aria-hidden="true"
            className="h-2 w-2 rounded-full bg-coral shrink-0"
          />
          <span>Needs attention</span>
        </h2>
      </div>

      <ul className="grid grid-cols-1 gap-2.5">
        {items.map((item) => (
          <NeedsAttentionItem key={item.id} item={item} />
        ))}
      </ul>
    </section>
  );
}
