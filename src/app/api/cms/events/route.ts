import { NextResponse } from 'next/server';
import { getAuthenticatedUser, AuthenticatedUser } from '@/server/auth';
import { getEvents, createEvent, CmsError } from '@/server/cms';

export async function GET(
  req: Request,
  context?: any
) {
  try {
    const events = await getEvents(context?.customClient);
    return NextResponse.json({ data: events, error: null }, { status: 200 });
  } catch (err: any) {
    if (err instanceof CmsError) {
      return NextResponse.json({ data: null, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ data: null, error: { code: 'INTERNAL_ERROR', message: err.message } }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  context?: any
) {
  try {
    const user = context?.caller || (await getAuthenticatedUser(req));
    if (!user) {
      return NextResponse.json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return NextResponse.json({ data: null, error: { code: 'FORBIDDEN', message: 'Admin role required' } }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ data: null, error: { code: 'INVALID_JSON', message: 'Request body required' } }, { status: 400 });
    }

    const event = await createEvent(user.id, body, context?.customClient);
    return NextResponse.json({ data: event, error: null }, { status: 201 });
  } catch (err: any) {
    if (err instanceof CmsError) {
      return NextResponse.json({ data: null, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ data: null, error: { code: 'INTERNAL_ERROR', message: err.message } }, { status: 500 });
  }
}
