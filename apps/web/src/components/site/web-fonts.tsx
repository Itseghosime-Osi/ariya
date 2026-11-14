/**
 * Loads the landing pages' Google Fonts without blocking the first paint.
 *
 * A `<link rel="stylesheet">` in the head holds up rendering until it has downloaded (PageSpeed's
 * "render-blocking requests", about 650 ms on a slow phone). The stylesheet uses `display=swap`,
 * so text shows in a fallback face straight away and switches when the fonts arrive. A link added
 * by a script is not render-blocking, so this adds it from a tiny inline script, with a
 * `<noscript>` link for the rare visitor with scripts off.
 */
export function WebFonts({ href }: { href: string }) {
  const boot = `(function(){var l=document.createElement("link");l.rel="stylesheet";l.href=${JSON.stringify(href)};document.head.appendChild(l)})()`;
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      <script dangerouslySetInnerHTML={{ __html: boot }} />
      <noscript>
        <link rel="stylesheet" href={href} />
      </noscript>
    </>
  );
}
