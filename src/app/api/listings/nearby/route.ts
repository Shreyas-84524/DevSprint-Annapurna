import { NextResponse } from 'next/server';
import { getNearbyListings } from '@/server/listings';

export async function GET(
  req: Request,
  context?: any
) {
  try {
    const url = new URL(req.url);
    const latParam = url.searchParams.get('lat');
    const lngParam = url.searchParams.get('lng');
    const radiusParam = url.searchParams.get('radius');
    const cursor = url.searchParams.get('cursor') || undefined;
    const limitParam = url.searchParams.get('limit');

    const lat = latParam ? parseFloat(latParam) : undefined;
    const lng = lngParam ? parseFloat(lngParam) : undefined;
    const radius = radiusParam ? parseFloat(radiusParam) : undefined;
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    const listings = await getNearbyListings(
      { lat, lng, radius, cursor, limit },
      context?.customClient
    );

    return NextResponse.json(
      {
        data: listings,
        error: null,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('Unexpected error in GET /api/listings/nearby:', err);
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred while discovering nearby listings.',
        },
      },
      { status: 500 }
    );
  }
}
