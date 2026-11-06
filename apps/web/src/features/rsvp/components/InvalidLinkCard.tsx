import React from "react";
import Link from "next/link";
import { ERROR_PRIMARY } from "@/components/errors/error-screen";
import { GuestNotice } from "@/components/errors/guest-notice";

export function InvalidLinkCard() {
  return (
    <GuestNotice
      icon="link"
      badge="Link not recognised"
      title="Invitation link not recognised"
      action={
        <Link href="/" className={ERROR_PRIMARY}>
          Return to Àríyá
        </Link>
      }
    >
      <p>
        This invitation link does not match a guest on the list, or it has been
        replaced. Please check the link on your invitation card or message, or
        ask the hosts to send it again.
      </p>
    </GuestNotice>
  );
}
