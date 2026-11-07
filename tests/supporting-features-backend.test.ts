import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  getUserNotifications,
  markNotificationRead,
  createWorkflowNotification,
  NotificationError,
} from '../src/server/notifications';

import {
  submitContactMessage,
  getContactMessages,
  _resetContactRateLimits,
  ContactError,
} from '../src/server/contact';

import {
  getPublicBlogs,
  getPublicBlogBySlug,
  getAdminBlogs,
  createBlog,
  updateBlog,
  deleteBlog,
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  getFaqs,
  createFaq,
  deleteFaq,
  getGallery,
  addGalleryItem,
  deleteGalleryItem,
  getAdminStats,
  uploadCmsAsset,
  CmsError,
} from '../src/server/cms';

import { GET as getNotificationsHandler } from '../src/app/api/notifications/route';
import { POST as markNotificationReadHandler } from '../src/app/api/notifications/[id]/read/route';
import { POST as submitContactHandler, GET as getContactPublicHandler } from '../src/app/api/contact/route';
import { GET as getAdminStatsHandler } from '../src/app/api/admin/stats/route';
import { POST as createCmsBlogHandler } from '../src/app/api/cms/blogs/route';
import { AuthenticatedUser } from '../src/server/auth';

/**
 * In-memory mock database client implementing Supabase query builder semantics
 * for supporting features tests.
 */
class MockSupportingDB {
  public profiles = new Map<string, any>();
  public notifications = new Map<string, any>();
  public contactMessages = new Map<string, any>();
  public blogs = new Map<string, any>();
  public blogCategories = new Map<string, any>();
  public events = new Map<string, any>();
  public faqs = new Map<string, any>();
  public gallery = new Map<string, any>();
  public foodListings = new Map<string, any>();
  public deliveries = new Map<string, any>();
  public storageBuckets = new Map<string, any>();
  public storageObjects = new Map<string, any>();

  constructor() {
    this.seed();
  }

