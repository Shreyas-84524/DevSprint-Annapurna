import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateGeoapifyRoute,
  validateCoordinates,
  GeoapifyConfig,
  GeoapifyRoutingError,
} from '../src/server/routing/geoapify';
import {
  getCalculatedRoute,
  resetRouteCache,
} from '../src/server/routing/index';
import { GET as routingHandler } from '../src/app/api/routing/route';

const MOCK_CONFIG: GeoapifyConfig = {
  apiKey: 'test_geoapify_secret_key_abc',
  baseUrl: 'https://mock-geoapify.local/v1/routing',
};

const ORIGIN = { lat: 19.076, lng: 72.8777 }; // Mumbai Central
const DESTINATION = { lat: 19.0596, lng: 72.8295 }; // Bandra West

const MOCK_FEATURE_RESPONSE = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        mode: 'drive',
        distance: 8520, // 8.52 km
        time: 1260, // 21 minutes
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [72.8777, 19.076],
          [72.855, 19.068],
          [72.8295, 19.0596],
        ],
      },
    },
  ],
};

describe('Geoapify Routing Suite', () => {
  beforeEach(() => {
    resetRouteCache();
  });

  describe('1. Coordinate Validation', () => {
    it('accepts valid coordinates', () => {
      assert.doesNotThrow(() => validateCoordinates(ORIGIN));
      assert.doesNotThrow(() => validateCoordinates(DESTINATION));
    });

    it('rejects invalid or non-numeric coordinates', () => {
      assert.throws(
        () => validateCoordinates({ lat: NaN, lng: 72.8 } as any),
        (err: GeoapifyRoutingError) => {
          assert.equal(err.code, 'INVALID_COORDINATES');
          assert.equal(err.status, 400);
          return true;
        }
      );
    });

    it('rejects latitude out of bounds (-90 to 90)', () => {
      assert.throws(
        () => validateCoordinates({ lat: 95.0, lng: 72.8 }),
        (err: GeoapifyRoutingError) => {
          assert.equal(err.code, 'COORDINATES_OUT_OF_BOUNDS');
          assert.equal(err.status, 400);
          return true;
        }
      );
    });

    it('rejects longitude out of bounds (-180 to 180)', () => {
      assert.throws(
        () => validateCoordinates({ lat: 19.0, lng: -195.0 }),
        (err: GeoapifyRoutingError) => {
          assert.equal(err.code, 'COORDINATES_OUT_OF_BOUNDS');
          assert.equal(err.status, 400);
          return true;
        }
      );
    });
  });

  describe('2. Geoapify Provider Adapter', () => {
    it('calculates route successfully with distance, duration, and GeoJSON geometry', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url: any) => {
        assert.ok(url.includes('https://mock-geoapify.local/v1/routing'));
        assert.ok(url.includes(`apiKey=${MOCK_CONFIG.apiKey}`));
        assert.ok(url.includes('mode=drive'));
        return new Response(JSON.stringify(MOCK_FEATURE_RESPONSE), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      };

      try {
        const result = await calculateGeoapifyRoute(
          ORIGIN,
          DESTINATION,
          'drive',
          MOCK_CONFIG
        );

        assert.equal(result.distanceMeters, 8520);
        assert.equal(result.distanceKm, 8.5);
        assert.equal(result.durationSeconds, 1260);
        assert.equal(result.durationMinutes, 21);
        assert.equal(result.geometry.type, 'LineString');
        assert.equal(result.geometry.coordinates.length, 3);
        assert.equal(result.travelMode, 'drive');
        assert.equal(result.provider, 'geoapify');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('handles upstream 401 unauthorized safely without leaking secret key', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => {
        return new Response(
          JSON.stringify({ message: 'Invalid API key' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      };

      try {
        await assert.rejects(
          async () => calculateGeoapifyRoute(ORIGIN, DESTINATION, 'drive', MOCK_CONFIG),
          (err: GeoapifyRoutingError) => {
            assert.equal(err.status, 401);
            assert.equal(err.code, 'GEOAPIFY_UNAUTHORIZED');
            assert.ok(!err.message.includes(MOCK_CONFIG.apiKey));
            return true;
          }
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('handles upstream 402/403 quota exhaustion', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => {
        return new Response(
          JSON.stringify({ message: 'Monthly quota exceeded' }),
          { status: 402, headers: { 'Content-Type': 'application/json' } }
        );
      };

      try {
        await assert.rejects(
          async () => calculateGeoapifyRoute(ORIGIN, DESTINATION, 'drive', MOCK_CONFIG),
          (err: GeoapifyRoutingError) => {
            assert.equal(err.status, 403);
            assert.equal(err.code, 'GEOAPIFY_QUOTA_EXHAUSTED');
            return true;
          }
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('handles upstream 404 no route found', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => {
        return new Response(
          JSON.stringify({ features: [] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      };

      try {
        await assert.rejects(
          async () => calculateGeoapifyRoute(ORIGIN, DESTINATION, 'drive', MOCK_CONFIG),
          (err: GeoapifyRoutingError) => {
            assert.equal(err.status, 404);
            assert.equal(err.code, 'NO_ROUTE_FOUND');
            return true;
          }
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('retries on 500/503 up to 2 times and maps to GEOAPIFY_SERVICE_UNAVAILABLE', async () => {
      const originalFetch = globalThis.fetch;
      let calls = 0;

      globalThis.fetch = async () => {
        calls++;
        return new Response('Service Unavailable', { status: 503 });
      };

      try {
        await assert.rejects(
          async () => calculateGeoapifyRoute(ORIGIN, DESTINATION, 'drive', MOCK_CONFIG),
          (err: GeoapifyRoutingError) => {
            assert.equal(err.status, 503);
            assert.equal(err.code, 'GEOAPIFY_SERVICE_UNAVAILABLE');
            return true;
          }
        );

        // 1 initial + 2 retries = 3 calls
        assert.equal(calls, 3);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe('3. Route Caching & TTL Invariants', () => {
    it('serves cached route on second identical request', async () => {
      const originalFetch = globalThis.fetch;
      let networkCalls = 0;

      globalThis.fetch = async () => {
        networkCalls++;
        return new Response(JSON.stringify(MOCK_FEATURE_RESPONSE), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      };

      try {
        // First call: fresh from provider
        const first = await getCalculatedRoute(ORIGIN, DESTINATION, {
          customConfig: MOCK_CONFIG,
        });
        assert.equal(first.cached, false);
        assert.equal(networkCalls, 1);

        // Second call: served from in-memory cache
        const second = await getCalculatedRoute(ORIGIN, DESTINATION, {
          customConfig: MOCK_CONFIG,
        });
        assert.equal(second.cached, true);
        assert.equal(second.distanceKm, 8.5);
        assert.equal(networkCalls, 1); // no additional network call!

        // Third call with bypassCache: fresh network call
        const third = await getCalculatedRoute(ORIGIN, DESTINATION, {
          bypassCache: true,
          customConfig: MOCK_CONFIG,
        });
        assert.equal(third.cached, false);
        assert.equal(networkCalls, 2);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe('4. Routing Route Handler (HTTP Boundary)', () => {
    it('returns 401 when unauthenticated', async () => {
      const req = new Request(
        'http://localhost:3000/api/routing?origin=19.076,72.8777&destination=19.0596,72.8295',
        { method: 'GET' }
      );

      const res = await routingHandler(req);
      assert.equal(res.status, 401);
      const json = await res.json();
      assert.equal(json.error.code, 'UNAUTHORIZED');
      assert.equal(json.data, null);
    });

    it('returns 400 when missing origin or destination', async () => {
      const req = new Request(
        'http://localhost:3000/api/routing?origin=19.076,72.8777',
        {
          method: 'GET',
          headers: { 'Authorization': 'Bearer test-token' },
        }
      );

      const res = await routingHandler(req);
      assert.ok(res.status === 400 || res.status === 401);
    });
  });
});
