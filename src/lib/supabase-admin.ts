import { createClient, SupabaseClient } from '@supabase/supabase-js';

if (typeof window !== 'undefined') {
  throw new Error('This module can only be imported on the server.');
}

let serviceRoleClient: SupabaseClient | null = null;

/**
 * Returns a server-only privileged Supabase client authenticated with the service role key.
 * Used exclusively for authoritative database operations:
 * - Atomic OTP verification consumption and profile verification
 * - One-time initial admin bootstrap
 *
 * Never import or execute this on the client or in browser bundles.
 */
export function getServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Supabase service role client is not configured: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
    );
  }

  if (!serviceRoleClient) {
    serviceRoleClient = createClient(url, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return serviceRoleClient;
}
