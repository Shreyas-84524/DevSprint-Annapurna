import { NextResponse } from 'next/server';
import { getAuthenticatedUser, AuthenticatedUser } from '@/server/auth';
import { markNotificationRead, NotificationError } from '@/server/notifications';

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }>; caller?: AuthenticatedUser; customClient?: any }
) {
  try {
    const user = context?.caller || (await getAuthenticatedUser(req));
    if (!user) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: 'UNAUTHORIZED',
            message: 'You must be signed in to update notifications.',
          },
        },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: 'INVALID_ID',
            message: 'Notification ID is required.',
          },
        },
        { status: 400 }
      );
    }

    const updated = await markNotificationRead(user.id, id, context?.customClient);

    return NextResponse.json(
      {
        data: updated,
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

    console.error('Unexpected error in POST /api/notifications/[id]/read:', err);
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred while marking notification as read.',
        },
      },
      { status: 500 }
    );
  }
}
