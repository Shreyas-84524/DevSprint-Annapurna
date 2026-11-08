import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  createListing,
  updateListing,
  publishListing,
  getNearbyListings,
  getDonorListings,
  claimListing,
} from '../src/server/listings';
import {
  getAvailableVolunteerTasks,
  acceptDeliveryTask,
  getDeliveryDetail,
  DeliveryWorkflowError,
} from '../src/server/deliveries';
import {
  GET as donorListingsHandler,
  POST as createListingHandler,
} from '../src/app/api/listings/route';
import { PATCH as updateListingHandler } from '../src/app/api/listings/[id]/route';
import { POST as publishListingHandler } from '../src/app/api/listings/[id]/publish/route';
import { GET as nearbyListingsHandler } from '../src/app/api/listings/nearby/route';
import { POST as claimListingHandler } from '../src/app/api/listings/[id]/claim/route';
import { GET as availableTasksHandler } from '../src/app/api/volunteer/tasks/available/route';
import { POST as acceptDeliveryHandler } from '../src/app/api/deliveries/[id]/accept/route';
import { GET as deliveryDetailHandler } from '../src/app/api/deliveries/[id]/route';
import { AuthenticatedUser } from '../src/server/auth';

/**
 * Mock database simulating Postgres tables and atomic stored procedures
 * for isolated, deterministic unit testing.
 */
class MockWorkflowDB {
  public profiles = new Map<string, any>();
  public savedLocations = new Map<string, any>();
  public foodListings = new Map<string, any>();
  public listingPickupDetails = new Map<string, any>();
  public listingImages = new Map<string, any>();
  public claims = new Map<string, any>();
  public deliveries = new Map<string, any>();
  public deliveryEvents = new Map<string, any>();

  constructor() {
    this.seed();
  }

  public seed() {
    // Verified donor
    this.profiles.set('donor-001', {
      id: 'donor-001',
      display_name: 'Green Kitchen NGO',
      role: 'donor',
      is_verified: true,
      phone: '+919876543210',
    });

    // Unverified donor
    this.profiles.set('donor-unverified', {
      id: 'donor-unverified',
      display_name: 'Unverified Donor',
      role: 'donor',
      is_verified: false,
      phone: '+919876543211',
    });

    // Verified requester
    this.profiles.set('requester-001', {
      id: 'requester-001',
      display_name: 'Care Shelter',
      role: 'requester',
      is_verified: true,
      phone: '+919123456780',
    });

    // Competing requester
    this.profiles.set('requester-002', {
      id: 'requester-002',
      display_name: 'Community Pantry',
      role: 'requester',
      is_verified: true,
      phone: '+919123456781',
    });

    // Unverified requester
    this.profiles.set('requester-unverified', {
      id: 'requester-unverified',
      display_name: 'Unverified Requester',
      role: 'requester',
      is_verified: false,
      phone: '+919123456782',
    });

    // Volunteers
    this.profiles.set('volunteer-001', {
      id: 'volunteer-001',
      display_name: 'Amit Kumar',
      role: 'volunteer',
      is_verified: true,
      phone: '+919988776655',
    });

    this.profiles.set('volunteer-002', {
      id: 'volunteer-002',
      display_name: 'Priya Sharma',
      role: 'volunteer',
      is_verified: true,
      phone: '+919988776656',
    });

    // Admin
    this.profiles.set('admin-001', {
      id: 'admin-001',
      display_name: 'System Admin',
      role: 'admin',
      is_verified: true,
      phone: '+919999999999',
    });

    // Unrelated user
    this.profiles.set('stranger-001', {
      id: 'stranger-001',
      display_name: 'Unrelated User',
      role: 'donor',
      is_verified: true,
      phone: '+919000000001',
    });

    // Saved Locations
    this.savedLocations.set('loc-donor-1', {
      id: 'loc-donor-1',
      user_id: 'donor-001',
      label: 'Main Central Kitchen',
      address: '100 Marine Drive, Nariman Point',
      city: 'Mumbai',
      state: 'Maharashtra',
      postal_code: '400021',
      latitude: 18.922,
      longitude: 72.8258,
      is_default: true,
      created_at: new Date().toISOString(),
    });

    this.savedLocations.set('loc-donor-unverified', {
      id: 'loc-donor-unverified',
      user_id: 'donor-unverified',
      label: 'Secondary Kitchen',
      address: '101 Marine Drive, Nariman Point',
      city: 'Mumbai',
      state: 'Maharashtra',
      postal_code: '400021',
      latitude: 18.923,
      longitude: 72.826,
      is_default: true,
      created_at: new Date().toISOString(),
    });

    this.savedLocations.set('loc-requester-1', {
      id: 'loc-requester-1',
      user_id: 'requester-001',
      label: 'Shelter Hub',
      address: '42 Hill Road, Bandra West',
      city: 'Mumbai',
      state: 'Maharashtra',
      postal_code: '400050',
      latitude: 19.0544,
      longitude: 72.8277,
      is_default: true,
      created_at: new Date().toISOString(),
    });

    this.savedLocations.set('loc-requester-unverified', {
      id: 'loc-requester-unverified',
      user_id: 'requester-unverified',
      label: 'Community Hub',
      address: '43 Hill Road, Bandra West',
      city: 'Mumbai',
      state: 'Maharashtra',
      postal_code: '400050',
      latitude: 19.055,
      longitude: 72.828,
      is_default: true,
      created_at: new Date().toISOString(),
    });
  }

