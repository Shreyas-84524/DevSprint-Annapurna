import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  isSupabaseConfigured,
  createClient,
  PLACEHOLDER_URLS,
  PLACEHOLDER_KEYS,
} from '../src/lib/supabase';

describe('Supabase browser client configuration suite', () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  afterEach(() => {
    if (originalUrl !== undefined) {
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    } else {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    }

    if (originalKey !== undefined) {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey;
    } else {
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    }
  });

  describe('isSupabaseConfigured detection', () => {
    it('returns false when NEXT_PUBLIC_SUPABASE_URL is missing', () => {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'valid-anon-key-sample-12345';
      assert.equal(isSupabaseConfigured(), false);
    });

    it('returns false when NEXT_PUBLIC_SUPABASE_URL is empty or whitespace', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = '   ';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'valid-anon-key-sample-12345';
      assert.equal(isSupabaseConfigured(), false);
    });

    it('returns false when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://valid-project.supabase.co';
      assert.equal(isSupabaseConfigured(), false);
    });

    it('returns false when NEXT_PUBLIC_SUPABASE_ANON_KEY is empty or whitespace', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://valid-project.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = '   ';
      assert.equal(isSupabaseConfigured(), false);
    });

    it('returns false when NEXT_PUBLIC_SUPABASE_URL is a known placeholder URL', () => {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'valid-anon-key-sample-12345';

      for (const placeholderUrl of PLACEHOLDER_URLS) {
        process.env.NEXT_PUBLIC_SUPABASE_URL = placeholderUrl;
        assert.equal(
          isSupabaseConfigured(),
          false,
          `Expected placeholder url '${placeholderUrl}' to return false`
        );
      }
    });

    it('returns false when NEXT_PUBLIC_SUPABASE_ANON_KEY is a known placeholder key', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://valid-project.supabase.co';

      for (const placeholderKey of PLACEHOLDER_KEYS) {
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = placeholderKey;
        assert.equal(
          isSupabaseConfigured(),
          false,
          `Expected placeholder key '${placeholderKey}' to return false`
        );
      }
    });

    it('returns false when URL contains placeholder substrings', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://your-project.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'valid-anon-key-sample-12345';
      assert.equal(isSupabaseConfigured(), false);

      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://placeholder-url.supabase.co';
      assert.equal(isSupabaseConfigured(), false);
    });

    it('returns false when key contains placeholder substrings', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://valid-project.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'your-anon-key';
      assert.equal(isSupabaseConfigured(), false);

      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'placeholder-anon-key';
      assert.equal(isSupabaseConfigured(), false);
    });

    it('returns true when valid non-placeholder URL and key are provided', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://annapurna-prod.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example-key';
      assert.equal(isSupabaseConfigured(), true);
    });
  });

  describe('createClient fail-closed behavior', () => {
    it('throws when public configuration is missing', () => {
      assert.throws(
        () => createClient(),
        /Supabase browser client is not configured: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be configured/
      );
    });

    it('throws when NEXT_PUBLIC_SUPABASE_URL is a placeholder', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://your-project.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example-key';

      assert.throws(
        () => createClient(),
        /Supabase browser client is not configured/
      );
    });

    it('throws when NEXT_PUBLIC_SUPABASE_ANON_KEY is a placeholder', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://annapurna-prod.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'your-anon-key';

      assert.throws(
        () => createClient(),
        /Supabase browser client is not configured/
      );
    });

    it('succeeds and creates client when valid credentials are set', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://annapurna-prod.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example-key';

      const client = createClient();
      assert.ok(client);
      assert.equal(typeof client.auth?.getUser, 'function');
      assert.equal(typeof client.from, 'function');
    });
  });
});
