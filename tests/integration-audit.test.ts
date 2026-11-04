import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { getProtectedRouteRedirect, proxy } from '../src/proxy';
import { POST as adminBootstrapHandler } from '../src/app/api/admin/bootstrap/route';
import {
  confirmPhoneVerification,
  getVerificationRecordAsync,
  initiatePhoneVerification,
} from '../src/server/verification';
import { SwiftError } from '../src/server/swift';
import { InMemoryVerificationClient } from './helpers/verification-client';

describe('Stage 2 integration boundary suite', () => {
  afterEach(() => {
    delete process.env.ADMIN_BOOTSTRAP_SECRET;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  describe('route enforcement', () => {
    it('fails closed when protected-route auth configuration is missing', async () => {
      const response = await proxy(new NextRequest('http://localhost:3000/dashboard/donor'));
      assert.equal(response.status, 503);
      const payload = await response.json();
      assert.equal(payload.error.code, 'AUTH_CONFIGURATION_UNAVAILABLE');
    });

    it('sends valid unverified donors and requesters to onboarding', () => {
      assert.equal(
        getProtectedRouteRedirect('/dashboard/donor', {
          role: 'donor',
          is_verified: false,
        }),
        '/onboarding'
      );
      assert.equal(
        getProtectedRouteRedirect('/dashboard/beneficiary', {
          role: 'requester',
          is_verified: false,
        }),
        '/onboarding'
      );
    });

    it('allows only verified users into the matching donor/requester dashboard', () => {
      assert.equal(
        getProtectedRouteRedirect('/dashboard/donor', {
          role: 'donor',
          is_verified: true,
        }),
        null
      );
      assert.equal(
        getProtectedRouteRedirect('/dashboard/beneficiary', {
          role: 'requester',
          is_verified: true,
        }),
        null
      );
    });
  });

  describe('admin bootstrap', () => {
    it('returns 200 for the first bootstrap and 409 for the second', async () => {
      const secret = 'test_admin_bootstrap_secret_min_16_chars';
      const targetUserId = '99999999-8888-4777-8666-555555555555';
      process.env.ADMIN_BOOTSTRAP_SECRET = secret;
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_service_role_key';

      let calls = 0;
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (input) => {
        const url = String(input);
        if (!url.includes('/rest/v1/rpc/bootstrap_admin_user')) {
          return new Response('Not found', { status: 404 });
        }
        calls += 1;
        if (calls === 1) {
          return Response.json({ id: targetUserId, role: 'admin' }, { status: 200 });
        }
        return Response.json(
          {
            code: 'P0001',
            message: 'ADMIN_ALREADY_EXISTS',
            details: null,
            hint: null,
          },
          { status: 400 }
        );
      };

      const request = () => new Request('http://localhost:3000/api/admin/bootstrap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-bootstrap-secret': secret,
        },
        body: JSON.stringify({ targetUserId }),
      });

      try {
        const first = await adminBootstrapHandler(request());
        assert.equal(first.status, 200);

        const second = await adminBootstrapHandler(request());
        assert.equal(second.status, 409);
        const secondPayload = await second.json();
        assert.equal(secondPayload.error.code, 'ADMIN_ALREADY_EXISTS');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe('durable verification RPC boundary', () => {
    it('persists proof state in an explicitly shared store and rejects replay', async () => {
      const database = new InMemoryVerificationClient();
      const config = {
        baseUrl: 'https://mock-swift.local',
        projectKey: 'test_project_key',
      };
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (input) => {
        const url = String(input);
        if (url.includes('/send')) {
          return Response.json({
            request_id: 'swift_proof_req_999',
            phone: '+919876500000',
            status: 'QUEUED',
            expires_in: 600,
            resend_after: 60,
          });
        }
        if (url.includes('/verify')) {
          return Response.json({
            verified: true,
            phone: '+919876500000',
            verified_at: new Date().toISOString(),
          });
        }
        return new Response('Not found', { status: 404 });
      };

      try {
        const userId = 'user_serverless_isolation_1';
        const sent = await initiatePhoneVerification({
          userId,
          phone: '+919876500000',
          customConfig: config,
          customClient: database,
        });
        assert.equal(sent.requestId, 'swift_proof_req_999');

        const verified = await confirmPhoneVerification({
          userId,
          otp: '654321',
          requestId: sent.requestId,
          customConfig: config,
          customClient: database,
        });
        assert.equal(verified.proofId, 'swift_proof_req_999');

        const record = await getVerificationRecordAsync(userId, database);
        assert.equal(record?.proofId, 'swift_proof_req_999');
        assert.notEqual(record?.proofId, record?.phone);

        await assert.rejects(
          () => confirmPhoneVerification({
            userId,
            otp: '654321',
            requestId: sent.requestId,
            customConfig: config,
            customClient: database,
          }),
          (error: SwiftError) => {
            assert.equal(error.code, 'CHALLENGE_ALREADY_CONSUMED');
            assert.equal(error.status, 409);
            return true;
          }
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});
