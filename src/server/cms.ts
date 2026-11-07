/**
 * Server-only CMS DAL & Services
 *
 * Implements public-safe reads of published blogs, events, FAQs, and gallery items;
 * admin-authorized mutations with server-side profile verification;
 * real admin dashboard operational metrics; and hardened CMS asset uploads.
 */

import { getServiceRoleClient } from '@/lib/supabase-admin';
import {
  BlogPostDTO,
  CreateBlogPostRequest,
  UpdateBlogPostRequest,
  EventDTO,
  CreateEventRequest,
  UpdateEventRequest,
  FaqDTO,
  CreateFaqRequest,
  UpdateFaqRequest,
  GalleryItemDTO,
  CreateGalleryItemRequest,
  AdminStatsDTO,
} from '@/types/contracts';

export class CmsError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: any;

  constructor(message: string, code: string, status: number, details?: any) {
    super(message);
    this.name = 'CmsError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

/**
 * Asserts that the given user ID has the canonical 'admin' role in public.profiles.
 */
export async function assertAdminRole(
  adminId: string,
  customClient?: any
): Promise<void> {
  if (!adminId) {
    throw new CmsError('Authentication required', 'UNAUTHENTICATED', 401);
  }

  const supabase = customClient || getServiceRoleClient();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', adminId)
    .maybeSingle();

  if (error || !profile) {
    throw new CmsError('User profile not found', 'PROFILE_NOT_FOUND', 403);
  }

  if (profile.role !== 'admin') {
    throw new CmsError('Admin role required', 'FORBIDDEN', 403);
  }
}

// -------------------------------------------------------------
// Blogs & Categories
// -------------------------------------------------------------

export async function getPublicBlogs(
  customClient?: any
): Promise<BlogPostDTO[]> {
  const supabase = customClient || getServiceRoleClient();

  const { data, error } = await supabase
    .from('blogs')
    .select('id, title, slug, content, image_url, author_id, category_id, status, created_at, blog_categories(id, name, slug)')
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  if (error) {
    throw new CmsError(`Failed to fetch blogs: ${error.message}`, 'FETCH_FAILED', 500);
  }

  return (data || []).map((b: any) => ({
    id: b.id,
    title: b.title,
    slug: b.slug,
    content: b.content,
    imageUrl: b.image_url,
    authorId: b.author_id,
    categoryId: b.category_id,
    status: b.status,
    createdAt: b.created_at,
    category: b.blog_categories ? {
      id: b.blog_categories.id,
      name: b.blog_categories.name,
      slug: b.blog_categories.slug,
    } : null,
  }));
}

export async function getPublicBlogBySlug(
  slug: string,
  customClient?: any
): Promise<BlogPostDTO | null> {
  const supabase = customClient || getServiceRoleClient();

  const { data, error } = await supabase
    .from('blogs')
    .select('id, title, slug, content, image_url, author_id, category_id, status, created_at, blog_categories(id, name, slug)')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (error) {
    throw new CmsError(`Failed to fetch blog: ${error.message}`, 'FETCH_FAILED', 500);
  }

  if (!data) return null;

  return {
    id: data.id,
    title: data.title,
    slug: data.slug,
    content: data.content,
    imageUrl: data.image_url,
    authorId: data.author_id,
    categoryId: data.category_id,
    status: data.status,
    createdAt: data.created_at,
    category: data.blog_categories ? {
      id: data.blog_categories.id,
      name: data.blog_categories.name,
      slug: data.blog_categories.slug,
    } : null,
  };
}

export async function getAdminBlogs(
  adminId: string,
  status?: 'draft' | 'published' | 'all',
  customClient?: any
): Promise<BlogPostDTO[]> {
  await assertAdminRole(adminId, customClient);
  const supabase = customClient || getServiceRoleClient();

  let query = supabase
    .from('blogs')
    .select('id, title, slug, content, image_url, author_id, category_id, status, created_at, blog_categories(id, name, slug)')
    .order('created_at', { ascending: false });

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) {
    throw new CmsError(`Failed to fetch blogs: ${error.message}`, 'FETCH_FAILED', 500);
  }

  return (data || []).map((b: any) => ({
    id: b.id,
    title: b.title,
    slug: b.slug,
    content: b.content,
    imageUrl: b.image_url,
    authorId: b.author_id,
    categoryId: b.category_id,
    status: b.status,
    createdAt: b.created_at,
    category: b.blog_categories ? {
      id: b.blog_categories.id,
      name: b.blog_categories.name,
      slug: b.blog_categories.slug,
    } : null,
  }));
}

