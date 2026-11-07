import React from "react";
import Link from "next/link";
import { slugify, type Block } from "@/lib/docs";

const TOKEN = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;

/** `code`, **bold** and [links](/path): the only markup the manual allows. */
export function Inline({ text }: { text: string }) {
  const parts = text.split(TOKEN).filter(Boolean);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
          return (
            <code
              key={i}
              className="rounded-md bg-night/[0.06] px-1.5 py-0.5 font-mono text-[0.86em] text-wine [overflow-wrap:anywhere]"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
          return (
            <strong key={i} className="font-semibold">
              {part.slice(2, -2)}
            </strong>
          );
        }
        const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
        if (link) {
          const [, label, href] = link;
          const cls =
            "font-semibold text-burgundy underline underline-offset-2 hover:text-wine";
          return /^https?:|^mailto:/.test(href) ? (
            <a key={i} href={href} className={cls}>
              {label}
            </a>
          ) : (
            <Link key={i} href={href} className={cls}>
              {label}
            </Link>
          );
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
}

const TONES = {
  info: "border-gold/50 bg-gold/10",
  tip: "border-[#1f6b4a]/40 bg-[#1f6b4a]/10",
  warn: "border-[#9e2a2b]/40 bg-[#9e2a2b]/[0.07]",
} as const;
const LABELS = { info: "Note", tip: "Tip", warn: "Careful" } as const;

export function DocBlocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-4 text-[16px] leading-relaxed text-night">
      {blocks.map((b, i) => {
        switch (b.t) {
          case "h2":
            return (
              <h2
                key={i}
                id={slugify(b.x)}
                className="mt-10 scroll-mt-24 border-t border-hairline pt-6 font-display text-2xl font-bold text-night first:mt-0"
              >
                <Inline text={b.x} />
              </h2>
            );
          case "h3":
            return (
              <h3
                key={i}
                id={slugify(b.x)}
                className="mt-6 scroll-mt-24 font-display text-xl font-bold"
              >
                <Inline text={b.x} />
              </h3>
            );
          case "p":
            return (
              <p key={i}>
                <Inline text={b.x} />
              </p>
            );
          case "ul":
            return (
              <ul key={i} className="ml-5 list-disc space-y-1.5 pl-1">
                {b.x.map((li, j) => (
                  <li key={j}>
                    <Inline text={li} />
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i} className="ml-5 list-decimal space-y-1.5 pl-1">
                {b.x.map((li, j) => (
                  <li key={j}>
                    <Inline text={li} />
                  </li>
                ))}
              </ol>
            );
          case "table":
            return (
              <div
                key={i}
                className="overflow-x-auto rounded-2xl border border-hairline bg-white/60"
                tabIndex={0}
                role="region"
                aria-label="Table, scrolls sideways on small screens"
              >
                <table className="w-full min-w-[34rem] border-collapse text-left text-[14.5px]">
                  <thead>
                    <tr className="bg-night/[0.04]">
                      {b.head.map((h) => (
                        <th
                          key={h}
                          scope="col"
                          className="px-3.5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-gold-ink"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((row, r) => (
                      <tr
                        key={r}
                        className="border-t border-hairline align-top"
                      >
                        {row.map((cell, c) => (
                          <td key={c} className="px-3.5 py-2.5">
                            <Inline text={cell} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "note": {
            const tone = b.tone ?? "info";
            return (
              <aside
                key={i}
                className={`rounded-2xl border px-4 py-3 text-[15px] ${TONES[tone]}`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-ink">
                  {b.title ?? LABELS[tone]}
                </p>
                <p className="mt-1">
                  <Inline text={b.x} />
                </p>
              </aside>
            );
          }
          case "code":
            return (
              <pre
                key={i}
                tabIndex={0}
                className="overflow-x-auto rounded-2xl bg-[#1c070d] px-4 py-3 font-mono text-[13.5px] leading-relaxed text-[#f4e8cc]"
              >
                <code>{b.x}</code>
              </pre>
            );
        }
      })}
    </div>
  );
}
