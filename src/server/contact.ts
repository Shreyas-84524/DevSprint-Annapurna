/**
 * Server-only Contact Messages DAL
 *
 * Implements validated contact submission with strict length limits,
 * normalized fields, in-memory sliding-window rate limiting,
 * and authenticated admin-only message retrieval.
 */

import { getServiceRoleClient } from '@/lib/supabase-admin';
import { ContactSubmissionRequest, ContactMessageDTO } from '@/types/contracts';
import { createHash } from 'node:crypto';

export class ContactError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: any;

  constructor(message: string, code: string, status: number, details?: any) {
    if (status >= 500) console.error(`[CONTACT ${code}]`, message);
    super(status >= 500 ? 'The contact request could not be completed.' : message);
    this.name = 'ContactError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

// In-memory rate limiting tracker (per IP or email)
interface RateLimitEntry {
  timestamps: number[];
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_SUBMISSIONS_PER_HOUR = 5;

/**
 * Resets rate limit map for testing purposes.
 */
export function _resetContactRateLimits(): void {
  rateLimitMap.clear();
}

/**
 * Checks and records rate limit for a given key (IP or normalized email).
 */
function checkRateLimit(key: string): void {
  const now = Date.now();
  let entry = rateLimitMap.get(key);

  if (!entry) {
    entry = { timestamps: [] };
    rateLimitMap.set(key, entry);
  }

  // Filter out timestamps older than the window
  entry.timestamps = entry.timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);

  if (entry.timestamps.length >= MAX_SUBMISSIONS_PER_HOUR) {
    const oldest = entry.timestamps[0];
    const retryAfter = Math.ceil((oldest + RATE_LIMIT_WINDOW_MS - now) / 1000);
    throw new ContactError(
      `Rate limit exceeded. You can submit up to ${MAX_SUBMISSIONS_PER_HOUR} messages per hour.`,
      'RATE_LIMIT_EXCEEDED',
      429,
      { retryAfterSeconds: Math.max(retryAfter, 1) }
    );
  }

  entry.timestamps.push(now);
}

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Validates and normalizes contact submission input.
 */
function validateAndNormalizeContactInput(input: ContactSubmissionRequest): {
  name: string;
  email: string;
  phone?: string | null;
  message: string;
} {
  if (!input || typeof input !== 'object') {
    throw new ContactError('Invalid request payload', 'INVALID_PAYLOAD', 400);
  }

  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (name.length < 2 || name.length > 100) {
    throw new ContactError(
      'Name must be between 2 and 100 characters',
      'VALIDATION_FAILED',
      400,
      { field: 'name' }
    );
  }

  const rawEmail = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  if (rawEmail.length < 5 || rawEmail.length > 255 || !EMAIL_REGEX.test(rawEmail)) {
    throw new ContactError(
      'A valid email address is required (maximum 255 characters)',
      'VALIDATION_FAILED',
      400,
      { field: 'email' }
    );
  }

  let phone: string | null = null;
  if (input.phone && typeof input.phone === 'string') {
    phone = input.phone.trim();
    if (phone.length > 30) {
      throw new ContactError(
        'Phone number must be at most 30 characters',
        'VALIDATION_FAILED',
        400,
        { field: 'phone' }
      );
    }
  }

  const message = typeof input.message === 'string' ? input.message.trim() : '';
  if (message.length < 10 || message.length > 3000) {
    throw new ContactError(
      'Message must be between 10 and 3000 characters',
      'VALIDATION_FAILED',
      400,
      { field: 'message' }
    );
  }

  return { name, email: rawEmail, phone, message };
}

/**
 * Submits a contact inquiry via validated server endpoint.
 */
export async function submitContactMessage(
  input: ContactSubmissionRequest,
  clientIp?: string,
  customClient?: any
): Promise<ContactMessageDTO> {
  const supabase = customClient || getServiceRoleClient();

  const normalized = validateAndNormalizeContactInput(input);

  // Injected clients are used only by isolated unit tests. Production uses the
  // database RPC below so throttling survives stateless Vercel instances.
  if (customClient) {
    const testRateLimitKey = clientIp ? `ip:${clientIp}` : `email:${normalized.email}`;
    checkRateLimit(testRateLimitKey);

    const { data, error } = await supabase
      .from('contact_messages')
      .insert({
        name: normalized.name,
        email: normalized.email,
        phone: normalized.phone,
        message: normalized.message,
        status: 'unread',
      })
      .select()
      .single();

    if (error) {
      throw new ContactError('Failed to submit contact message', 'CONTACT_SUBMISSION_FAILED', 500);
    }

    return {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      message: data.message,
      status: data.status,
      createdAt: data.created_at,
    };
  }

  const rateLimitIdentity = clientIp
    ? `ip:${clientIp}`
    : `email:${normalized.email}`;
  const rateLimitKey = createHash('sha256').update(rateLimitIdentity).digest('hex');

  const { data, error } = await supabase
    .rpc('submit_contact_message', {
      p_name: normalized.name,
      p_email: normalized.email,
      p_phone: normalized.phone,
      p_message: normalized.message,
      p_rate_key: rateLimitKey,
    });

  if (error) {
    if (error.message?.includes('CONTACT_RATE_LIMITED')) {
      throw new ContactError(
        `Rate limit exceeded. You can submit up to ${MAX_SUBMISSIONS_PER_HOUR} messages per hour.`,
        'RATE_LIMIT_EXCEEDED',
        429,
        { retryAfterSeconds: 3600 }
      );
    }
    throw new ContactError(
      'Failed to submit contact message',
      'CONTACT_SUBMISSION_FAILED',
      500
    );
  }

  const result = Array.isArray(data) ? data[0] : data;
  if (!result?.id || !result?.created_at) {
    throw new ContactError('Failed to submit contact message', 'CONTACT_SUBMISSION_FAILED', 500);
  }

  return {
    id: result.id,
    name: normalized.name,
    email: normalized.email,
    phone: normalized.phone,
    message: normalized.message,
    status: 'unread',
    createdAt: result.created_at,
  };
}

/**
 * Retrieves all contact messages for administrative review.
 * Strictly restricted to admin profile role.
 */
export async function getContactMessages(
  adminId: string,
  customClient?: any
): Promise<ContactMessageDTO[]> {
  const supabase = customClient || getServiceRoleClient();

  // Verify admin authorization close to the data source
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', adminId)
    .maybeSingle();

  if (!profile || profile.role !== 'admin') {
    throw new ContactError(
      'Unauthorized: Admin role required to view contact messages',
      'FORBIDDEN',
      403
    );
  }

  const { data, error } = await supabase
    .from('contact_messages')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new ContactError(
      `Failed to load contact messages: ${error.message}`,
      'FETCH_FAILED',
      500
    );
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
  }));
}

/**
 * Deletes a contact message by ID.
 * Strictly restricted to admin profile role.
 */
export async function deleteContactMessage(
  adminId: string,
  messageId: string,
  customClient?: any
): Promise<void> {
  const supabase = customClient || getServiceRoleClient();

  // Verify admin authorization
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', adminId)
    .maybeSingle();

  if (!profile || profile.role !== 'admin') {
    throw new ContactError(
      'Unauthorized: Admin role required to delete contact messages',
      'FORBIDDEN',
      403
    );
  }

  const { error } = await supabase
    .from('contact_messages')
    .delete()
    .eq('id', messageId);

  if (error) {
    throw new ContactError(
      `Failed to delete contact message: ${error.message}`,
      'DELETE_FAILED',
      500
    );
  }
}