  public rpc = async (name: string, args: Record<string, any>) => {
    if (name === 'claim_food_listing' || name === 'claim_food_listing_tx') {
      const { p_listing_id, p_requester_id, p_delivery_location_id, p_idempotency_key } = args;

      // 1. Replay check
      if (p_idempotency_key) {
        for (const claim of this.claims.values()) {
          if (claim.requester_id === p_requester_id && claim.idempotency_key === p_idempotency_key) {
            let deliveryId = '';
            for (const d of this.deliveries.values()) {
              if (d.claim_id === claim.id) {
                deliveryId = d.id;
                break;
              }
            }
            return {
              data: {
                success: true,
                claim_id: claim.id,
                delivery_id: deliveryId,
                listing_id: claim.listing_id,
                status: 'replayed',
              },
              error: null,
            };
          }
        }
      }

      // 2. Requester check
      const requester = this.profiles.get(p_requester_id);
      if (!requester || requester.role !== 'requester') {
        return { data: null, error: { code: '42501', message: 'UNAUTHORIZED_REQUESTER' } };
      }

      // 3. Location check
      if (p_delivery_location_id && !this.savedLocations.has(p_delivery_location_id)) {
        return { data: null, error: { code: 'P0002', message: 'LOCATION_NOT_FOUND' } };
      }

      // 4. Listing check
      const listing = this.foodListings.get(p_listing_id);
      if (!listing) {
        return { data: null, error: { code: 'P0002', message: 'LISTING_NOT_FOUND' } };
      }

      if (new Date(listing.expires_at).getTime() <= Date.now()) {
        return { data: null, error: { code: 'P0001', message: 'LISTING_EXPIRED' } };
      }

      if (listing.status !== 'published') {
        return { data: null, error: { code: 'P0001', message: 'LISTING_ALREADY_CLAIMED' } };
      }

      // 5. Active claim invariant check (idx_claims_one_active_listing)
      for (const c of this.claims.values()) {
        if (c.listing_id === p_listing_id && c.status === 'active') {
          return { data: null, error: { code: '23505', message: 'idx_claims_one_active_listing' } };
        }
      }

      // Atomic transitions
      listing.status = 'claimed';
      listing.row_version = (listing.row_version || 1) + 1;
      listing.updated_at = new Date().toISOString();

      const claimId = 'claim-' + Math.random().toString(36).substring(2, 9);
      const deliveryId = 'deliv-' + Math.random().toString(36).substring(2, 9);

      const newClaim = {
        id: claimId,
        listing_id: p_listing_id,
        requester_id: p_requester_id,
        status: 'active',
        delivery_location_id: p_delivery_location_id || null,
        dropoff_address: '42 Hill Road, Bandra West',
        dropoff_latitude: 19.0544,
        dropoff_longitude: 72.8277,
        dropoff_contact_phone: requester.phone || '+919000000000',
        idempotency_key: p_idempotency_key || null,
        claimed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.claims.set(claimId, newClaim);

      const newDelivery = {
        id: deliveryId,
        listing_id: p_listing_id,
        claim_id: claimId,
        donor_id: listing.donor_id,
        requester_id: p_requester_id,
        volunteer_id: null,
        status: 'awaiting_volunteer',
        row_version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.deliveries.set(deliveryId, newDelivery);

      return {
        data: {
          success: true,
          claim_id: claimId,
          delivery_id: deliveryId,
          listing_id: p_listing_id,
          status: 'claimed',
        },
        error: null,
      };
    }

    if (name === 'accept_delivery_task' || name === 'accept_delivery_task_tx') {
      const { p_delivery_id, p_volunteer_id, p_idempotency_key } = args;
      void p_idempotency_key;

      // 1. Replay check
      const delivery = this.deliveries.get(p_delivery_id);
      if (delivery && delivery.volunteer_id === p_volunteer_id) {
        return {
          data: {
            success: true,
            delivery_id: p_delivery_id,
            volunteer_id: p_volunteer_id,
            status: 'assigned',
            replayed: true,
          },
          error: null,
        };
      }

      // 2. Volunteer role check
      const volunteer = this.profiles.get(p_volunteer_id);
      if (!volunteer || volunteer.role !== 'volunteer') {
        return { data: null, error: { code: '42501', message: 'UNAUTHORIZED_VOLUNTEER' } };
      }

      // 3. One active delivery invariant check (idx_deliveries_one_active_volunteer)
      for (const d of this.deliveries.values()) {
        if (
          d.volunteer_id === p_volunteer_id &&
          !['qc_failed', 'receipt_confirmed', 'cancelled'].includes(d.status) &&
          d.id !== p_delivery_id
        ) {
          return { data: null, error: { code: 'P0001', message: 'VOLUNTEER_ACTIVE_DELIVERY_EXISTS' } };
        }
      }

      // 4. Delivery check
      if (!delivery) {
        return { data: null, error: { code: 'P0002', message: 'DELIVERY_NOT_FOUND' } };
      }

      if (delivery.status !== 'awaiting_volunteer') {
        return { data: null, error: { code: 'P0001', message: 'DELIVERY_ALREADY_ASSIGNED' } };
      }

      // 5. Expiry check on listing
      const listing = this.foodListings.get(delivery.listing_id);
      if (listing && new Date(listing.expires_at).getTime() <= Date.now()) {
        return { data: null, error: { code: 'P0001', message: 'LISTING_EXPIRED' } };
      }

      // Atomic assignment
      delivery.volunteer_id = p_volunteer_id;
      delivery.status = 'assigned';
      delivery.assigned_at = new Date().toISOString();
      delivery.row_version = (delivery.row_version || 1) + 1;
      delivery.updated_at = new Date().toISOString();

      if (listing) {
        listing.status = 'in_delivery';
        listing.updated_at = new Date().toISOString();
      }

      return {
        data: {
          success: true,
          delivery_id: p_delivery_id,
          volunteer_id: p_volunteer_id,
          status: 'assigned',
        },
        error: null,
      };
    }

    return { data: null, error: { message: `UNKNOWN_RPC:${name}` } };
  };

  public from = (tableName: string) => {
    const tableMap = this.getTableMap(tableName);

    return {
      select: (columns: string = '*') => {
        const filters: Array<(row: any) => boolean> = [];
        let sortFn: ((a: any, b: any) => number) | null = null;
        let limitVal: number | null = null;

        const queryObj = {
          eq: (column: string, value: any) => {
            filters.push((row) => row[column] === value);
            return queryObj;
          },
          neq: (column: string, value: any) => {
            filters.push((row) => row[column] !== value);
            return queryObj;
          },
          gt: (column: string, value: any) => {
            filters.push((row) => row[column] > value);
            return queryObj;
          },
          not: (column: string, op: string, val: string) => {
            if (op === 'in') {
              const cleaned = val.replace(/[()"]/g, '').split(',');
              filters.push((row) => !cleaned.includes(row[column]));
            }
            return queryObj;
          },
          order: (column: string, options?: { ascending?: boolean }) => {
            const asc = options?.ascending !== false;
            sortFn = (a, b) => {
              if (a[column] < b[column]) return asc ? -1 : 1;
              if (a[column] > b[column]) return asc ? 1 : -1;
              return 0;
            };
            return queryObj;
          },
          limit: (n: number) => {
            limitVal = n;
            return queryObj;
          },
          maybeSingle: async () => {
            const rows = Array.from(tableMap.values()).filter((r) => filters.every((f) => f(r)));
            const first = rows[0] || null;
            return { data: first ? this.hydrateRow(tableName, first, columns) : null, error: null };
          },
          single: async () => {
            const rows = Array.from(tableMap.values()).filter((r) => filters.every((f) => f(r)));
            const first = rows[0];
            if (!first) {
              return { data: null, error: { message: 'Row not found' } };
            }
            return { data: this.hydrateRow(tableName, first, columns), error: null };
          },
          then: (resolve: any) => {
            let rows = Array.from(tableMap.values()).filter((r) => filters.every((f) => f(r)));
            if (sortFn) rows.sort(sortFn);
            if (limitVal !== null) rows = rows.slice(0, limitVal);
            const hydrated = rows.map((r) => this.hydrateRow(tableName, r, columns));
            resolve({ data: hydrated, error: null });
          },
        };

        return queryObj;
      },

      insert: (data: any) => {
        const rows = Array.isArray(data) ? data : [data];
        const insertedRows: any[] = [];

        for (const row of rows) {
          const id = row.id || `${tableName.substring(0, 4)}-${Math.random().toString(36).substring(2, 9)}`;
          const fullRow = {
            id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...row,
          };
          tableMap.set(id, fullRow);
          insertedRows.push(fullRow);
        }

        return {
          select: () => ({
            single: async () => ({ data: insertedRows[0], error: null }),
          }),
          then: (resolve: any) => resolve({ data: insertedRows, error: null }),
        };
      },

      update: (updates: Record<string, any>) => {
        const filters: Array<(row: any) => boolean> = [];
        const queryObj = {
          eq: (col: string, val: any) => {
            filters.push((r) => r[col] === val);
            return queryObj;
          },
          select: () => ({
            single: async () => {
              const row = Array.from(tableMap.values()).find((r) => filters.every((f) => f(r)));
              if (!row) return { data: null, error: { message: 'Not found' } };
              Object.assign(row, updates);
              return { data: row, error: null };
            },
          }),
          then: (resolve: any) => {
            for (const row of tableMap.values()) {
              if (filters.every((f) => f(row))) {
                Object.assign(row, updates);
              }
            }
            resolve({ data: null, error: null });
          },
        };
        return queryObj;
      },
    };
  };

  private getTableMap(name: string): Map<string, any> {
    switch (name) {
      case 'profiles':
        return this.profiles;
      case 'saved_locations':
        return this.savedLocations;
      case 'food_listings':
        return this.foodListings;
      case 'listing_pickup_details':
        return this.listingPickupDetails;
      case 'listing_images':
        return this.listingImages;
      case 'claims':
        return this.claims;
      case 'deliveries':
        return this.deliveries;
      case 'delivery_events':
        return this.deliveryEvents;
      default:
        throw new Error(`MockWorkflowDB: unknown table ${name}`);
    }
  }

  private hydrateRow(table: string, row: any, columns: string): any {
    const copy = { ...row };
    if (table === 'food_listings' && columns.includes('listing_pickup_details')) {
      const details = Array.from(this.listingPickupDetails.values()).filter((p) => p.listing_id === row.id);
      copy.listing_pickup_details = details;
    }
    if (table === 'food_listings' && columns.includes('listing_images')) {
      const images = Array.from(this.listingImages.values()).filter((i) => i.listing_id === row.id);
      copy.listing_images = images;
    }
    if (table === 'deliveries' && columns.includes('food_listings')) {
      copy.food_listings = this.foodListings.get(row.listing_id) || null;
    }
    if (table === 'deliveries' && columns.includes('claims')) {
      copy.claims = this.claims.get(row.claim_id) || null;
    }
    return copy;
  }
}

describe('Core Food Workflow API & DAL Suite', () => {
  let db: MockWorkflowDB;

  beforeEach(() => {
    db = new MockWorkflowDB();
  });

  describe('1. Donor Listing Creation (POST /api/listings & DAL)', () => {
    it('creates a draft listing with pickup details', async () => {
      const listing = await createListing(
        'donor-001',
        {
          title: 'Surplus Fresh Sandwiches',
          description: '30 vegetable sandwiches freshly prepared',
          quantity: 30,
          unit: 'packs',
          foodType: 'veg',
          dietaryTags: ['fresh', 'vegetarian'],
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          pickupLocationId: 'loc-donor-1',
          publishImmediately: false,
        },
        db
      );

      assert.equal(listing.title, 'Surplus Fresh Sandwiches');
      assert.equal(listing.status, 'draft');
      assert.equal(listing.quantity, 30);
      assert.equal(listing.unit, 'packs');
      assert.equal(listing.rowVersion, 1);

      // Verify pickup details were recorded in DB
      const pickupDetails = Array.from(db.listingPickupDetails.values()).find(
        (p) => p.listing_id === listing.id
      );
      assert.ok(pickupDetails);
      assert.equal(pickupDetails.pickup_address, '100 Marine Drive, Nariman Point');
      assert.equal(pickupDetails.city, 'Mumbai');
    });

    it('creates an immediately published listing when requested', async () => {
      const listing = await createListing(
        'donor-001',
        {
          title: 'Steamed Rice & Dal',
          quantity: 50,
          unit: 'servings',
          foodType: 'veg',
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          pickupLocationId: 'loc-donor-1',
          publishImmediately: true,
        },
        db
      );

      assert.equal(listing.status, 'published');
    });

    it('allows a canonical donor regardless of legacy verification status', async () => {
      const listing = await createListing(
        'donor-unverified',
        {
          title: 'Fresh Bread',
          quantity: 10,
          unit: 'loaves',
          foodType: 'veg',
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          pickupLocationId: 'loc-donor-unverified',
        },
        db
      );

      assert.equal(listing.donorId, 'donor-unverified');
    });

    it('rejects listing creation if role is not donor', async () => {
      await assert.rejects(
        async () => {
          await createListing(
            'requester-001',
            {
              title: 'Fresh Bread',
              quantity: 10,
              unit: 'loaves',
              foodType: 'veg',
              expiresAt: new Date(Date.now() + 3600000).toISOString(),
            },
            db
          );
        },
        (err: any) => {
          assert.equal(err.code, 'FORBIDDEN_ROLE');
          assert.equal(err.status, 403);
          return true;
        }
      );
    });

    it('validates input: title length, positive quantity, valid unit, food type, future expiry', async () => {
      // Invalid quantity
      await assert.rejects(
        async () => {
          await createListing(
            'donor-001',
            {
              title: 'Valid Title',
              quantity: 0,
              unit: 'packs',
              foodType: 'veg',
              expiresAt: new Date(Date.now() + 3600000).toISOString(),
            },
            db
          );
        },
        (err: any) => err.code === 'INVALID_QUANTITY'
      );

      // Expired date
      await assert.rejects(
        async () => {
          await createListing(
            'donor-001',
            {
              title: 'Valid Title',
              quantity: 5,
              unit: 'packs',
              foodType: 'veg',
              expiresAt: new Date(Date.now() - 3600000).toISOString(),
            },
            db
          );
        },
        (err: any) => err.code === 'INVALID_EXPIRY'
      );
    });

    it('route handler POST /api/listings handles auth and returns 201', async () => {
      const donorCaller: AuthenticatedUser = {
        id: 'donor-001',
        role: 'donor',
        isVerified: true,
      };

      const req = new Request('http://localhost:3000/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Hot Vegetable Biryani',
          quantity: 25,
          unit: 'boxes',
          foodType: 'veg',
          expiresAt: new Date(Date.now() + 7200000).toISOString(),
          pickupLocationId: 'loc-donor-1',
        }),
      });

      const res = await createListingHandler(req, { caller: donorCaller, customClient: db });
      assert.equal(res.status, 201);
      const json = await res.json();
      assert.equal(json.data.title, 'Hot Vegetable Biryani');
      assert.equal(json.data.status, 'draft');
      assert.equal(json.error, null);
    });

    it('route handler POST /api/listings returns 401 when unauthenticated', async () => {
      const req = new Request('http://localhost:3000/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Apples', quantity: 10, unit: 'kg', foodType: 'veg' }),
      });

      const res = await createListingHandler(req, { caller: undefined, customClient: db });
      assert.equal(res.status, 401);
      const json = await res.json();
      assert.equal(json.error.code, 'UNAUTHORIZED');
    });

    it('returns only donor-owned listings in newest-first order', async () => {
      const older = await createListing(
        'donor-001',
        {
          title: 'Older Donor Listing',
          quantity: 5,
          unit: 'packs',
          foodType: 'veg',
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          pickupLocationId: 'loc-donor-1',
        },
        db
      );
      const other = await createListing(
        'donor-unverified',
        {
          title: 'Other Donor Listing',
          quantity: 4,
          unit: 'packs',
          foodType: 'veg',
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          pickupLocationId: 'loc-donor-unverified',
        },
        db
      );
      db.foodListings.get(older.id).created_at = '2026-11-08T01:00:00.000Z';
      db.foodListings.get(other.id).created_at = '2026-11-08T03:00:00.000Z';
      const newer = await createListing(
        'donor-001',
        {
          title: 'Newer Donor Listing',
          quantity: 6,
          unit: 'packs',
          foodType: 'veg',
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          pickupLocationId: 'loc-donor-1',
        },
        db
      );
      db.foodListings.get(newer.id).created_at = '2026-11-08T02:00:00.000Z';

      const listings = await getDonorListings('donor-001', db);

      assert.deepEqual(listings.map((listing) => listing.id), [newer.id, older.id]);
      assert.equal(listings.some((listing) => listing.id === other.id), false);
    });

    it('GET /api/listings?mine=true returns the authenticated donor listings', async () => {
      await createListing(
        'donor-001',
        {
          title: 'Dashboard Listing',
          quantity: 8,
          unit: 'boxes',
          foodType: 'veg',
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          pickupLocationId: 'loc-donor-1',
        },
        db
      );

      const response = await donorListingsHandler(
        new Request('http://localhost:3000/api/listings?mine=true'),
        { caller: { id: 'donor-001', role: 'donor' }, customClient: db }
      );
      const payload = await response.json();

      assert.equal(response.status, 200);
      assert.equal(payload.data.length, 1);
      assert.equal(payload.data[0].title, 'Dashboard Listing');
      assert.equal(payload.error, null);
      assert.equal(response.headers.get('cache-control'), 'private, no-store');
    });

    it('GET /api/listings?mine=true rejects a non-donor canonical role', async () => {
      const response = await donorListingsHandler(
        new Request('http://localhost:3000/api/listings?mine=true'),
        { caller: { id: 'requester-001', role: 'requester' }, customClient: db }
      );
      const payload = await response.json();

      assert.equal(response.status, 403);
      assert.equal(payload.error.code, 'FORBIDDEN_ROLE');
    });

    it('GET /api/listings?mine=true rejects an unauthenticated request', async () => {
      const response = await donorListingsHandler(
        new Request('http://localhost:3000/api/listings?mine=true'),
        { caller: null, customClient: db }
      );
      const payload = await response.json();

      assert.equal(response.status, 401);
      assert.equal(payload.error.code, 'UNAUTHORIZED');
    });

    it('GET /api/listings requires the explicit mine query', async () => {
      const response = await donorListingsHandler(
        new Request('http://localhost:3000/api/listings'),
        { caller: { id: 'donor-001', role: 'donor' }, customClient: db }
      );
      const payload = await response.json();

      assert.equal(response.status, 400);
      assert.equal(payload.error.code, 'MINE_REQUIRED');
    });
  });

  describe('2. Listing Editing and Row Version Check (PATCH /api/listings/[id] & DAL)', () => {
    let listingId: string;

    beforeEach(async () => {
      const l = await createListing(
        'donor-001',
        {
          title: 'Editable Listing',
          quantity: 20,
          unit: 'kg',
          foodType: 'veg',
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          pickupLocationId: 'loc-donor-1',
        },
        db
      );
      listingId = l.id;
    });

    it('updates listing fields with valid rowVersion and increments rowVersion', async () => {
      const updated = await updateListing(
        'donor-001',
        listingId,
        {
          rowVersion: 1,
          title: 'Updated Listing Title',
          quantity: 25,
        },
        db
      );

      assert.equal(updated.title, 'Updated Listing Title');
      assert.equal(updated.quantity, 25);
      assert.equal(updated.rowVersion, 2);
    });

    it('rejects updates with stale rowVersion (409 Conflict)', async () => {
      // First update bumps to rowVersion 2
      await updateListing('donor-001', listingId, { rowVersion: 1, title: 'First Update' }, db);

      // Competing update with stale version 1
      await assert.rejects(
        async () => {
          await updateListing('donor-001', listingId, { rowVersion: 1, title: 'Competing Stale' }, db);
        },
        (err: any) => {
          assert.equal(err.code, 'STALE_ROW_VERSION');
          assert.equal(err.status, 409);
          return true;
        }
      );
    });

    it('rejects updates from non-owner (403 Forbidden)', async () => {
      await assert.rejects(
        async () => {
          await updateListing('stranger-001', listingId, { rowVersion: 1, title: 'Unauthorized Edit' }, db);
        },
        (err: any) => {
          assert.equal(err.code, 'FORBIDDEN');
          assert.equal(err.status, 403);
          return true;
        }
      );
    });

    it('rejects updates on claimed listings (409 Conflict)', async () => {
      // Manually set status to claimed
      db.foodListings.get(listingId).status = 'claimed';

      await assert.rejects(
        async () => {
          await updateListing('donor-001', listingId, { rowVersion: 1, title: 'Edit Claimed' }, db);
        },
        (err: any) => {
          assert.equal(err.code, 'LISTING_NOT_EDITABLE');
          assert.equal(err.status, 409);
          return true;
        }
      );
    });

    it('rejects updates on expired listings (410 Gone)', async () => {
      db.foodListings.get(listingId).expires_at = new Date(Date.now() - 1000).toISOString();

      await assert.rejects(
        async () => {
          await updateListing('donor-001', listingId, { rowVersion: 1, title: 'Edit Expired' }, db);
        },
        (err: any) => {
          assert.equal(err.code, 'LISTING_EXPIRED');
          assert.equal(err.status, 410);
          return true;
        }
      );
    });

    it('route handler PATCH /api/listings/[id] returns 200 on success and 409 on stale version', async () => {
      const donorCaller: AuthenticatedUser = { id: 'donor-001', role: 'donor', isVerified: true };

      // Successful patch
      const req = new Request(`http://localhost:3000/api/listings/${listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rowVersion: 1, quantity: 35 }),
      });

      const res = await updateListingHandler(req, {
        params: Promise.resolve({ id: listingId }),
        caller: donorCaller,
        customClient: db,
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.data.quantity, 35);
      assert.equal(json.data.rowVersion, 2);

      // Stale patch returns 409
      const staleReq = new Request(`http://localhost:3000/api/listings/${listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rowVersion: 1, quantity: 40 }),
      });
      const staleRes = await updateListingHandler(staleReq, {
        params: Promise.resolve({ id: listingId }),
        caller: donorCaller,
        customClient: db,
      });
      assert.equal(staleRes.status, 409);
      const staleJson = await staleRes.json();
      assert.equal(staleJson.error.code, 'STALE_ROW_VERSION');
    });
  });

  describe('3. Listing Publish Transition (POST /api/listings/[id]/publish & DAL)', () => {
    it('publishes a draft listing idempotently', async () => {
      const draft = await createListing(
        'donor-001',
        {
          title: 'Draft to Publish',
          quantity: 15,
          unit: 'boxes',
          foodType: 'veg',
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          pickupLocationId: 'loc-donor-1',
          publishImmediately: false,
        },
        db
      );

      // First publish: draft -> published
      const pub1 = await publishListing('donor-001', draft.id, db);
      assert.equal(pub1.status, 'published');
      assert.equal(pub1.rowVersion, 2);

      // Second publish: idempotent return
      const pub2 = await publishListing('donor-001', draft.id, db);
      assert.equal(pub2.status, 'published');
      assert.equal(pub2.rowVersion, 2);
    });

    it('rejects publishing an expired listing (410 Gone)', async () => {
      const draft = await createListing(
        'donor-001',
        {
          title: 'Expiring Draft',
          quantity: 5,
          unit: 'kg',
          foodType: 'veg',
          expiresAt: new Date(Date.now() + 10000).toISOString(),
          pickupLocationId: 'loc-donor-1',
        },
        db
      );
      // Expire it
      db.foodListings.get(draft.id).expires_at = new Date(Date.now() - 5000).toISOString();

      await assert.rejects(
        async () => {
          await publishListing('donor-001', draft.id, db);
        },
        (err: any) => {
          assert.equal(err.code, 'LISTING_EXPIRED');
          assert.equal(err.status, 410);
          return true;
        }
      );
    });

    it('route handler POST /api/listings/[id]/publish publishes listing', async () => {
      const draft = await createListing(
        'donor-001',
        {
          title: 'Draft to Publish via Route',
          quantity: 10,
          unit: 'boxes',
          foodType: 'veg',
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          pickupLocationId: 'loc-donor-1',
          publishImmediately: false,
        },
        db
      );

      const donorCaller: AuthenticatedUser = { id: 'donor-001', role: 'donor', isVerified: true };
      const req = new Request(`http://localhost:3000/api/listings/${draft.id}/publish`, {
        method: 'POST',
      });
      const res = await publishListingHandler(req, {
        params: Promise.resolve({ id: draft.id }),
        caller: donorCaller,
        customClient: db,
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.data.status, 'published');
    });
  });

  describe('4. Public Nearby Discovery & Strict Privacy Projection (GET /api/listings/nearby & DAL)', () => {
    beforeEach(async () => {
      // Listing 1: Nariman Point (lat: 18.922, lng: 72.8258), published, unexpired
      await createListing(
        'donor-001',
        {
          title: 'Marine Drive Surplus Meal',
          quantity: 20,
          unit: 'meals',
          foodType: 'veg',
          expiresAt: new Date(Date.now() + 7200000).toISOString(),
          pickupLocationId: 'loc-donor-1',
          publishImmediately: true,
        },
        db
      );

      // Listing 2: Draft (must be excluded from discovery)
      await createListing(
        'donor-001',
        {
          title: 'Draft Secret Meal',
          quantity: 10,
          unit: 'meals',
          foodType: 'veg',
          expiresAt: new Date(Date.now() + 7200000).toISOString(),
          pickupLocationId: 'loc-donor-1',
          publishImmediately: false,
        },
        db
      );

      // Listing 3: Expired (must be excluded)
      const exp = await createListing(
        'donor-001',
        {
          title: 'Expired Food',
          quantity: 5,
          unit: 'meals',
          foodType: 'veg',
          expiresAt: new Date(Date.now() + 10000).toISOString(),
          pickupLocationId: 'loc-donor-1',
          publishImmediately: true,
        },
        db
      );
      db.foodListings.get(exp.id).expires_at = new Date(Date.now() - 1000).toISOString();
    });

    it('returns published, unexpired listings and enforces strict privacy projection', async () => {
      const results = await getNearbyListings({ lat: 18.93, lng: 72.83, radius: 10 }, db);

      assert.equal(results.length, 1);
      const summary = results[0];
      assert.equal(summary.title, 'Marine Drive Surplus Meal');
      assert.equal(summary.quantity, 20);
      assert.equal(summary.foodType, 'veg');
      assert.ok(summary.distanceKm !== undefined);

      // Strict privacy validation: no private pickup details or contact details exposed
      const keys = Object.keys(summary);
      assert.equal(keys.includes('pickupAddress'), false);
      assert.equal(keys.includes('addressLine2'), false);
      assert.equal(keys.includes('latitude'), false);
      assert.equal(keys.includes('longitude'), false);
      assert.equal(keys.includes('contactPhone'), false);
      assert.equal(keys.includes('pickupInstructions'), false);
    });

    it('filters out listings outside the radius', async () => {
      // Query 100km away with 5km radius
      const farResults = await getNearbyListings({ lat: 28.6139, lng: 77.209, radius: 5 }, db);
      assert.equal(farResults.length, 0);
    });

    it('route handler GET /api/listings/nearby returns safe public summaries', async () => {
      const req = new Request('http://localhost:3000/api/listings/nearby?lat=18.93&lng=72.83&radius=10');
      const res = await nearbyListingsHandler(req, { customClient: db });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.data.length, 1);
      assert.equal(json.data[0].title, 'Marine Drive Surplus Meal');
      assert.equal(json.data[0].pickupAddress, undefined);
      assert.equal(json.data[0].contactPhone, undefined);
    });
  });

  describe('5. Atomic Requester Whole-Listing Claim (POST /api/listings/[id]/claim & DAL)', () => {
    let publishedListingId: string;

    beforeEach(async () => {
      const listing = await createListing(
        'donor-001',
        {
          title: 'Hot Meals for Claim',
          quantity: 40,
          unit: 'portions',
          foodType: 'veg',
          expiresAt: new Date(Date.now() + 14400000).toISOString(),
          pickupLocationId: 'loc-donor-1',
          publishImmediately: true,
        },
        db
      );
      publishedListingId = listing.id;
    });

    it('successfully claims a published listing and creates awaiting delivery', async () => {
      const res = await claimListing(
        publishedListingId,
        'requester-001',
        { deliveryLocationId: 'loc-requester-1' },
        'key-req-001',
        db
      );

      assert.equal(res.status, 'claimed');
      assert.ok(res.claimId);
      assert.ok(res.deliveryId);
      assert.equal(res.replayed, false);

      // Listing state should now be claimed
      const listing = db.foodListings.get(publishedListingId);
      assert.equal(listing.status, 'claimed');

      // Delivery state should be awaiting_volunteer
      const delivery = db.deliveries.get(res.deliveryId);
      assert.equal(delivery.status, 'awaiting_volunteer');
    });

    it('handles idempotent retry with same key returning 200 and replayed: true', async () => {
      const first = await claimListing(
        publishedListingId,
        'requester-001',
        { deliveryLocationId: 'loc-requester-1' },
        'key-idempotent-claim',
        db
      );
      assert.equal(first.replayed, false);

      // Replay same key
      const replay = await claimListing(
        publishedListingId,
        'requester-001',
        { deliveryLocationId: 'loc-requester-1' },
        'key-idempotent-claim',
        db
      );
      assert.equal(replay.claimId, first.claimId);
      assert.equal(replay.deliveryId, first.deliveryId);
      assert.equal(replay.replayed, true);
    });

    it('rejects competing claim on already-claimed listing (409 Conflict)', async () => {
      // First claimant wins
      await claimListing(
        publishedListingId,
        'requester-001',
        { deliveryLocationId: 'loc-requester-1' },
        'key-req-1',
        db
      );

      // Competing second claimant
      await assert.rejects(
        async () => {
          await claimListing(
            publishedListingId,
            'requester-002',
            { deliveryLocationId: 'loc-requester-1' },
            'key-req-2',
            db
          );
        },
        (err: any) => {
          assert.equal(err.code, 'CLAIM_CONFLICT');
          assert.equal(err.status, 409);
          return true;
        }
      );
    });

    it('rejects claim on expired listing (410 Gone)', async () => {
      db.foodListings.get(publishedListingId).expires_at = new Date(Date.now() - 5000).toISOString();

      await assert.rejects(
        async () => {
          await claimListing(
            publishedListingId,
            'requester-001',
            { deliveryLocationId: 'loc-requester-1' },
            'key-exp',
            db
          );
        },
        (err: any) => {
          assert.equal(err.code, 'LISTING_EXPIRED');
          assert.equal(err.status, 410);
          return true;
        }
      );
    });

    it('allows a canonical requester regardless of legacy verification status', async () => {
      const result = await claimListing(
        publishedListingId,
        'requester-unverified',
        { deliveryLocationId: 'loc-requester-unverified' },
        'key-unverified-requester',
        db
      );

      assert.equal(result.listingId, publishedListingId);
      assert.equal(result.status, 'claimed');
    });

    it('route handler POST /api/listings/[id]/claim returns 201 on new claim and 200 on retry', async () => {
      const requesterCaller: AuthenticatedUser = {
        id: 'requester-001',
        role: 'requester',
        isVerified: true,
      };

      const req1 = new Request(`http://localhost:3000/api/listings/${publishedListingId}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': 'claim-route-key-1',
        },
        body: JSON.stringify({ deliveryLocationId: 'loc-requester-1' }),
      });

      const res1 = await claimListingHandler(req1, {
        params: Promise.resolve({ id: publishedListingId }),
        caller: requesterCaller,
        customClient: db,
      });
      assert.equal(res1.status, 201);
      const json1 = await res1.json();
      assert.equal(json1.data.status, 'claimed');
      assert.equal(json1.data.replayed, false);

      // Replay returns 200
      const req2 = new Request(`http://localhost:3000/api/listings/${publishedListingId}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': 'claim-route-key-1',
        },
        body: JSON.stringify({ deliveryLocationId: 'loc-requester-1' }),
      });
      const res2 = await claimListingHandler(req2, {
        params: Promise.resolve({ id: publishedListingId }),
        caller: requesterCaller,
        customClient: db,
      });
      assert.equal(res2.status, 200);
      const json2 = await res2.json();
      assert.equal(json2.data.replayed, true);
    });
  });

  describe('6. Volunteer Available Tasks & Acceptance (API & DAL)', () => {
    let deliveryId: string;

    beforeEach(async () => {
      const listing = await createListing(
        'donor-001',
        {
          title: 'Nutritious Curry & Bread',
          quantity: 25,
          unit: 'boxes',
          foodType: 'veg',
          expiresAt: new Date(Date.now() + 10800000).toISOString(),
          pickupLocationId: 'loc-donor-1',
          publishImmediately: true,
        },
        db
      );

      const claim = await claimListing(
        listing.id,
        'requester-001',
        { deliveryLocationId: 'loc-requester-1' },
        'key-c1',
        db
      );
      deliveryId = claim.deliveryId;
    });

    it('retrieves available tasks in awaiting_volunteer status', async () => {
      const tasks = await getAvailableVolunteerTasks('volunteer-001', {}, db);
      assert.equal(tasks.length, 1);
      assert.equal(tasks[0].deliveryId, deliveryId);
      assert.equal(tasks[0].foodTitle, 'Nutritious Curry & Bread');
      assert.equal(tasks[0].status, 'awaiting_volunteer');
    });

    it('rejects available task query from non-volunteers (403 Forbidden)', async () => {
      await assert.rejects(
        async () => {
          await getAvailableVolunteerTasks('donor-001', {}, db);
        },
        (err: any) => {
          assert.equal(err instanceof DeliveryWorkflowError, true);
          assert.equal(err.code, 'UNAUTHORIZED_VOLUNTEER');
          assert.equal(err.status, 403);
          return true;
        }
      );
    });

    it('route handler GET /api/volunteer/tasks/available returns available tasks', async () => {
      const volCaller: AuthenticatedUser = { id: 'volunteer-001', role: 'volunteer', isVerified: true };
      const req = new Request('http://localhost:3000/api/volunteer/tasks/available');
      const res = await availableTasksHandler(req, {
        caller: volCaller,
        customClient: db,
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.data.length, 1);
      assert.equal(json.data[0].deliveryId, deliveryId);
    });

    it('successfully accepts delivery task and transitions status to assigned', async () => {
      const res = await acceptDeliveryTask(deliveryId, 'volunteer-001', 'accept-key-1', db);
      assert.equal(res.status, 'assigned');
      assert.equal(res.volunteerId, 'volunteer-001');
      assert.equal(res.replayed, false);

      const delivery = db.deliveries.get(deliveryId);
      assert.equal(delivery.status, 'assigned');
      assert.equal(delivery.volunteer_id, 'volunteer-001');

      // Listing transitions to in_delivery
      const listing = db.foodListings.get(delivery.listing_id);
      assert.equal(listing.status, 'in_delivery');
    });

    it('handles idempotent acceptance replay returning 200 and replayed: true', async () => {
      await acceptDeliveryTask(deliveryId, 'volunteer-001', 'accept-key-idempotent', db);

      const replay = await acceptDeliveryTask(deliveryId, 'volunteer-001', 'accept-key-idempotent', db);
      assert.equal(replay.status, 'assigned');
      assert.equal(replay.replayed, true);
    });

    it('rejects competing volunteer on already-assigned delivery (409 Conflict)', async () => {
      // Volunteer 1 accepts
      await acceptDeliveryTask(deliveryId, 'volunteer-001', 'v1-key', db);

      // Volunteer 2 attempts to accept same delivery
      await assert.rejects(
        async () => {
          await acceptDeliveryTask(deliveryId, 'volunteer-002', 'v2-key', db);
        },
        (err: any) => {
          assert.equal(err.code, 'DELIVERY_ALREADY_ASSIGNED');
          assert.equal(err.status, 409);
          return true;
        }
      );
    });

    it('enforces one active delivery per volunteer (409 Conflict)', async () => {
      // Volunteer 1 accepts delivery 1
      await acceptDeliveryTask(deliveryId, 'volunteer-001', 'v1-key', db);

      // Create a second delivery
      const listing2 = await createListing(
        'donor-001',
        {
          title: 'Second Meal Batch',
          quantity: 15,
          unit: 'boxes',
          foodType: 'veg',
          expiresAt: new Date(Date.now() + 10800000).toISOString(),
          pickupLocationId: 'loc-donor-1',
          publishImmediately: true,
        },
        db
      );
      const claim2 = await claimListing(
        listing2.id,
        'requester-001',
        { deliveryLocationId: 'loc-requester-1' },
        'key-c2',
        db
      );

      // Volunteer 1 tries to accept delivery 2 while delivery 1 is still active
      await assert.rejects(
        async () => {
          await acceptDeliveryTask(claim2.deliveryId, 'volunteer-001', 'v1-attempt-2', db);
        },
        (err: any) => {
          assert.equal(err.code, 'VOLUNTEER_ACTIVE_DELIVERY_EXISTS');
          assert.equal(err.status, 409);
          return true;
        }
      );
    });

    it('route handler POST /api/deliveries/[id]/accept returns 200 on success and 409 on conflict', async () => {
      const volCaller1: AuthenticatedUser = { id: 'volunteer-001', role: 'volunteer', isVerified: true };
      const volCaller2: AuthenticatedUser = { id: 'volunteer-002', role: 'volunteer', isVerified: true };

      const req1 = new Request(`http://localhost:3000/api/deliveries/${deliveryId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const res1 = await acceptDeliveryHandler(req1, {
        params: Promise.resolve({ id: deliveryId }),
        caller: volCaller1,
        customClient: db,
      });
      assert.equal(res1.status, 200);
      const json1 = await res1.json();
      assert.equal(json1.data.status, 'assigned');

      // Competing second volunteer
      const req2 = new Request(`http://localhost:3000/api/deliveries/${deliveryId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const res2 = await acceptDeliveryHandler(req2, {
        params: Promise.resolve({ id: deliveryId }),
        caller: volCaller2,
        customClient: db,
      });
      assert.equal(res2.status, 409);
      const json2 = await res2.json();
      assert.equal(json2.error.code, 'DELIVERY_ALREADY_ASSIGNED');
    });
  });

  describe('7. Participant Delivery Detail Projection (GET /api/deliveries/[id] & DAL)', () => {
    let deliveryId: string;

    beforeEach(async () => {
      const listing = await createListing(
        'donor-001',
        {
          title: 'Paneer Butter Masala',
          quantity: 20,
          unit: 'portions',
          foodType: 'veg',
          expiresAt: new Date(Date.now() + 10800000).toISOString(),
          pickupLocationId: 'loc-donor-1',
          publishImmediately: true,
        },
        db
      );

      const claim = await claimListing(
        listing.id,
        'requester-001',
        { deliveryLocationId: 'loc-requester-1' },
        'key-c-detail',
        db
      );
      deliveryId = claim.deliveryId;

      await acceptDeliveryTask(deliveryId, 'volunteer-001', 'key-v-detail', db);
    });

    it('returns complete delivery details to donor participant', async () => {
      const donorCaller: AuthenticatedUser = { id: 'donor-001', role: 'donor', isVerified: true };
      const detail = await getDeliveryDetail(deliveryId, donorCaller, db);

      assert.equal(detail.id, deliveryId);
      assert.equal(detail.status, 'assigned');
      assert.equal(detail.donor.id, 'donor-001');
      assert.equal(detail.requester.id, 'requester-001');
      assert.equal(detail.volunteer?.id, 'volunteer-001');
      assert.ok(detail.pickupLocation);
      assert.ok(detail.dropoffLocation);
      assert.equal(detail.pickupLocation.address, '100 Marine Drive, Nariman Point');
      assert.equal(detail.dropoffLocation.address, '42 Hill Road, Bandra West');
    });

    it('returns complete delivery details to requester participant', async () => {
      const reqCaller: AuthenticatedUser = { id: 'requester-001', role: 'requester', isVerified: true };
      const detail = await getDeliveryDetail(deliveryId, reqCaller, db);
      assert.equal(detail.id, deliveryId);
      assert.ok(detail.pickupLocation);
    });

    it('returns complete delivery details to assigned volunteer participant', async () => {
      const volCaller: AuthenticatedUser = { id: 'volunteer-001', role: 'volunteer', isVerified: true };
      const detail = await getDeliveryDetail(deliveryId, volCaller, db);
      assert.equal(detail.id, deliveryId);
      assert.ok(detail.dropoffLocation);
    });

    it('returns complete delivery details to admin caller', async () => {
      const adminCaller: AuthenticatedUser = { id: 'admin-001', role: 'admin', isVerified: true };
      const detail = await getDeliveryDetail(deliveryId, adminCaller, db);
      assert.equal(detail.id, deliveryId);
    });

    it('rejects access from unrelated user (403 Forbidden)', async () => {
      const strangerCaller: AuthenticatedUser = { id: 'stranger-001', role: 'donor', isVerified: true };
      await assert.rejects(
        async () => {
          await getDeliveryDetail(deliveryId, strangerCaller, db);
        },
        (err: any) => {
          assert.equal(err.code, 'FORBIDDEN_NOT_PARTICIPANT');
          assert.equal(err.status, 403);
          return true;
        }
      );
    });

    it('route handler GET /api/deliveries/[id] enforces participant authorization', async () => {
      const donorCaller: AuthenticatedUser = { id: 'donor-001', role: 'donor', isVerified: true };
      const strangerCaller: AuthenticatedUser = { id: 'stranger-001', role: 'donor', isVerified: true };

      // Participant returns 200
      const req1 = new Request(`http://localhost:3000/api/deliveries/${deliveryId}`);
      const res1 = await deliveryDetailHandler(req1, {
        params: Promise.resolve({ id: deliveryId }),
        caller: donorCaller,
        customClient: db,
      });
      assert.equal(res1.status, 200);
      const json1 = await res1.json();
      assert.equal(json1.data.id, deliveryId);

      // Non-participant returns 403
      const req2 = new Request(`http://localhost:3000/api/deliveries/${deliveryId}`);
      const res2 = await deliveryDetailHandler(req2, {
        params: Promise.resolve({ id: deliveryId }),
        caller: strangerCaller,
        customClient: db,
      });
      assert.equal(res2.status, 403);
      const json2 = await res2.json();
      assert.equal(json2.error.code, 'FORBIDDEN_NOT_PARTICIPANT');
    });
  });
});
