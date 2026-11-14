import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getAdminState } from "@/features/admin/guard";
import { SecondStep } from "@/features/admin/components/SecondStep";

export const metadata: Metadata = {
  title: "Admin • Àríyá",
  robots: { index: false, follow: false },
};

export default async function AdminVerifyPage() {
  const state = await getAdminState();
  if (state.kind === "none") notFound();
  if (state.kind === "admin") redirect("/admin");
  return (
    <div className="flex min-h-dvh items-center bg-ivory px-4 py-10">
      <SecondStep hasAuthenticator={state.hasAuthenticator} />
    </div>
  );
}
