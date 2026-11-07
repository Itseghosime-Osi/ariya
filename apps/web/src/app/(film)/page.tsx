import Link from "next/link";
import { Film } from "@/components/film/film";

export default function HomePage() {
  return (
    <>
      <Film />
      {/* Google's consent-screen review needs the home page itself to link to the legal pages. */}
      <nav
        aria-label="Legal"
        className="pointer-events-none fixed inset-x-0 bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-50 flex justify-center gap-4 text-[12px]"
      >
        <Link
          href="/privacy"
          className="pointer-events-auto rounded px-1.5 py-1 text-white/75 underline underline-offset-2 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
        >
          Privacy
        </Link>
        <Link
          href="/terms"
          className="pointer-events-auto rounded px-1.5 py-1 text-white/75 underline underline-offset-2 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
        >
          Terms
        </Link>
      </nav>
    </>
  );
}
