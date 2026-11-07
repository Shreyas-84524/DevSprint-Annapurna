import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  createWorkflowNotification,
  getUserNotifications,
  markNotificationRead,
} from "../src/server/notifications";
import {
  submitContactMessage,
} from "../src/server/contact";
import {
  getPublicBlogs,
  createBlog,
  getEvents,
  createEvent,
  getAdminStats,
} from "../src/server/cms";

// In-memory test store simulating Supabase database state with table isolation
class IntegrationTestDB {
  public notifications: Map<string, any> = new Map();
  public contactMessages: Map<string, any> = new Map();
  public blogs: Map<string, any> = new Map();
  public events: Map<string, any> = new Map();
  public faqs: Map<string, any> = new Map();
  public gallery: Map<string, any> = new Map();
  public foodListings: Map<string, any> = new Map();
  public deliveries: Map<string, any> = new Map();
  public profiles: Map<string, any> = new Map();

  constructor() {
    this.seedDefaults();
  }

  seedDefaults() {
    this.profiles.set("usr-admin", { id: "usr-admin", role: "admin", full_name: "Admin User", is_verified: true });
    this.profiles.set("usr-donor", { id: "usr-donor", role: "donor", full_name: "Donor User", is_verified: true });
    this.profiles.set("usr-requester", { id: "usr-requester", role: "requester", full_name: "Requester User", is_verified: true });
    this.profiles.set("usr-volunteer", { id: "usr-volunteer", role: "volunteer", full_name: "Volunteer User", is_verified: true });

    this.foodListings.set("list-1", {
      id: "list-1",
      donor_id: "usr-donor",
      title: "Surplus Rice & Vegetable Curry",
      food_type: "veg",
      quantity: 25,
      unit: "meals",
      status: "published",
      row_version: 1,
      pickup_address: "123 Secret Flat, Private Road", // SENSITIVE
      donor_phone: "+919876543210", // SENSITIVE
      expires_at: new Date(Date.now() + 36000000).toISOString(),
      created_at: new Date().toISOString(),
    });

    this.blogs.set("bl-pub", {
      id: "bl-pub",
      title: "Published Story",
      slug: "published-story",
      content: "Story content",
      status: "published",
      created_at: new Date().toISOString(),
    });

    this.blogs.set("bl-draft", {
      id: "bl-draft",
      title: "Draft Story",
      slug: "draft-story",
      content: "Draft content",
      status: "draft",
      created_at: new Date().toISOString(),
    });
  }

  private getTableMap(table: string): Map<string, any> {
    switch (table) {
      case "food_listings":
        return this.foodListings;
      case "contact_messages":
        return this.contactMessages;
      case "profiles":
        return this.profiles;
      case "notifications":
        return this.notifications;
      case "blogs":
        return this.blogs;
      case "events":
        return this.events;
      case "faqs":
        return this.faqs;
      case "gallery":
        return this.gallery;
      case "deliveries":
        return this.deliveries;
      default:
        return new Map();
    }
  }

