import { NextResponse } from 'next/server';
import { getAuthenticatedUser, AuthenticatedUser } from '@/server/auth';
import { getAvailableVolunteerTasks, DeliveryWorkflowError } from '@/server/deliveries';

export async function GET(
  req: Request,
  context?: any
) {
  try {
    // 1. Authenticate caller
    const user = context?.caller || (await getAuthenticatedUser(req));
    if (!user) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: 'UNAUTHORIZED',
            message: 'You must be signed in to view available volunteer tasks.',
          },
        },
        { status: 401 }
      );
    }

    if (user.role !== 'volunteer') {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: 'UNAUTHORIZED_VOLUNTEER',
            message: 'Only volunteers can view available delivery tasks.',
          },
        },
        { status: 403 }
      );
    }

    const url = new URL(req.url);
    const cursor = url.searchParams.get('cursor') || undefined;
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    const tasks = await getAvailableVolunteerTasks(
      user.id,
      { cursor, limit },
      context?.customClient
    );

    return NextResponse.json(
      {
        data: tasks,
        error: null,
      },
      { status: 200 }
    );
  } catch (err: any) {
    if (err instanceof DeliveryWorkflowError) {
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

    console.error('Unexpected error in GET /api/volunteer/tasks/available:', err);
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred while fetching available volunteer tasks.',
        },
      },
      { status: 500 }
    );
  }
}
