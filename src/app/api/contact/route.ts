import { NextResponse } from 'next/server';
import { submitContactMessage, ContactError } from '@/server/contact';

export async function POST(
  req: Request,
  context?: any
) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: 'INVALID_JSON',
            message: 'A valid JSON request body is required.',
          },
        },
        { status: 400 }
      );
    }

    // Extract client IP from forwarding headers for rate limiting
    const forwarded = req.headers.get('x-forwarded-for');
    const clientIp = forwarded ? forwarded.split(',')[0].trim() : req.headers.get('x-real-ip') || undefined;

    const result = await submitContactMessage(body, clientIp, context?.customClient);

    return NextResponse.json(
      {
        data: {
          id: result.id,
          message: 'Thank you for your message. An administrator will review it shortly.',
          createdAt: result.createdAt,
        },
        error: null,
      },
      { status: 201 }
    );
  } catch (err: any) {
    if (err instanceof ContactError) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: err.code,
            message: err.message,
            details: err.details,
          },
        },
        { status: err.status }
      );
    }

    console.error('Unexpected error in POST /api/contact:', err);
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred while submitting contact inquiry.',
        },
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      data: null,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Contact inquiries are not publicly listable.',
      },
    },
    { status: 405 }
  );
}