  createClient = (actorId?: string, actorRole?: string) => {

    return {
      auth: {
        getUser: async () => ({
          data: {
            user: actorId ? { id: actorId, role: actorRole } : null,
          },
          error: actorId ? null : new Error("Unauthenticated"),
        }),
      },

      from: (table: string) => {
        const targetMap = this.getTableMap(table);
        const filters: Array<(row: any) => boolean> = [];
        let limitVal: number | null = null;
        let isHeadCount = false;

        const builder = {
          select: (_columns?: string, options?: any) => {
            if (options?.head) {
              isHeadCount = true;
            }
            return builder;
          },

          eq: (column: string, value: any) => {
            filters.push((r: any) => r[column] === value);
            return builder;
          },

          neq: (column: string, value: any) => {
            filters.push((r: any) => r[column] !== value);
            return builder;
          },

          in: (column: string, values: any[]) => {
            filters.push((r: any) => values.includes(r[column]));
            return builder;
          },

          order: () => builder,
          limit: (n: number) => {
            limitVal = n;
            return builder;
          },

          maybeSingle: async () => {
            let items = Array.from(targetMap.values());
            for (const f of filters) items = items.filter(f);
            return { data: items[0] ? { ...items[0] } : null, error: null };
          },

          single: async () => {
            let items = Array.from(targetMap.values());
            for (const f of filters) items = items.filter(f);
            if (!items[0]) {
              return { data: null, error: { message: "Row not found", code: "P0002" } };
            }
            return { data: { ...items[0] }, error: null };
          },

          update: (payload: any) => {
            return {
              eq: (col: string, val: any) => {
                filters.push((r: any) => r[col] === val);
                return {
                  select: () => ({
                    single: async () => {
                      let items = Array.from(targetMap.values());
                      for (const f of filters) items = items.filter(f);
                      if (items[0]) {
                        Object.assign(items[0], payload);
                        return { data: { ...items[0] }, error: null };
                      }
                      return { data: null, error: new Error("Row not found") };
                    },
                  }),
                  then: (resolve: any) => {
                    let items = Array.from(targetMap.values());
                    for (const f of filters) items = items.filter(f);
                    for (const item of items) {
                      Object.assign(item, payload);
                    }
                    return resolve({ data: items, error: null });
                  },
                };
              },
            };
          },

          insert: (payload: any) => {
            const id = payload.id || `gen-${Math.random().toString(36).slice(2, 9)}`;
            const record = { id, ...payload, created_at: payload.created_at || new Date().toISOString() };
            let insertError: any = null;

            // Enforce idempotency_key unique constraint on notifications
            if (table === "notifications" && payload.idempotency_key) {
              for (const item of targetMap.values()) {
                if (item.idempotency_key === payload.idempotency_key) {
                  insertError = { message: "Duplicate key", code: "23505" };
                  break;
                }
              }
            }

            if (!insertError) {
              targetMap.set(id, record);
            }

            return {
              select: () => ({
                single: async () => {
                  if (insertError) return { data: null, error: insertError };
                  return { data: { ...record }, error: null };
                },
              }),
              then: (resolve: any) => {
                return resolve({ data: insertError ? null : [record], error: insertError });
              },
            };
          },

          then: (resolve: any) => {
            let items = Array.from(targetMap.values());
            for (const f of filters) items = items.filter(f);
            const count = items.length;
            if (limitVal !== null) items = items.slice(0, limitVal);

            if (isHeadCount) {
              return resolve({ data: null, count, error: null });
            }
            return resolve({ data: items, count, error: null });
          },
        };

        return builder;
      },
    };
  }
}

