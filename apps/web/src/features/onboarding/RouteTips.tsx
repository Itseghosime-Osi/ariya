"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { PageTips } from "./PageTips";
import { tipsForPath } from "./page-help";

/** Asked for by the Help button: show this page's tips again, even once dismissed. */
export const SHOW_TIPS_EVENT = "ariya:show-tips";

/** The tips card for whichever celebration page is open, above its content. */
export function RouteTips() {
  const pathname = usePathname() ?? "";
  const tips = tipsForPath(pathname);
  const [forced, setForced] = useState<string | null>(null);

  useEffect(() => {
    const show = (e: Event) => {
      if (!tips) return;
      e.preventDefault();
      setForced(tips.key);
    };
    window.addEventListener(SHOW_TIPS_EVENT, show);
    return () => window.removeEventListener(SHOW_TIPS_EVENT, show);
  }, [tips]);

  if (!tips) return null;
  return (
    <PageTips
      key={tips.key}
      tipKey={tips.key}
      items={tips.items}
      forced={forced === tips.key}
      onDismiss={() => setForced(null)}
    />
  );
}