export async function createBlog(
  adminId: string,
  input: CreateBlogPostRequest,
  customClient?: any
): Promise<BlogPostDTO> {
  await assertAdminRole(adminId, customClient);
  const supabase = customClient || getServiceRoleClient();

  if (!input.title || input.title.trim().length < 3) {
    throw new CmsError('Title must be at least 3 characters', 'VALIDATION_FAILED', 400);
  }
  if (!input.content || input.content.trim().length < 10) {
    throw new CmsError('Content must be at least 10 characters', 'VALIDATION_FAILED', 400);
  }

  const slug = (input.slug || input.title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

  const payload = {
    title: input.title.trim(),
    slug,
    content: input.content.trim(),
    image_url: input.imageUrl || null,
    category_id: input.categoryId || null,
    author_id: adminId,
    status: input.status || 'published',
  };

  const { data, error } = await supabase
    .from('blogs')
    .insert(payload)
    .select('*, blog_categories(id, name, slug)')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new CmsError('A blog with this slug already exists', 'CONFLICT', 409);
    }
    throw new CmsError(`Failed to create blog: ${error.message}`, 'CREATE_FAILED', 500);
  }

  return {
    id: data.id,
    title: data.title,
    slug: data.slug,
    content: data.content,
    imageUrl: data.image_url,
    authorId: data.author_id,
    categoryId: data.category_id,
    status: data.status,
    createdAt: data.created_at,
    category: data.blog_categories ? {
      id: data.blog_categories.id,
      name: data.blog_categories.name,
      slug: data.blog_categories.slug,
    } : null,
  };
}

export async function updateBlog(
  adminId: string,
  id: string,
  input: UpdateBlogPostRequest,
  customClient?: any
): Promise<BlogPostDTO> {
  await assertAdminRole(adminId, customClient);
  const supabase = customClient || getServiceRoleClient();

  const updates: any = {};
  if (input.title !== undefined) {
    if (input.title.trim().length < 3) {
      throw new CmsError('Title must be at least 3 characters', 'VALIDATION_FAILED', 400);
    }
    updates.title = input.title.trim();
  }
  if (input.slug !== undefined) {
    updates.slug = input.slug.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }
  if (input.content !== undefined) {
    if (input.content.trim().length < 10) {
      throw new CmsError('Content must be at least 10 characters', 'VALIDATION_FAILED', 400);
    }
    updates.content = input.content.trim();
  }
  if (input.imageUrl !== undefined) updates.image_url = input.imageUrl;
  if (input.categoryId !== undefined) updates.category_id = input.categoryId;
  if (input.status !== undefined) updates.status = input.status;

  const { data, error } = await supabase
    .from('blogs')
    .update(updates)
    .eq('id', id)
    .select('*, blog_categories(id, name, slug)')
    .single();

  if (error) {
    throw new CmsError(`Failed to update blog: ${error.message}`, 'UPDATE_FAILED', 500);
  }

  return {
    id: data.id,
    title: data.title,
    slug: data.slug,
    content: data.content,
    imageUrl: data.image_url,
    authorId: data.author_id,
    categoryId: data.category_id,
    status: data.status,
    createdAt: data.created_at,
    category: data.blog_categories ? {
      id: data.blog_categories.id,
      name: data.blog_categories.name,
      slug: data.blog_categories.slug,
    } : null,
  };
}

