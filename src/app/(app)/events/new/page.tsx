import React from "react";
import { AppShell } from "@/components/layout/app-shell";
import { CreateEventWizard } from "@/features/events/components/CreateEventWizard";
import { getCurrentUser } from "@/features/auth/queries";

export const metadata = {
  title: "New Celebration • Àríyá",
  description: "Create and plan a new celebration in Àríyá",
};

export default async function NewEventPage() {
  const user = await getCurrentUser();

  return (
    <AppShell userEmail={user?.email}>
      <CreateEventWizard />
    </AppShell>
  );
}
