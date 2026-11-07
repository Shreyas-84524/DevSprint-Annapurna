import { NextResponse } from 'next/server';
import { getAuthenticatedUser, AuthenticatedUser } from '@/server/auth';
import { getAdminStats, CmsError } from '@/server/cms';

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
            message: 'Authentication required.',
          },
        },
        { status: 401 }
      );
    }

    if (user.role !== 'admin') {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin access required.',
          },
        },
        { status: 403 }
      );
    }

    const stats = await getAdminStats(user.id, context?.customClient);

    return NextResponse.json(
      {
        data: stats,
        error: null,
      },
      { status: 200 }
    );
  } catch (err: any) {
    if (err instanceof CmsError) {
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

    console.error('Unexpected error in GET /api/admin/stats:', err);
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve administrative statistics.',
        },
      },
      { status: 500 }
    );
  }
}
