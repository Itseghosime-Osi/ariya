import React from "react";

/**
 * Greys out and switches off a whole screen once its celebration has ended. The content stays
 * readable, but nothing inside can be clicked, focused or typed into. Screens with a few things that
 * may still change (vendors) disable their own controls instead.
 */
export function EndedLock({
  ended,
  children,
}: {
  ended: boolean;
  children: React.ReactNode;
}) {
  if (!ended) return <>{children}</>;
  return (
    <div
      inert
      aria-disabled="true"
      data-testid="ended-lock"
      className="select-none opacity-55 saturate-50 [&_*]:cursor-not-allowed"
    >
      {children}
    </div>
  );
}
