import React from "react";
import Link from "next/link";
import { ERROR_PRIMARY, ErrorScreen } from "@/components/errors/error-screen";

export default function SharedPlanNotFound() {
  return (
    <ErrorScreen
      eyebrow="Floor plan link"
      title="This floor plan is not shared"
      message="The link is wrong, or the hosts have stopped sharing their floor plan. Ask them for a new link."
      actions={
        <Link href="/" className={ERROR_PRIMARY}>
          Return to Àríyá
        </Link>
      }
    />
  );
}
