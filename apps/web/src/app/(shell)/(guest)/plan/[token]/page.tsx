import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSharedPlan } from "@/features/seating/share-queries";
import { SharedPlanView } from "@/features/seating/components/SharedPlanView";

export const metadata: Metadata = {
  title: "Floor plan • Àríyá",
  // A private link: keep it out of search engines and away from link previews that cache it.
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function SharedPlanPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const plan = await getSharedPlan(token);
  if (!plan) notFound();
  return <SharedPlanView plan={plan} />;
}
