import Link from "next/link";
import { formatKobo } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Small, server-rendered pieces shared by the admin pages. */

/** The confirmation carried over from an action that left the page it was on (a delete). */
export function Notice({ text }: { text: string }) {
  if (!text) return null;
  return (
    <p
      role="status"
      className="mb-4 rounded-2xl border border-[#b9dcc6] bg-[#e3f1e8] px-4 py-3 text-sm font-semibold text-[#1e5b3c]"
    >
      {text}
    </p>
  );
}

export function PageTitle({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl">
          {title}
        </h1>
        {sub && <p className="mt-1 text-sm text-label-2">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

export function Section({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mt-8", className)} aria-label={title}>
      <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-gold-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-hairline bg-white/60 p-4">
      <p className="text-xs font-semibold text-label-2">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold tabular-nums text-night">
        {typeof value === "number" ? value.toLocaleString("en-NG") : value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-label-2">{hint}</p>}
    </div>
  );
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {children}
    </div>
  );
}

export function Pill({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "good" | "warn" | "bad" | "gold";
  children: React.ReactNode;
}) {
  const tones = {
    neutral: "bg-night/[0.06] text-night",
    good: "bg-[#e3f1e8] text-[#1e5b3c]",
    warn: "bg-[#fbefd5] text-[#7a4b00]",
    bad: "bg-error/10 text-error",
    gold: "bg-gold/25 text-[#6b4c12]",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold",
        tones[tone]
      )}
    >
      {children}
    </span>
  );
}

/** A plain GET search box with optional filter chips, so results are linkable and back-button friendly. */
export function SearchBar({
  action,
  query,
  placeholder,
  filters,
  filter,
}: {
  action: string;
  query?: string;
  placeholder: string;
  filters?: readonly string[];
  filter?: string;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3">
      <form action={action} role="search" className="flex gap-2">
        {filter && filter !== "all" && (
          <input type="hidden" name="filter" value={filter} />
        )}
        <label htmlFor="admin-search" className="sr-only">
          {placeholder}
        </label>
        <input
          id="admin-search"
          type="search"
          name="q"
          defaultValue={query}
          placeholder={placeholder}
          className="min-h-11 w-full max-w-md rounded-xl border border-outline-variant bg-white px-4 text-sm focus-visible:outline-2 focus-visible:outline-burgundy"
        />
        <button
          type="submit"
          className="min-h-11 rounded-xl bg-night px-4 text-sm font-semibold text-ivory hover:bg-wine"
        >
          Search
        </button>
      </form>
      {filters && (
        <nav aria-label="Filter" className="flex flex-wrap gap-1.5">
          {filters.map((f) => {
            const params = new URLSearchParams();
            if (query) params.set("q", query);
            if (f !== "all") params.set("filter", f);
            const on = (filter ?? "all") === f;
            return (
              <Link
                key={f}
                href={`${action}${params.size ? `?${params}` : ""}`}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-9 items-center rounded-full border px-3 text-xs font-semibold capitalize",
                  on
                    ? "border-night bg-night text-gold"
                    : "border-hairline bg-white/60 text-label-2 hover:text-night"
                )}
              >
                {f}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}

export function Pager({
  path,
  page,
  total,
  pageSize,
  params,
}: {
  path: string;
  page: number;
  total: number;
  pageSize: number;
  params?: Record<string, string | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params ?? {})) if (v) sp.set(k, v);
    if (p > 1) sp.set("page", String(p));
    return `${path}${sp.size ? `?${sp}` : ""}`;
  };
  return (
    <nav
      aria-label="Pages"
      className="mt-4 flex items-center justify-between text-sm text-label-2"
    >
      <span>
        {total.toLocaleString("en-NG")} result{total === 1 ? "" : "s"} · page{" "}
        {page} of {pages}
      </span>
      <span className="flex gap-2">
        {page > 1 && (
          <Link
            className="font-semibold text-burgundy hover:underline"
            href={href(page - 1)}
          >
            Previous
          </Link>
        )}
        {page < pages && (
          <Link
            className="font-semibold text-burgundy hover:underline"
            href={href(page + 1)}
          >
            Next
          </Link>
        )}
      </span>
    </nav>
  );
}

/** A table that scrolls sideways inside its card on a phone instead of widening the page. */
export function DataTable({
  head,
  children,
  empty,
  rows,
}: {
  head: string[];
  children: React.ReactNode;
  empty: string;
  rows: number;
}) {
  if (rows === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-hairline bg-white/40 p-6 text-center text-sm text-label-2">
        {empty}
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-2xl border border-hairline bg-white/60">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-hairline text-[11px] uppercase tracking-[0.08em] text-label-2">
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="px-4 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={cn("px-4 py-3 align-top", className)}>{children}</td>;
}

const dateTime = new Intl.DateTimeFormat("en-NG", {
  timeZone: "Africa/Lagos",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const dateOnly = new Intl.DateTimeFormat("en-NG", {
  timeZone: "Africa/Lagos",
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function when(iso: string | null | undefined, withTime = true) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return (withTime ? dateTime : dateOnly).format(d);
}

export function naira(kobo: number | null | undefined) {
  return formatKobo(Number(kobo ?? 0));
}

export function paymentTone(status: string) {
  return status === "success"
    ? "good"
    : status === "pending"
      ? "warn"
      : status === "refunded"
        ? "gold"
        : "bad";
}

export function pageFrom(raw: string | string[] | undefined) {
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isInteger(n) && n > 0 ? Math.min(n, 10_000) : 1;
}

export function textFrom(raw: string | string[] | undefined, max = 120) {
  const s = Array.isArray(raw) ? raw[0] : raw;
  return (s ?? "").trim().slice(0, max);
}
