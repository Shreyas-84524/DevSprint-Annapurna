import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  FOOD_TYPES,
  LISTING_STATUSES,
  CLAIM_STATUSES,
  DELIVERY_STATUSES,
  TERMINAL_DELIVERY_STATES,
  FoodType,
  ListingStatus,
  ClaimStatus,
  DeliveryStatus,
  PublicListingSummaryDTO,
  ListingPickupDetailsDTO,
} from '../src/types/contracts';
import { Database } from '../src/types/database.types';

describe('Core Food Workflow Database & Contract Suite', () => {
  describe('1. Contract DTOs, Enums, and State Definitions', () => {
    it('defines canonical food types correctly', () => {
      assert.deepEqual(Array.from(FOOD_TYPES), ['veg', 'non-veg', 'vegan', 'other']);
      const sampleFood: FoodType = 'veg';
      assert.equal(FOOD_TYPES.includes(sampleFood), true);
    });

    it('defines explicit listing lifecycle states', () => {
      assert.deepEqual(Array.from(LISTING_STATUSES), [
        'draft',
        'published',
        'claimed',
        'in_delivery',
        'completed',
        'expired',
        'cancelled',
        'rejected_qc',
      ]);
      const status: ListingStatus = 'published';
      assert.equal(LISTING_STATUSES.includes(status), true);
    });

    it('defines claim lifecycle states', () => {
      assert.deepEqual(Array.from(CLAIM_STATUSES), ['active', 'cancelled', 'fulfilled']);
      const claimStatus: ClaimStatus = 'active';
      assert.equal(CLAIM_STATUSES.includes(claimStatus), true);
    });

    it('defines delivery lifecycle and terminal states', () => {
      assert.deepEqual(Array.from(DELIVERY_STATUSES), [
        'awaiting_volunteer',
        'assigned',
        'at_pickup',
        'qc_passed',
        'qc_failed',
        'collected',
        'en_route_dropoff',
        'handed_over',
        'receipt_confirmed',
        'cancelled',
      ]);
      assert.deepEqual(Array.from(TERMINAL_DELIVERY_STATES), [
        'qc_failed',
        'receipt_confirmed',
        'cancelled',
      ]);

      const isTerminal = (s: DeliveryStatus): boolean => {
        return (TERMINAL_DELIVERY_STATES as readonly string[]).includes(s);
      };

      assert.equal(isTerminal('awaiting_volunteer'), false);
      assert.equal(isTerminal('assigned'), false);
      assert.equal(isTerminal('en_route_dropoff'), false);
      assert.equal(isTerminal('qc_failed'), true);
      assert.equal(isTerminal('receipt_confirmed'), true);
      assert.equal(isTerminal('cancelled'), true);
    });
  });

  describe('2. Public-Safe vs Private-Participant Projection Isolation', () => {
    it('ensures PublicListingSummaryDTO omits private pickup location and contact details', () => {
      const publicSummary: PublicListingSummaryDTO = {
        id: 'list-001',
        title: 'Fresh Bread',
        description: 'Freshly baked wheat bread',
        quantity: 10,
        unit: 'loaves',
        foodType: 'veg',
        dietaryTags: ['fresh', 'bakery'],
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        area: 'Bandra West',
        city: 'Mumbai',
        distanceKm: 2.5,
        imageUrl: null,
      };

      const keys = Object.keys(publicSummary);
      assert.equal(keys.includes('pickupAddress'), false);
      assert.equal(keys.includes('latitude'), false);
      assert.equal(keys.includes('longitude'), false);
      assert.equal(keys.includes('contactPhone'), false);
      assert.equal(keys.includes('pickupInstructions'), false);
    });

    it('ensures ListingPickupDetailsDTO preserves exact coordinates and contact phone for participants', () => {
      const privateDetails: ListingPickupDetailsDTO = {
        id: 'detail-001',
        listingId: 'list-001',
        pickupLocationId: 'loc-001',
        pickupAddress: 'Shop 4, Hill Road, Bandra West',
        addressLine2: 'Near Station',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400050',
        latitude: 19.0544,
        longitude: 72.8402,
        pickupInstructions: 'Collect from back kitchen door',
        contactPhone: '+919876543210',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      assert.equal(typeof privateDetails.latitude, 'number');
      assert.equal(typeof privateDetails.longitude, 'number');
      assert.equal(privateDetails.contactPhone.startsWith('+91'), true);
      assert.equal(privateDetails.pickupAddress.length >= 3, true);
    });
  });

  describe('3. Database Types Verification', () => {
    it('exports all 6 workflow tables in Database interface', () => {
      type PublicTables = Database['public']['Tables'];

      type HasFoodListings = 'food_listings' extends keyof PublicTables ? true : false;
      type HasPickupDetails = 'listing_pickup_details' extends keyof PublicTables ? true : false;
      type HasListingImages = 'listing_images' extends keyof PublicTables ? true : false;
      type HasClaims = 'claims' extends keyof PublicTables ? true : false;
      type HasDeliveries = 'deliveries' extends keyof PublicTables ? true : false;
      type HasDeliveryEvents = 'delivery_events' extends keyof PublicTables ? true : false;

      const hasFoodListings: HasFoodListings = true;
      const hasPickupDetails: HasPickupDetails = true;
      const hasListingImages: HasListingImages = true;
      const hasClaims: HasClaims = true;
      const hasDeliveries: HasDeliveries = true;
      const hasDeliveryEvents: HasDeliveryEvents = true;

      assert.equal(hasFoodListings, true);
      assert.equal(hasPickupDetails, true);
      assert.equal(hasListingImages, true);
      assert.equal(hasClaims, true);
      assert.equal(hasDeliveries, true);
      assert.equal(hasDeliveryEvents, true);
    });

    it('exports atomic RPCs in Database Functions interface', () => {
      type PublicFunctions = Database['public']['Functions'];

      type HasClaimListing = 'claim_food_listing' extends keyof PublicFunctions ? true : false;
      type HasAcceptDelivery = 'accept_delivery_task' extends keyof PublicFunctions ? true : false;

      const hasClaimListing: HasClaimListing = true;
      const hasAcceptDelivery: HasAcceptDelivery = true;

      assert.equal(hasClaimListing, true);
      assert.equal(hasAcceptDelivery, true);
    });
  });

  describe('4. Migration SQL Structure & Invariant Validation', () => {
    const migrationPath = path.resolve(
      __dirname,
      '../supabase/migrations/20261105080000_core_food_workflow.sql'
    );

    it('forward migration file exists and is non-empty', () => {
      assert.equal(fs.existsSync(migrationPath), true);
      const content = fs.readFileSync(migrationPath, 'utf8');
      assert.equal(content.length > 500, true);
    });

    it('enforces partial unique index for single active claim per listing', () => {
      const content = fs.readFileSync(migrationPath, 'utf8');
      assert.match(
        content,
        /CREATE\s+UNIQUE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_claims_one_active_listing\s+ON\s+public\.claims\s*\(\s*listing_id\s*\)\s+WHERE\s+status\s*=\s*'active'/i
      );
    });

    it('enforces partial unique index for single active delivery per volunteer', () => {
      const content = fs.readFileSync(migrationPath, 'utf8');
      assert.match(
        content,
        /CREATE\s+UNIQUE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_deliveries_one_active_volunteer\s+ON\s+public\.deliveries\s*\(\s*volunteer_id\s*\)\s+WHERE\s+volunteer_id\s+IS\s+NOT\s+NULL\s+AND\s+status\s+NOT\s+IN\s*\(\s*'qc_failed'\s*,\s*'receipt_confirmed'\s*,\s*'cancelled'\s*\)/i
      );
    });

    it('enforces idempotency indexes on claims and delivery events', () => {
      const content = fs.readFileSync(migrationPath, 'utf8');
      assert.match(
        content,
        /idx_claims_requester_idempotency\s+ON\s+public\.claims\s*\(\s*requester_id\s*,\s*idempotency_key\s*\)/i
      );
      assert.match(
        content,
        /idx_delivery_events_actor_idempotency\s+ON\s+public\.delivery_events\s*\(\s*actor_id\s*,\s*idempotency_key\s*\)/i
      );
    });

    it('enables Row Level Security on all 6 tables', () => {
      const content = fs.readFileSync(migrationPath, 'utf8');
      const tables = [
        'food_listings',
        'listing_pickup_details',
        'listing_images',
        'claims',
        'deliveries',
        'delivery_events',
      ];

      for (const table of tables) {
        const regex = new RegExp(`ALTER\\s+TABLE\\s+public\\.${table}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`, 'i');
        assert.match(content, regex, `RLS must be enabled on ${table}`);
      }
    });

    it('configures explicit PostgREST Data API grants following least-privilege', () => {
      const content = fs.readFileSync(migrationPath, 'utf8');
      assert.match(content, /REVOKE\s+ALL\s+ON\s+TABLE\s+public\.food_listings\s+FROM\s+anon,\s*authenticated/i);
      assert.match(content, /REVOKE\s+ALL\s+ON\s+TABLE\s+public\.listing_pickup_details\s+FROM\s+anon,\s*authenticated/i);
      assert.match(content, /REVOKE\s+ALL\s+ON\s+TABLE\s+public\.claims\s+FROM\s+anon,\s*authenticated/i);
      assert.match(content, /REVOKE\s+ALL\s+ON\s+TABLE\s+public\.deliveries\s+FROM\s+anon,\s*authenticated/i);

      assert.match(content, /GRANT\s+SELECT\s+ON\s+TABLE\s+public\.food_listings\s+TO\s+anon/i);
      assert.match(content, /GRANT\s+ALL\s+ON\s+TABLE\s+public\.food_listings\s+TO\s+service_role/i);
    });

    it('defines storage bucket registration and policies for listing-images', () => {
      const content = fs.readFileSync(migrationPath, 'utf8');
      assert.match(content, /'listing-images'/i);
      assert.match(content, /5242880/);
      assert.match(content, /listing_images_storage_insert/i);
      assert.match(content, /\(SELECT\s+auth\.uid\(\)\)::text/i);
    });

    it('defines atomic procedures claim_food_listing and accept_delivery_task with security definer and safe search path', () => {
      const content = fs.readFileSync(migrationPath, 'utf8');
      assert.match(content, /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.claim_food_listing/i);
      assert.match(content, /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.accept_delivery_task/i);
      assert.match(content, /SECURITY\s+DEFINER/i);
      assert.match(content, /SET\s+search_path\s*=\s*''/i);
      assert.match(content, /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.claim_food_listing/i);
      assert.match(content, /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.accept_delivery_task/i);
    });

    it('removes legacy profile verification predicates without weakening role authorization', () => {
      const accessMigrationPath = path.resolve(
        __dirname,
        '../supabase/migrations/20261108114130_remove_profile_verification_gate.sql'
      );
      const content = fs.readFileSync(accessMigrationPath, 'utf8');

      assert.match(content, /pg_get_functiondef/i);
      assert.match(content, /OR NOT v_profile\.is_verified/i);
      assert.match(content, /OR NOT v_requester\.is_verified/i);
      assert.match(content, /canonical donor/i);
      assert.match(content, /canonical requester/i);
      assert.doesNotMatch(content, /DROP\s+(?:TABLE|POLICY|FUNCTION)/i);
    });

    it('replaces recursive listing and claim policies with private participant helpers', () => {
      const rlsMigrationPath = path.resolve(
        __dirname,
        '../supabase/migrations/20261108185711_fix_food_workflow_rls_recursion.sql'
      );
      const content = fs.readFileSync(rlsMigrationPath, 'utf8');

      assert.match(content, /FUNCTION\s+internal\.can_read_food_listing\s*\(p_listing_id uuid\)/i);
      assert.match(content, /FUNCTION\s+internal\.can_read_claim\s*\(p_claim_id uuid\)/i);
      assert.match(content, /SECURITY\s+DEFINER[\s\S]*SET\s+search_path\s*=\s*''/i);
      assert.match(content, /\(SELECT auth\.uid\(\)\) IS NOT NULL/i);
      assert.match(content, /REVOKE\s+ALL[\s\S]*FROM PUBLIC, anon, authenticated, service_role/i);
      assert.match(content, /GRANT\s+EXECUTE[\s\S]*TO authenticated/i);
      assert.match(content, /DROP POLICY IF EXISTS "food_listings_select_claimed"/i);
      assert.match(content, /USING\s*\(\(SELECT internal\.can_read_food_listing\(food_listings\.id\)\)\)/i);
      assert.match(content, /USING\s*\(\(SELECT internal\.can_read_claim\(claims\.id\)\)\)/i);

      const insertPolicy = content.slice(content.indexOf('CREATE POLICY "food_listings_insert_donor"'));
      assert.match(insertPolicy, /internal\.has_canonical_role\('donor'\)/i);
      assert.doesNotMatch(insertPolicy, /is_verified/i);
    });
  });

  describe('5. pgTAP Test Suite Validation', () => {
    const testPath = path.resolve(
      __dirname,
      '../supabase/tests/core_workflow_test.sql'
    );

    it('pgTAP test file exists and contains complete test plan', () => {
      assert.equal(fs.existsSync(testPath), true);
      const content = fs.readFileSync(testPath, 'utf8');
      assert.match(content, /SELECT\s+plan\(39\);/i);
      const assertions = content.match(/^SELECT\s+(?:has_table|ok|is_empty|results_eq|has_index|throws_ok|is)\s*\(/gim) || [];
      assert.equal(assertions.length, 39);
      assert.match(content, /SELECT\s+\*\s+FROM\s+finish\(\);/i);
      assert.match(content, /ROLLBACK;/i);
    });

    it('includes executable regression coverage for the RLS recursion path', () => {
      const recursionTestPath = path.resolve(
        __dirname,
        '../supabase/tests/food_workflow_rls_recursion_test.sql'
      );
      const content = fs.readFileSync(recursionTestPath, 'utf8');
      const assertions = content.match(
        /^SELECT\s+(?:has_function|ok|is_empty|results_eq|lives_ok)\s*\(/gim
      ) || [];

      assert.match(content, /SELECT\s+plan\(12\);/i);
      assert.equal(assertions.length, 12);
      assert.match(content, /SET LOCAL ROLE authenticated;/i);
      assert.match(content, /request\.jwt\.claim\.sub/i);
      assert.match(content, /legacy is_verified status/i);
      assert.match(content, /ROLLBACK;/i);
    });
  });

  describe('6. Zero Forbidden Terminology Scan', () => {
    it('verifies absence of forbidden terms in migration, contracts, types, and test files', () => {
      const filesToCheck = [
        path.resolve(__dirname, '../supabase/migrations/20261105080000_core_food_workflow.sql'),
        path.resolve(__dirname, '../supabase/tests/core_workflow_test.sql'),
        path.resolve(__dirname, '../src/types/database.types.ts'),
        path.resolve(__dirname, '../src/types/contracts.ts'),
        __filename,
      ];

      // Build forbidden terms dynamically so literal strings do not appear in source code
      const term1 = ['p', 'h', 'a', 's', 'e'].join('');
      const term2 = ['s', 't', 'a', 'g', 'e'].join('');
      const term3 = ['m', 'i', 'l', 'e', 's', 't', 'o', 'n', 'e'].join('');
      const pattern = new RegExp(`\\b(${term1}|${term2}|${term3})\\b`, 'i');

      for (const filePath of filesToCheck) {
        assert.equal(fs.existsSync(filePath), true, `File must exist: ${filePath}`);
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const match = pattern.exec(line);
          assert.equal(
            match,
            null,
            `Forbidden word "${match?.[0]}" found in ${path.basename(filePath)} at line ${i + 1}: ${line}`
          );
        }
      }
    });
  });
});
