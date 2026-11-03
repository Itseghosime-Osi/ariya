"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

type DocLink = { id: string; label: string };

const SIDE_GROUPS: { title: string; links: DocLink[] }[] = [
  {
    title: "Introduction",
    links: [
      { id: "overview", label: "Overview" },
      { id: "quick-start", label: "Quick start" },
    ],
  },
  {
    title: "Planning",
    links: [
      { id: "guest-list", label: "Guest list" },
      { id: "invitations", label: "Invitations & RSVP" },
      { id: "seating", label: "Seating" },
      { id: "vendors", label: "Vendors" },
      { id: "check-in", label: "Check-in" },
    ],
  },
  {
    title: "Reference",
    links: [
      { id: "pricing", label: "Pricing & passes" },
      { id: "faq", label: "FAQ" },
    ],
  },
];

const TOC_GROUPS: { title: string; links: DocLink[] }[] = [
  {
    title: "Plan your celebration",
    links: [
      { id: "overview", label: "Overview" },
      { id: "quick-start", label: "Quick start" },
      { id: "guest-list", label: "Guest list" },
      { id: "invitations", label: "Invitations & RSVP" },
      { id: "seating", label: "Seating" },
      { id: "vendors", label: "Vendors" },
      { id: "check-in", label: "Check-in" },
    ],
  },
  {
    title: "Reference",
    links: [
      { id: "pricing", label: "Pricing & passes" },
      { id: "faq", label: "FAQ" },
    ],
  },
];

const ALL_LINKS = SIDE_GROUPS.flatMap((group) => group.links);

export function DocsRoom({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);

  const q = query.trim().toLowerCase();
  const matches = q
    ? ALL_LINKS.filter((link) => link.label.toLowerCase().includes(q))
    : null;
  const status = matches
    ? `${matches.length} ${matches.length === 1 ? "section matches" : "sections match"}.`
    : "";

  // Marks the section currently in the reading band, the way a thumb would.
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const sections = Array.from(
      grid.querySelectorAll<HTMLElement>(".doc-main section[id]")
    );
    const spy = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-30% 0px -55% 0px" }
    );
    sections.forEach((section) => spy.observe(section));
    return () => spy.disconnect();
  }, []);

  useEffect(() => {
    function onKeyDown(e: globalThis.KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function onSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setQuery("");
      return;
    }
    if (e.key !== "Enter") return;
    const first = (matches ?? ALL_LINKS)[0];
    if (!first) return;
    e.preventDefault();
    document.getElementById(first.id)?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  }

  const current = (id: string) => (active === id ? "true" : undefined);

  return (
    <>
      <section className="wineband docs-hero" aria-labelledby="docsTitle">
        <div className="wrap">
          <span className="caps">Docs</span>
          <h1 id="docsTitle">
            How Àríyá <em className="foil-text">works.</em>
          </h1>
          <p>
            Guides to your guest list, invitations, replies, seats and vendors.
            Start with the overview, or jump straight to what you need.
          </p>
          <div className="doc-search">
            <label className="sr-only" htmlFor="docSearch">
              Search the guides
            </label>
            <input
              className="input"
              id="docSearch"
              type="search"
              placeholder="Search the guides — try “seating” or “plus-one”"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onSearchKeyDown}
              ref={searchRef}
            />
            <kbd aria-hidden="true">⌘K</kbd>
          </div>
          <p className="sr-status" role="status">
            {status}
          </p>
        </div>
      </section>

      <div className="wrap docs" ref={gridRef}>
        <aside className="doc-side" aria-label="Guide sections">
          <h2>Guides</h2>
          {SIDE_GROUPS.map((group) => {
            const links = matches
              ? group.links.filter((link) => matches.includes(link))
              : group.links;
            if (links.length === 0) return null;
            return (
              <div className="doc-group" key={group.title}>
                <h3>{group.title}</h3>
                <ul>
                  {links.map((link) => (
                    <li key={link.id}>
                      <a href={`#${link.id}`} aria-current={current(link.id)}>
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </aside>

        {children}

        <aside className="doc-toc" aria-label="On this page">
          <h2>On this page</h2>
          <nav aria-label="Page sections">
            {TOC_GROUPS.map((group) => (
              <div key={group.title}>
                <h3>{group.title}</h3>
                <ul>
                  {group.links.map((link) => (
                    <li key={link.id}>
                      <a href={`#${link.id}`} aria-current={current(link.id)}>
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>
      </div>
    </>
  );
}
