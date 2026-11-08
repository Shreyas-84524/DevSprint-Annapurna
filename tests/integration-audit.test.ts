import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { getProtectedRouteRedirect, proxy } from '../src/proxy';
import { POST as adminBootstrapHandler } from '../src/app/api/admin/bootstrap/route';

describe('Integration boundary suite', () => {
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

    it('allows matching canonical roles regardless of legacy verification status', () => {
      assert.equal(
        getProtectedRouteRedirect('/dashboard/donor', {
          role: 'donor',
          is_verified: false,
        }),
        null
      );
      assert.equal(
        getProtectedRouteRedirect('/dashboard/beneficiary', {
          role: 'requester',
          is_verified: false,
        }),
        null
      );
    });

    it('still prevents cross-role dashboard access', () => {
      assert.equal(
        getProtectedRouteRedirect('/dashboard/donor', {
          role: 'requester',
          is_verified: true,
        }),
        '/dashboard/beneficiary'
      );
      assert.equal(
        getProtectedRouteRedirect('/dashboard/beneficiary', {
          role: 'donor',
          is_verified: true,
        }),
        '/dashboard/donor'
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
});