export async function deleteBlog(
  adminId: string,
  id: string,
  customClient?: any
): Promise<void> {
  await assertAdminRole(adminId, customClient);
  const supabase = customClient || getServiceRoleClient();

  const { error } = await supabase.from('blogs').delete().eq('id', id);
  if (error) {
    throw new CmsError(`Failed to delete blog: ${error.message}`, 'DELETE_FAILED', 500);
  }
}

// -------------------------------------------------------------
// Events
// -------------------------------------------------------------

export async function getEvents(customClient?: any): Promise<EventDTO[]> {
  const supabase = customClient || getServiceRoleClient();

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('date', { ascending: true });

  if (error) {
    throw new CmsError(`Failed to fetch events: ${error.message}`, 'FETCH_FAILED', 500);
  }

  return (data || []).map((e: any) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    date: e.date,
    location: e.location,
    imageUrl: e.image_url,
    createdAt: e.created_at,
  }));
}

export async function createEvent(
  adminId: string,
  input: CreateEventRequest,
  customClient?: any
): Promise<EventDTO> {
  await assertAdminRole(adminId, customClient);
  const supabase = customClient || getServiceRoleClient();

  if (!input.title || input.title.trim().length < 3) {
    throw new CmsError('Title must be at least 3 characters', 'VALIDATION_FAILED', 400);
  }
  if (!input.description || input.description.trim().length < 10) {
    throw new CmsError('Description must be at least 10 characters', 'VALIDATION_FAILED', 400);
  }
  if (!input.location || input.location.trim().length < 3) {
    throw new CmsError('Location must be at least 3 characters', 'VALIDATION_FAILED', 400);
  }
  if (!input.date) {
    throw new CmsError('Event date is required', 'VALIDATION_FAILED', 400);
  }

  const payload = {
    title: input.title.trim(),
    description: input.description.trim(),
    location: input.location.trim(),
    date: new Date(input.date).toISOString(),
    image_url: input.imageUrl || null,
  };

  const { data, error } = await supabase
    .from('events')
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new CmsError(`Failed to create event: ${error.message}`, 'CREATE_FAILED', 500);
  }

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    date: data.date,
    location: data.location,
    imageUrl: data.image_url,
    createdAt: data.created_at,
  };
}

export async function updateEvent(
  adminId: string,
  id: string,
  input: UpdateEventRequest,
  customClient?: any
): Promise<EventDTO> {
  await assertAdminRole(adminId, customClient);
  const supabase = customClient || getServiceRoleClient();

  const updates: any = {};
  if (input.title !== undefined) updates.title = input.title.trim();
  if (input.description !== undefined) updates.description = input.description.trim();
  if (input.location !== undefined) updates.location = input.location.trim();
  if (input.date !== undefined) updates.date = new Date(input.date).toISOString();
  if (input.imageUrl !== undefined) updates.image_url = input.imageUrl;

  const { data, error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new CmsError(`Failed to update event: ${error.message}`, 'UPDATE_FAILED', 500);
  }

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    date: data.date,
    location: data.location,
    imageUrl: data.image_url,
    createdAt: data.created_at,
  };
}

export async function deleteEvent(
  adminId: string,
  id: string,
  customClient?: any
): Promise<void> {
  await assertAdminRole(adminId, customClient);
  const supabase = customClient || getServiceRoleClient();

  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) {
    throw new CmsError(`Failed to delete event: ${error.message}`, 'DELETE_FAILED', 500);
  }
}

// -------------------------------------------------------------
// FAQs
// -------------------------------------------------------------

export async function getFaqs(
  category?: string,
  customClient?: any
): Promise<FaqDTO[]> {
  const supabase = customClient || getServiceRoleClient();

  let query = supabase
    .from('faqs')
    .select('*')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;
  if (error) {
    throw new CmsError(`Failed to fetch FAQs: ${error.message}`, 'FETCH_FAILED', 500);
  }

  return (data || []).map((f: any) => ({
    id: f.id,
    question: f.question,
    answer: f.answer,
    category: f.category,
    displayOrder: f.display_order ?? 0,
    createdAt: f.created_at,
  }));
}

