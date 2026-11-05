import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Known placeholder values that indicate unconfigured public Supabase environments.
 */
export const PLACEHOLDER_URLS: readonly string[] = [
  "https://your-project.supabase.co",
  "https://placeholder-url.supabase.co",
  "http://placeholder-url.supabase.co",
];

export const PLACEHOLDER_KEYS: readonly string[] = [
  "your-anon-key",
  "placeholder-anon-key",
];

/**
 * Checks whether the public Supabase client credentials are valid and non-placeholder.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !key) {
    return false;
  }

  // Check known placeholder URLs and placeholder substrings
  if (
    PLACEHOLDER_URLS.includes(url) ||
    url.includes("your-project") ||
    url.includes("placeholder-url")
  ) {
    return false;
  }

  // Check known placeholder keys and placeholder substrings
  if (
    PLACEHOLDER_KEYS.includes(key) ||
    key.includes("your-anon-key") ||
    key.includes("placeholder-anon-key")
  ) {
    return false;
  }

  return true;
}

/**
 * Creates a browser Supabase client.
 * Fails closed by throwing an Error if configuration is missing, empty, or placeholder.
 */
export const createClient = (): SupabaseClient => {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase browser client is not configured: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be configured with valid, non-placeholder credentials."
    );
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim()
  );
};
