"use client";

import { useEffect } from "react";

/**
 * The last resort: it replaces the whole page when even the layouts fail, so nothing else is loaded.
 * Styles are written in place, in the same ivory, burgundy and gold as the rest of Àríyá.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en-NG">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 16px",
          textAlign: "center",
          background:
            "radial-gradient(60% 45% at 50% 0%, rgba(110,20,38,0.10), transparent 70%), radial-gradient(45% 35% at 50% 100%, rgba(212,168,90,0.14), transparent 70%), #f6f1ea",
          color: "#1c0a10",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
        }}
      >
        <main role="alert" style={{ maxWidth: 440 }}>
          <div
            aria-hidden="true"
            style={{
              width: 64,
              height: 64,
              margin: "0 auto",
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 38% 32%, #a8283f, #5b1424)",
              boxShadow: "0 4px 10px rgba(42,10,20,0.35)",
              color: "#e8c77f",
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 30,
              fontWeight: 700,
              lineHeight: "64px",
            }}
          >
            À
          </div>
          <p
            style={{
              margin: "20px 0 0",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#7a5612",
            }}
          >
            Something went wrong
          </p>
          <h1
            style={{
              margin: "8px 0 0",
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 34,
              lineHeight: 1.15,
              fontWeight: 600,
            }}
          >
            Àríyá needs a moment
          </h1>
          <p
            style={{
              margin: "16px auto 0",
              maxWidth: 360,
              fontSize: 15,
              lineHeight: 1.6,
              color: "#6b5a55",
            }}
          >
            A critical error stopped the page from loading. Nothing you saved
            was lost. Reload to try again.
          </p>
          <div style={{ marginTop: 28 }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                minHeight: 48,
                padding: "0 28px",
                border: 0,
                borderRadius: 999,
                background: "#6e1426",
                color: "#fff6dc",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 8px 20px -8px rgba(110,20,38,0.6)",
              }}
            >
              Reload Àríyá
            </button>
          </div>
          {error.digest && (
            <p style={{ marginTop: 24, fontSize: 11, color: "#6b5a55" }}>
              Reference{" "}
              <code
                style={{
                  padding: "2px 8px",
                  border: "1px solid rgba(110,20,38,0.2)",
                  borderRadius: 999,
                }}
              >
                {error.digest}
              </code>
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
