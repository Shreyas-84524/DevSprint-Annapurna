import { NextResponse } from 'next/server';
import { getAuthenticatedUser, AuthenticatedUser } from '@/server/auth';
import { updateEvent, deleteEvent, CmsError } from '@/server/cms';

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }>; caller?: AuthenticatedUser; customClient?: any }
) {
  try {
    const user = context?.caller || (await getAuthenticatedUser(req));
    if (!user) {
      return NextResponse.json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return NextResponse.json({ data: null, error: { code: 'FORBIDDEN', message: 'Admin role required' } }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ data: null, error: { code: 'INVALID_JSON', message: 'Request body required' } }, { status: 400 });
    }

    const updated = await updateEvent(user.id, id, body, context?.customClient);
    return NextResponse.json({ data: updated, error: null }, { status: 200 });
  } catch (err: any) {
    if (err instanceof CmsError) {
      return NextResponse.json({ data: null, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ data: null, error: { code: 'INTERNAL_ERROR', message: err.message } }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }>; caller?: AuthenticatedUser; customClient?: any }
) {
  try {
    const user = context?.caller || (await getAuthenticatedUser(req));
    if (!user) {
      return NextResponse.json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return NextResponse.json({ data: null, error: { code: 'FORBIDDEN', message: 'Admin role required' } }, { status: 403 });
    }

    const { id } = await context.params;
    await deleteEvent(user.id, id, context?.customClient);
    return NextResponse.json({ data: { success: true }, error: null }, { status: 200 });
  } catch (err: any) {
    if (err instanceof CmsError) {
      return NextResponse.json({ data: null, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ data: null, error: { code: 'INTERNAL_ERROR', message: err.message } }, { status: 500 });
  }
}
