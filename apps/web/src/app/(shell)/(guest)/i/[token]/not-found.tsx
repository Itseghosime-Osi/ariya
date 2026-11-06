import React from "react";
import Link from "next/link";
import { ERROR_PRIMARY, ErrorScreen } from "@/components/errors/error-screen";

export default function RsvpNotFound() {
  return (
    <ErrorScreen
      eyebrow="Invitation link"
      title="Invitation not found"
      message="This private invitation link is invalid or has expired. Please check the link you received on your invitation card or in your WhatsApp message."
      actions={
        <Link href="/" className={ERROR_PRIMARY}>
          Return to Àríyá
        </Link>
      }
    />
  );
}