  public seed() {
    // Admin user
    this.profiles.set('admin-001', {
      id: 'admin-001',
      role: 'admin',
      display_name: 'System Admin',
      is_verified: true,
      phone: '+919999999999',
    });

    // Regular users
    this.profiles.set('donor-001', {
      id: 'donor-001',
      role: 'donor',
      display_name: 'Generous Donor',
      is_verified: true,
      phone: '+919876543210',
    });

    this.profiles.set('requester-001', {
      id: 'requester-001',
      role: 'requester',
      display_name: 'Recipient Shelter',
      is_verified: true,
      phone: '+919876543211',
    });

    this.profiles.set('volunteer-001', {
      id: 'volunteer-001',
      role: 'volunteer',
      display_name: 'Active Volunteer',
      is_verified: true,
      phone: '+919876543212',
    });

    // Seed blog category
    this.blogCategories.set('cat-001', {
      id: 'cat-001',
      name: 'Community Impact',
      slug: 'community-impact',
    });

    // Seed blogs (1 published, 1 draft)
    this.blogs.set('blog-pub-1', {
      id: 'blog-pub-1',
      title: 'Zero Waste in Mumbai',
      slug: 'zero-waste-in-mumbai',
      content: 'Detailed article on surplus food rescue operations in Mumbai.',
      image_url: 'https://images.unsplash.com/photo-1593113598332-cd288d649433',
      author_id: 'admin-001',
      category_id: 'cat-001',
      status: 'published',
      created_at: new Date(Date.now() - 86400000).toISOString(),
    });

    this.blogs.set('blog-draft-1', {
      id: 'blog-draft-1',
      title: 'Upcoming Expansion Plans',
      slug: 'upcoming-expansion-plans',
      content: 'Draft internal roadmap for platform logistics expansion.',
      image_url: null,
      author_id: 'admin-001',
      category_id: 'cat-001',
      status: 'draft',
      created_at: new Date().toISOString(),
    });

    // Seed events
    this.events.set('event-001', {
      id: 'event-001',
      title: 'Bandra Food Drive',
      description: 'Community surplus distribution drive at Bandra Station.',
      date: new Date(Date.now() + 7 * 86400000).toISOString(),
      location: 'Bandra West, Mumbai',
      image_url: 'https://images.unsplash.com/photo-1542838132-92c53300491e',
      is_published: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Seed FAQs
    this.faqs.set('faq-001', {
      id: 'faq-001',
      question: 'How do I donate surplus food?',
      answer: 'Register as a donor, complete phone verification, and list your edible surplus with pickup timing.',
      category: 'Donation',
      display_order: 1,
      is_published: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Seed Gallery
    this.gallery.set('gal-001', {
      id: 'gal-001',
      title: 'Distribution at Slum Community',
      image_url: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c',
      is_published: true,
      created_at: new Date().toISOString(),
    });

    // Seed food listings & deliveries for stats
    this.foodListings.set('listing-001', {
      id: 'listing-001',
      donor_id: 'donor-001',
      title: 'Fresh Bread',
      status: 'published',
    });

    this.deliveries.set('deliv-001', {
      id: 'deliv-001',
      status: 'receipt_confirmed',
    });
    this.deliveries.set('deliv-002', {
      id: 'deliv-002',
      status: 'assigned',
    });

    // Seed notifications
    this.notifications.set('notif-001', {
      id: 'notif-001',
      user_id: 'donor-001',
      title: 'Welcome Donor',
      message: 'Thank you for signing up as a food donor.',
      type: 'info',
      link: '/dashboard/donor',
      read: false,
      idempotency_key: 'notif-welcome-donor-001',
      metadata: {},
      created_at: new Date().toISOString(),
      read_at: null,
    });

    this.notifications.set('notif-002', {
      id: 'notif-002',
      user_id: 'requester-001',
      title: 'Welcome Requester',
      message: 'You can now claim nearby food donations.',
      type: 'info',
      link: '/dashboard/beneficiary',
      read: false,
      idempotency_key: 'notif-welcome-requester-001',
      metadata: {},
      created_at: new Date().toISOString(),
      read_at: null,
    });

    // Storage bucket
    this.storageBuckets.set('cms-assets', {
      id: 'cms-assets',
      public: true,
    });
  }

  public storage = {
    from: (bucketId: string) => ({
      upload: async (path: string, buffer: Buffer, options?: any) => {
        this.storageObjects.set(`${bucketId}/${path}`, {
          bucketId,
          path,
          buffer,
          options,
          createdAt: new Date().toISOString(),
        });
        return { data: { path }, error: null };
      },
      getPublicUrl: (path: string) => ({
        data: {
          publicUrl: `https://example-supabase.co/storage/v1/object/public/${bucketId}/${path}`,
        },
      }),
    }),
  };

  public from = (tableName: string) => {
    let targetMap: Map<string, any>;

    switch (tableName) {
      case 'profiles': targetMap = this.profiles; break;
      case 'notifications': targetMap = this.notifications; break;
      case 'contact_messages': targetMap = this.contactMessages; break;
      case 'blogs': targetMap = this.blogs; break;
      case 'blog_categories': targetMap = this.blogCategories; break;
      case 'events': targetMap = this.events; break;
      case 'faqs': targetMap = this.faqs; break;
      case 'gallery': targetMap = this.gallery; break;
      case 'food_listings': targetMap = this.foodListings; break;
      case 'deliveries': targetMap = this.deliveries; break;
      default:
        targetMap = new Map();
    }

    return {
      select: (_columns = '*', options?: { count?: string; head?: boolean }) => {
        const filters: ((item: any) => boolean)[] = [];
        let limitVal: number | null = null;
        const isCountHead = options?.head === true;

        const queryObj: any = {
          eq: (column: string, value: any) => {
            filters.push((item: any) => item[column] === value);
            return queryObj;
          },
          in: (column: string, values: any[]) => {
            filters.push((item: any) => values.includes(item[column]));
            return queryObj;
          },
          order: (_column: string, _options?: { ascending?: boolean }) => {
            return queryObj;
          },
          limit: (n: number) => {
            limitVal = n;
            return queryObj;
          },
          maybeSingle: async () => {
            let items = Array.from(targetMap.values());
            for (const f of filters) items = items.filter(f);
            const first = items[0] || null;
            if (first && tableName === 'blogs') {
              return {
                data: {
                  ...first,
                  blog_categories: this.blogCategories.get(first.category_id) || null,
                },
                error: null,
              };
            }
            return { data: first, error: null };
          },
          single: async () => {
            let items = Array.from(targetMap.values());
            for (const f of filters) items = items.filter(f);
            if (!items[0]) return { data: null, error: { message: 'Row not found', code: 'P0002' } };
            const first = items[0];
            if (tableName === 'blogs') {
              return {
                data: {
                  ...first,
                  blog_categories: this.blogCategories.get(first.category_id) || null,
                },
                error: null,
              };
            }
            return { data: first, error: null };
          },
          then: (resolve: any, reject: any) => {
            let items = Array.from(targetMap.values());
            for (const f of filters) items = items.filter(f);
            const count = items.length;
            if (limitVal !== null) items = items.slice(0, limitVal);

            if (tableName === 'blogs') {
              items = items.map((b) => ({
                ...b,
                blog_categories: this.blogCategories.get(b.category_id) || null,
              }));
            }

            const res = isCountHead ? { count, data: null, error: null } : { data: items, count, error: null };
            return Promise.resolve(res).then(resolve, reject);
          },
        };

        return queryObj;
      },

      insert: (payload: any) => {
        const id = payload.id || `gen-${Math.random().toString(36).substring(2, 9)}`;
        const record = {
          ...payload,
          id,
          created_at: payload.created_at || new Date().toISOString(),
        };

        let insertError: any = null;

        // Unique check for idempotency_key in notifications
        if (tableName === 'notifications' && payload.idempotency_key) {
          for (const item of targetMap.values()) {
            if (item.idempotency_key === payload.idempotency_key) {
              insertError = { message: 'Duplicate key', code: '23505' };
              break;
            }
          }
        }

        // Unique check for slug in blogs
        if (tableName === 'blogs' && payload.slug) {
          for (const item of targetMap.values()) {
            if (item.slug === payload.slug && item.id !== id) {
              insertError = { message: 'Duplicate slug', code: '23505' };
              break;
            }
          }
        }

        if (!insertError) {
          targetMap.set(id, record);
        }

        const insertResult = {
          data: insertError ? null : record,
          error: insertError,
          select: () => ({
            single: async () => {
              if (insertError) return { data: null, error: insertError };
              const res = { ...record };
              if (tableName === 'blogs') {
                res.blog_categories = this.blogCategories.get(record.category_id) || null;
              }
              return { data: res, error: null };
            },
          }),
          then: (resolve: any) => {
            return resolve({ data: insertError ? null : [record], error: insertError });
          },
        };

        return insertResult;
      },

      update: (updates: any) => {
        const filters: ((item: any) => boolean)[] = [];

        const updateObj = {
          eq: (column: string, value: any) => {
            filters.push((item: any) => item[column] === value);
            return updateObj;
          },
          select: () => ({
            single: async () => {
              let items = Array.from(targetMap.values());
              for (const f of filters) items = items.filter(f);
              if (items.length === 0) {
                return { data: null, error: { message: 'Not found', code: 'P0002' } };
              }
              const updatedItem = { ...items[0], ...updates, updated_at: new Date().toISOString() };
              targetMap.set(updatedItem.id, updatedItem);
              const res = { ...updatedItem };
              if (tableName === 'blogs') {
                res.blog_categories = this.blogCategories.get(updatedItem.category_id) || null;
              }
              return { data: res, error: null };
            },
          }),
          then: (resolve: any) => {
            let items = Array.from(targetMap.values());
            for (const f of filters) items = items.filter(f);
            for (const it of items) {
              const updated = { ...it, ...updates, updated_at: new Date().toISOString() };
              targetMap.set(updated.id, updated);
            }
            return resolve({ data: items, error: null });
          },
        };

        return updateObj;
      },

      delete: () => {
        const filters: ((item: any) => boolean)[] = [];
        const delObj = {
          eq: (column: string, value: any) => {
            filters.push((item: any) => item[column] === value);
            return delObj;
          },
          then: (resolve: any) => {
            let items = Array.from(targetMap.values());
            for (const f of filters) items = items.filter(f);
            for (const it of items) targetMap.delete(it.id);
            return resolve({ data: null, error: null });
          },
        };
        return delObj;
      },
    };
  };
}

describe('Supporting Features & Release Hardening Backend Suite', () => {
  let db: MockSupportingDB;

  beforeEach(() => {
    db = new MockSupportingDB();
    _resetContactRateLimits();
  });

  // ============================================================
  // 1. CMS Public Reads & Draft Denials
  // ============================================================
  describe('1. CMS Public Reads and Draft Denial', () => {
    it('returns only published blogs to public callers', async () => {
      const blogs = await getPublicBlogs(db);
      assert.strictEqual(blogs.length, 1);
      assert.strictEqual(blogs[0].slug, 'zero-waste-in-mumbai');
      assert.strictEqual(blogs[0].status, 'published');
    });

    it('denies public resolution of draft blogs by slug', async () => {
      const draftBlog = await getPublicBlogBySlug('upcoming-expansion-plans', db);
      assert.strictEqual(draftBlog, null);
    });

    it('allows public resolution of published blog by slug', async () => {
      const pubBlog = await getPublicBlogBySlug('zero-waste-in-mumbai', db);
      assert.ok(pubBlog);
      assert.strictEqual(pubBlog?.title, 'Zero Waste in Mumbai');
      assert.strictEqual(pubBlog?.status, 'published');
    });

    it('returns public events list ordered by date', async () => {
      const events = await getEvents(db);
      assert.strictEqual(events.length, 1);
      assert.strictEqual(events[0].title, 'Bandra Food Drive');
      assert.ok(events[0].location);
    });

    it('returns public FAQs list with questions and answers', async () => {
      const faqs = await getFaqs(undefined, db);
      assert.strictEqual(faqs.length, 1);
      assert.strictEqual(faqs[0].question, 'How do I donate surplus food?');
    });

    it('returns public gallery photos', async () => {
      const gallery = await getGallery(db);
      assert.strictEqual(gallery.length, 1);
      assert.strictEqual(gallery[0].title, 'Distribution at Slum Community');
      assert.ok(gallery[0].imageUrl);
    });
  });

  // ============================================================
  // 2. CMS Mutation Authorization & Admin Privileges
  // ============================================================
  describe('2. CMS Mutation Authorization & Admin Privileges', () => {
    it('rejects blog creation from non-admin users (403 Forbidden)', async () => {
      await assert.rejects(
        () =>
          createBlog(
            'donor-001',
            { title: 'Donor Post', content: 'This should fail validation because donor is not admin.' },
            db
          ),
        (err: any) => err instanceof CmsError && err.status === 403
      );
    });

    it('allows blog creation from verified admin', async () => {
      const newBlog = await createBlog(
        'admin-001',
        {
          title: 'New Community Kitchen',
          content: 'Announcing our newest community kitchen partnership in Kurla.',
          categoryId: 'cat-001',
          status: 'published',
        },
        db
      );
      assert.ok(newBlog.id);
      assert.strictEqual(newBlog.title, 'New Community Kitchen');
      assert.strictEqual(newBlog.slug, 'new-community-kitchen');
    });

    it('allows admin to view drafts when requested', async () => {
      const adminBlogs = await getAdminBlogs('admin-001', 'all', db);
      assert.strictEqual(adminBlogs.length, 2);
    });

    it('rejects event creation from non-admin users', async () => {
      await assert.rejects(
        () =>
          createEvent(
            'volunteer-001',
            {
              title: 'Volunteer Meetup',
              description: 'Unauthorized event creation attempt.',
              date: new Date().toISOString(),
              location: 'Dadar',
            },
            db
          ),
        (err: any) => err instanceof CmsError && err.status === 403
      );
    });

    it('allows event creation, update, and deletion by admin', async () => {
      const created = await createEvent(
        'admin-001',
        {
          title: 'Dadar Community Kitchen',
          description: 'A gathering of community kitchens in Dadar central.',
          date: new Date().toISOString(),
          location: 'Dadar East, Mumbai',
        },
        db
      );
      assert.ok(created.id);

      const updated = await updateEvent(
        'admin-001',
        created.id,
        { title: 'Dadar Food Kitchen (Updated)' },
        db
      );
      assert.strictEqual(updated.title, 'Dadar Food Kitchen (Updated)');

      await deleteEvent('admin-001', created.id, db);
      const remaining = await getEvents(db);
      assert.ok(!remaining.some((e) => e.id === created.id));
    });

    it('rejects FAQ creation from non-admin users', async () => {
      await assert.rejects(
        () =>
          createFaq(
            'requester-001',
            { question: 'Invalid FAQ?', answer: 'Should fail immediately.' },
            db
          ),
        (err: any) => err instanceof CmsError && err.status === 403
      );
    });

    it('allows FAQ creation and deletion by admin', async () => {
      const created = await createFaq(
        'admin-001',
        {
          question: 'What is the maximum pickup window?',
          answer: 'All pickups must occur within 2 hours of claim.',
          category: 'Volunteer',
        },
        db
      );
      assert.ok(created.id);
      assert.strictEqual(created.category, 'Volunteer');

      await deleteFaq('admin-001', created.id, db);
    });

    it('allows gallery item creation and deletion by admin', async () => {
      const item = await addGalleryItem(
        'admin-001',
        {
          title: 'Food Inspection Check',
          imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e',
        },
        db
      );
      assert.ok(item.id);

      await deleteGalleryItem('admin-001', item.id, db);
    });
  });

  // ============================================================
  // 3. Contact Submissions & Rate Limiting
  // ============================================================
  describe('3. Contact Form Submission, Rate Limiting, and Privacy', () => {
    it('accepts valid contact submission and normalizes email', async () => {
      const msg = await submitContactMessage(
        {
          name: 'Priya Sharma',
          email: '  PRIYA@EXAMPLE.COM  ',
          message: 'Hello Annapurna team, I want to volunteer next weekend.',
        },
        '192.168.1.10',
        db
      );

      assert.ok(msg.id);
      assert.strictEqual(msg.name, 'Priya Sharma');
      assert.strictEqual(msg.email, 'priya@example.com');
      assert.strictEqual(msg.status, 'unread');
    });

    it('rejects oversized and invalid contact inputs', async () => {
      // Name too short
      await assert.rejects(
        () => submitContactMessage({ name: 'A', email: 'a@test.com', message: 'Valid message content' }, '1.1.1.1', db),
        (err: any) => err instanceof ContactError && err.status === 400
      );

      // Invalid email
      await assert.rejects(
        () => submitContactMessage({ name: 'Rahul', email: 'not-an-email', message: 'Valid message content' }, '1.1.1.1', db),
        (err: any) => err instanceof ContactError && err.status === 400
      );

      // Message too short (<10 chars)
      await assert.rejects(
        () => submitContactMessage({ name: 'Rahul', email: 'rahul@test.com', message: 'Short' }, '1.1.1.1', db),
        (err: any) => err instanceof ContactError && err.status === 400
      );

      // Message too long (>3000 chars)
      const longMessage = 'A'.repeat(3001);
      await assert.rejects(
        () => submitContactMessage({ name: 'Rahul', email: 'rahul@test.com', message: longMessage }, '1.1.1.1', db),
        (err: any) => err instanceof ContactError && err.status === 400
      );
    });

    it('enforces practical rate limiting (max 5 per hour per IP)', async () => {
      const ip = '10.0.0.42';

      for (let i = 0; i < 5; i++) {
        await submitContactMessage(
          {
            name: `User ${i}`,
            email: `user${i}@example.com`,
            message: `Legitimate test inquiry number ${i + 1}`,
          },
          ip,
          db
        );
      }

      // 6th attempt should be rejected with 429
      await assert.rejects(
        () =>
          submitContactMessage(
            {
              name: 'Spam Bot',
              email: 'spambot@example.com',
              message: 'This sixth submission must be throttled.',
            },
            ip,
            db
          ),
        (err: any) => err instanceof ContactError && err.status === 429 && err.code === 'RATE_LIMIT_EXCEEDED'
      );
    });

    it('ensures contact messages are never publicly listable', async () => {
      const res = await getContactPublicHandler();
      assert.strictEqual(res.status, 405);
    });

    it('restricts admin messages view to authenticated admin only', async () => {
      // Non-admin attempt
      await assert.rejects(
        () => getContactMessages('donor-001', db),
        (err: any) => err instanceof ContactError && err.status === 403
      );

      // Admin access succeeds
      const messages = await getContactMessages('admin-001', db);
      assert.ok(Array.isArray(messages));
    });
  });

  // ============================================================
  // 4. In-App Notifications & Retry Deduplication
  // ============================================================
  describe('4. In-App Notifications and User Isolation', () => {
    it('returns notifications strictly belonging to the caller', async () => {
      const donorRes = await getUserNotifications('donor-001', undefined, db);
      assert.strictEqual(donorRes.notifications.length, 1);
      assert.strictEqual(donorRes.notifications[0].title, 'Welcome Donor');
      assert.strictEqual(donorRes.unreadCount, 1);

      const reqRes = await getUserNotifications('requester-001', undefined, db);
      assert.strictEqual(reqRes.notifications.length, 1);
      assert.strictEqual(reqRes.notifications[0].title, 'Welcome Requester');
    });

    it('allows a user to mark their own notification as read', async () => {
      const updated = await markNotificationRead('donor-001', 'notif-001', db);
      assert.strictEqual(updated.read, true);
      assert.ok(updated.readAt);

      const refreshed = await getUserNotifications('donor-001', undefined, db);
      assert.strictEqual(refreshed.unreadCount, 0);
    });

    it('prevents a user from marking another user notification as read (403 Forbidden)', async () => {
      await assert.rejects(
        () => markNotificationRead('requester-001', 'notif-001', db),
        (err: any) => err instanceof NotificationError && err.status === 403
      );
    });

    it('prevents duplicate notifications on exact retry with same idempotency key', async () => {
      const key = 'workflow-notif-claim-xyz';

      const first = await createWorkflowNotification(
        {
          userId: 'donor-001',
          title: 'Listing Claimed',
          message: 'Your listing has been claimed.',
          type: 'claim',
          idempotencyKey: key,
        },
        db
      );

      const second = await createWorkflowNotification(
        {
          userId: 'donor-001',
          title: 'Listing Claimed',
          message: 'Your listing has been claimed.',
          type: 'claim',
          idempotencyKey: key,
        },
        db
      );

      assert.strictEqual(first.id, second.id);

      // Check total notifications for donor
      const donorRes = await getUserNotifications('donor-001', undefined, db);
      const claimNotifs = donorRes.notifications.filter((n: any) => n.idempotency_key === key || n.id === first.id);
      assert.strictEqual(claimNotifs.length, 1);
    });

    it('rejects mismatched notification retries and unsafe navigation links', async () => {
      const input = {
        userId: 'donor-001',
        title: 'Listing Claimed',
        message: 'Your listing was claimed.',
        type: 'claim' as const,
        link: '/dashboard/donor',
        idempotencyKey: 'notif-exact-retry-check',
      };
      await createWorkflowNotification(input, db);

      await assert.rejects(
        () => createWorkflowNotification({ ...input, userId: 'requester-001' }, db),
        (err: any) => err instanceof NotificationError && err.code === 'IDEMPOTENCY_KEY_REUSED'
      );
      await assert.rejects(
        () => createWorkflowNotification({
          ...input,
          idempotencyKey: 'notif-unsafe-link',
          link: 'javascript:alert(1)',
        }, db),
        (err: any) => err instanceof NotificationError && err.code === 'INVALID_NOTIFICATION_LINK'
      );
    });
  });

  // ============================================================
  // 5. CMS Uploads & Operational Metrics
  // ============================================================
  describe('5. Hardened CMS Uploads & Operational Metrics', () => {
    it('denies upload from non-admin users', async () => {
      const buffer = Buffer.from('fake image content');
      await assert.rejects(
        () =>
          uploadCmsAsset(
            'volunteer-001',
            { buffer, fileName: 'test.jpg', mimeType: 'image/jpeg', size: buffer.length },
            'blogs',
            db
          ),
        (err: any) => err instanceof CmsError && err.status === 403
      );
    });

    it('rejects disallowed file MIME types', async () => {
      const buffer = Buffer.from('executable script');
      await assert.rejects(
        () =>
          uploadCmsAsset(
            'admin-001',
            { buffer, fileName: 'script.exe', mimeType: 'application/octet-stream', size: buffer.length },
            'blogs',
            db
          ),
        (err: any) => err instanceof CmsError && err.status === 400 && err.code === 'INVALID_FILE_TYPE'
      );
    });

    it('rejects files larger than 5 MB', async () => {
      const buffer = Buffer.alloc(10);
      const oversized = 6 * 1024 * 1024; // 6 MB
      await assert.rejects(
        () =>
          uploadCmsAsset(
            'admin-001',
            { buffer, fileName: 'huge.jpg', mimeType: 'image/jpeg', size: oversized },
            'blogs',
            db
          ),
        (err: any) => err instanceof CmsError && err.status === 400 && err.code === 'FILE_TOO_LARGE'
      );
    });

    it('succeeds for valid admin upload and generates public storage URL', async () => {
      const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43]);
      const result = await uploadCmsAsset(
        'admin-001',
        { buffer, fileName: 'photo.jpg', mimeType: 'image/jpeg', size: buffer.length },
        'gallery',
        db
      );

      assert.ok(result.url.includes('https://example-supabase.co/storage/v1/object/public/cms-assets/gallery/'));
      assert.ok(result.path.startsWith('gallery/'));
    });

    it('returns real administrative operational metrics', async () => {
      const stats = await getAdminStats('admin-001', db);

      assert.strictEqual(stats.totalUsers, 4);
      assert.strictEqual(stats.totalDonors, 1);
      assert.strictEqual(stats.totalRequesters, 1);
      assert.strictEqual(stats.totalVolunteers, 1);
      assert.strictEqual(stats.activeListings, 1);
      assert.strictEqual(stats.completedDeliveries, 1);
      assert.strictEqual(stats.pendingDeliveries, 1);
      assert.strictEqual(stats.unreadMessages, 0);
    });
  });

  // ============================================================
  // 6. HTTP Boundary Route Handlers
  // ============================================================
  describe('6. HTTP Boundary Route Handlers', () => {
    const adminCaller: AuthenticatedUser = { id: 'admin-001', role: 'admin' };
    const donorCaller: AuthenticatedUser = { id: 'donor-001', role: 'donor' };

    it('GET /api/notifications returns 401 when unauthenticated', async () => {
      const req = new Request('http://localhost/api/notifications');
      const res = await getNotificationsHandler(req, { caller: undefined });
      assert.strictEqual(res.status, 401);
    });

    it('GET /api/notifications returns 200 with caller notifications', async () => {
      const req = new Request('http://localhost/api/notifications');
      const res = await getNotificationsHandler(req, { caller: donorCaller, customClient: db });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.data.notifications.length, 1);
      assert.strictEqual(json.data.unreadCount, 1);
    });

    it('POST /api/notifications/[id]/read marks read for owner', async () => {
      const req = new Request('http://localhost/api/notifications/notif-001/read', { method: 'POST' });
      const res = await markNotificationReadHandler(req, {
        params: Promise.resolve({ id: 'notif-001' }),
        caller: donorCaller,
        customClient: db,
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.data.read, true);
    });

    it('POST /api/contact validates input and returns 201', async () => {
      const req = new Request('http://localhost/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Ananya Roy',
          email: 'ananya@example.com',
          message: 'I would like to inquire about bulk food pickups.',
        }),
      });

      const res = await submitContactHandler(req, { customClient: db });
      assert.strictEqual(res.status, 201);
      const json = await res.json();
      assert.ok(json.data.id);
    });

    it('POST /api/contact returns 400 on malformed payload', async () => {
      const req = new Request('http://localhost/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'A', email: 'bad' }),
      });

      const res = await submitContactHandler(req, { customClient: db });
      assert.strictEqual(res.status, 400);
    });

    it('GET /api/admin/stats enforces admin check', async () => {
      const req = new Request('http://localhost/api/admin/stats');
      const denied = await getAdminStatsHandler(req, { caller: donorCaller, customClient: db });
      assert.strictEqual(denied.status, 403);

      const allowed = await getAdminStatsHandler(req, { caller: adminCaller, customClient: db });
      assert.strictEqual(allowed.status, 200);
      const json = await allowed.json();
      assert.strictEqual(json.data.totalUsers, 4);
    });

    it('POST /api/cms/blogs enforces admin role', async () => {
      const req = new Request('http://localhost/api/cms/blogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Admin Article',
          content: 'Legitimate admin-authored article content.',
        }),
      });

      const denied = await createCmsBlogHandler(req, { caller: donorCaller, customClient: db });
      assert.strictEqual(denied.status, 403);

      const allowed = await createCmsBlogHandler(req, { caller: adminCaller, customClient: db });
      assert.strictEqual(allowed.status, 201);
    });
  });
});
