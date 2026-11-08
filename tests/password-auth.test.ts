import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import {
  normalizeEmail,
  validatePassword,
  validateSignupRole,
  PasswordAuthError,
  signUpWithPassword,
  signInWithPassword,
  requestPasswordReset,
  updatePassword,
} from '../src/server/passwordAuth';
import { POST as signupHandler } from '../src/app/api/auth/signup/route';
import { POST as logoutHandler } from '../src/app/api/auth/logout/route';
import { GET as adminStatsHandler } from '../src/app/api/admin/stats/route';

// Mock Supabase client for isolated auth unit tests
class MockAuthSupabaseClient {
  public users = new Map<string, any>();
  public profiles = new Map<string, any>();
  public foodListings = new Map<string, any>();
  public deliveries = new Map<string, any>();
  public contactMessages = new Map<string, any>();
  public deliveryEvents = new Map<string, any>();
  public activeUser: any = null;
  public signedOut = false;

  constructor() {
    // Seed default admin profile
    this.profiles.set('admin-user-id', {
      id: 'admin-user-id',
      role: 'admin',
      is_verified: true,
      display_name: 'Administrator',
    });
    // Seed default donor profile
    this.profiles.set('donor-user-id', {
      id: 'donor-user-id',
      role: 'donor',
      is_verified: true,
      display_name: 'Active Donor',
    });
    // Seed default volunteer profile
    this.profiles.set('vol-user-id', {
      id: 'vol-user-id',
      role: 'volunteer',
      is_verified: true,
      display_name: 'Fast Volunteer',
    });
    // Seed default requester profile
    this.profiles.set('req-user-id', {
      id: 'req-user-id',
      role: 'requester',
      is_verified: true,
      display_name: 'Community Shelter',
    });
  }

  public auth = {
    signUp: async ({ email, password }: any) => {
      if (email === 'existing@example.com') {
        return {
          data: { user: null, session: null },
          error: { message: 'User already registered' },
        };
      }
      const user = {
        id: 'new-user-' + Math.random().toString(36).substring(2, 9),
        email,
      };
      this.users.set(email, { ...user, password });
      return {
        data: {
          user,
          session: { access_token: 'mock-token' },
        },
        error: null,
      };
    },

    signInWithPassword: async ({ email, password }: any) => {
      if (email === 'admin@annapurna.org' && password === 'ValidAdminPassword123!') {
        const user = { id: 'admin-user-id', email };
        this.activeUser = user;
        return { data: { user, session: { access_token: 'mock-token' } }, error: null };
      }
      if (email === 'donor@example.com' && password === 'ValidPassword123!') {
        const user = { id: 'donor-user-id', email };
        this.activeUser = user;
        return { data: { user, session: { access_token: 'mock-token' } }, error: null };
      }
      if (email === 'volunteer@example.com' && password === 'ValidPassword123!') {
        const user = { id: 'vol-user-id', email };
        this.activeUser = user;
        return { data: { user, session: { access_token: 'mock-token' } }, error: null };
      }
      if (email === 'requester@example.com' && password === 'ValidPassword123!') {
        const user = { id: 'req-user-id', email };
        this.activeUser = user;
        return { data: { user, session: { access_token: 'mock-token' } }, error: null };
      }
      return { data: { user: null, session: null }, error: { message: 'Invalid login credentials' } };
    },

    resetPasswordForEmail: async () => {
      return { data: {}, error: null };
    },

    getUser: async () => {
      return { data: { user: this.activeUser }, error: null };
    },

    updateUser: async ({ password }: any) => {
      if (!this.activeUser) {
        return { data: null, error: { message: 'No active session' } };
      }
      this.activeUser.password = password;
      return { data: { user: this.activeUser }, error: null };
    },

    signOut: async () => {
      this.signedOut = true;
      this.activeUser = null;
      return { error: null };
    },
  };

  public from = (table: string) => {
    let map: Map<string, any>;
    switch (table) {
      case 'profiles': map = this.profiles; break;
      case 'food_listings': map = this.foodListings; break;
      case 'deliveries': map = this.deliveries; break;
      case 'contact_messages': map = this.contactMessages; break;
      case 'delivery_events': map = this.deliveryEvents; break;
      default: map = new Map();
    }

    return {
      select: (_?: string, options?: any) => {
        let items = Array.from(map.values());
        const query: any = {
          eq: (col: string, val: any) => {
            items = items.filter((i) => i[col] === val);
            return query;
          },
          in: (col: string, vals: any[]) => {
            items = items.filter((i) => vals.includes(i[col]));
            return query;
          },
          order: () => query,
          limit: (n: number) => {
            items = items.slice(0, n);
            return query;
          },
          maybeSingle: async () => {
            return { data: items[0] || null, error: null };
          },
          then: (resolve: any, reject: any) => {
            const count = items.length;
            const res = options?.head ? { count, data: null, error: null } : { data: items, count, error: null };
            return Promise.resolve(res).then(resolve, reject);
          },
        };
        return query;
      },
    };
  };
}

