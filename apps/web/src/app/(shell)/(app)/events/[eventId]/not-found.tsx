import React from "react";
import Link from "next/link";
import { ERROR_PRIMARY, ErrorScreen } from "@/components/errors/error-screen";

export default function EventNotFound() {
  return (
    <ErrorScreen
      layout="page"
      code="404"
      eyebrow="Celebration not found"
      title="We can't find that celebration"
      message="It may not exist, it may have been archived, or you may not have permission to see it. Ask the host to add you to the team if you expected access."
      actions={
        <Link href="/events" className={ERROR_PRIMARY}>
          Return to my celebrations
        </Link>
      }
    />
  );
}
