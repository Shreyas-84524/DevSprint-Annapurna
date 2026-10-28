/**
 * Server-only Geoapify Routing Provider Adapter
 *
 * Implements routing calculation using Geoapify Routing API v1.
 * Never import or execute this module in client components or browser bundles.
 */

export interface GeoapifyConfig {
  apiKey: string;
  baseUrl?: string;
}

export type TravelMode =
  | 'drive'
  | 'motorcycle'
  | 'bicycle'
  | 'walk'
  | 'transit'
  | 'scooter';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface GeoapifyRouteResult {
  distanceMeters: number;
  distanceKm: number;
  durationSeconds: number;
  durationMinutes: number;
  geometry: {
    type: 'LineString';
    coordinates: [number, number][]; // [lon, lat] per GeoJSON specification
  };
  travelMode: TravelMode;
  provider: 'geoapify';
}

export class GeoapifyRoutingError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly retryAfterSeconds?: number;

  constructor(
    message: string,
    options: {
      code: string;
      status: number;
      retryAfterSeconds?: number;
    }
  ) {
    super(message);
    this.name = 'GeoapifyRoutingError';
    this.code = options.code;
    this.status = options.status;
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}

/**
 * Validates latitude and longitude coordinates within valid geographical bounds.
 */
export function validateCoordinates(coord: LatLng, name = 'Coordinate'): void {
  if (
    !coord ||
    typeof coord.lat !== 'number' ||
    typeof coord.lng !== 'number' ||
    Number.isNaN(coord.lat) ||
    Number.isNaN(coord.lng)
  ) {
    throw new GeoapifyRoutingError(`${name} must contain valid numerical lat and lng properties`, {
      code: 'INVALID_COORDINATES',
      status: 400,
    });
  }

  if (coord.lat < -90 || coord.lat > 90) {
    throw new GeoapifyRoutingError(`${name} latitude must be between -90 and 90 degrees`, {
      code: 'COORDINATES_OUT_OF_BOUNDS',
      status: 400,
    });
  }

  if (coord.lng < -180 || coord.lng > 180) {
    throw new GeoapifyRoutingError(`${name} longitude must be between -180 and 180 degrees`, {
      code: 'COORDINATES_OUT_OF_BOUNDS',
      status: 400,
    });
  }
}

/**
 * Resolves server-only Geoapify configuration.
 */
export function getGeoapifyConfig(): GeoapifyConfig {
  const apiKey = process.env.GEOAPIFY_API_KEY;

  if (!apiKey) {
    throw new GeoapifyRoutingError('GEOAPIFY_API_KEY is not configured on the server', {
      code: 'GEOAPIFY_CONFIG_MISSING',
      status: 500,
    });
  }

  return {
    apiKey,
    baseUrl: 'https://api.geoapify.com/v1/routing',
  };
}

/**
 * Parses upstream Geoapify error responses safely without leaking API keys.
 */
function parseGeoapifyError(status: number, data: any): GeoapifyRoutingError {
  let message = 'Routing calculation failed';
  if (data && typeof data === 'object') {
    message = data.message || data.error?.message || message;
  }

  switch (status) {
    case 400:
      return new GeoapifyRoutingError(message || 'Invalid routing parameters or waypoint coordinates', {
        code: 'GEOAPIFY_BAD_REQUEST',
        status: 400,
      });
    case 401:
      return new GeoapifyRoutingError('Invalid or unauthorized Geoapify API key', {
        code: 'GEOAPIFY_UNAUTHORIZED',
        status: 401,
      });
    case 402:
    case 403:
      return new GeoapifyRoutingError('Geoapify monthly request quota exceeded or API key restricted', {
        code: 'GEOAPIFY_QUOTA_EXHAUSTED',
        status: 403,
      });
    case 404:
      return new GeoapifyRoutingError('No road route could be calculated between the specified waypoints', {
        code: 'NO_ROUTE_FOUND',
        status: 404,
      });
    case 429:
      return new GeoapifyRoutingError('Geoapify rate limit reached. Please wait before retrying.', {
        code: 'GEOAPIFY_RATE_LIMITED',
        status: 429,
        retryAfterSeconds: 5,
      });
    case 500:
    case 503:
      return new GeoapifyRoutingError('Geoapify routing service is temporarily unavailable', {
        code: 'GEOAPIFY_SERVICE_UNAVAILABLE',
        status: 503,
      });
    default:
      return new GeoapifyRoutingError(message || `Upstream Geoapify error (${status})`, {
        code: 'GEOAPIFY_UPSTREAM_ERROR',
        status,
      });
  }
}

