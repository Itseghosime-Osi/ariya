/**
 * Validates whether a given URL is a valid Supabase Storage URL
 * pointing to the public "event-covers" bucket of the configured project.
 */
export function isValidCoverImageUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") {
    return false;
  }

  try {
    const parsed = new URL(url);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      return false;
    }

    const parsedSupabase = new URL(supabaseUrl);

    // Hostname must strictly match configured Supabase host
    if (parsed.hostname !== parsedSupabase.hostname) {
      return false;
    }

    // If a port is specified on Supabase URL, port must match
    if (parsedSupabase.port && parsed.port !== parsedSupabase.port) {
      return false;
    }

    // Must be in the public event-covers bucket
    return parsed.pathname.startsWith(
      "/storage/v1/object/public/event-covers/"
    );
  } catch {
    return false;
  }
}
