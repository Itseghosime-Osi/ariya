import type { Metadata, Viewport } from "next";
import "@/styles/site/archive.css";
import "@/styles/site/archive-nav.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://ariya-two.vercel.app"),
  title: {
    default: "Àríyá · The Yes",
    template: "%s · Àríyá",
  },
  description:
    "Àríyá plans Nigerian weddings and parties with one personal RSVP link per guest. The Yes is a wedding film in seventeen chapters.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Àríyá by OwambePlan",
    locale: "en_NG",
    title: "The Yes · Àríyá",
    description:
      "One personal invitation for every guest, and a guest list that keeps itself. A Lagos wedding in seventeen chapters, from Àríyá by OwambePlan.",
    url: "/",
    images: [
      {
        url: "/assets/og.jpg",
        width: 1200,
        height: 630,
        alt: "A red velvet ring box, open in candlelight. The Yes, by Àríyá.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Yes · Àríyá",
    description:
      "One personal invitation for every guest, and a guest list that keeps itself. A Lagos wedding in seventeen chapters.",
    images: ["/assets/og.jpg"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#16040a",
};

const FONTS =
  "https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..600;1,6..96,400..600&family=Figtree:wght@400;500;600;700&family=Pinyon+Script&display=swap";

// The film's 3D module imports three by bare specifier, exactly as the archive
// did, so the import map has to be in the document before the module loads.
const IMPORT_MAP = JSON.stringify({
  imports: {
    three: "https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/",
  },
});

// Before paint: a page reached from another marketing page opens its velvet
// curtain; a direct visit renders plainly.
const curtainBoot =
  'try{if(sessionStorage.getItem("ariya-curtain")&&!/embed=/.test(location.search))document.documentElement.classList.add("cur-in")}catch(e){}';

// The archive's own scripts, in index.html's order. Classic scripts keep their
// order only if `async` is explicitly off when React inserts them.
const FILM_SCRIPTS = [
  "/site/assets/fine-card.js",
  "/site/assets/scroll.js",
  "/site/assets/nav.js",
  "/site/assets/the-yes-controls.819e8d5cbcae.js",
];

export default function FilmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-NG" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link rel="stylesheet" href={FONTS} precedence="default" />
        <script
          type="importmap"
          dangerouslySetInnerHTML={{ __html: IMPORT_MAP }}
        />
        <script dangerouslySetInnerHTML={{ __html: curtainBoot }} />
      </head>
      <body>
        {children}
        {FILM_SCRIPTS.map((src) => (
          <script key={src} src={src} async={false} />
        ))}
        {/* A module script is deferred by definition; the attribute only quiets the linter. */}
        <script
          type="module"
          src="/site/assets/the-yes-scene.83edb5453053.js"
          defer
        />
      </body>
    </html>
  );
}