describe('Supabase Email & Password Authentication Suite', () => {
  describe('1. Email Normalization & Validation', () => {
    it('normalizes valid emails by trimming and converting to lowercase', () => {
      assert.equal(normalizeEmail(' Donor.User@Example.COM '), 'donor.user@example.com');
      assert.equal(normalizeEmail('volunteer+annapurna@domain.org'), 'volunteer+annapurna@domain.org');
    });

    it('rejects missing or empty email inputs', () => {
      assert.throws(() => normalizeEmail(''), {
        name: 'PasswordAuthError',
        code: 'MISSING_EMAIL',
        status: 400,
      });
      assert.throws(() => normalizeEmail(null as any), {
        name: 'PasswordAuthError',
        code: 'MISSING_EMAIL',
        status: 400,
      });
    });

    it('rejects malformed email formats', () => {
      assert.throws(() => normalizeEmail('not-an-email'), {
        name: 'PasswordAuthError',
        code: 'INVALID_EMAIL_FORMAT',
        status: 400,
      });
      assert.throws(() => normalizeEmail('@domain.com'), {
        name: 'PasswordAuthError',
        code: 'INVALID_EMAIL_FORMAT',
        status: 400,
      });
    });
  });

  describe('2. Password Complexity & Role Restrictions', () => {
    it('requires password to be at least 8 characters long', () => {
      assert.throws(() => validatePassword('short'), {
        name: 'PasswordAuthError',
        code: 'WEAK_PASSWORD',
        status: 400,
      });
      assert.doesNotThrow(() => validatePassword('12345678'));
    });

    it('allows valid public onboarding roles (donor, requester, volunteer)', () => {
      assert.equal(validateSignupRole('donor'), 'donor');
      assert.equal(validateSignupRole('requester'), 'requester');
      assert.equal(validateSignupRole('volunteer'), 'volunteer');
    });

    it('strictly forbids admin self-assignment during signup', () => {
      assert.throws(() => validateSignupRole('admin'), {
        name: 'PasswordAuthError',
        code: 'INVALID_ROLE',
        status: 400,
      });
      assert.throws(() => validateSignupRole('root'), {
        name: 'PasswordAuthError',
        code: 'INVALID_ROLE',
        status: 400,
      });
    });
  });

  describe('3. Public Signup Route (POST /api/auth/signup)', () => {
    it('returns 400 when email or password is missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' }),
      });
      const res = await signupHandler(req);
      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.data, null);
      assert.equal(json.error.code, 'MISSING_PASSWORD');
    });

    it('returns 400 when password is fewer than 8 characters', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'short',
          role: 'donor',
        }),
      });
      const res = await signupHandler(req);
      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.error.code, 'WEAK_PASSWORD');
    });

    it('returns 400 when attempting to sign up as admin', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@example.com',
          password: 'ValidPassword123!',
          role: 'admin',
        }),
      });
      const res = await signupHandler(req);
      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.error.code, 'INVALID_ROLE');
    });

    it('successfully registers valid donor and guides to onboarding', async () => {
      const mockClient = new MockAuthSupabaseClient();
      const res = await signUpWithPassword(
        {
          email: 'newdonor@example.com',
          password: 'ValidPassword123!',
          role: 'donor',
        },
        mockClient
      );

      assert.equal(res.user.email, 'newdonor@example.com');
      assert.equal(res.redirectUrl, '/onboarding');
      assert.equal(res.session, true);
    });
  });

  describe('4. Public Login Route (POST /api/auth/login)', () => {
    it('returns 401 with generic message on wrong password', async () => {
      const mockClient = new MockAuthSupabaseClient();
      await assert.rejects(
        () =>
          signInWithPassword(
            { email: 'donor@example.com', password: 'WrongPassword!' },
            mockClient
          ),
        (err: PasswordAuthError) => {
          assert.equal(err.status, 401);
          assert.equal(err.code, 'INVALID_CREDENTIALS');
          assert.equal(err.message, 'Invalid email or password.');
          return true;
        }
      );
    });

    it('returns 401 with generic message on unknown email (no disclosure)', async () => {
      const mockClient = new MockAuthSupabaseClient();
      await assert.rejects(
        () =>
          signInWithPassword(
            { email: 'unknown@example.com', password: 'ValidPassword123!' },
            mockClient
          ),
        (err: PasswordAuthError) => {
          assert.equal(err.status, 401);
          assert.equal(err.code, 'INVALID_CREDENTIALS');
          assert.equal(err.message, 'Invalid email or password.');
          return true;
        }
      );
    });

    it('authenticates valid donor and routes to donor dashboard', async () => {
      const mockClient = new MockAuthSupabaseClient();
      const res = await signInWithPassword(
        {
          email: 'donor@example.com',
          password: 'ValidPassword123!',
          portalRole: 'donor',
        },
        mockClient
      );

      assert.equal(res.user.email, 'donor@example.com');
      assert.equal(res.profile?.role, 'donor');
      assert.equal(res.redirectUrl, '/dashboard/donor');
      assert.equal(res.roleMismatch, false);
    });

    it('routes requester to /dashboard/beneficiary', async () => {
      const mockClient = new MockAuthSupabaseClient();
      const res = await signInWithPassword(
        {
          email: 'requester@example.com',
          password: 'ValidPassword123!',
          portalRole: 'requester',
        },
        mockClient
      );

      assert.equal(res.profile?.role, 'requester');
      assert.equal(res.redirectUrl, '/dashboard/beneficiary');
    });

    it('routes volunteer to /dashboard/volunteer', async () => {
      const mockClient = new MockAuthSupabaseClient();
      const res = await signInWithPassword(
        {
          email: 'volunteer@example.com',
          password: 'ValidPassword123!',
          portalRole: 'volunteer',
        },
        mockClient
      );

      assert.equal(res.profile?.role, 'volunteer');
      assert.equal(res.redirectUrl, '/dashboard/volunteer');
    });

    it('enforces one-role-per-account and routes mismatched portal to canonical dashboard without role mutation', async () => {
      const mockClient = new MockAuthSupabaseClient();
      // Donor signs in through volunteer portal
      const res = await signInWithPassword(
        {
          email: 'donor@example.com',
          password: 'ValidPassword123!',
          portalRole: 'volunteer',
        },
        mockClient
      );

      assert.equal(res.profile?.role, 'donor');
      assert.equal(res.redirectUrl, '/dashboard/donor');
      assert.equal(res.roleMismatch, true);
    });

    it('strictly denies non-admin user signing in through admin portal (/login/admin)', async () => {
      const mockClient = new MockAuthSupabaseClient();
      await assert.rejects(
        () =>
          signInWithPassword(
            {
              email: 'donor@example.com',
              password: 'ValidPassword123!',
              portalRole: 'admin',
            },
            mockClient
          ),
        (err: PasswordAuthError) => {
          assert.equal(err.status, 403);
          assert.equal(err.code, 'UNAUTHORIZED_ROLE');
          assert.equal(mockClient.signedOut, true, 'Non-admin session must be signed out immediately');
          return true;
        }
      );
    });

    it('authenticates valid admin and routes to /admin', async () => {
      const mockClient = new MockAuthSupabaseClient();
      const res = await signInWithPassword(
        {
          email: 'admin@annapurna.org',
          password: 'ValidAdminPassword123!',
          portalRole: 'admin',
        },
        mockClient
      );

      assert.equal(res.profile?.role, 'admin');
      assert.equal(res.redirectUrl, '/admin');
      assert.equal(res.roleMismatch, false);
    });
  });

  describe('5. Password Reset & Update Flows', () => {
    it('returns neutral response for password reset without disclosing email existence', async () => {
      const mockClient = new MockAuthSupabaseClient();
      const res = await requestPasswordReset(
        { email: 'nonexistent@example.com' },
        mockClient
      );
      assert.equal(typeof res.message, 'string');
      assert.ok(res.message.includes('If an account exists'));
    });

    it('rejects password update if recovery session is expired or unauthenticated', async () => {
      const mockClient = new MockAuthSupabaseClient();
      mockClient.activeUser = null; // Unauthenticated
      await assert.rejects(
        () => updatePassword('NewSecurePassword123!', mockClient),
        (err: PasswordAuthError) => {
          assert.equal(err.status, 401);
          assert.equal(err.code, 'UNAUTHORIZED');
          return true;
        }
      );
    });

    it('updates password for authenticated recovery session', async () => {
      const mockClient = new MockAuthSupabaseClient();
      mockClient.activeUser = { id: 'recovery-user-1', email: 'recovery@example.com' };

      const res = await updatePassword('NewSecurePassword123!', mockClient);
      assert.equal(res.success, true);
      assert.equal(res.redirectUrl, '/login');
      assert.equal(mockClient.activeUser.password, 'NewSecurePassword123!');
    });
  });

  describe('6. Logout Route (POST /api/auth/logout)', () => {
    it('terminates active session and returns 200', async () => {
      const res = await logoutHandler();
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.data.success, true);
    });
  });

  describe('7. Admin Stats Endpoint (GET /api/admin/stats)', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/stats');
      const res = await adminStatsHandler(req, { caller: null });
      assert.equal(res.status, 401);
    });

    it('rejects non-admin users with 403', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/stats');
      const res = await adminStatsHandler(req, {
        caller: { id: 'donor-1', role: 'donor', isVerified: true },
      });
      assert.equal(res.status, 403);
    });
  });
});
