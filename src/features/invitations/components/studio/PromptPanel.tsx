"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { CopyButton } from "@/features/mcp/components/CopyButton";
import { draftInvitationDesign, invitationDesignBrief } from "../../assistant";
import type { StudioApi } from "./types";

const EXAMPLES = [
  "Emerald garden wedding, soft and classic",
  "Royal gold, traditional owambe with aso-ebi",
  "Sunset colours, bold and dramatic, velvet stage",
  "Monochrome, modern and minimal, no seal",
];

const LABEL =
  "mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-gold-ink";

export function PromptPanel({ api }: { api: StudioApi }) {
  const [prompt, setPrompt] = useState("");
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function draft() {
    if (!prompt.trim()) {
      setError("Describe the invitation you want first.");
      return;
    }
    setError(null);
    const result = draftInvitationDesign(prompt, api.content);
    api.replaceDesign(result.design, { commit: true });
    setSummary(result.summary);
  }

  const brief = invitationDesignBrief(api.design, api.content);

  return (
    <div className="space-y-4">
      <div>
        <p className={LABEL}>Prompt the studio</p>
        <label htmlFor="studio-prompt" className="sr-only">
          Describe the invitation you want
        </label>
        <textarea
          id="studio-prompt"
          rows={3}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Emerald garden wedding, soft and classic, with aso-ebi colours..."
          className="desk-field w-full resize-none rounded-2xl px-3 py-2.5 text-xs leading-relaxed text-night placeholder:text-label-2 focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => setPrompt(example)}
            className="desk-chip inline-flex min-h-8 items-center rounded-full px-3 text-left text-[11px] font-medium text-night"
          >
            {example}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={draft}
        className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-burgundy px-4 text-xs font-semibold text-white transition-colors hover:bg-wine focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
      >
        <Icon name="magic" size={15} />
        Draft this invitation
      </button>

      {error && (
        <p role="alert" className="text-xs font-medium text-[#9e2a2b]">
          {error}
        </p>
      )}
      {summary && (
        <p
          role="status"
          className="rounded-xl border border-emerald-900/15 bg-emerald-50/70 px-3 py-2 text-[11px] text-emerald-900"
        >
          Drafted: {summary}
        </p>
      )}

      <div className="border-t border-gold-ink/15 pt-4">
        <p className={LABEL}>Or use your connected AI</p>
        <p className="text-[11px] leading-relaxed text-label-2">
          Copy the brief into Claude, ChatGPT or a designer, then paste their
          answer back through Import. Your connected AI can also read this
          celebration through the Àríyá MCP connection.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <CopyButton value={brief} label="Copy design brief" />
          <Link
            href="/connect-ai"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-burgundy hover:bg-white/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
          >
            Connect your AI
            <Icon name="arrow_forward" size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
