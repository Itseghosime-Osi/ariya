"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const CLASS =
  "inline-flex min-h-11 items-center justify-center rounded-2xl bg-wine px-6 text-xs font-semibold text-ivory shadow-md transition-all hover:bg-wine/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy";

/**
 * Takes a visitor back to the page they came from, such as the page editor a host opened their
 * unpublished page from. Someone who arrived any other way (a pasted link, a search) is sent to the
 * Àríyá home page, and the button says so.
 */
export function GoBackLink() {
  const router = useRouter();
  const [from, setFrom] = useState<string | null>(null);

  useEffect(() => {
    try {
      const ref = document.referrer ? new URL(document.referrer) : null;
      if (ref && ref.origin === window.location.origin) {
        const target = `${ref.pathname}${ref.search}${ref.hash}`;
        if (target !== `${window.location.pathname}${window.location.search}`) {
          setFrom(target);
        }
      }
    } catch {
      // No usable referrer: the button falls back to the home page.
    }
  }, []);

  const go = () => {
    if (from === null) {
      router.push("/");
    } else if (window.history.length > 1) {
      router.back();
    } else {
      // Opened in a fresh tab from the editor: there is no history, so open the page itself.
      router.push(from);
    }
  };

  return (
    <button type="button" onClick={go} className={CLASS}>
      {from === null ? "Return to Àríyá" : "Go back"}
    </button>
  );
}
