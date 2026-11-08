"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const PAGES: ReadonlyArray<readonly [string, string, string]> = [
  ["/", "The film", "Seventeen chapters of a Lagos wedding. Best with sound."],
  [
    "/about",
    "About Àríyá",
    "Invitations, RSVPs and seating, told on one page.",
  ],
  [
    "/product",
    "What we do",
    "Guest lists, personal links, seating and vendors.",
  ],
  [
    "/pricing",
    "Pricing",
    "Pay per event. Placeholder prices for the prototype.",
  ],
  ["/docs", "Docs", "Guides to guest lists, invitations, seating and vendors."],
  [
    "/events",
    "The demo planner",
    "Try it on a sample wedding. Nothing is sent.",
  ],
];

const CURTAIN_KEY = "ariya-curtain";

function useReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduce(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduce;
}

function openCurtain(reduce: boolean) {
  const root = document.documentElement;
  if (!root.classList.contains("cur-in")) return;
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      root.classList.add("cur-opening");
      window.setTimeout(
        () => root.classList.remove("cur-in", "cur-opening"),
        reduce ? 150 : 700
      );
    })
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const reduce = useReducedMotion();

  const [open, setOpen] = useState(false);
  const [ghost, setGhost] = useState("");
  const menuRef = useRef<HTMLDivElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const leavingRef = useRef(false);
  const arrivedRef = useRef(false);

  // A hard load that came from another page: the boot script closed the
  // curtain, so open it once the markup is on screen.
  useEffect(() => {
    openCurtain(reduce);
    try {
      sessionStorage.removeItem(CURTAIN_KEY);
    } catch {
      /* the next page just opens plainly */
    }
  }, [reduce]);

  // A client-side navigation finished: drop the leaving curtain, close it, then
  // open it again so the arrival matches a full page load.
  useEffect(() => {
    if (!arrivedRef.current) return;
    arrivedRef.current = false;
    leavingRef.current = false;

    const root = document.documentElement;
    root.classList.remove("cur-out");
    root.classList.add("cur-in");
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        root.classList.add("cur-opening");
        window.setTimeout(
          () => root.classList.remove("cur-in", "cur-opening"),
          reduce ? 150 : 700
        );
      })
    );
  }, [pathname, reduce]);

  const go = useCallback(
    (href: string) => {
      if (leavingRef.current) return;
      leavingRef.current = true;
      arrivedRef.current = true;
      document.documentElement.classList.add("cur-out");
      window.setTimeout(() => router.push(href), reduce ? 120 : 420);
    },
    [reduce, router]
  );

  // Curtain between pages, and closing the menu when the current page is
  // clicked again.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const a = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target || a.hasAttribute("download")) return;
      if (a.hasAttribute("data-no-curtain")) return;

      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;

      const samePath =
        url.pathname === location.pathname && url.search === location.search;
      if (samePath && url.hash) return; // an in-page anchor
      if (samePath) {
        e.preventDefault();
        setOpen(false);
        return;
      }
      e.preventDefault();
      go(url.pathname + url.search + url.hash);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [go]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("cm-on", open);
    return () => root.classList.remove("cm-on");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const menu = menuRef.current;
    if (!menu) return;
    const focusTarget =
      menu.querySelector<HTMLElement>('.cm-list a[aria-current="page"]') ??
      menu.querySelector<HTMLElement>(".cm-list a");
    const timer = window.setTimeout(
      () => focusTarget?.focus({ preventScroll: true }),
      reduce ? 0 : 450
    );
    return () => window.clearTimeout(timer);
  }, [open, reduce]);

  const close = useCallback(() => {
    setOpen(false);
    const opener = openerRef.current;
    if (opener?.focus) opener.focus({ preventScroll: true });
  }, []);

  function onMenuKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== "Tab") return;
    const menu = menuRef.current;
    if (!menu) return;
    const focusables = menu.querySelectorAll<HTMLElement>("a, button");
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  const current = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const lastWord = (title: string) => title.split(" ").pop() ?? "";

  return (
    <>
      <header className="site-head on-dark" id="top">
        <div className="wrap">
          <Link className="lockup" href="/" aria-label="Àríyá, the film">
            <b>Àríyá</b>
          </Link>

          <nav className="site-nav" aria-label="Main">
            <Link href="/" aria-current={current("/") ? "page" : undefined}>
              The film
            </Link>
            <Link
              href="/about"
              aria-current={current("/about") ? "page" : undefined}
            >
              About
            </Link>
            <Link
              href="/product"
              aria-current={current("/product") ? "page" : undefined}
            >
              What we do
            </Link>
            <Link
              href="/pricing"
              aria-current={current("/pricing") ? "page" : undefined}
            >
              Pricing
            </Link>
            <Link
              href="/docs"
              aria-current={current("/docs") ? "page" : undefined}
            >
              Docs
            </Link>
            <Link className="btn btn-primary btn-small" href="/events">
              Start planning
            </Link>
          </nav>
          <button
            className="btn btn-ghost btn-small cm-btn"
            type="button"
            aria-haspopup="dialog"
            aria-controls="cm"
            aria-expanded={open}
            onClick={(e) => {
              if (open) {
                close();
              } else {
                openerRef.current = e.currentTarget;
                setOpen(true);
              }
            }}
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </header>

      <div
        className={`cm${open ? " open" : ""}`}
        id="cm"
        hidden={!open}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        ref={menuRef}
        onKeyDown={onMenuKeyDown}
      >
        <div className="cm-velvet" aria-hidden="true">
          <i />
          <i />
        </div>
        <div className={`cm-ghost${ghost ? " on" : ""}`} aria-hidden="true">
          {ghost}
        </div>
        <div className="cm-inner">
          <div className="cm-top">
            <span className="cm-mark">Àríyá</span>
            <button type="button" className="cm-close" onClick={close}>
              Close
            </button>
          </div>
          <div className="cm-body">
            <nav aria-label="Pages">
              <ol className="cm-list">
                {PAGES.map(([href, title, desc], i) => (
                  <li key={href} style={{ "--i": i } as React.CSSProperties}>
                    <a
                      href={href}
                      aria-current={current(href) ? "page" : undefined}
                      data-word={lastWord(title)}
                      onPointerEnter={(e) => {
                        if (e.pointerType === "mouse")
                          setGhost(lastWord(title));
                      }}
                      onFocus={() => setGhost(lastWord(title))}
                      onPointerLeave={() => setGhost("")}
                    >
                      <span className="n">0{i + 1}</span>
                      <span className="t">
                        <span>{title}</span>
                      </span>
                      <span className="d">{desc}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </div>
          <div className="cm-foot">
            <span>Àríyá (ah-ree-YAH): merriment, in Yoruba</span>
            <span>Lagos · Benin · Abuja</span>
            <Link href="/i/k701Qx">Open a sample invitation</Link>
          </div>
        </div>
      </div>
    </>
  );
}