/**
 * Executes a network call with 10-second timeout and bounded retry on 500/503.
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 2
): Promise<Response> {
  let attempt = 0;

  while (true) {
    attempt++;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timer);

      if ((response.status === 500 || response.status === 503) && attempt <= maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 300));
        continue;
      }

      return response;
    } catch (err: any) {
      clearTimeout(timer);

      if (err?.name === 'AbortError') {
        throw new GeoapifyRoutingError('Geoapify routing request timed out after 10 seconds', {
          code: 'GEOAPIFY_TIMEOUT',
          status: 504,
        });
      }

      if (attempt <= maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 300));
        continue;
      }

      throw new GeoapifyRoutingError('Failed to communicate with Geoapify routing service', {
        code: 'GEOAPIFY_NETWORK_FAILURE',
        status: 503,
      });
    }
  }
}

/**
 * Calculates a route between origin and destination coordinates using Geoapify.
 *
 * @param origin Start coordinate { lat, lng }
 * @param destination End coordinate { lat, lng }
 * @param mode Travel mode ('drive', 'walk', 'bicycle')
 * @param config Optional explicit configuration (for isolated testing)
 */
export async function calculateGeoapifyRoute(
  origin: LatLng,
  destination: LatLng,
  mode: TravelMode = 'drive',
  config = getGeoapifyConfig()
): Promise<GeoapifyRouteResult> {
  validateCoordinates(origin, 'Origin');
  validateCoordinates(destination, 'Destination');

  const waypoints = `${origin.lat},${origin.lng}|${destination.lat},${destination.lng}`;
  const baseUrl = config.baseUrl || 'https://api.geoapify.com/v1/routing';
  const url = `${baseUrl}?waypoints=${encodeURIComponent(waypoints)}&mode=${mode}&apiKey=${encodeURIComponent(config.apiKey)}`;

  const response = await fetchWithRetry(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  let data: any;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw parseGeoapifyError(response.status, data);
  }

  const feature = data?.features?.[0];
  if (!feature || !feature.geometry) {
    throw new GeoapifyRoutingError('No navigable route found between given coordinates', {
      code: 'NO_ROUTE_FOUND',
      status: 404,
    });
  }

  const distanceMeters = Math.round(feature.properties?.distance ?? 0);
  const durationSeconds = Math.round(feature.properties?.time ?? 0);

  // Normalize geometry to standard GeoJSON LineString coordinates
  const rawCoords = feature.geometry.coordinates || [];
  let coordinates: [number, number][] = [];

  if (feature.geometry.type === 'LineString') {
    coordinates = rawCoords;
  } else if (feature.geometry.type === 'MultiLineString') {
    coordinates = rawCoords.flat(1);
  }

  return {
    distanceMeters,
    distanceKm: Math.round((distanceMeters / 1000) * 10) / 10,
    durationSeconds,
    durationMinutes: Math.round(durationSeconds / 60),
    geometry: {
      type: 'LineString',
      coordinates,
    },
    travelMode: mode,
    provider: 'geoapify',
  };
}

/**
 * Geocodes an address string using Geoapify Geocoding API v1.
 * Runs strictly server-side and never exposes the API key to the client.
 */
export async function geocodeWithGeoapify(
  address: string,
  config?: GeoapifyConfig
): Promise<LatLng | null> {
  const resolvedConfig = config ?? getGeoapifyConfig();
  const trimmed = address?.trim();
  if (!trimmed) return null;

  const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(trimmed)}&apiKey=${encodeURIComponent(resolvedConfig.apiKey)}`;
  try {
    const response = await fetchWithRetry(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) return null;
    const data = await response.json();
    const feature = data?.features?.[0];
    if (!feature?.geometry?.coordinates) return null;
    const [lng, lat] = feature.geometry.coordinates;
    if (typeof lat !== 'number' || typeof lng !== 'number') return null;
    return { lat, lng };
  } catch {
    return null;
  }
}
