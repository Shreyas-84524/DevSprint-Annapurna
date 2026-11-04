import { createBrowserClient } from "@supabase/ssr";

function getBrowserSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (
    !url ||
    !key ||
    url.includes('placeholder') ||
    key.includes('placeholder')
  ) {
    throw new Error(
      'Supabase browser configuration is unavailable. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }

  return { url, key };
}

export const isSupabaseConfigured = (): boolean => {
  try {
    getBrowserSupabaseConfig();
    return true;
  } catch {
    return false;
  }
};

export const createClient = () => {
  const { url, key } = getBrowserSupabaseConfig();
  return createBrowserClient(url, key);
};
