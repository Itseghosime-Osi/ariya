import Link from "next/link";
import { Film } from "@/components/film/film";
import { SITE_URL, siteUrl } from "@/lib/site-url";

/** What search engines read about the site: who it is and where it lives. */
const HOME_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "Àríyá",
      url: siteUrl("/"),
      logo: siteUrl("/icons/icon-512.png"),
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: siteUrl("/"),
      name: "Àríyá",
      inLanguage: "en-NG",
      description:
        "Àríyá plans Nigerian weddings and parties with one personal RSVP link per guest.",
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(HOME_LD).replace(/</g, "\\u003c"),
        }}
      />
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
