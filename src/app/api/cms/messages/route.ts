import { NextResponse } from 'next/server';
import { getAuthenticatedUser, AuthenticatedUser } from '@/server/auth';
import { getContactMessages, ContactError } from '@/server/contact';

export async function GET(
  req: Request,
  context?: any
) {
  try {
    const user = context?.caller || (await getAuthenticatedUser(req));
    if (!user) {
      return NextResponse.json(
        { data: null, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }
    if (user.role !== 'admin') {
      return NextResponse.json(
        { data: null, error: { code: 'FORBIDDEN', message: 'Admin role required to view contact messages' } },
        { status: 403 }
      );
    }

    const messages = await getContactMessages(user.id, context?.customClient);
    return NextResponse.json({ data: messages, error: null }, { status: 200 });
  } catch (err: any) {
    if (err instanceof ContactError) {
      return NextResponse.json({ data: null, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'The contact messages request could not be completed.' } }, { status: 500 });
  }
}
