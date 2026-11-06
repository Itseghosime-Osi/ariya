import React from "react";
import { GoBackLink } from "@/features/events/components/GoBackLink";
import { ErrorScreen } from "@/components/errors/error-screen";

export default function PublicEventNotFound() {
  return (
    <ErrorScreen
      eyebrow="Private page"
      title="Celebration Unavailable"
      message="This celebration page is private, unpublished, or has concluded. If you were sent a personal invitation, use that link instead."
      actions={<GoBackLink />}
    />
  );
}