export async function createFaq(
  adminId: string,
  input: CreateFaqRequest,
  customClient?: any
): Promise<FaqDTO> {
  await assertAdminRole(adminId, customClient);
  const supabase = customClient || getServiceRoleClient();

  if (!input.question || input.question.trim().length < 5) {
    throw new CmsError('Question must be at least 5 characters', 'VALIDATION_FAILED', 400);
  }
  if (!input.answer || input.answer.trim().length < 5) {
    throw new CmsError('Answer must be at least 5 characters', 'VALIDATION_FAILED', 400);
  }

  const payload = {
    question: input.question.trim(),
    answer: input.answer.trim(),
    category: input.category || 'General',
    display_order: input.displayOrder || 0,
  };

  const { data, error } = await supabase
    .from('faqs')
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new CmsError(`Failed to create FAQ: ${error.message}`, 'CREATE_FAILED', 500);
  }

  return {
    id: data.id,
    question: data.question,
    answer: data.answer,
    category: data.category,
    displayOrder: data.display_order ?? 0,
    createdAt: data.created_at,
  };
}

export async function updateFaq(
  adminId: string,
  id: string,
  input: UpdateFaqRequest,
  customClient?: any
): Promise<FaqDTO> {
  await assertAdminRole(adminId, customClient);
  const supabase = customClient || getServiceRoleClient();

  const updates: any = {};
  if (input.question !== undefined) updates.question = input.question.trim();
  if (input.answer !== undefined) updates.answer = input.answer.trim();
  if (input.category !== undefined) updates.category = input.category;
  if (input.displayOrder !== undefined) updates.display_order = input.displayOrder;

  const { data, error } = await supabase
    .from('faqs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new CmsError(`Failed to update FAQ: ${error.message}`, 'UPDATE_FAILED', 500);
  }

  return {
    id: data.id,
    question: data.question,
    answer: data.answer,
    category: data.category,
    displayOrder: data.display_order ?? 0,
    createdAt: data.created_at,
  };
}

export async function deleteFaq(
  adminId: string,
  id: string,
  customClient?: any
): Promise<void> {
  await assertAdminRole(adminId, customClient);
  const supabase = customClient || getServiceRoleClient();

  const { error } = await supabase.from('faqs').delete().eq('id', id);
  if (error) {
    throw new CmsError(`Failed to delete FAQ: ${error.message}`, 'DELETE_FAILED', 500);
  }
}

// -------------------------------------------------------------
// Gallery
// -------------------------------------------------------------

export async function getGallery(customClient?: any): Promise<GalleryItemDTO[]> {
  const supabase = customClient || getServiceRoleClient();

  const { data, error } = await supabase
    .from('gallery')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new CmsError(`Failed to fetch gallery items: ${error.message}`, 'FETCH_FAILED', 500);
  }

  return (data || []).map((g: any) => ({
    id: g.id,
    title: g.title,
    imageUrl: g.image_url,
    createdAt: g.created_at,
  }));
}

export async function addGalleryItem(
  adminId: string,
  input: CreateGalleryItemRequest,
  customClient?: any
): Promise<GalleryItemDTO> {
  await assertAdminRole(adminId, customClient);
  const supabase = customClient || getServiceRoleClient();

  if (!input.title || input.title.trim().length < 2) {
    throw new CmsError('Title must be at least 2 characters', 'VALIDATION_FAILED', 400);
  }
  if (!input.imageUrl || input.imageUrl.trim().length < 5) {
    throw new CmsError('Image URL is required', 'VALIDATION_FAILED', 400);
  }

  const payload = {
    title: input.title.trim(),
    image_url: input.imageUrl.trim(),
  };

  const { data, error } = await supabase
    .from('gallery')
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new CmsError(`Failed to add gallery item: ${error.message}`, 'CREATE_FAILED', 500);
  }

  return {
    id: data.id,
    title: data.title,
    imageUrl: data.image_url,
    createdAt: data.created_at,
  };
}

