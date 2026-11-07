import { NextResponse } from 'next/server';
import { getAuthenticatedUser, AuthenticatedUser } from '@/server/auth';
import { uploadCmsAsset, CmsError } from '@/server/cms';

export const runtime = 'nodejs';

const MAX_CMS_ASSET_BYTES = 5 * 1024 * 1024;
const ALLOWED_CMS_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function POST(
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
        { data: null, error: { code: 'FORBIDDEN', message: 'Admin role required to upload CMS assets' } },
        { status: 403 }
      );
    }

    const formData = await req.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json(
        { data: null, error: { code: 'INVALID_FORM', message: 'Multipart form data is required' } },
        { status: 400 }
      );
    }

    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json(
        { data: null, error: { code: 'MISSING_FILE', message: 'No file provided in form field "file"' } },
        { status: 400 }
      );
    }

    if (!ALLOWED_CMS_MIME_TYPES.has(file.type.toLowerCase())) {
      return NextResponse.json(
        { data: null, error: { code: 'INVALID_FILE_TYPE', message: 'Only JPEG, PNG, and WebP images are allowed' } },
        { status: 400 }
      );
    }

    if (file.size <= 0 || file.size > MAX_CMS_ASSET_BYTES) {
      return NextResponse.json(
        { data: null, error: { code: 'INVALID_FILE_SIZE', message: 'Image must be larger than 0 bytes and no more than 5 MB' } },
        { status: 400 }
      );
    }

    const folder = (formData.get('folder') as string) || 'general';
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await uploadCmsAsset(
      user.id,
      {
        buffer,
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
      },
      folder,
      context?.customClient
    );

    return NextResponse.json({ data: result, error: null }, { status: 201 });
  } catch (err: any) {
    if (err instanceof CmsError) {
      return NextResponse.json(
        { data: null, error: { code: err.code, message: err.message } },
        { status: err.status }
      );
    }

    console.error('Unexpected error in POST /api/cms/upload:', err);
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Unable to upload the CMS asset' } },
      { status: 500 }
    );
  }
}
