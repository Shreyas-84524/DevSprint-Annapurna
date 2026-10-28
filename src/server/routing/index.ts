/**
 * Provider-neutral Server Routing Service with In-Memory Caching
 */

import {
  calculateGeoapifyRoute,
  GeoapifyConfig,
  GeoapifyRouteResult,
  LatLng,
  TravelMode,
  validateCoordinates,
} from './geoapify';

export interface RouteOptions {
  mode?: TravelMode;
  bypassCache?: boolean;
  customConfig?: GeoapifyConfig;
}

export interface CachedRoute extends GeoapifyRouteResult {
  cached: boolean;
  cachedAt?: string;
  cacheExpiresAt?: string;
}

interface CacheEntry {
  route: GeoapifyRouteResult;
  expiresAt: number; // epoch ms
}

// In-memory route cache with TTL (1 hour default)
const routeCache = new Map<string, CacheEntry>();
const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Normalizes coordinate key to 5 decimal places (~1.1 meter precision) to maximize cache hits.
 */
function getCacheKey(origin: LatLng, destination: LatLng, mode: TravelMode): string {
  const oLat = origin.lat.toFixed(5);
  const oLng = origin.lng.toFixed(5);
  const dLat = destination.lat.toFixed(5);
  const dLng = destination.lng.toFixed(5);
  return `route:${mode}:${oLat},${oLng}->${dLat},${dLng}`;
}

/**
 * Clears expired cache entries.
 */
function pruneExpiredCache(): void {
  const now = Date.now();
  for (const [key, entry] of routeCache.entries()) {
    if (now > entry.expiresAt) {
      routeCache.delete(key);
    }
  }
}

/**
 * Retrieves a route between origin and destination with caching.
 */
export async function getCalculatedRoute(
  origin: LatLng,
  destination: LatLng,
  options: RouteOptions = {}
): Promise<CachedRoute> {
  validateCoordinates(origin, 'Origin');
  validateCoordinates(destination, 'Destination');

  const mode = options.mode || 'drive';
  const cacheKey = getCacheKey(origin, destination, mode);
  const now = Date.now();

  // 1. Check cache if not bypassed
  if (!options.bypassCache) {
    const cachedEntry = routeCache.get(cacheKey);
    if (cachedEntry && now < cachedEntry.expiresAt) {
      return {
        ...cachedEntry.route,
        cached: true,
        cachedAt: new Date(cachedEntry.expiresAt - DEFAULT_TTL_MS).toISOString(),
        cacheExpiresAt: new Date(cachedEntry.expiresAt).toISOString(),
      };
    }
  }

  // 2. Calculate fresh route from provider
  const route = await calculateGeoapifyRoute(
    origin,
    destination,
    mode,
    options.customConfig
  );

  // 3. Save to cache
  pruneExpiredCache();
  routeCache.set(cacheKey, {
    route,
    expiresAt: now + DEFAULT_TTL_MS,
  });

  return {
    ...route,
    cached: false,
  };
}

/**
 * Resets the in-memory route cache (for test isolation).
 */
export function resetRouteCache(): void {
  routeCache.clear();
}