export async function deleteGalleryItem(
  adminId: string,
  id: string,
  customClient?: any
): Promise<void> {
  await assertAdminRole(adminId, customClient);
  const supabase = customClient || getServiceRoleClient();

  const { error } = await supabase.from('gallery').delete().eq('id', id);
  if (error) {
    throw new CmsError(`Failed to delete gallery item: ${error.message}`, 'DELETE_FAILED', 500);
  }
}

// -------------------------------------------------------------
// Real Admin Dashboard Metrics
// -------------------------------------------------------------

export async function getAdminStats(
  adminId: string,
  customClient?: any
): Promise<AdminStatsDTO> {
  await assertAdminRole(adminId, customClient);
  const supabase = customClient || getServiceRoleClient();

  const [
    usersRes,
    donorsRes,
    requestersRes,
    volunteersRes,
    activeListingsRes,
    completedDelivRes,
    pendingDelivRes,
    unreadMsgRes,
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'donor'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'requester'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'volunteer'),
    supabase.from('food_listings').select('*', { count: 'exact', head: true }).in('status', ['published', 'claimed', 'in_delivery']),
    supabase.from('deliveries').select('*', { count: 'exact', head: true }).eq('status', 'receipt_confirmed'),
    supabase.from('deliveries').select('*', { count: 'exact', head: true }).in('status', ['awaiting_volunteer', 'assigned', 'at_pickup', 'qc_passed', 'collected', 'en_route_dropoff', 'handed_over']),
    supabase.from('contact_messages').select('*', { count: 'exact', head: true }).eq('status', 'unread'),
  ]);

  return {
    totalUsers: usersRes.count || 0,
    totalDonors: donorsRes.count || 0,
    totalRequesters: requestersRes.count || 0,
    totalVolunteers: volunteersRes.count || 0,
    activeListings: activeListingsRes.count || 0,
    completedDeliveries: completedDelivRes.count || 0,
    pendingDeliveries: pendingDelivRes.count || 0,
    unreadMessages: unMsgCountSafe(unreadMsgRes),
  };
}

function unMsgCountSafe(res: any): number {
  if (res && typeof res.count === 'number') return res.count;
  return 0;
}

// -------------------------------------------------------------
// Hardened CMS Upload Handler
// -------------------------------------------------------------

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function uploadCmsAsset(
  adminId: string,
  file: {
    buffer: Buffer;
    fileName: string;
    mimeType: string;
    size: number;
  },
  folder: string = 'general',
  customClient?: any
): Promise<{ url: string; path: string }> {
  await assertAdminRole(adminId, customClient);
  const supabase = customClient || getServiceRoleClient();

  if (!file || !file.buffer) {
    throw new CmsError('No file provided for upload', 'INVALID_FILE', 400);
  }

  if (!ALLOWED_MIME_TYPES.has(file.mimeType.toLowerCase())) {
    throw new CmsError(
      `Unsupported file type: ${file.mimeType}. Allowed types: image/jpeg, image/png, image/webp`,
      'INVALID_FILE_TYPE',
      400
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new CmsError(
      `File size (${(file.size / 1024 / 1024).toFixed(2)} MB) exceeds 5 MB limit`,
      'FILE_TOO_LARGE',
      400
    );
  }

  // Sanitize filename & extension
  const cleanExt = file.mimeType.split('/')[1]?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const cleanFolder = folder.toLowerCase().replace(/[^a-z0-9-_]/g, '') || 'general';
  const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${cleanExt}`;
  const storagePath = `${cleanFolder}/${uniqueName}`;

  const { error: uploadError } = await supabase.storage
    .from('cms-assets')
    .upload(storagePath, file.buffer, {
      contentType: file.mimeType,
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    throw new CmsError(
      `Failed to upload asset to storage: ${uploadError.message}`,
      'UPLOAD_FAILED',
      500
    );
  }

  const { data: publicUrlData } = supabase.storage
    .from('cms-assets')
    .getPublicUrl(storagePath);

  return {
    url: publicUrlData.publicUrl,
    path: storagePath,
  };
}
