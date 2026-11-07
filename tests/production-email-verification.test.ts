import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const TARGET_HOST = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : process.env.NEXT_PUBLIC_APP_URL || 'https://annapurna-steel.vercel.app';

describe('Production Email Authentication Verification Suite', () => {
  describe('1. Public Role Login & Registration Pages', () => {
    it('serves general login page with email OTP options (HTTP 200)', async () => {
      const res = await fetch(`${TARGET_HOST}/login`);
      assert.equal(res.status, 200);
      const text = await res.text();
      assert.ok(text.includes('Sign in to your Annapurna account') || text.includes('Annapurna'));
    });

    it('serves donor email login page (HTTP 200)', async () => {
      const res = await fetch(`${TARGET_HOST}/login/donor`);
      assert.equal(res.status, 200);
      const text = await res.text();
      assert.ok(text.includes('Donor Sign In') || text.includes('Food Donor'));
    });

    it('serves requester email login page (HTTP 200)', async () => {
      const res = await fetch(`${TARGET_HOST}/login/requester`);
      assert.equal(res.status, 200);
      const text = await res.text();
      assert.ok(text.includes('Requester Sign In') || text.includes('Requester'));
    });

    it('serves volunteer email login page (HTTP 200)', async () => {
      const res = await fetch(`${TARGET_HOST}/login/volunteer`);
      assert.equal(res.status, 200);
      const text = await res.text();
      assert.ok(text.includes('Volunteer Sign In') || text.includes('Volunteer'));
    });

    it('serves registration role selector page (HTTP 200)', async () => {
      const res = await fetch(`${TARGET_HOST}/register`);
      assert.equal(res.status, 200);
    });

    it('serves onboarding flow page (HTTP 200)', async () => {
      const res = await fetch(`${TARGET_HOST}/onboarding`);
      assert.equal(res.status, 200);
    });
  });

  describe('2. Email OTP API Boundaries', () => {
    it('POST /api/auth/email/send rejects empty payloads with 400 MISSING_EMAIL', async () => {
      const res = await fetch(`${TARGET_HOST}/api/auth/email/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.data, null);
      assert.equal(json.error.code, 'MISSING_EMAIL');
    });

    it('POST /api/auth/email/verify rejects empty payloads with 400 VALIDATION_FAILED', async () => {
      const res = await fetch(`${TARGET_HOST}/api/auth/email/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.data, null);
      assert.equal(json.error.code, 'VALIDATION_FAILED');
    });

    it('GET /api/me fails closed with 401 when unauthenticated', async () => {
      const res = await fetch(`${TARGET_HOST}/api/me`);
      assert.equal(res.status, 401);
    });
  });

  describe('3. Clean Decommissioning of Obsolete SMS Endpoints', () => {
    it('POST /api/auth/phone/send returns 404 Not Found', async () => {
      const res = await fetch(`${TARGET_HOST}/api/auth/phone/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '+919876543210' }),
      });
      assert.equal(res.status, 404);
    });

    it('POST /api/auth/phone/verify returns 404 Not Found', async () => {
      const res = await fetch(`${TARGET_HOST}/api/auth/phone/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: 'test', otp: '123456' }),
      });
      assert.equal(res.status, 404);
    });

    it('POST /api/verification/send-code returns 404 Not Found', async () => {
      const res = await fetch(`${TARGET_HOST}/api/verification/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '+919876543210' }),
      });
      assert.equal(res.status, 404);
    });

    it('POST /api/verification/verify-code returns 404 Not Found', async () => {
      const res = await fetch(`${TARGET_HOST}/api/verification/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: '123456' }),
      });
      assert.equal(res.status, 404);
    });
  });
});
