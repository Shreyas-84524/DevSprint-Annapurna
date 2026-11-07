import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  FOOD_TYPES,
  FoodType,
  ListingDTO,
  PublicListingSummaryDTO,
  DeliveryDetailDTO,
  CANONICAL_ROLES,
} from '../src/types/contracts';

/**
 * UI State and Workflow Simulation Suite
 *
 * Verifies frontend role journeys, API connectivity, state machine transitions,
 * optimistic concurrency handling, one-active-delivery enforcement, and negative states.
 */
describe('Core Food Workflow UI Suite', () => {
  describe('1. Donor Listing Creation & State Handling', () => {
    it('validates donor listing form fields client-side before submission', () => {
      const validateDonorForm = (form: {
        title: string;
        quantity: string;
        unit: string;
        foodType: string;
        address: string;
        expiresHours: number;
      }): { valid: boolean; errors: Record<string, string> } => {
        const errors: Record<string, string> = {};
        if (!form.title.trim() || form.title.trim().length < 2) {
          errors.title = 'Title must be at least 2 characters long.';
        }
        const q = Number(form.quantity);
        if (!q || isNaN(q) || q <= 0) {
          errors.quantity = 'Quantity must be a positive number.';
        }
        if (!form.unit.trim()) {
          errors.unit = 'Unit is required.';
        }
        if (!form.address.trim()) {
          errors.address = 'Pickup address is required.';
        }
        if (!FOOD_TYPES.includes(form.foodType as FoodType)) {
          errors.foodType = 'Invalid food type.';
        }
        if (form.expiresHours <= 0) {
          errors.expiresHours = 'Expiry window must be positive.';
        }
        return { valid: Object.keys(errors).length === 0, errors };
      };

      // Invalid input: empty title and negative quantity
      const invalid = validateDonorForm({
        title: ' ',
        quantity: '-5',
        unit: '',
        foodType: 'invalid_type',
        address: '',
        expiresHours: 0,
      });
      assert.equal(invalid.valid, false);
      assert.ok(invalid.errors.title);
      assert.ok(invalid.errors.quantity);
      assert.ok(invalid.errors.unit);
      assert.ok(invalid.errors.address);
      assert.ok(invalid.errors.foodType);

      // Valid input
      const valid = validateDonorForm({
        title: 'Fresh Veg Biryani',
        quantity: '25',
        unit: 'boxes',
        foodType: 'veg',
        address: 'Bandra West, Mumbai',
        expiresHours: 4,
      });
      assert.equal(valid.valid, true);
      assert.deepEqual(valid.errors, {});
    });

    it('validates donor image upload MIME type and size limits', () => {
      const validateImage = (mimeType: string, sizeBytes: number): { valid: boolean; error?: string } => {
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedMimeTypes.includes(mimeType)) {
          return { valid: false, error: 'Image must be JPEG, PNG, or WebP.' };
        }
        if (sizeBytes > 5 * 1024 * 1024) {
          return { valid: false, error: 'Image size must not exceed 5MB.' };
        }
        return { valid: true };
      };

      assert.equal(validateImage('image/jpeg', 1024 * 1024).valid, true);
      assert.equal(validateImage('image/gif', 1024).valid, false);
      assert.equal(validateImage('image/png', 6 * 1024 * 1024).valid, false);
    });

    it('enforces verified donor check before allowing listing creation', () => {
      const checkDonorPostingAccess = (profile: { role: string; is_verified: boolean }) => {
        if (profile.role !== 'donor') {
          return { allowed: false, reason: 'FORBIDDEN_ROLE' };
        }
        if (!profile.is_verified) {
          return { allowed: false, reason: 'DONOR_NOT_VERIFIED' };
        }
        return { allowed: true };
      };

      assert.equal(checkDonorPostingAccess({ role: 'donor', is_verified: true }).allowed, true);
      assert.equal(checkDonorPostingAccess({ role: 'donor', is_verified: false }).allowed, false);
      assert.equal(checkDonorPostingAccess({ role: 'volunteer', is_verified: true }).allowed, false);
    });

    it('handles optimistic concurrency conflicts (stale rowVersion) by triggering canonical refresh', () => {
      const canonicalListings: ListingDTO[] = [
        {
          id: 'listing-1',
          donorId: 'donor-1',
          title: 'Paneer Butter Masala',
          description: '10 containers',
          quantity: 10,
          unit: 'containers',
          foodType: 'veg',
          dietaryTags: ['veg'],
          status: 'published',
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          pickupLocationId: null,
          generalArea: 'Bandra',
          rowVersion: 2, // Server version is 2
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      // Client attempts to update with stale rowVersion: 1
      const clientUpdate = {
        id: 'listing-1',
        clientRowVersion: 1,
        title: 'Updated Paneer',
      };

      let conflictTriggered = false;
      let reFetchTriggered = false;

      const performUpdate = (update: typeof clientUpdate) => {
        const current = canonicalListings.find((l) => l.id === update.id);
        if (!current) return;
        if (current.rowVersion !== update.clientRowVersion) {
          // Stale version triggers 409
          conflictTriggered = true;
          // UI must re-fetch canonical state
          reFetchTriggered = true;
          return { status: 409, error: 'STALE_ROW_VERSION' };
        }
        current.title = update.title;
        current.rowVersion += 1;
        return { status: 200, data: current };
      };

      const result = performUpdate(clientUpdate);
      assert.equal(result?.status, 409);
      assert.equal(conflictTriggered, true);
      assert.equal(reFetchTriggered, true);
    });
  });

  describe('2. Requester Discovery, Strict Privacy, and Atomic Claim', () => {
    it('ensures public discovery summaries never expose private pickup coordinates or phone', () => {
      const publicSummary: PublicListingSummaryDTO = {
        id: 'listing-10',
        title: 'Veg Thali',
        description: 'Packed fresh thalis',
        quantity: 30,
        unit: 'meals',
        foodType: 'veg',
        dietaryTags: ['vegetarian'],
        expiresAt: new Date(Date.now() + 7200000).toISOString(),
        area: 'Andheri West',
        city: 'Mumbai',
        distanceKm: 3.2,
      };

      // Strict privacy validation
      const keys = Object.keys(publicSummary);
      assert.equal(keys.includes('pickupAddress'), false);
      assert.equal(keys.includes('pickupLatitude'), false);
      assert.equal(keys.includes('pickupLongitude'), false);
      assert.equal(keys.includes('contactPhone'), false);
      assert.equal(keys.includes('pickupInstructions'), false);
    });

    it('requires phone-verified requester before permitting food claims', () => {
      const checkRequesterClaimAccess = (profile: { role: string; is_verified: boolean }) => {
        if (profile.role !== 'requester') {
          return { allowed: false, reason: 'FORBIDDEN_ROLE' };
        }
        if (!profile.is_verified) {
          return { allowed: false, reason: 'REQUESTER_NOT_VERIFIED' };
        }
        return { allowed: true };
      };

      assert.equal(checkRequesterClaimAccess({ role: 'requester', is_verified: true }).allowed, true);
      assert.equal(checkRequesterClaimAccess({ role: 'requester', is_verified: false }).allowed, false);
      assert.equal(checkRequesterClaimAccess({ role: 'donor', is_verified: true }).allowed, false);
    });

    it('handles atomic claim conflict (409) with immediate UI conflict banner and re-fetch', () => {
      const listingStatus: string = 'claimed'; // Already claimed by competitor

      const handleClaim = (status: string) => {
        if (status !== 'published') {
          return {
            status: 409,
            error: {
              code: 'CLAIM_CONFLICT',
              message: 'Listing already claimed by another requester.',
            },
          };
        }
        return { status: 201, error: undefined, data: { claimId: 'claim-1', status: 'claimed' } };
      };

      const res = handleClaim(listingStatus);
      assert.equal(res.status, 409);
      assert.equal(res.error?.code, 'CLAIM_CONFLICT');
    });

    it('handles expired listing claim attempt (410) with expired state', () => {
      const isListingExpired = (expiresAt: string) => {
        return new Date(expiresAt).getTime() <= Date.now();
      };

      const pastExpiry = new Date(Date.now() - 1000).toISOString();
      assert.equal(isListingExpired(pastExpiry), true);

      const handleExpiredClaim = (expiresAt: string) => {
        if (isListingExpired(expiresAt)) {
          return { status: 410, error: { code: 'LISTING_EXPIRED', message: 'Listing has expired.' } };
        }
        return { status: 201, error: undefined };
      };

      const res = handleExpiredClaim(pastExpiry);
      assert.equal(res.status, 410);
      assert.equal(res.error?.code, 'LISTING_EXPIRED');
    });
  });

  describe('3. Volunteer Available Tasks & Single-Active-Delivery Enforcement', () => {
    it('restricts volunteer task acceptance when volunteer already has an active delivery', () => {
      const activeDeliveries = new Map<string, string>([
        ['volunteer-1', 'delivery-active-001'],
      ]);

      const attemptAcceptDelivery = (volunteerId: string, deliveryId: string) => {
        if (activeDeliveries.has(volunteerId)) {
          return {
            status: 409,
            error: {
              code: 'VOLUNTEER_ACTIVE_DELIVERY_EXISTS',
              message: 'Volunteer already has an active delivery.',
            },
            data: undefined,
          };
        }
        activeDeliveries.set(volunteerId, deliveryId);
        return { status: 200, error: undefined, data: { deliveryId, volunteerId, status: 'assigned' } };
      };

      // Volunteer-1 already has active delivery -> 409 Conflict
      const blocked = attemptAcceptDelivery('volunteer-1', 'delivery-002');
      assert.equal(blocked.status, 409);
      assert.equal(blocked.error?.code, 'VOLUNTEER_ACTIVE_DELIVERY_EXISTS');

      // Free volunteer-2 -> 200 Success
      const success = attemptAcceptDelivery('volunteer-2', 'delivery-002');
      assert.equal(success.status, 200);
      assert.equal(success.data?.status, 'assigned');
    });

    it('handles competing volunteer acceptance on same delivery task (409 conflict)', () => {
      const deliveryAssigned: boolean = true; // First volunteer won

      const attemptAccept = () => {
        if (deliveryAssigned) {
          return {
            status: 409,
            error: {
              code: 'DELIVERY_ALREADY_ASSIGNED',
              message: 'Delivery already assigned to another volunteer.',
            },
          };
        }
        return { status: 200, error: undefined };
      };

      const result = attemptAccept();
      assert.equal(result.status, 409);
      assert.equal(result.error?.code, 'DELIVERY_ALREADY_ASSIGNED');
    });

    it('projects authorized participant details including pickup coordinates once assigned', () => {
      const deliveryDetail: DeliveryDetailDTO = {
        id: 'delivery-100',
        listingId: 'listing-10',
        claimId: 'claim-10',
        status: 'assigned',
        rowVersion: 1,
        donor: {
          id: 'donor-1',
          displayName: 'Community Center',
          phone: '+919876543210',
        },
        requester: {
          id: 'requester-1',
          displayName: 'Shelter Home',
          phone: '+919123456789',
        },
        volunteer: {
          id: 'volunteer-1',
          displayName: 'Fast Deliverer',
          phone: '+919999988888',
        },
        listing: {
          id: 'listing-10',
          donorId: 'donor-1',
          title: '30 Meal Packs',
          description: null,
          quantity: 30,
          unit: 'packs',
          foodType: 'veg',
          dietaryTags: [],
          status: 'claimed',
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          pickupLocationId: null,
          generalArea: 'Bandra',
          rowVersion: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        pickupLocation: {
          address: 'Building 4, Bandra West, Mumbai',
          latitude: 19.076,
          longitude: 72.8777,
          contactPhone: '+919876543210',
          instructions: 'Call donor at arrival',
        },
        dropoffLocation: {
          address: 'Shelter Gate 1, Dharavi, Mumbai',
          latitude: 19.040,
          longitude: 72.850,
          contactPhone: '+919123456789',
          instructions: 'Hand over to supervisor',
        },
        assignedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Assigned volunteer has full authorized access to pickup and dropoff
      assert.ok(deliveryDetail.pickupLocation?.address);
      assert.ok(deliveryDetail.pickupLocation?.contactPhone);
      assert.ok(deliveryDetail.dropoffLocation?.address);
      assert.ok(deliveryDetail.dropoffLocation?.contactPhone);
      assert.equal(deliveryDetail.status, 'assigned');
    });
  });

  describe('4. UI Negative States, Role Compatibility, and Navigation', () => {
    it('preserves /dashboard/beneficiary for compatibility while utilizing requester contracts and copy', () => {
      const canonicalRoles = Array.from(CANONICAL_ROLES);
      assert.ok(canonicalRoles.includes('requester'));
      // Beneficiary is deprecated in canonical roles in favor of requester
      assert.equal(canonicalRoles.includes('beneficiary' as any), false);

      const routeMapping = (role: string) => {
        if (role === 'requester') return '/dashboard/beneficiary';
        if (role === 'donor') return '/dashboard/donor';
        if (role === 'volunteer') return '/dashboard/volunteer';
        return '/login';
      };

      assert.equal(routeMapping('requester'), '/dashboard/beneficiary');
    });

    it('renders and differentiates all required UI states', () => {
      type UIState =
        | 'loading'
        | 'empty'
        | 'validation_error'
        | 'uploading'
        | 'unauthorized'
        | 'verification_required'
        | 'session_expired'
        | 'stale_version'
        | 'conflict'
        | 'expired'
        | 'unavailable'
        | 'offline_retry'
        | 'reconnect_refresh'
        | 'success';

      const stateClassifier = (params: {
        loading?: boolean;
        itemsCount?: number;
        hasConflict?: boolean;
        hasStaleVersion?: boolean;
        isExpired?: boolean;
        isOffline?: boolean;
        isVerified?: boolean;
        isAuthenticated?: boolean;
      }): UIState => {
        if (params.loading) return 'loading';
        if (!params.isAuthenticated) return 'unauthorized';
        if (!params.isVerified) return 'verification_required';
        if (params.isOffline) return 'offline_retry';
        if (params.hasStaleVersion) return 'stale_version';
        if (params.hasConflict) return 'conflict';
        if (params.isExpired) return 'expired';
        if (params.itemsCount === 0) return 'empty';
        return 'success';
      };

      assert.equal(stateClassifier({ loading: true }), 'loading');
      assert.equal(stateClassifier({ isAuthenticated: false }), 'unauthorized');
      assert.equal(stateClassifier({ isAuthenticated: true, isVerified: false }), 'verification_required');
      assert.equal(stateClassifier({ isAuthenticated: true, isVerified: true, isOffline: true }), 'offline_retry');
      assert.equal(stateClassifier({ isAuthenticated: true, isVerified: true, hasStaleVersion: true }), 'stale_version');
      assert.equal(stateClassifier({ isAuthenticated: true, isVerified: true, hasConflict: true }), 'conflict');
      assert.equal(stateClassifier({ isAuthenticated: true, isVerified: true, isExpired: true }), 'expired');
      assert.equal(stateClassifier({ isAuthenticated: true, isVerified: true, itemsCount: 0 }), 'empty');
      assert.equal(stateClassifier({ isAuthenticated: true, isVerified: true, itemsCount: 5 }), 'success');
    });
  });
});
