/**
 * Server-only Authentication & Authorization Helpers
 */

import { createClient as createServerSupabaseClient } from '@/lib/supabase-server';
import { createClient as createApiClient } from '@supabase/supabase-js';

export interface AuthenticatedUser {
  id: string;
  email?: string;
  role?: string | null;
  isVerified?: boolean;
}

/**
 * Resolves authenticated user from Next.js server cookies or Authorization header.
 * Authoritative role is fetched from public.profiles, never trusted from user_metadata.
 */
export async function getAuthenticatedUser(request?: Request): Promise<AuthenticatedUser | null> {
  // 1. Attempt extraction from cookie session via Supabase SSR
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (!error && user) {
      // Query canonical profile for authoritative role and verification status
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_verified')
        .eq('id', user.id)
        .maybeSingle();

      return {
        id: user.id,
        email: user.email,
        role: profile?.role || null,
        isVerified: profile?.is_verified ?? false,
      };
    }
  } catch {
    // Cookie resolution may fail in non-browser/test environments
  }

  // 2. Fallback to Bearer token header
  if (request) {
    const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (url && key && !url.includes('placeholder-url')) {
        try {
          const client = createApiClient(url, key);
          const { data: { user }, error } = await client.auth.getUser(token);
          if (!error && user) {
            const { data: profile } = await client
              .from('profiles')
              .select('role, is_verified')
              .eq('id', user.id)
              .maybeSingle();

            return {
              id: user.id,
              email: user.email,
              role: profile?.role || null,
              isVerified: profile?.is_verified ?? false,
            };
          }
        } catch {}
      }
    }
  }

  return null;
}
