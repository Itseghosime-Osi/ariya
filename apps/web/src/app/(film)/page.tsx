import Link from "next/link";
import { Film } from "@/components/film/film";

export default function HomePage() {
  return (
    <>
      <Film />
      {/* Google's consent-screen review needs the home page itself to link to the legal pages. */}
      <nav
        aria-label="Legal"
        className="legal-nav"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: "max(0.6rem, env(safe-area-inset-bottom, 0.6rem))",
          zIndex: 9999,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "1.25rem",
          pointerEvents: "none",
        }}
      >
        <Link
          href="/privacy"
          style={{
            pointerEvents: "auto",
            color: "rgba(255, 255, 255, 0.75)",
            fontSize: "12px",
            textDecoration: "underline",
            textUnderlineOffset: "3px",
            padding: "4px 8px",
            borderRadius: "4px",
          }}
        >
          Privacy
        </Link>
        <Link
          href="/terms"
          style={{
            pointerEvents: "auto",
            color: "rgba(255, 255, 255, 0.75)",
            fontSize: "12px",
            textDecoration: "underline",
            textUnderlineOffset: "3px",
            padding: "4px 8px",
            borderRadius: "4px",
          }}
        >
          Terms
        </Link>
      </nav>
    </>
  );
}