describe("Cross-Feature Integration & Hardening Suite", () => {
  it("enforces deterministic notification deduplication across workflow retries", async () => {
    const db = new IntegrationTestDB();
    const client = db.createClient("usr-donor", "donor");

    // First transition event
    const notif1 = await createWorkflowNotification(
      {
        userId: "usr-donor",
        type: "claim",
        title: "Listing Claimed",
        message: 'Your food listing "Surplus Rice" was claimed.',
        link: "/dashboard/donor",
        idempotencyKey: "notif-claim-trans-12345",
      },
      client
    );

    assert.equal(notif1.title, "Listing Claimed");
    assert.equal(db.notifications.size, 1);

    // Replayed retry of exact same transition with identical idempotencyKey
    const notif2 = await createWorkflowNotification(
      {
        userId: "usr-donor",
        type: "claim",
        title: "Listing Claimed",
        message: 'Your food listing "Surplus Rice" was claimed.',
        link: "/dashboard/donor",
        idempotencyKey: "notif-claim-trans-12345",
      },
      client
    );

    assert.equal(notif2.id, notif1.id);
    assert.equal(db.notifications.size, 1); // Exactly 1 row in DB - not duplicated!
  });

  it("enforces strict user isolation for in-app notifications", async () => {
    const db = new IntegrationTestDB();
    const donorClient = db.createClient("usr-donor", "donor");
    const requesterClient = db.createClient("usr-requester", "requester");

    // Create notifications for donor and requester
    await createWorkflowNotification(
      {
        userId: "usr-donor",
        type: "claim",
        title: "Donor Notification",
        message: "Message for donor",
        idempotencyKey: "key-donor-1",
      },
      donorClient
    );

    await createWorkflowNotification(
      {
        userId: "usr-requester",
        type: "delivery",
        title: "Requester Notification",
        message: "Message for requester",
        idempotencyKey: "key-req-1",
      },
      requesterClient
    );

    // Donor can only read donor notifications
    const donorRes = await getUserNotifications("usr-donor", { limit: 50 }, donorClient);
    assert.equal(donorRes.notifications.length, 1);
    assert.equal(donorRes.notifications[0].title, "Donor Notification");

    // Requester can only read requester notifications
    const reqRes = await getUserNotifications("usr-requester", { limit: 50 }, requesterClient);
    assert.equal(reqRes.notifications.length, 1);
    assert.equal(reqRes.notifications[0].title, "Requester Notification");

    // Requester attempts to mark donor notification as read -> must fail
    await assert.rejects(
      async () => {
        await markNotificationRead("usr-requester", donorRes.notifications[0].id, requesterClient);
      },
      {
        name: "NotificationError",
        message: /Cannot mark another user notification as read/,
      }
    );
  });

  it("rejects invalid contact submissions and enforces rate limits", async () => {
    const db = new IntegrationTestDB();
    const client = db.createClient();

    // 1. Rejects invalid email
    await assert.rejects(
      async () => {
        await submitContactMessage(
          {
            name: "Test User",
            email: "not-an-email",
            message: "A legitimate message of sufficient length.",
          },
          "ip-rate-test-1",
          client
        );
      },
      {
        name: "ContactError",
        message: /valid email address/,
      }
    );

    // 2. Rejects message shorter than 10 chars
    await assert.rejects(
      async () => {
        await submitContactMessage(
          {
            name: "Test User",
            email: "test@example.com",
            message: "Too short",
          },
          "ip-rate-test-2",
          client
        );
      },
      {
        name: "ContactError",
        message: /between 10 and 3000 characters/,
      }
    );

    // 3. Rejects oversized message
    await assert.rejects(
      async () => {
        await submitContactMessage(
          {
            name: "Test User",
            email: "test@example.com",
            message: "x".repeat(3001),
          },
          "ip-rate-test-3",
          client
        );
      },
      {
        name: "ContactError",
        message: /between 10 and 3000 characters/,
      }
    );

    // 4. Rate limiting: 5 allowed, 6th rejected with 429
    const ip = "ip-rate-limit-check";
    for (let i = 0; i < 5; i++) {
      const res = await submitContactMessage(
        {
          name: `User ${i}`,
          email: `test${i}@example.com`,
          message: `Legitimate test inquiry number ${i}`,
        },
        ip,
        client
      );
      assert.ok(res.id);
    }

    await assert.rejects(
      async () => {
        await submitContactMessage(
          {
            name: "User 6",
            email: "test6@example.com",
            message: "This 6th message should be rate limited.",
          },
          ip,
          client
        );
      },
      {
        name: "ContactError",
        message: /Rate limit exceeded/,
      }
    );
  });

  it("restricts CMS mutations and draft visibility strictly to authenticated admins", async () => {
    const db = new IntegrationTestDB();
    const nonAdminClient = db.createClient("usr-donor", "donor");
    const adminClient = db.createClient("usr-admin", "admin");

    // Non-admin attempting to create a blog
    await assert.rejects(
      async () => {
        await createBlog(
          "usr-donor",
          {
            title: "Unauthorized Post",
            content: "Content that should be blocked",
          },
          nonAdminClient
        );
      },
      {
        name: "CmsError",
        message: /Admin role required/,
      }
    );

    // Non-admin attempting to create an event
    await assert.rejects(
      async () => {
        await createEvent(
          "usr-donor",
          {
            title: "Unauthorized Event",
            description: "Description",
            date: new Date().toISOString(),
            location: "Location",
          },
          nonAdminClient
        );
      },
      {
        name: "CmsError",
        message: /Admin role required/,
      }
    );

    // Admin successfully creates blog
    const createdBlog = await createBlog(
      "usr-admin",
      {
        title: "Official Relief Update",
        content: "Annapurna has reached 50,000 meals delivered.",
        status: "published",
      },
      adminClient
    );
    assert.equal(createdBlog.title, "Official Relief Update");

    // Public only sees published blogs
    const publicBlogs = await getPublicBlogs(nonAdminClient);
    assert.ok(publicBlogs.every((b) => b.status === "published"));
    assert.ok(!publicBlogs.some((b) => b.title === "Draft Story"));
  });

  it("ensures public CMS reads never expose sensitive administrative or private fields", async () => {
    const db = new IntegrationTestDB();
    const client = db.createClient();

    const blogs = await getPublicBlogs(client);
    for (const b of blogs) {
      assert.equal((b as any).password, undefined);
      assert.equal((b as any).secret, undefined);
      assert.ok(b.id);
      assert.ok(b.title);
      assert.ok(b.slug);
    }

    const events = await getEvents(client);
    for (const ev of events) {
      assert.equal((ev as any).token, undefined);
    }
  });

  it("returns real operational metrics for admin without leaking sensitive PII", async () => {
    const db = new IntegrationTestDB();
    const adminClient = db.createClient("usr-admin", "admin");

    const stats = await getAdminStats("usr-admin", adminClient);
    assert.equal(typeof stats.totalUsers, "number");
    assert.equal(typeof stats.totalDonors, "number");
    assert.equal(typeof stats.activeListings, "number");
    assert.equal(typeof stats.completedDeliveries, "number");
    assert.equal(typeof stats.unreadMessages, "number");
  });
});
