"use server";

import { createClient } from "@/lib/supabase/server";
import type { GlobalSearchResults } from "./types";

export async function globalSearchAction(
  query: string
): Promise<{ data?: GlobalSearchResults; error?: string }> {
  const trimmed = query.trim();
  if (!trimmed) {
    return {
      data: {
        events: [],
        guests: [],
        vendors: [],
      },
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("global_search", {
    p_query: trimmed,
    p_limit: 15,
  });

  if (error) {
    return { error: error.message };
  }

  return {
    data: (data as unknown as GlobalSearchResults) || {
      events: [],
      guests: [],
      vendors: [],
    },
  };
}
