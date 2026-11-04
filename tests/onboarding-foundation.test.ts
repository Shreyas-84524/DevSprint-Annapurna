import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  createCanonicalProfile,
  getCurrentUserProjection,
  OnboardingError,
} from '../src/server/onboarding';
import {
  initiatePhoneVerification,
  confirmPhoneVerification,
} from '../src/server/verification';
import { POST as adminBootstrapHandler } from '../src/app/api/admin/bootstrap/route';
import { InMemoryVerificationClient } from './helpers/verification-client';

// Mock in-memory Supabase database for isolated unit testing
class MockSupabaseDB {
  public profiles = new Map<string, any>();
  public savedLocations = new Map<string, any>();
  public volunteerPreferences = new Map<string, any>();

  rpc = async (name: string, args: Record<string, any>) => {
    if (name !== 'complete_onboarding_tx') {
      return { data: null, error: { message: `UNKNOWN_RPC:${name}` } };
    }
    if (this.profiles.has(args.p_user_id)) {
      return { data: null, error: { code: '23505', message: 'PROFILE_ALREADY_EXISTS' } };
    }

    const now = new Date().toISOString();
    const profile = {
      id: args.p_user_id,
      display_name: args.p_display_name,
      role: args.p_role,
      is_verified: args.p_role === 'volunteer',
      phone: null,
      verified_at: args.p_role === 'volunteer' ? now : null,
      created_at: now,
      updated_at: now,
    };
    const location = {
      id: 'loc_' + Math.random().toString(36).substring(2),
      user_id: args.p_user_id,
      label: args.p_location_label,
      address: args.p_address,
      latitude: args.p_latitude,
      longitude: args.p_longitude,
      is_default: true,
      created_at: now,
      updated_at: now,
    };
    const preferences = args.p_role === 'volunteer'
      ? {
          user_id: args.p_user_id,
          vehicle_type: args.p_vehicle_type,
          max_distance_km: args.p_max_distance_km,
          is_available: true,
          created_at: now,
          updated_at: now,
        }
      : null;

    this.profiles.set(profile.id, profile);
    this.savedLocations.set(location.id, location);
    if (preferences) this.volunteerPreferences.set(preferences.user_id, preferences);

    return {
      data: {
        profile,
        location,
        volunteer_preferences: preferences,
      },
      error: null,
    };
  };

  from = (table: string) => {
    return {
      select: () => {
        const filters: Record<string, any> = {};
        const query = {
          eq: (col: string, val: any) => {
            filters[col] = val;
            return query;
          },
          maybeSingle: async () => {
            if (table === 'profiles') {
              const p = this.profiles.get(filters['id']);
              return { data: p || null, error: null };
            }
            if (table === 'saved_locations') {
              const locs = Array.from(this.savedLocations.values()).filter((l) => {
                for (const [k, v] of Object.entries(filters)) {
                  if (l[k] !== v) return false;
                }
                return true;
              });
              return { data: locs[0] || null, error: null };
            }
            if (table === 'volunteer_preferences') {
              const pref = this.volunteerPreferences.get(filters['user_id']);
              return { data: pref || null, error: null };
            }
            return { data: null, error: null };
          },
          single: async () => {
            const res = await query.maybeSingle();
            if (!res.data) return { data: null, error: { message: 'Not found' } };
            return res;
          },
        };
        return query;
      },
      insert: (row: any) => {
        return {
          select: () => {
            return {
              single: async () => {
                if (table === 'profiles') {
                  this.profiles.set(row.id, {
                    ...row,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  });
                  return { data: this.profiles.get(row.id), error: null };
                }
                if (table === 'saved_locations') {
                  const id = 'loc_' + Math.random().toString(36).substring(2);
                  const saved = {
                    ...row,
                    id,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  };
                  this.savedLocations.set(id, saved);
                  return { data: saved, error: null };
                }
                if (table === 'volunteer_preferences') {
                  this.volunteerPreferences.set(row.user_id, {
                    ...row,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  });
                  return { data: this.volunteerPreferences.get(row.user_id), error: null };
                }
                return { data: row, error: null };
              },
            };
          },
        };
      },
      delete: () => {
        return {
          eq: (col: string, val: any) => {
            if (table === 'profiles') this.profiles.delete(val);
            if (table === 'saved_locations') {
              for (const [k, v] of this.savedLocations.entries()) {
                if (v.user_id === val) this.savedLocations.delete(k);
              }
            }
            return { error: null };
          },
        };
      },
      upsert: (row: any) => {
        return {
          then: (resolve: any) => {
            if (table === 'profiles') {
              const existing = this.profiles.get(row.id) || {};
              this.profiles.set(row.id, { ...existing, ...row });
            }
            return resolve({ data: null, error: null });
          },
        };
      },
    };
  };
}

