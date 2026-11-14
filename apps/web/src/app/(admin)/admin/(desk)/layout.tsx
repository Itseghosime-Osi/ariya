import type { Metadata } from "next";
import { requireAdmin } from "@/features/admin/guard";
import { AdminShell } from "@/features/admin/components/AdminShell";
import { adm } from "@/features/admin/path";

export const metadata: Metadata = {
  title: { default: "Admin • Àríyá", template: "%s • Àríyá admin" },
  robots: { index: false, follow: false },
};

/** Every admin page sits behind this check: not an admin is a 404, no second step is the code screen. */
export default async function AdminDeskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();
  return (
    <AdminShell email={admin.email} base={adm("/admin")}>
      {children}
    </AdminShell>
  );
}
