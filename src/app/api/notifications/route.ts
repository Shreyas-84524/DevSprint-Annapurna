import { NextResponse } from 'next/server';
import { getAuthenticatedUser, AuthenticatedUser } from '@/server/auth';
import { getUserNotifications, NotificationError } from '@/server/notifications';

export async function GET(
  req: Request,
  context?: any
) {
  try {
    const user = context?.caller || (await getAuthenticatedUser(req));
    if (!user) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: 'UNAUTHORIZED',
            message: 'You must be signed in to view notifications.',
          },
        },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const limitParam = url.searchParams.get('limit');
    const unreadOnlyParam = url.searchParams.get('unreadOnly');

    const limit = limitParam ? parseInt(limitParam, 10) : 20;
    const unreadOnly = unreadOnlyParam === 'true';

    const result = await getUserNotifications(
      user.id,
      { limit, unreadOnly },
      context?.customClient
    );

    return NextResponse.json(
      {
        data: result,
        error: null,
      },
      { status: 200 }
    );
  } catch (err: any) {
    if (err instanceof NotificationError) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: err.code,
            message: err.message,
          },
        },
        { status: err.status }
      );
    }

    console.error('Unexpected error in GET /api/notifications:', err);
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred while fetching notifications.',
        },
      },
      { status: 500 }
    );
  }
}
