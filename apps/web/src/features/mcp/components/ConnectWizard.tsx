"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import {
  FIRST_PROMPTS,
  aiClients,
  claudeCodeCommand,
  codexConfig,
  geminiCliCommand,
  findNewApp,
  type AiClient,
  type AiClientId,
} from "../clients";
import { listConnectedApps } from "../grants";
import type { ConnectedApp } from "../types";
import { CopyButton } from "./CopyButton";

interface ConnectWizardProps {
  address: string;
  /** Apps already connected, so only a new one counts as "it worked". */
  connectedIds: string[];
}

const POLL_MS = 4000;
const GOLD_BUTTON =
  "inline-flex min-h-14 w-full items-center justify-center gap-2.5 rounded-full bg-gradient-to-br from-[#f6e2ad] to-[#d4a85a] px-6 text-[15px] font-semibold text-night shadow-[0_10px_26px_-10px_rgba(212,168,90,0.7)] transition-transform active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f6e2ad] sm:w-auto sm:min-w-[320px]";

/**
 * Connect an AI in three moves: pick it, press one button, approve. The button does the fiddly part
 * (copies the link and opens the app, or hands the app a one-click install). While the host works
 * through the steps this page watches for the connection and says so the moment it lands.
 */
export function ConnectWizard({ address, connectedIds }: ConnectWizardProps) {
  const router = useRouter();
  const clients = aiClients(address);
  const [selectedId, setSelectedId] = useState<AiClientId | null>(null);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState<ConnectedApp | null>(null);
  const [copiedNote, setCopiedNote] = useState<string | null>(null);
  const baseline = useRef(new Set(connectedIds));
  const panel = useRef<HTMLElement>(null);

  const selected = clients.find((c) => c.id === selectedId) ?? null;

  const check = useCallback(async () => {
    const res = await listConnectedApps();
    if (!res.ok) return;
    const fresh = findNewApp(baseline.current, res.data);
    if (fresh) {
      setDone(fresh);
      router.refresh();
    }
  }, [router]);

  // Once the host has pressed the button, look for the new connection every few seconds.
  useEffect(() => {
    if (!started || done) return;
    const timer = setInterval(check, POLL_MS);
    const onFocus = () => void check();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [started, done, check]);

  const choose = (id: AiClientId) => {
    setSelectedId(id);
    setStarted(false);
    setDone(null);
    setCopiedNote(null);
    // On a phone the panel sits below the tiles: bring it up so the button is the next thing seen.
    requestAnimationFrame(() =>
      panel.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    );
  };

  async function press(client: AiClient) {
    const action = client.action;
    setStarted(true);

    let note: string | null = null;
    if (action.copy) {
      try {
        await navigator.clipboard.writeText(action.copy);
        note = "Copied. Paste it where the steps below say.";
      } catch {
        note =
          "Could not copy automatically. Use the link under “Prefer to do it yourself”.";
      }
    } else if (action.kind === "open") {
      note = `${client.name} is opening with Àríyá already filled in.`;
    }
    setCopiedNote(note);
    if (action.kind === "open") {
      window.open(action.url, "_blank", "noopener");
    }
  }

  return (
    <div className="space-y-5">
      <section aria-labelledby="pick-ai">
        <h2
          id="pick-ai"
          className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-gold-ink"
        >
          1 · Choose your AI
        </h2>
        <div
          role="radiogroup"
          aria-labelledby="pick-ai"
          className="grid grid-cols-2 gap-2.5 sm:grid-cols-4"
        >
          {clients.map((client) => {
            const on = client.id === selectedId;
            return (
              <button
                key={client.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => choose(client.id)}
                className={`group flex min-h-[88px] flex-col items-start justify-between rounded-3xl border p-3.5 text-left transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy ${
                  on
                    ? "border-burgundy bg-burgundy text-ivory shadow-[0_14px_30px_-16px_rgba(110,20,38,0.8)]"
                    : "border-hairline bg-white/40 text-night backdrop-blur-sm hover:border-gold/60 hover:bg-white/60"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`grid h-9 w-9 place-items-center rounded-full font-display text-[13px] font-bold ring-1 ${
                    on
                      ? "bg-white/15 text-[#f6e2ad] ring-[#f6e2ad]/50"
                      : "bg-burgundy/10 text-burgundy ring-gold/50"
                  }`}
                >
                  {client.glyph}
                </span>
                <span>
                  <span className="block text-[15px] font-semibold leading-tight">
                    {client.name}
                  </span>
                  <span
                    className={`block text-[11.5px] leading-snug ${
                      on ? "text-ivory/80" : "text-label-2"
                    }`}
                  >
                    {client.tagline}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {!selected && (
        <p className="rounded-3xl border border-dashed border-gold/50 px-5 py-6 text-center text-sm text-label-2">
          Pick the AI you use. We will show you the one button to press.
        </p>
      )}

      {selected && (
        <section
          ref={panel}
          aria-live="polite"
          className="profile-card relative scroll-mt-24 overflow-hidden rounded-[28px] p-5 sm:p-7"
        >
          <span aria-hidden="true" className="profile-card__weave" />
          <div className="relative">
            {done ? (
              <Connected app={done} clientName={selected.name} />
            ) : (
              <>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#f3d98f]">
                  2 · Connect {selected.name}
                </p>
                <h3 className="mt-1.5 font-display text-[1.6rem] font-semibold leading-tight text-[#fff6dc]">
                  One button, then approve
                </h3>

                <div className="mt-5">
                  <button
                    type="button"
                    onClick={() => void press(selected)}
                    className={GOLD_BUTTON}
                  >
                    <Icon
                      name={
                        selected.action.kind === "open" && !selected.action.copy
                          ? "arrow_forward"
                          : "copy"
                      }
                      size={18}
                    />
                    {selected.action.label}
                  </button>
                  {copiedNote && (
                    <p
                      role="status"
                      className="mt-2.5 text-[13px] font-medium text-[#f4e8cc]"
                    >
                      {copiedNote}
                    </p>
                  )}
                </div>

                <ol className="mt-6 space-y-3">
                  {selected.steps.map((step, i) => {
                    const finished = started && i === 0;
                    const copies = (selected.stepCopies ?? []).filter(
                      (chip) => chip.step === i
                    );
                    return (
                      <li key={step} className="flex items-start gap-3">
                        <span
                          aria-hidden="true"
                          className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-bold ${
                            finished
                              ? "bg-[#f6e2ad] text-night"
                              : "bg-white/12 text-[#f4e8cc] ring-1 ring-white/20"
                          }`}
                        >
                          {finished ? <Icon name="check" size={14} /> : i + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[14.5px] leading-relaxed text-[#f4e8cc]">
                            {step}
                          </span>
                          {copies.length > 0 && (
                            <span className="mt-2 flex flex-wrap gap-2">
                              {copies.map((chip) => (
                                <CopyButton
                                  key={chip.label}
                                  value={chip.value}
                                  label={chip.label}
                                  tone="dark"
                                />
                              ))}
                            </span>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ol>

                {selected.notes && selected.notes.length > 0 && (
                  <ul className="mt-5 space-y-2 rounded-2xl border border-[#f6e2ad]/25 px-4 py-3">
                    {selected.notes.map((note) => (
                      <li
                        key={note}
                        className="flex items-start gap-2 text-[13px] leading-relaxed text-[#f4e8cc]"
                      >
                        <Icon
                          name="info"
                          size={14}
                          className="mt-0.5 shrink-0 text-[#f6e2ad]"
                        />
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <div
                  className="mt-6 flex items-center gap-2.5 rounded-2xl bg-white/[0.08] px-4 py-3 text-[13.5px] text-[#f4e8cc]"
                  aria-live="polite"
                >
                  <span
                    aria-hidden="true"
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                      started ? "animate-pulse bg-[#f6e2ad]" : "bg-white/30"
                    }`}
                  />
                  {started
                    ? "Waiting for you to approve. This page will notice the moment it connects."
                    : "When you press the button, this page starts watching for the connection."}
                </div>
              </>
            )}
          </div>
        </section>
      )}

      <details className="group rounded-3xl border border-hairline bg-white/40 px-5 py-4 backdrop-blur-sm">
        <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 text-[14px] font-semibold text-night focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy">
          <span>Prefer to do it yourself? Use the MCP link</span>
          <Icon
            name="expand_more"
            size={18}
            className="shrink-0 text-burgundy transition-transform group-open:rotate-180"
          />
        </summary>
        <p className="mt-3 text-sm text-label-2">
          Any app that accepts a remote MCP link can connect with this one
          address. It is the same for everyone you connect, and it grants
          nothing until you approve it on the sign-in screen.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <code
            data-testid="mcp-address"
            className="min-w-0 flex-1 break-all rounded-2xl border border-hairline bg-ivory px-4 py-3 font-mono text-xs text-night"
          >
            {address}
          </code>
          <CopyButton value={address} label="Copy link" />
        </div>

        <div className="mt-5 border-t border-hairline pt-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold-ink">
            For developers
          </p>
          <p className="mt-1.5 text-sm text-label-2">
            Coding tools take a command or a setting instead.
          </p>
          <DevSnippet
            title="Claude Code"
            value={claudeCodeCommand(address)}
            label="Copy command"
          />
          <DevSnippet
            title="Gemini CLI"
            value={geminiCliCommand(address)}
            label="Copy command"
          />
          <DevSnippet
            title="Codex"
            value={codexConfig(address)}
            label="Copy setting"
          />
        </div>
      </details>
    </div>
  );
}

function DevSnippet({
  title,
  value,
  label,
}: {
  title: string;
  value: string;
  label: string;
}) {
  return (
    <div className="mt-3">
      <p className="mb-1.5 text-xs font-semibold text-night">{title}</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <code className="block min-w-0 flex-1 overflow-x-auto whitespace-pre-wrap break-words rounded-2xl border border-hairline bg-ivory px-4 py-3 font-mono text-xs leading-relaxed text-night">
          {value}
        </code>
        <CopyButton value={value} label={label} />
      </div>
    </div>
  );
}

function Connected({
  app,
  clientName,
}: {
  app: ConnectedApp;
  clientName: string;
}) {
  return (
    <div data-testid="connect-success" className="text-center sm:text-left">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-[#f6e2ad] to-[#d4a85a] text-night shadow-[0_8px_22px_-8px_rgba(212,168,90,0.8)] sm:mx-0">
        <Icon name="verified" size={26} />
      </span>
      <h3 className="mt-4 font-display text-[1.7rem] font-semibold leading-tight text-[#fff6dc]">
        {app.name || clientName} is connected
      </h3>
      <p className="mt-1.5 text-[14.5px] leading-relaxed text-[#f4e8cc]">
        It can now read your celebrations and prepare work for you. Anything
        that sends something waits for your approval first. Try asking:
      </p>
      <ul className="mt-4 space-y-2">
        {FIRST_PROMPTS.map((prompt) => (
          <li
            key={prompt}
            className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.08] px-4 py-2.5"
          >
            <span className="text-[14px] text-[#fff6dc]">{prompt}</span>
            <CopyButton value={prompt} label="Copy" tone="dark" />
          </li>
        ))}
      </ul>
    </div>
  );
}