describe('Annapurna Phase 2 — Onboarding & Foundation Suite', () => {
  let mockDb: MockSupabaseDB;
  let verificationClient: InMemoryVerificationClient;

  beforeEach(() => {
    mockDb = new MockSupabaseDB();
    verificationClient = new InMemoryVerificationClient();
  });

  describe('1. Canonical Role Creation & Constraints', () => {
    it('creates a donor profile requiring OTP verification', async () => {
      const res = await createCanonicalProfile(
        'user_donor_1',
        'donor@annapurna.test',
        {
          displayName: 'Aarav Patel',
          role: 'donor',
          location: {
            label: 'Home Kitchen',
            address: 'Bandra West, Mumbai',
            latitude: 19.0596,
            longitude: 72.8295,
          },
        },
        mockDb
      );

      assert.equal(res.profile.displayName, 'Aarav Patel');
      assert.equal(res.profile.role, 'donor');
      assert.equal(res.profile.isVerified, false, 'Donor must require OTP verification');
      assert.equal(res.dashboardRoute, '/onboarding');
      assert.equal(res.location?.label, 'Home Kitchen');
      assert.equal(res.location?.latitude, 19.0596);
    });

    it('creates a requester profile requiring OTP verification', async () => {
      const res = await createCanonicalProfile(
        'user_req_1',
        'requester@annapurna.test',
        {
          displayName: 'Community Shelter',
          role: 'requester',
          location: {
            label: 'Shelter Hub',
            address: 'Dadar, Mumbai',
            latitude: 19.0178,
            longitude: 72.8478,
          },
        },
        mockDb
      );

      assert.equal(res.profile.displayName, 'Community Shelter');
      assert.equal(res.profile.role, 'requester');
      assert.equal(res.profile.isVerified, false, 'Requester must require OTP verification');
      assert.equal(res.dashboardRoute, '/onboarding');
    });

    it('creates a volunteer profile without requiring OTP verification', async () => {
      const res = await createCanonicalProfile(
        'user_vol_1',
        'volunteer@annapurna.test',
        {
          displayName: 'Vikram Singh',
          role: 'volunteer',
          location: {
            label: 'Distribution Point',
            latitude: 19.076,
            longitude: 72.8777,
          },
          volunteerPreferences: {
            vehicleType: 'motorcycle',
            maxDistanceKm: 15,
          },
        },
        mockDb
      );

      assert.equal(res.profile.displayName, 'Vikram Singh');
      assert.equal(res.profile.role, 'volunteer');
      assert.equal(res.profile.isVerified, true, 'Volunteers are verified upon onboarding');
      assert.equal(res.dashboardRoute, '/dashboard/volunteer');
      assert.equal(res.volunteerPreferences?.vehicleType, 'motorcycle');
      assert.equal(res.volunteerPreferences?.maxDistanceKm, 15);
    });

    it('rejects self-escalation to admin role (403 ADMIN_ESCALATION_FORBIDDEN)', async () => {
      await assert.rejects(
        async () => {
          await createCanonicalProfile(
            'user_bad_actor',
            'attacker@evil.com',
            {
              displayName: 'Fake Admin',
              role: 'admin' as any,
              location: {
                label: 'Base',
                latitude: 19.0,
                longitude: 72.8,
              },
            },
            mockDb
          );
        },
        (err: OnboardingError) => {
          assert.equal(err.code, 'ADMIN_ESCALATION_FORBIDDEN');
          assert.equal(err.status, 403);
          return true;
        }
      );
    });

    it('rejects invalid or unrecognized roles (400 INVALID_ROLE)', async () => {
      await assert.rejects(
        async () => {
          await createCanonicalProfile(
            'user_invalid_role',
            'invalid@test.com',
            {
              displayName: 'Invalid User',
              role: 'superman' as any,
              location: {
                label: 'Base',
                latitude: 19.0,
                longitude: 72.8,
              },
            },
            mockDb
          );
        },
        (err: OnboardingError) => {
          assert.equal(err.code, 'INVALID_ROLE');
          assert.equal(err.status, 400);
          return true;
        }
      );
    });

    it('rejects missing saved location on onboarding (400 MISSING_LOCATION)', async () => {
      await assert.rejects(
        async () => {
          await createCanonicalProfile(
            'user_no_loc',
            'no_loc@test.com',
            {
              displayName: 'No Location User',
              role: 'donor',
            },
            mockDb
          );
        },
        (err: OnboardingError) => {
          assert.equal(err.code, 'MISSING_LOCATION');
          assert.equal(err.status, 400);
          return true;
        }
      );
    });

    it('rejects invalid display names (400 INVALID_DISPLAY_NAME)', async () => {
      await assert.rejects(
        async () => {
          await createCanonicalProfile(
            'user_short_name',
            'short@test.com',
            {
              displayName: 'X',
              role: 'donor',
              location: {
                label: 'Base',
                latitude: 19.0,
                longitude: 72.8,
              },
            },
            mockDb
          );
        },
        (err: OnboardingError) => {
          assert.equal(err.code, 'INVALID_DISPLAY_NAME');
          assert.equal(err.status, 400);
          return true;
        }
      );
    });

    it('prevents re-onboarding / duplicate profile creation (409 PROFILE_ALREADY_EXISTS)', async () => {
      await createCanonicalProfile(
        'user_duplicate',
        'dup@test.com',
        {
          displayName: 'First Onboarding',
          role: 'volunteer',
          location: {
            label: 'Base',
            latitude: 19.0,
            longitude: 72.8,
          },
        },
        mockDb
      );

      await assert.rejects(
        async () => {
          await createCanonicalProfile(
            'user_duplicate',
            'dup@test.com',
            {
              displayName: 'Second Attempt',
              role: 'donor',
              location: {
                label: 'Base',
                latitude: 19.0,
                longitude: 72.8,
              },
            },
            mockDb
          );
        },
        (err: OnboardingError) => {
          assert.equal(err.code, 'PROFILE_ALREADY_EXISTS');
          assert.equal(err.status, 409);
          return true;
        }
      );
    });
  });

  describe('2. User State Projections (GET /api/me) & Dashboard Routing', () => {
    it('projects un-onboarded user to /onboarding', async () => {
      const projection = await getCurrentUserProjection('user_fresh', 'fresh@test.com', mockDb);
      assert.equal(projection.onboardingComplete, false);
      assert.equal(projection.dashboardRoute, '/onboarding');
      assert.equal(projection.role, null);
    });

    it('projects unverified donor to /onboarding', async () => {
      mockDb.profiles.set('donor_unverified', {
        id: 'donor_unverified',
        display_name: 'Pooja Donor',
        role: 'donor',
        is_verified: false,
      });

      const projection = await getCurrentUserProjection('donor_unverified', 'pooja@test.com', mockDb);
      assert.equal(projection.onboardingComplete, false);
      assert.equal(projection.dashboardRoute, '/onboarding');
    });

    it('projects verified donor to /dashboard/donor', async () => {
      mockDb.profiles.set('donor_verified', {
        id: 'donor_verified',
        display_name: 'Pooja Verified',
        role: 'donor',
        is_verified: true,
      });

      const projection = await getCurrentUserProjection('donor_verified', 'pooja@test.com', mockDb);
      assert.equal(projection.onboardingComplete, true);
      assert.equal(projection.dashboardRoute, '/dashboard/donor');
    });

    it('projects verified requester to /dashboard/beneficiary', async () => {
      mockDb.profiles.set('req_verified', {
        id: 'req_verified',
        display_name: 'Shelter Coordinator',
        role: 'requester',
        is_verified: true,
      });

      const projection = await getCurrentUserProjection('req_verified', 'shelter@test.com', mockDb);
      assert.equal(projection.onboardingComplete, true);
      assert.equal(projection.dashboardRoute, '/dashboard/beneficiary');
    });

    it('projects volunteer immediately to /dashboard/volunteer', async () => {
      mockDb.profiles.set('vol_ready', {
        id: 'vol_ready',
        display_name: 'Volunteer Amit',
        role: 'volunteer',
        is_verified: true,
      });

      const projection = await getCurrentUserProjection('vol_ready', 'amit@test.com', mockDb);
      assert.equal(projection.onboardingComplete, true);
      assert.equal(projection.dashboardRoute, '/dashboard/volunteer');
    });

    it('projects admin directly to /admin', async () => {
      mockDb.profiles.set('admin_user', {
        id: 'admin_user',
        display_name: 'Admin Boss',
        role: 'admin',
        is_verified: true,
      });

      const projection = await getCurrentUserProjection('admin_user', 'admin@annapurna.test', mockDb);
      assert.equal(projection.onboardingComplete, true);
      assert.equal(projection.dashboardRoute, '/admin');
    });
  });

  describe('3. Admin Bootstrap Security Boundary & One-Time Lockout', () => {
    const validSecret = 'super_secret_admin_bootstrap_key_2026';
    const validUUID = 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d';

    beforeEach(() => {
      delete process.env.ADMIN_BOOTSTRAP_SECRET;
    });

    it('returns 503 when admin bootstrap secret is not configured on server', async () => {
      const req = new Request('http://localhost:3000/api/admin/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: validUUID }),
      });

      const res = await adminBootstrapHandler(req);
      assert.equal(res.status, 503);
      const json = await res.json();
      assert.equal(json.error.code, 'BOOTSTRAP_NOT_CONFIGURED');
    });

    it('returns 401 when x-admin-bootstrap-secret header is omitted', async () => {
      process.env.ADMIN_BOOTSTRAP_SECRET = validSecret;

      const req = new Request('http://localhost:3000/api/admin/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: validUUID }),
      });

      const res = await adminBootstrapHandler(req);
      assert.equal(res.status, 401);
      const json = await res.json();
      assert.equal(json.error.code, 'UNAUTHORIZED');
    });

    it('returns 403 when wrong bootstrap secret is provided', async () => {
      process.env.ADMIN_BOOTSTRAP_SECRET = validSecret;

      const req = new Request('http://localhost:3000/api/admin/bootstrap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-bootstrap-secret': 'wrong_secret_attempt',
        },
        body: JSON.stringify({ targetUserId: validUUID }),
      });

      const res = await adminBootstrapHandler(req);
      assert.equal(res.status, 403);
      const json = await res.json();
      assert.equal(json.error.code, 'FORBIDDEN');
    });

    it('returns 400 when targetUserId is not a valid UUID', async () => {
      process.env.ADMIN_BOOTSTRAP_SECRET = validSecret;

      const req = new Request('http://localhost:3000/api/admin/bootstrap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-bootstrap-secret': validSecret,
        },
        body: JSON.stringify({ targetUserId: 'not-a-valid-uuid' }),
      });

      const res = await adminBootstrapHandler(req);
      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.error.code, 'INVALID_TARGET_USER_ID');
    });
  });

  describe('4. Full Onboarding & OTP Verification Workflow', () => {
    it('executes donor creation followed by Swift OTP verification flow', async () => {
      // 1. Create donor profile with required location
      const onboardRes = await createCanonicalProfile(
        'user_lifecycle_1',
        'donor@test.com',
        {
          displayName: 'Community Donor',
          role: 'donor',
          location: {
            label: 'Central Kitchen',
            latitude: 19.076,
            longitude: 72.8777,
          },
        },
        mockDb
      );
      assert.equal(onboardRes.profile.isVerified, false);

      // 2. Mock Swift fetch responses
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url: any) => {
        const urlStr = url.toString();
        if (urlStr.includes('/api/v1/otp/send')) {
          return new Response(
            JSON.stringify({
              request_id: 'req_test_123',
              phone: '+919876543210',
              status: 'QUEUED',
              expires_at: new Date(Date.now() + 600000).toISOString(),
              resend_after: 30,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        if (urlStr.includes('/api/v1/otp/verify')) {
          return new Response(
            JSON.stringify({
              verified: true,
              phone: '+919876543210',
              verified_at: new Date().toISOString(),
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return new Response('Not found', { status: 404 });
      };

      try {
        const MOCK_CONFIG = {
          baseUrl: 'https://mock-swift.local',
          projectKey: 'test_key',
        };

        const sendResult = await initiatePhoneVerification({
          userId: 'user_lifecycle_1',
          phone: '+919876543210',
          customConfig: MOCK_CONFIG,
          customClient: verificationClient,
        });

        assert.equal(sendResult.status, 'QUEUED');
        assert.ok(sendResult.requestId);

        // 3. Complete phone verification
        const verifyResult = await confirmPhoneVerification({
          userId: 'user_lifecycle_1',
          otp: '123456',
          customConfig: MOCK_CONFIG,
          customClient: verificationClient,
        });

        assert.equal(verifyResult.verified, true);
        assert.equal(verifyResult.phone, '+919876543210');
        assert.equal(verifyResult.proofId, 'req_test_123'); // Swift requestId proof

        // 4. Update profile in database
        const profile = mockDb.profiles.get('user_lifecycle_1');
        profile.is_verified = true;
        profile.phone = verifyResult.phone;
        profile.verified_at = verifyResult.verifiedAt;

        // 5. Query /api/me projection
        const projection = await getCurrentUserProjection('user_lifecycle_1', 'donor@test.com', mockDb);
        assert.equal(projection.isVerified, true);
        assert.equal(projection.onboardingComplete, true);
        assert.equal(projection.dashboardRoute, '/dashboard/donor');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});
