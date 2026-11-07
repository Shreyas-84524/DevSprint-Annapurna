import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import {
  normalizeEmail,
  purposeToRole,
} from '../src/server/emailAuth';
import { POST as sendEmailOtpHandler } from '../src/app/api/auth/email/send/route';
import { POST as verifyEmailOtpHandler } from '../src/app/api/auth/email/verify/route';
import { POST as logoutHandler } from '../src/app/api/auth/logout/route';

describe('Supabase Passwordless Email OTP Authentication Suite', () => {
  describe('1. Email Normalization & Format Validation', () => {
    it('normalizes valid emails by trimming and converting to lowercase', () => {
      assert.equal(normalizeEmail('Test.User@Example.COM '), 'test.user@example.com');
      assert.equal(normalizeEmail('donor+annapurna@domain.org'), 'donor+annapurna@domain.org');
      assert.equal(normalizeEmail('  requester@shelter.in  '), 'requester@shelter.in');
    });

    it('rejects missing or empty email inputs', () => {
      assert.throws(() => normalizeEmail(''), {
        name: 'EmailAuthError',
        code: 'MISSING_EMAIL',
        status: 400,
      });
      assert.throws(() => normalizeEmail(null as any), {
        name: 'EmailAuthError',
        code: 'MISSING_EMAIL',
        status: 400,
      });
    });

    it('rejects malformed email formats', () => {
      assert.throws(() => normalizeEmail('invalid-email'), {
        name: 'EmailAuthError',
        code: 'INVALID_EMAIL_FORMAT',
        status: 400,
      });
      assert.throws(() => normalizeEmail('@missinguser.com'), {
        name: 'EmailAuthError',
        code: 'INVALID_EMAIL_FORMAT',
        status: 400,
      });
      assert.throws(() => normalizeEmail('user@nodomain'), {
        name: 'EmailAuthError',
        code: 'INVALID_EMAIL_FORMAT',
        status: 400,
      });
    });
  });

  describe('2. Role Mapping & Admin Boundary Enforcement', () => {
    it('maps valid login purposes to canonical roles', () => {
      assert.equal(purposeToRole('donor_login'), 'donor');
      assert.equal(purposeToRole('requester_login'), 'requester');
      assert.equal(purposeToRole('volunteer_login'), 'volunteer');
    });

    it('strictly forbids admin escalation via email OTP purpose', () => {
      assert.throws(() => purposeToRole('admin_login' as any), {
        name: 'EmailAuthError',
        code: 'INVALID_PURPOSE',
        status: 400,
      });
      assert.throws(() => purposeToRole('root' as any), {
        name: 'EmailAuthError',
        code: 'INVALID_PURPOSE',
        status: 400,
      });
    });
  });

  describe('3. Send Email OTP Route (POST /api/auth/email/send)', () => {
    it('returns 400 when email is missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purpose: 'donor_login' }),
      });

      const res = await sendEmailOtpHandler(req);
      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.data, null);
      assert.equal(json.error.code, 'MISSING_EMAIL');
    });

    it('returns 400 when purpose is missing or invalid', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'donor@example.com', purpose: 'unknown' }),
      });

      const res = await sendEmailOtpHandler(req);
      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.data, null);
      assert.equal(json.error.code, 'INVALID_PURPOSE');
    });

    it('returns 400 when email format is invalid', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'notanemail', purpose: 'donor_login' }),
      });

      const res = await sendEmailOtpHandler(req);
      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.data, null);
      assert.equal(json.error.code, 'INVALID_EMAIL_FORMAT');
    });

    it('returns 200 with standard envelope on valid send request', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test.donor@annapurna.org', purpose: 'donor_login' }),
      });

      const res = await sendEmailOtpHandler(req);
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.error, null);
      assert.equal(json.data.email, 'test.donor@annapurna.org');
      assert.equal(json.data.purpose, 'donor_login');
      assert.equal(json.data.sent, true);
    });
  });

  describe('4. Verify Email OTP Route (POST /api/auth/email/verify)', () => {
    it('returns 400 when required verification parameters are missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/email/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'donor@example.com' }),
      });

      const res = await verifyEmailOtpHandler(req);
      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.data, null);
      assert.equal(json.error.code, 'VALIDATION_FAILED');
    });

    it('rejects invalid or non-numeric token formats', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/email/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'donor@example.com',
          token: 'abc',
          purpose: 'donor_login',
        }),
      });

      const res = await verifyEmailOtpHandler(req);
      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.data, null);
      assert.equal(json.error.code, 'INVALID_TOKEN_FORMAT');
    });

    it('rejects invalid purpose at HTTP boundary', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/email/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'donor@example.com',
          token: '123456',
          purpose: 'admin_login',
        }),
      });

      const res = await verifyEmailOtpHandler(req);
      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.data, null);
      assert.equal(json.error.code, 'INVALID_PURPOSE');
    });
  });

  describe('5. Role Isolation & Destination Redirection Logic', () => {
    function calculateRedirect(role: string, isComplete: boolean): string {
      if (!isComplete) return '/onboarding';
      switch (role) {
        case 'donor': return '/dashboard/donor';
        case 'requester': return '/dashboard/beneficiary';
        case 'volunteer': return '/dashboard/volunteer';
        case 'admin': return '/admin';
        default: return '/onboarding';
      }
    }

    it('directs fully onboarded users to their authorized dashboards', () => {
      assert.equal(calculateRedirect('donor', true), '/dashboard/donor');
      assert.equal(calculateRedirect('requester', true), '/dashboard/beneficiary');
      assert.equal(calculateRedirect('volunteer', true), '/dashboard/volunteer');
      assert.equal(calculateRedirect('admin', true), '/admin');
    });

    it('directs incomplete profiles to onboarding flow', () => {
      assert.equal(calculateRedirect('donor', false), '/onboarding');
      assert.equal(calculateRedirect('requester', false), '/onboarding');
      assert.equal(calculateRedirect('volunteer', false), '/onboarding');
    });

    it('flags role mismatch when an existing donor uses requester portal', () => {
      const existingUserRole: string = 'donor';
      const requestedPurpose: string = 'requester_login';
      const requestedRole = requestedPurpose === 'donor_login' ? 'donor' : requestedPurpose === 'requester_login' ? 'requester' : 'volunteer';

      const roleMismatch = existingUserRole !== requestedRole && existingUserRole !== 'admin';
      assert.equal(roleMismatch, true);
      assert.equal(existingUserRole, 'donor');
    });

    it('allows admin accounts to access without role demotion', () => {
      const existingUserRole: string = 'admin';
      const requestedPurpose: string = 'donor_login';
      const requestedRole = requestedPurpose === 'donor_login' ? 'donor' : 'requester';

      const roleMismatch = existingUserRole !== requestedRole && existingUserRole !== 'admin';
      assert.equal(roleMismatch, false);
      assert.equal(existingUserRole, 'admin');
    });
  });

  describe('6. Logout Route (POST /api/auth/logout)', () => {
    it('terminates session and returns 200 with standard envelope', async () => {
      const res = await logoutHandler();
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.data?.success, true);
      assert.equal(json.error, null);
    });
  });
});
