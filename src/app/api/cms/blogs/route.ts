import { NextResponse } from 'next/server';
import { getAuthenticatedUser, AuthenticatedUser } from '@/server/auth';
import { getPublicBlogs, getAdminBlogs, createBlog, CmsError } from '@/server/cms';

export async function GET(
  req: Request,
  context?: any
) {
  try {
    const user = context?.caller || (await getAuthenticatedUser(req));
    const url = new URL(req.url);
    const statusParam = url.searchParams.get('status') as 'draft' | 'published' | 'all' | null;

    // If caller is an authenticated admin and requests specific status, return admin view
    if (user && user.role === 'admin' && statusParam) {
      const blogs = await getAdminBlogs(user.id, statusParam, context?.customClient);
      return NextResponse.json({ data: blogs, error: null }, { status: 200 });
    }

    // Public view: always published only
    const blogs = await getPublicBlogs(context?.customClient);
    return NextResponse.json({ data: blogs, error: null }, { status: 200 });
  } catch (err: any) {
    if (err instanceof CmsError) {
      return NextResponse.json({ data: null, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'The CMS request could not be completed.' } }, { status: 500 });
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

    const blog = await createBlog(user.id, body, context?.customClient);
    return NextResponse.json({ data: blog, error: null }, { status: 201 });
  } catch (err: any) {
    if (err instanceof CmsError) {
      return NextResponse.json({ data: null, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'The CMS request could not be completed.' } }, { status: 500 });
  }
}
