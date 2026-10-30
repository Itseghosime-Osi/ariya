import type { MetadataRoute } from "next";

// Brand colours, matching --ivory in styles/globals.css.
const IVORY = "#f7f2ea";
// The wine of the app's splash screen (components/layout/app-splash.tsx).
const WINE = "#2a0610";

/**
 * Makes Àríyá installable ("Add to Home Screen"). Opened from the home screen
 * it runs in its own window with no browser address bar.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Àríyá — Wedding & Event Suite",
    short_name: "Àríyá",
    description: "Wedding and event planner for Nigerian couples and planners.",
    lang: "en-NG",
    dir: "ltr",
    start_url: "/events",
    scope: "/",
    display: "standalone",
    // The phone's own launch screen, which hands over to the in-app splash in the same colour.
    background_color: WINE,
    theme_color: IVORY,
    categories: ["lifestyle", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "New event",
        short_name: "New event",
        url: "/events/new",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
