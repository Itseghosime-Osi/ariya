import React from "react";
import { CreateEventWizard } from "@/features/events/components/CreateEventWizard";

export const metadata = {
  title: "New Celebration • Àríyá",
  description: "Create and plan a new celebration in Àríyá",
};

export default async function NewEventPage() {
  return (
    <>
      <CreateEventWizard />
    </>
  );
}
