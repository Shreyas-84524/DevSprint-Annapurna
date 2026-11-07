/**
 * Server-only Notifications DAL
 *
 * Implements user-scoped in-app notifications, mark-as-read updates,
 * and idempotent workflow transition notification generation.
 */

import { getServiceRoleClient } from '@/lib/supabase-admin';
import {
  NotificationDTO,
  NotificationsResponseDTO,
  CreateNotificationInput,
  NotificationType,
} from '@/types/contracts';

export class NotificationError extends Error {
  public readonly code: string;
  public readonly status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'NotificationError';
    this.code = code;
    this.status = status;
  }
}

/**
 * Retrieves notifications for the authenticated user.
 * Users can only read their own notifications.
 */
export async function getUserNotifications(
  userId: string,
  options?: { limit?: number; unreadOnly?: boolean },
  customClient?: any
): Promise<NotificationsResponseDTO> {
  const supabase = customClient || getServiceRoleClient();
  const limit = Math.min(Math.max(options?.limit || 20, 1), 100);

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (options?.unreadOnly) {
    query = query.eq('read', false);
  }

  const { data, error } = await query;

  if (error) {
    throw new NotificationError(
      `Failed to load notifications: ${error.message}`,
      'NOTIFICATION_FETCH_FAILED',
      500
    );
  }

  // Get total unread count
  const { count: unreadCount, error: countError } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (countError) {
    throw new NotificationError(
      `Failed to count unread notifications: ${countError.message}`,
      'NOTIFICATION_COUNT_FAILED',
      500
    );
  }

  const notifications: NotificationDTO[] = (data || []).map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    title: row.title,
    message: row.message,
    type: (row.type as NotificationType) || 'info',
    link: row.link,
    read: row.read,
    metadata: row.metadata,
    createdAt: row.created_at,
    readAt: row.read_at,
  }));

  return {
    notifications,
    unreadCount: unreadCount || 0,
  };
}

/**
 * Marks a single notification as read.
 * Enforces ownership: users can only mark their own notifications as read.
 */
export async function markNotificationRead(
  userId: string,
  notificationId: string,
  customClient?: any
): Promise<NotificationDTO> {
  const supabase = customClient || getServiceRoleClient();

  // First verify existence and ownership
  const { data: existing, error: findError } = await supabase
    .from('notifications')
    .select('*')
    .eq('id', notificationId)
    .maybeSingle();

  if (findError) {
    throw new NotificationError(
      `Failed to lookup notification: ${findError.message}`,
      'NOTIFICATION_LOOKUP_FAILED',
      500
    );
  }

  if (!existing) {
    throw new NotificationError(
      'Notification not found',
      'NOTIFICATION_NOT_FOUND',
      404
    );
  }

  if (existing.user_id !== userId) {
    throw new NotificationError(
      'Cannot mark another user notification as read',
      'NOTIFICATION_FORBIDDEN',
      403
    );
  }

  if (existing.read) {
    return {
      id: existing.id,
      userId: existing.user_id,
      title: existing.title,
      message: existing.message,
      type: (existing.type as NotificationType) || 'info',
      link: existing.link,
      read: true,
      metadata: existing.metadata,
      createdAt: existing.created_at,
      readAt: existing.read_at,
    };
  }

  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from('notifications')
    .update({
      read: true,
      read_at: now,
    })
    .eq('id', notificationId)
    .eq('user_id', userId)
    .select()
    .single();

  if (updateError) {
    throw new NotificationError(
      `Failed to mark notification as read: ${updateError.message}`,
      'NOTIFICATION_UPDATE_FAILED',
      500
    );
  }

  return {
    id: updated.id,
    userId: updated.user_id,
    title: updated.title,
    message: updated.message,
    type: (updated.type as NotificationType) || 'info',
    link: updated.link,
    read: updated.read,
    metadata: updated.metadata,
    createdAt: updated.created_at,
    readAt: updated.read_at,
  };
}

/**
 * Creates an in-app notification for a user.
 * Supports idempotency: if an idempotency_key is provided and already exists,
 * it safely returns the existing notification without duplicating.
 */
export async function createWorkflowNotification(
  input: CreateNotificationInput,
  customClient?: any
): Promise<NotificationDTO> {
  const supabase = customClient || getServiceRoleClient();

  if (!input.userId) {
    throw new NotificationError('userId is required', 'INVALID_NOTIFICATION_INPUT', 400);
  }
  if (!input.title || input.title.trim().length === 0) {
    throw new NotificationError('title is required', 'INVALID_NOTIFICATION_INPUT', 400);
  }
  if (!input.message || input.message.trim().length === 0) {
    throw new NotificationError('message is required', 'INVALID_NOTIFICATION_INPUT', 400);
  }

  // Idempotency check: if key already exists, return existing row
  if (input.idempotencyKey) {
    const { data: existing } = await supabase
      .from('notifications')
      .select('*')
      .eq('idempotency_key', input.idempotencyKey)
      .maybeSingle();

    if (existing) {
      return {
        id: existing.id,
        userId: existing.user_id,
        title: existing.title,
        message: existing.message,
        type: (existing.type as NotificationType) || 'info',
        link: existing.link,
        read: existing.read,
        metadata: existing.metadata,
        createdAt: existing.created_at,
        readAt: existing.read_at,
      };
    }
  }

  const payload = {
    user_id: input.userId,
    title: input.title.trim(),
    message: input.message.trim(),
    type: input.type || 'info',
    link: input.link || null,
    idempotency_key: input.idempotencyKey || null,
    metadata: input.metadata || {},
    read: false,
  };

  const { data: created, error } = await supabase
    .from('notifications')
    .insert(payload)
    .select()
    .single();

  if (error) {
    // If unique constraint violation on idempotency_key due to concurrent insert, fetch existing
    if (error.code === '23505' && input.idempotencyKey) {
      const { data: existing } = await supabase
        .from('notifications')
        .select('*')
        .eq('idempotency_key', input.idempotencyKey)
        .maybeSingle();

      if (existing) {
        return {
          id: existing.id,
          userId: existing.user_id,
          title: existing.title,
          message: existing.message,
          type: (existing.type as NotificationType) || 'info',
          link: existing.link,
          read: existing.read,
          metadata: existing.metadata,
          createdAt: existing.created_at,
          readAt: existing.read_at,
        };
      }
    }

    throw new NotificationError(
      `Failed to create notification: ${error.message}`,
      'NOTIFICATION_CREATION_FAILED',
      500
    );
  }

  return {
    id: created.id,
    userId: created.user_id,
    title: created.title,
    message: created.message,
    type: (created.type as NotificationType) || 'info',
    link: created.link,
    read: created.read,
    metadata: created.metadata,
    createdAt: created.created_at,
    readAt: created.read_at,
  };
}
