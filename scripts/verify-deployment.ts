/**
 * Deployment Environment Pre-Flight Verification Script
 * Validates environment variable presence, formats, and safety rules without exposing secrets.
 */

interface EnvCheck {
  name: string;
  scope: 'public' | 'server';
  required: boolean;
  validate?: (val: string) => boolean | string;
}

const CHECKS: EnvCheck[] = [
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    scope: 'public',
    required: true,
    validate: (val) => {
      try {
        const u = new URL(val);
        return u.protocol === 'https:' || 'must use https:';
      } catch {
        return 'must be a valid URL';
      }
    },
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    scope: 'public',
    required: true,
    validate: (val) => val.length >= 20 || 'must be at least 20 characters',
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    scope: 'server',
    required: true,
    validate: (val) => val.length >= 20 || 'must be at least 20 characters',
  },
  {
    name: 'ADMIN_BOOTSTRAP_SECRET',
    scope: 'server',
    required: true,
    validate: (val) => val.length >= 16 || 'must be at least 16 characters for administrative safety',
  },
  {
    name: 'SWIFT_BASE_URL',
    scope: 'server',
    required: false,
    validate: (val) => {
      try {
        const u = new URL(val);
        return u.protocol === 'https:' || u.protocol === 'http:' || 'invalid protocol';
      } catch {
        return 'must be a valid URL';
      }
    },
  },
  {
    name: 'SWIFT_PROJECT_KEY',
    scope: 'server',
    required: false,
  },
  {
    name: 'GEOAPIFY_API_KEY',
    scope: 'server',
    required: false,
  },
  {
    name: 'NEXT_PUBLIC_GEOAPIFY_MAP_KEY',
    scope: 'public',
    required: false,
  },
  {
    name: 'NEXT_PUBLIC_APP_URL',
    scope: 'public',
    required: false,
    validate: (val) => {
      try {
        new URL(val);
        return true;
      } catch {
        return 'must be a valid URL';
      }
    },
  },
];

export function verifyEnvironment(env: Record<string, string | undefined> = process.env) {
  let hasErrors = false;
  const results: { name: string; scope: string; status: 'ok' | 'missing' | 'invalid' | 'optional_unset'; message?: string }[] = [];

  for (const check of CHECKS) {
    const val = env[check.name]?.trim();

    if (!val) {
      if (check.required) {
        hasErrors = true;
        results.push({ name: check.name, scope: check.scope, status: 'missing', message: 'Required variable is unset or empty' });
      } else {
        results.push({ name: check.name, scope: check.scope, status: 'optional_unset', message: 'Optional variable unset' });
      }
      continue;
    }

    // Safety check: ensure service role key is not mistakenly exposed in NEXT_PUBLIC_
    if (check.scope === 'public' && (val.includes('service_role') || (env.SUPABASE_SERVICE_ROLE_KEY && val === env.SUPABASE_SERVICE_ROLE_KEY))) {
      hasErrors = true;
      results.push({ name: check.name, scope: check.scope, status: 'invalid', message: 'CRITICAL: Service role key cannot be in public variable!' });
      continue;
    }

    if (check.validate) {
      const valid = check.validate(val);
      if (valid !== true) {
        hasErrors = true;
        results.push({ name: check.name, scope: check.scope, status: 'invalid', message: typeof valid === 'string' ? valid : 'Validation failed' });
        continue;
      }
    }

    results.push({ name: check.name, scope: check.scope, status: 'ok' });
  }

  return { ok: !hasErrors, results };
}

if (process.argv[1] && process.argv[1].endsWith('verify-deployment.ts')) {
  console.log('=== Deployment Environment Pre-Flight Verification ===');
  const { ok, results } = verifyEnvironment();
  for (const r of results) {
    console.log(`[${r.status.toUpperCase()}] ${r.name} (${r.scope})${r.message ? `: ${r.message}` : ''}`);
  }
  if (!ok) {
    console.error('\nEnvironment verification failed. Check errors above.');
    process.exit(1);
  } else {
    console.log('\nEnvironment verification passed.');
  }
}
