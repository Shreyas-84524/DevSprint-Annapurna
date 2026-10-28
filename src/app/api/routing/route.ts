import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { getCalculatedRoute } from '@/server/routing';
import { GeoapifyRoutingError, TravelMode, geocodeWithGeoapify, LatLng } from '@/server/routing/geoapify';

async function parseLocationParam(param: string): Promise<LatLng | null> {
  const parts = param.split(',');
  if (parts.length === 2) {
    const lat = parseFloat(parts[0].trim());
    const lng = parseFloat(parts[1].trim());
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      return { lat, lng };
    }
  }
  // Fall back to server-side geocoding if given an address string
  return await geocodeWithGeoapify(param);
}

export async function GET(req: Request) {
  try {
    // 1. Authenticate user
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: 'UNAUTHORIZED',
            message: 'You must be signed in to request routing calculations.',
          },
        },
        { status: 401 }
      );
    }

    // 2. Parse query parameters
    const url = new URL(req.url);
    const originParam = url.searchParams.get('origin');
    const destinationParam = url.searchParams.get('destination');
    const modeParam = (url.searchParams.get('mode') || 'drive') as TravelMode;

    if (!originParam || !destinationParam) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'Both origin and destination coordinates are required (format: lat,lng).',
          },
        },
        { status: 400 }
      );
    }

    const origin = await parseLocationParam(originParam);
    const destination = await parseLocationParam(destinationParam);

    if (!origin || !destination) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: 'INVALID_LOCATION',
            message: 'Unable to resolve geographic coordinates for the provided origin or destination.',
          },
        },
        { status: 400 }
      );
    }

    // 3. Calculate route
    const route = await getCalculatedRoute(origin, destination, {
      mode: modeParam,
    });

    return NextResponse.json(
      {
        data: route,
        error: null,
      },
      { status: 200 }
    );
  } catch (err: any) {
    if (err instanceof GeoapifyRoutingError) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: err.code,
            message: err.message,
            retryAfterSeconds: err.retryAfterSeconds,
          },
        },
        { status: err.status }
      );
    }

    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred during route calculation.',
        },
      },
      { status: 500 }
    );
  }
}
