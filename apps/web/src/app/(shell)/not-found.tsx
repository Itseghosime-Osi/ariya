import Link from "next/link";
import {
  ERROR_PRIMARY,
  ERROR_SECONDARY,
  ErrorScreen,
} from "@/components/errors/error-screen";

export default function NotFound() {
  return (
    <ErrorScreen
      code="404"
      eyebrow="Page not found"
      title="This page has wandered off"
      message="The page or link you are looking for does not exist, or it has moved. Check the address, or head back to your celebrations."
      actions={
        <>
          <Link href="/events" className={ERROR_PRIMARY}>
            My celebrations
          </Link>
          <Link href="/" className={ERROR_SECONDARY}>
            Back to home
          </Link>
        </>
      }
    />
  );
}
