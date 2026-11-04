import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createClient, isSupabaseConfigured } from '../src/lib/supabase';

describe('browser Supabase configuration', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  it('fails closed when public configuration is missing', () => {
    assert.equal(isSupabaseConfigured(), false);
    assert.throws(
      () => createClient(),
      /Supabase browser configuration is unavailable/
    );
  });

  it('rejects placeholder configuration', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://placeholder-url.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'placeholder-anon-key';

    assert.equal(isSupabaseConfigured(), false);
    assert.throws(
      () => createClient(),
      /Supabase browser configuration is unavailable/
    );
  });

  it('creates a browser client with valid public configuration', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project-ref.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-publishable-key';

    assert.equal(isSupabaseConfigured(), true);
    assert.ok(createClient());
  });
});
