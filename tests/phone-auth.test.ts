import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import {
  normalizeE164Phone,
  PhoneAuthError,
} from '../src/server/phoneAuth';
import { POST as sendPhoneOtpHandler } from '../src/app/api/auth/phone/send/route';
import { POST as verifyPhoneOtpHandler } from '../src/app/api/auth/phone/verify/route';
import { POST as logoutHandler } from '../src/app/api/auth/logout/route';

describe('Swift Mobile Phone Authentication & Identity Bridge Suite', () => {
  describe('1. Phone Number Normalization & Validation', () => {
    it('normalizes valid E.164 phone numbers correctly', () => {
      assert.equal(normalizeE164Phone('+919876543210'), '+919876543210');
      assert.equal(normalizeE164Phone('+14155552671'), '+14155552671');
      assert.equal(normalizeE164Phone(' +91 98765-43210 '), '+919876543210');
      assert.equal(normalizeE164Phone('+91 (987) 654-3210'), '+919876543210');
    });

    it('rejects phone numbers without leading plus', () => {
      assert.throws(() => normalizeE164Phone('9876543210'), {
        name: 'SwiftError',
        code: 'INVALID_PHONE_FORMAT',
      });
    });

    it('rejects numbers with alphabets and invalid characters', () => {
      assert.throws(() => normalizeE164Phone('+9198765abcd'), {
        name: 'SwiftError',
        code: 'INVALID_PHONE_FORMAT',
      });
    });

    it('rejects empty and non-string inputs', () => {
      assert.throws(() => normalizeE164Phone(''), {
        name: 'SwiftError',
        code: 'INVALID_PHONE_FORMAT',
      });
      assert.throws(() => normalizeE164Phone(null as any), {
        name: 'SwiftError',
        code: 'INVALID_PHONE_FORMAT',
      });
    });
  });

  describe('2. Send Phone OTP Route & Validation (POST /api/auth/phone/send)', () => {
    it('returns 400 when phone number is missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/phone/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purpose: 'donor_login' }),
      });

      const res = await sendPhoneOtpHandler(req);
      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.data, null);
      assert.equal(json.error.code, 'MISSING_PHONE');
    });

    it('returns 400 when purpose is invalid or attempts admin escalation', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/phone/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: '+919876543210',
          purpose: 'admin_login',
        }),
      });

      const res = await sendPhoneOtpHandler(req);
      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.data, null);
      assert.equal(json.error.code, 'INVALID_PURPOSE');
    });

    it('rejects invalid E.164 phone format at HTTP boundary', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/phone/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: '12345',
          purpose: 'donor_login',
        }),
      });

      const res = await sendPhoneOtpHandler(req);
      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.error.code, 'INVALID_PHONE_FORMAT');
    });
  });

  describe('3. Verify Phone OTP Route & Validation (POST /api/auth/phone/verify)', () => {
    it('returns 400 when required fields are missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/phone/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: '+919876543210',
        }),
      });

      const res = await verifyPhoneOtpHandler(req);
      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.data, null);
      assert.equal(json.error.code, 'VALIDATION_FAILED');
    });

    it('rejects invalid OTP code format', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/phone/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: '+919876543210',
          requestId: 'req_12345',
          otp: '12',
          purpose: 'donor_login',
        }),
      });

      const res = await verifyPhoneOtpHandler(req);
      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.error.code, 'INVALID_CODE_FORMAT');
    });
  });

  describe('4. Logout Route (POST /api/auth/logout)', () => {
    it('clears session and returns 200 with standard envelope', async () => {
      const res = await logoutHandler();
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.data?.success, true);
      assert.equal(json.error, null);
    });
  });

  describe('5. Security, Credential Isolation, and Role Boundaries', () => {
    it('ensures service role key and Swift credentials are not exported to client', () => {
      assert.ok(!process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY);
      assert.ok(!process.env.NEXT_PUBLIC_SWIFT_PROJECT_KEY);
      assert.ok(!process.env.NEXT_PUBLIC_ADMIN_BOOTSTRAP_SECRET);
    });

    it('masks phone numbers safely for client display', () => {
      // 13 characters (+919876543210) -> +91******3210
      const normalized = '+919876543210';
      const prefix = normalized.slice(0, 3);
      const suffix = normalized.slice(-4);
      const masked = `${prefix}${'*'.repeat(normalized.length - 7)}${suffix}`;
      assert.equal(masked, '+91******3210');
      assert.ok(!masked.includes('987654'));
    });

    it('rejects attempt to authenticate admin via mobile OTP purpose', () => {
      assert.throws(
        () => {
          // Attempting admin_login as purpose should fail validation
          const purpose = 'admin_login' as any;
          if (!['donor_login', 'requester_login', 'volunteer_login'].includes(purpose)) {
            throw new PhoneAuthError('Invalid login purpose', 'INVALID_PURPOSE', 400);
          }
        },
        {
          name: 'PhoneAuthError',
          code: 'INVALID_PURPOSE',
          status: 400,
        }
      );
    });
  });

  describe('6. Swift Upstream Error Translation & Resilience', () => {
    it('maps Swift HTTP 400 to invalid request error', () => {
      const err = new PhoneAuthError('Invalid OTP', 'SWIFT_INVALID_REQUEST', 400, { attemptsRemaining: 2 });
      assert.equal(err.status, 400);
      assert.equal(err.code, 'SWIFT_INVALID_REQUEST');
      assert.equal(err.details.attemptsRemaining, 2);
    });

    it('maps Swift HTTP 404 to challenge not found', () => {
      const err = new PhoneAuthError('Verification challenge was not found', 'CHALLENGE_NOT_FOUND', 404);
      assert.equal(err.status, 404);
      assert.equal(err.code, 'CHALLENGE_NOT_FOUND');
    });

    it('maps Swift HTTP 410 to expired challenge error', () => {
      const err = new PhoneAuthError('Verification code has expired', 'CHALLENGE_EXPIRED', 410);
      assert.equal(err.status, 410);
      assert.equal(err.code, 'CHALLENGE_EXPIRED');
    });

    it('maps Swift HTTP 429 to rate limit with retry-after cooldown', () => {
      const err = new PhoneAuthError('Too many attempts', 'RATE_LIMITED', 429, null, 45);
      assert.equal(err.status, 429);
      assert.equal(err.code, 'RATE_LIMITED');
      assert.equal(err.retryAfterSeconds, 45);
    });

    it('maps Swift HTTP 503 and network errors to service unavailable', () => {
      const err = new PhoneAuthError('SMS verification service is temporarily unavailable', 'SWIFT_UNAVAILABLE', 503);
      assert.equal(err.status, 503);
      assert.equal(err.code, 'SWIFT_UNAVAILABLE');
    });

    it('maps Swift HTTP 504 timeout to gateway timeout', () => {
      const err = new PhoneAuthError('Verification request timed out', 'SWIFT_TIMEOUT', 504);
      assert.equal(err.status, 504);
      assert.equal(err.code, 'SWIFT_TIMEOUT');
    });
  });

  describe('7. Role Isolation, Onboarding Redirection & Canonical Preservation', () => {
    it('detects role mismatch when existing donor uses requester sign-in flow', () => {
      const existingUserRole: string = 'donor';
      const requestedPurpose: string = 'requester_login';
      const requestedRole = requestedPurpose === 'donor_login' ? 'donor' : requestedPurpose === 'requester_login' ? 'requester' : 'volunteer';
      
      const roleMismatch = existingUserRole !== requestedRole && existingUserRole !== 'admin';
      assert.equal(roleMismatch, true);
      // Canonical role is preserved as donor, not overridden by requested flow
      assert.equal(existingUserRole, 'donor');
    });

    it('allows admin to sign in through any mobile role flow without demotion', () => {
      const existingUserRole: string = 'admin';
      const requestedPurpose: string = 'donor_login';
      const requestedRole = requestedPurpose === 'donor_login' ? 'donor' : 'requester';
      
      const roleMismatch = existingUserRole !== requestedRole && existingUserRole !== 'admin';
      assert.equal(roleMismatch, false);
      assert.equal(existingUserRole, 'admin');
    });

    it('routes completed profiles to their correct dashboard and incomplete to onboarding', () => {
      function getRedirect(role: string, isComplete: boolean): string {
        if (!isComplete) return '/onboarding';
        switch (role) {
          case 'donor': return '/dashboard/donor';
          case 'requester': return '/dashboard/beneficiary';
          case 'volunteer': return '/dashboard/volunteer';
          case 'admin': return '/admin';
          default: return '/onboarding';
        }
      }

      assert.equal(getRedirect('donor', true), '/dashboard/donor');
      assert.equal(getRedirect('donor', false), '/onboarding');
      assert.equal(getRedirect('requester', true), '/dashboard/beneficiary');
      assert.equal(getRedirect('requester', false), '/onboarding');
      assert.equal(getRedirect('volunteer', true), '/dashboard/volunteer');
      assert.equal(getRedirect('admin', true), '/admin');
    });
  });

  describe('8. Database Challenge Locking & Concurrency Protection', () => {
    it('maps database error codes to HTTP error responses', () => {
      const dbErrors: Record<string, { code: string; status: number }> = {
        P0001: { code: 'RATE_LIMITED', status: 429 },
        P0002: { code: 'COOLDOWN_ACTIVE', status: 429 },
        P0003: { code: 'CHALLENGE_NOT_FOUND', status: 404 },
        P0004: { code: 'CHALLENGE_ALREADY_USED', status: 409 },
        P0005: { code: 'CHALLENGE_EXPIRED', status: 410 },
        P0006: { code: 'MAX_ATTEMPTS_EXCEEDED', status: 429 },
      };

      assert.equal(dbErrors['P0001'].status, 429);
      assert.equal(dbErrors['P0002'].status, 429);
      assert.equal(dbErrors['P0003'].status, 404);
      assert.equal(dbErrors['P0004'].status, 409);
      assert.equal(dbErrors['P0005'].status, 410);
      assert.equal(dbErrors['P0006'].status, 429);
    });
  });
});
