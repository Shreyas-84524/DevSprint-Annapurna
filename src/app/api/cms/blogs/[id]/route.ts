import { NextResponse } from 'next/server';
import { getAuthenticatedUser, AuthenticatedUser } from '@/server/auth';
import { getPublicBlogBySlug, updateBlog, deleteBlog, CmsError } from '@/server/cms';

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }>; customClient?: any }
) {
  try {
    const { id: slugOrId } = await context.params;
    const blog = await getPublicBlogBySlug(slugOrId, context.customClient);
    if (!blog) {
      return NextResponse.json({ data: null, error: { code: 'NOT_FOUND', message: 'Blog post not found' } }, { status: 404 });
    }
    return NextResponse.json({ data: blog, error: null }, { status: 200 });
  } catch {
    return NextResponse.json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'The CMS request could not be completed.' } }, { status: 500 });
  }
}

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

    const updated = await updateBlog(user.id, id, body, context?.customClient);
    return NextResponse.json({ data: updated, error: null }, { status: 200 });
  } catch (err: any) {
    if (err instanceof CmsError) {
      return NextResponse.json({ data: null, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'The CMS request could not be completed.' } }, { status: 500 });
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
    await deleteBlog(user.id, id, context?.customClient);
    return NextResponse.json({ data: { success: true }, error: null }, { status: 200 });
  } catch (err: any) {
    if (err instanceof CmsError) {
      return NextResponse.json({ data: null, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'The CMS request could not be completed.' } }, { status: 500 });
  }
}
