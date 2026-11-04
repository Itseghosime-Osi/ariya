import { MARKUP } from "./markup";

// The archive's markup, rendered as-is so the film is the archive's film. The
// layout loads the archive's scripts against this DOM after it is in the page.
export default function HomePage() {
  // The archive's scripts mutate this subtree before React hydrates, so the
  // markup React hydrates against cannot be the one the server sent.
  return (
    <div
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: MARKUP }}
    />
  );
}
