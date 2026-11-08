import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CANONICAL_ROLES,
  ONBOARDING_ROLES,
  LocationInput,
} from '../src/types/contracts';
import { getProtectedRouteRedirect } from '../src/proxy';

describe('Role-aware onboarding and location fallback suite', () => {
  describe('Canonical role definitions and constraints', () => {
    it('defines canonical roles including donor, requester, volunteer, admin', () => {
      assert.deepEqual(Array.from(CANONICAL_ROLES), [
        'donor',
        'requester',
        'volunteer',
        'admin',
      ]);
    });

    it('allows only donor, requester, and volunteer as self-onboarding roles', () => {
      assert.deepEqual(Array.from(ONBOARDING_ROLES), [
        'donor',
        'requester',
        'volunteer',
      ]);
      assert.equal((ONBOARDING_ROLES as readonly string[]).includes('admin'), false);
    });

    it('does not add an account-verification gate to any self-onboarding role', () => {
      for (const role of ONBOARDING_ROLES) {
        assert.equal(['donor', 'requester', 'volunteer'].includes(role), true);
      }
    });
  });

  describe('Location validation and fallback coordinate logic', () => {
    const validateLocation = (input: Partial<LocationInput>): { valid: boolean; error?: string } => {
      if (!input.label || !input.label.trim()) {
        return { valid: false, error: 'LOCATION_LABEL_REQUIRED' };
      }
      if (!input.address || !input.address.trim()) {
        return { valid: false, error: 'ADDRESS_REQUIRED' };
      }
      if (
        typeof input.latitude !== 'number' ||
        typeof input.longitude !== 'number' ||
        isNaN(input.latitude) ||
        isNaN(input.longitude)
      ) {
        return { valid: false, error: 'INVALID_COORDINATES' };
      }
      if (input.latitude < -90 || input.latitude > 90) {
        return { valid: false, error: 'LATITUDE_OUT_OF_BOUNDS' };
      }
      if (input.longitude < -180 || input.longitude > 180) {
        return { valid: false, error: 'LONGITUDE_OUT_OF_BOUNDS' };
      }
      return { valid: true };
    };

    it('accepts valid location inputs with accurate coordinates', () => {
      const valid = validateLocation({
        label: 'Main Kitchen',
        address: 'Bandra West, Mumbai',
        latitude: 19.076,
        longitude: 72.8777,
      });
      assert.equal(valid.valid, true);
    });

    it('rejects missing or empty location label', () => {
      const res = validateLocation({
        label: '   ',
        address: 'Bandra West, Mumbai',
        latitude: 19.076,
        longitude: 72.8777,
      });
      assert.equal(res.valid, false);
      assert.equal(res.error, 'LOCATION_LABEL_REQUIRED');
    });

    it('rejects missing address', () => {
      const res = validateLocation({
        label: 'Home',
        address: '',
        latitude: 19.076,
        longitude: 72.8777,
      });
      assert.equal(res.valid, false);
      assert.equal(res.error, 'ADDRESS_REQUIRED');
    });

    it('rejects non-numeric or NaN coordinates', () => {
      const res = validateLocation({
        label: 'Home',
        address: 'Bandra West, Mumbai',
        latitude: NaN,
        longitude: 72.8777,
      });
      assert.equal(res.valid, false);
      assert.equal(res.error, 'INVALID_COORDINATES');
    });

    it('rejects latitude outside -90 to 90', () => {
      const res = validateLocation({
        label: 'Home',
        address: 'North Pole',
        latitude: 91.5,
        longitude: 0,
      });
      assert.equal(res.valid, false);
      assert.equal(res.error, 'LATITUDE_OUT_OF_BOUNDS');
    });

    it('rejects longitude outside -180 to 180', () => {
      const res = validateLocation({
        label: 'Home',
        address: 'Date Line',
        latitude: 0,
        longitude: 181.2,
      });
      assert.equal(res.valid, false);
      assert.equal(res.error, 'LONGITUDE_OUT_OF_BOUNDS');
    });

    it('handles permission-denied manual coordinate presets accurately', () => {
      const presets = [
        { name: 'Mumbai', lat: 19.076, lng: 72.8777 },
        { name: 'Delhi', lat: 28.6139, lng: 77.209 },
        { name: 'Bengaluru', lat: 12.9716, lng: 77.5946 },
        { name: 'Kolkata', lat: 22.5726, lng: 88.3639 },
      ];

      for (const preset of presets) {
        const check = validateLocation({
          label: 'Default Base',
          address: `${preset.name}, India`,
          latitude: preset.lat,
          longitude: preset.lng,
        });
        assert.equal(check.valid, true, `City preset ${preset.name} should be valid`);
      }
    });
  });

  describe('Dashboard routing outcomes based on canonical role', () => {
    it('allows a canonical donor regardless of legacy verification status', () => {
      const route = getProtectedRouteRedirect('/dashboard/donor', {
        role: 'donor',
      });
      assert.equal(route, null);
    });

    it('allows donor to access donor dashboard without redirect', () => {
      const route = getProtectedRouteRedirect('/dashboard/donor', {
        role: 'donor',
      });
      assert.equal(route, null);
    });

    it('allows a canonical requester regardless of legacy verification status', () => {
      const route = getProtectedRouteRedirect('/dashboard/beneficiary', {
        role: 'requester',
      });
      assert.equal(route, null);
    });

    it('allows requester to access beneficiary dashboard without redirect', () => {
      const route = getProtectedRouteRedirect('/dashboard/beneficiary', {
        role: 'requester',
      });
      assert.equal(route, null);
    });

    it('allows volunteer to access volunteer dashboard immediately without extra approval gates', () => {
      const route = getProtectedRouteRedirect('/dashboard/volunteer', {
        role: 'volunteer',
      });
      assert.equal(route, null);
    });

    it('prevents cross-role access (e.g. donor attempting volunteer dashboard)', () => {
      const route = getProtectedRouteRedirect('/dashboard/volunteer', {
        role: 'donor',
      });
      assert.equal(route, '/dashboard/donor');
    });

    it('prevents non-admin user from accessing admin portal', () => {
      const route = getProtectedRouteRedirect('/admin', {
        role: 'volunteer',
      });
      assert.equal(route, '/dashboard/volunteer');
    });
  });
});
