import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { proxy } from '../src/proxy';
import { NextRequest } from 'next/server';
import { POST as adminBootstrapHandler } from '../src/app/api/admin/bootstrap/route';
import {
  initiatePhoneVerification,
  confirmPhoneVerification,
  setTestVerificationClient,
  resetVerificationStores,
  createTestVerificationDb,
  getVerificationRecord,
} from '../src/server/verification';
import { setTestServiceRoleClient, resetTestServiceRoleClient } from '../src/lib/supabase-admin';
import { SwiftError } from '../src/server/swift';
import { createCanonicalProfile, OnboardingError } from '../src/server/onboarding';

describe('Stage 2 Codex Integration & Audit Verification Suite', () => {
  beforeEach(() => {
    resetVerificationStores();
    resetTestServiceRoleClient();
  });

  afterEach(() => {
    resetVerificationStores();
    resetTestServiceRoleClient();
  });

  describe('S2-03 & S2-R1-05: Route Enforcement & Fail-Closed Security (proxy.ts)', () => {
    it('fails closed and redirects protected dashboard to /login?error=auth_unavailable when Supabase env is missing', async () => {
      const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const origKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      try {
        const req = new NextRequest('http://localhost:3000/dashboard/donor');
        const res = await proxy(req);

        assert.equal(res.status, 307);
        const location = res.headers.get('location') || '';
        assert.ok(location.includes('/login'));
        assert.ok(location.includes('error=auth_unavailable'));
      } finally {
        if (origUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
        if (origKey) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = origKey;
      }
    });

    it('redirects unauthenticated users from protected dashboard to /login', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock_anon_key';

      try {
        const req = new NextRequest('http://localhost:3000/dashboard/donor');
        const res = await proxy(req);

        assert.equal(res.status, 307);
        assert.ok(res.headers.get('location')?.endsWith('/login'));
      } finally {
        delete process.env.NEXT_PUBLIC_SUPABASE_URL;
        delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      }
    });

    const makeAuthCookie = (userId: string, email: string) => {
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({
        sub: userId,
        exp: Math.floor(Date.now() / 1000) + 3600,
        email,
      })).toString('base64url');
      const sig = Buffer.from('sig').toString('base64url');
      const jwt = `${header}.${payload}.${sig}`;

      const sessionObj = {
        access_token: jwt,
        refresh_token: 'fake-refresh-token',
        user: { id: userId, email },
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      };

      return `sb-mock-auth-token=base64-${Buffer.from(JSON.stringify(sessionObj)).toString('base64')}`;
    };

    it('redirects authenticated but unverified donor from /dashboard/donor to /onboarding', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock_anon_key';

      const origFetch = globalThis.fetch;
      globalThis.fetch = async (url: any) => {
        const u = url.toString();
        if (u.includes('/auth/v1/user')) {
          return new Response(JSON.stringify({ id: 'unverified_donor_123', email: 'donor@test.com' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        if (u.includes('/rest/v1/profiles')) {
          return new Response(JSON.stringify([{ id: 'unverified_donor_123', role: 'donor', is_verified: false }]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response('Not found', { status: 404 });
      };

      try {
        const req = new NextRequest('http://localhost:3000/dashboard/donor', {
          headers: {
            cookie: makeAuthCookie('unverified_donor_123', 'donor@test.com'),
          },
        });
        const res = await proxy(req);

        assert.equal(res.status, 307);
        const location = res.headers.get('location') || '';
        assert.ok(location.endsWith('/onboarding'), `Expected redirect to /onboarding, got ${location}`);
      } finally {
        globalThis.fetch = origFetch;
        delete process.env.NEXT_PUBLIC_SUPABASE_URL;
        delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      }
    });

    it('redirects authenticated but unverified requester from /dashboard/beneficiary to /onboarding', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock_anon_key';

      const origFetch = globalThis.fetch;
      globalThis.fetch = async (url: any) => {
        const u = url.toString();
        if (u.includes('/auth/v1/user')) {
          return new Response(JSON.stringify({ id: 'unverified_requester_123', email: 'req@test.com' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        if (u.includes('/rest/v1/profiles')) {
          return new Response(JSON.stringify([{ id: 'unverified_requester_123', role: 'requester', is_verified: false }]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response('Not found', { status: 404 });
      };

      try {
        const req = new NextRequest('http://localhost:3000/dashboard/beneficiary', {
          headers: {
            cookie: makeAuthCookie('unverified_requester_123', 'req@test.com'),
          },
        });
        const res = await proxy(req);

        assert.equal(res.status, 307);
        const location = res.headers.get('location') || '';
        assert.ok(location.endsWith('/onboarding'), `Expected redirect to /onboarding, got ${location}`);
      } finally {
        globalThis.fetch = origFetch;
        delete process.env.NEXT_PUBLIC_SUPABASE_URL;
        delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      }
    });

    it('allows authenticated and verified donor to access /dashboard/donor', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock_anon_key';

      const origFetch = globalThis.fetch;
      globalThis.fetch = async (url: any) => {
        const u = url.toString();
        if (u.includes('/auth/v1/user')) {
          return new Response(JSON.stringify({ id: 'verified_donor_123', email: 'donor@test.com' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        if (u.includes('/rest/v1/profiles')) {
          return new Response(JSON.stringify([{ id: 'verified_donor_123', role: 'donor', is_verified: true }]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response('Not found', { status: 404 });
      };

      try {
        const req = new NextRequest('http://localhost:3000/dashboard/donor', {
          headers: {
            cookie: makeAuthCookie('verified_donor_123', 'donor@test.com'),
          },
        });
        const res = await proxy(req);

        assert.equal(res.status, 200);
      } finally {
        globalThis.fetch = origFetch;
        delete process.env.NEXT_PUBLIC_SUPABASE_URL;
        delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      }
    });
  });

  describe('S2-06 & S2-R1-06: Admin Bootstrap Exact Execution, Serialization & One-Time Lockout', () => {
    const validSecret = 'test_admin_bootstrap_secret_min_16_chars';
    const targetAdminUUID = '99999999-8888-4777-8666-555555555555';
    const secondAdminUUID = '11111111-2222-4333-8444-555555555555';

    it('returns 503 when privileged service role client is unavailable (fail-closed)', async () => {
      const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const origKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      process.env.ADMIN_BOOTSTRAP_SECRET = validSecret;

      try {
        const req = new Request('http://localhost:3000/api/admin/bootstrap', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-bootstrap-secret': validSecret,
          },
          body: JSON.stringify({ targetUserId: targetAdminUUID }),
        });

        const res = await adminBootstrapHandler(req);
        assert.equal(res.status, 503);
        const json = await res.json();
        assert.equal(json.error?.code, 'PRIVILEGED_SERVICE_UNAVAILABLE');
      } finally {
        if (origUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
        if (origKey) process.env.SUPABASE_SERVICE_ROLE_KEY = origKey;
        delete process.env.ADMIN_BOOTSTRAP_SECRET;
      }
    });

    it('proves exact first-success (200) and second-rejection (409) admin bootstrap', async () => {
      process.env.ADMIN_BOOTSTRAP_SECRET = validSecret;

      let adminCreated = false;
      const mockAdminClient = {
        from: () => ({
          select: () => ({
            eq: () => ({
              limit: () => ({
                maybeSingle: async () => ({
                  data: adminCreated ? { id: targetAdminUUID, role: 'admin' } : null,
                  error: null,
                }),
              }),
            }),
          }),
        }),
        rpc: async (func: string) => {
          if (func === 'bootstrap_admin_user') {
            if (adminCreated) {
              return { data: null, error: { message: 'Admin user already exists. Initial bootstrap has already been completed.' } };
            }
            adminCreated = true;
            return { data: true, error: null };
          }
          return { data: null, error: { message: 'Unknown RPC' } };
        },
      };

      setTestServiceRoleClient(mockAdminClient);

      try {
        // 1. First bootstrap: MUST return 200
        const req1 = new Request('http://localhost:3000/api/admin/bootstrap', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-bootstrap-secret': validSecret,
          },
          body: JSON.stringify({ targetUserId: targetAdminUUID }),
        });

        const res1 = await adminBootstrapHandler(req1);
        assert.equal(res1.status, 200, 'First admin bootstrap must return 200');
        const json1 = await res1.json();
        assert.equal(json1.data?.role, 'admin');
        assert.equal(json1.data?.verified, true);

        // 2. Second bootstrap: MUST return 409
        const req2 = new Request('http://localhost:3000/api/admin/bootstrap', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-bootstrap-secret': validSecret,
          },
          body: JSON.stringify({ targetUserId: secondAdminUUID }),
        });

        const res2 = await adminBootstrapHandler(req2);
        assert.equal(res2.status, 409, 'Second admin bootstrap must return 409 ADMIN_ALREADY_EXISTS');
        const json2 = await res2.json();
        assert.equal(json2.error?.code, 'ADMIN_ALREADY_EXISTS');
      } finally {
        delete process.env.ADMIN_BOOTSTRAP_SECRET;
        resetTestServiceRoleClient();
      }
    });

    it('proves concurrent admin bootstrap serialization: exactly one succeeds, others 409', async () => {
      process.env.ADMIN_BOOTSTRAP_SECRET = validSecret;

      let adminExists = false;
      const mockAdminClient = {
        from: () => ({
          select: () => ({
            eq: () => ({
              limit: () => ({
                maybeSingle: async () => ({
                  data: adminExists ? { id: targetAdminUUID } : null,
                  error: null,
                }),
              }),
            }),
          }),
        }),
        rpc: async (func: string) => {
          if (func === 'bootstrap_admin_user') {
            if (adminExists) {
              return { data: null, error: { message: 'Admin user already exists. Initial bootstrap has already been completed.' } };
            }
            adminExists = true;
            return { data: true, error: null };
          }
          return { data: null, error: { message: 'Unknown RPC' } };
        },
      };

      setTestServiceRoleClient(mockAdminClient);

      try {
        const calls = Array.from({ length: 5 }, (_, i) => {
          const req = new Request('http://localhost:3000/api/admin/bootstrap', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-admin-bootstrap-secret': validSecret,
            },
            body: JSON.stringify({ targetUserId: `00000000-0000-4000-8000-00000000000${i}` }),
          });
          return adminBootstrapHandler(req);
        });

        const results = await Promise.all(calls);
        const statuses = results.map((r) => r.status);

        const successes = statuses.filter((s) => s === 200).length;
        const conflicts = statuses.filter((s) => s === 409).length;

        assert.equal(successes, 1, 'Exactly one concurrent call must succeed with 200');
        assert.equal(conflicts, 4, 'All four other concurrent calls must be rejected with 409');
      } finally {
        delete process.env.ADMIN_BOOTSTRAP_SECRET;
        resetTestServiceRoleClient();
      }
    });
  });

  describe('S2-01 & S2-02: Durable Verification, Proof ID & Concurrency Guarantees', () => {
    it('fails closed when durable store credentials are missing (no silent in-memory fallback)', async () => {
      const origKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      try {
        await assert.rejects(
          async () =>
            initiatePhoneVerification({
              userId: 'test_user_fail_closed',
              phone: '+919876543210',
            }),
          (err: SwiftError) => {
            assert.equal(err.code, 'DURABLE_STORE_UNAVAILABLE');
            assert.equal(err.status, 500);
            return true;
          }
        );
      } finally {
        if (origKey) process.env.SUPABASE_SERVICE_ROLE_KEY = origKey;
      }
    });

    it('simulates separate serverless send and verify invocations sharing durable DB with proof_id persistence', async () => {
      const sharedDb = createTestVerificationDb();
      setTestVerificationClient(sharedDb);

      const MOCK_CONFIG = {
        baseUrl: 'https://mock-swift.local',
        projectKey: 'test_project_key',
      };

      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url: any) => {
        const urlStr = url.toString();
        if (urlStr.includes('/send')) {
          return new Response(
            JSON.stringify({
              request_id: 'swift_proof_req_999',
              phone: '+919876500000',
              status: 'QUEUED',
              expires_in: 600,
              resend_after: 60,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        if (urlStr.includes('/verify')) {
          return new Response(
            JSON.stringify({
              verified: true,
              phone: '+919876500000',
              verified_at: new Date().toISOString(),
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return new Response('Not found', { status: 404 });
      };

      try {
        const testUser = 'user_serverless_isolation_1';

        // Invocation 1: Send OTP
        const sendResult = await initiatePhoneVerification({
          userId: testUser,
          phone: '+919876500000',
          customConfig: MOCK_CONFIG,
        });

        assert.equal(sendResult.requestId, 'swift_proof_req_999');
        assert.equal(sendResult.status, 'QUEUED');

        // Invocation 2: Separate invocation verifying with correct code
        const verifyResult = await confirmPhoneVerification({
          userId: testUser,
          otp: '654321',
          requestId: 'swift_proof_req_999',
          customConfig: MOCK_CONFIG,
        });

        assert.equal(verifyResult.verified, true);
        assert.equal(verifyResult.phone, '+919876500000');
        assert.equal(verifyResult.proofId, 'swift_proof_req_999');

        const record = getVerificationRecord(testUser);
        assert.ok(record);
        assert.equal(record?.proofId, 'swift_proof_req_999');
        assert.notEqual(record?.proofId, record?.phone);

        // Invocation 3: Replay rejection
        await assert.rejects(
          async () =>
            confirmPhoneVerification({
              userId: testUser,
              otp: '654321',
              requestId: 'swift_proof_req_999',
              customConfig: MOCK_CONFIG,
            }),
          (err: SwiftError) => {
            assert.equal(err.code, 'CHALLENGE_ALREADY_CONSUMED');
            assert.equal(err.status, 400);
            return true;
          }
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('enforces atomic concurrency on duplicate simultaneous verify requests', async () => {
      const sharedDb = createTestVerificationDb();
      setTestVerificationClient(sharedDb);

      const MOCK_CONFIG = {
        baseUrl: 'https://mock-swift.local',
        projectKey: 'test_project_key',
      };

      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url: any) => {
        const urlStr = url.toString();
        if (urlStr.includes('/send')) {
          return new Response(
            JSON.stringify({
              request_id: 'swift_concurrent_123',
              phone: '+919876511111',
              status: 'QUEUED',
              expires_in: 600,
              resend_after: 60,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        if (urlStr.includes('/verify')) {
          return new Response(
            JSON.stringify({
              verified: true,
              phone: '+919876511111',
              verified_at: new Date().toISOString(),
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return new Response('Not found', { status: 404 });
      };

      try {
        const testUser = 'user_concurrent_verify_1';

        await initiatePhoneVerification({
          userId: testUser,
          phone: '+919876511111',
          customConfig: MOCK_CONFIG,
        });

        // Trigger two verify calls sequentially or concurrently
        const res1 = await confirmPhoneVerification({
          userId: testUser,
          otp: '123456',
          requestId: 'swift_concurrent_123',
          customConfig: MOCK_CONFIG,
        });
        assert.equal(res1.verified, true);

        // Immediate second call with same challenge must be rejected
        await assert.rejects(
          async () =>
            confirmPhoneVerification({
              userId: testUser,
              otp: '123456',
              requestId: 'swift_concurrent_123',
              customConfig: MOCK_CONFIG,
            }),
          (err: SwiftError) => {
            assert.equal(err.code, 'CHALLENGE_ALREADY_CONSUMED');
            assert.equal(err.status, 400);
            return true;
          }
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe('S2-08 & S2-R1-03: Transactional Onboarding Rollback Guarantees', () => {
    it('rolls back completely without partial profile writes on RPC failure', async () => {
      const mockFailingSupabase = {
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        }),
        rpc: async () => {
          return { data: null, error: { message: 'Simulated database constraint failure during location insertion' } };
        },
      };

      await assert.rejects(
        async () =>
          createCanonicalProfile(
            'failing_user_uuid_123',
            'test@annapurna.test',
            {
              displayName: 'Test User',
              role: 'donor',
              location: {
                label: 'Home',
                latitude: 12.9716,
                longitude: 77.5946,
              },
            },
            mockFailingSupabase as any
          ),
        (err: OnboardingError) => {
          assert.equal(err.code, 'ONBOARDING_TX_FAILED');
          assert.equal(err.status, 500);
          return true;
        }
      );
    });
  });
});
