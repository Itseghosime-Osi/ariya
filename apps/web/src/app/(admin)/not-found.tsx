import type { Metadata } from "next";
import Link from "next/link";
import {
  ERROR_PRIMARY,
  ERROR_SECONDARY,
  ErrorScreen,
} from "@/components/errors/error-screen";

export const metadata: Metadata = {
  title: "Page not found · Àríyá",
  robots: { index: false, follow: false },
};

/**
 * What anyone who is not a signed-in admin sees at the desk's address. It is word for word the
 * site's own 404 (global-not-found.tsx), so the address looks like any page that does not exist.
 */
export default function AdminNotFound() {
  return (
    <ErrorScreen
      code="404"
      eyebrow="Page not found"
      title="This page has wandered off"
      message="The page or link you are looking for does not exist, or it has moved. Check the address, or head back to Àríyá."
      actions={
        <>
          <Link href="/" className={ERROR_PRIMARY}>
            Back to Àríyá
          </Link>
          <Link href="/events" className={ERROR_SECONDARY}>
            My celebrations
          </Link>
        </>
      }
    />
  );
}
