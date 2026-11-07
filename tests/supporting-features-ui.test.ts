import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";

import { getBlogsService } from "../src/services/blogs";
import { getEventsService } from "../src/services/events";
import { getFaqsService } from "../src/services/faqs";
import { getGalleryService } from "../src/services/gallery";
import { getContactService } from "../src/services/contact";
import { getNotificationsService } from "../src/services/notifications";

describe("Supporting Features UI & Service Integration Suite", () => {
  let originalFetch: typeof globalThis.fetch;
  let mockFetchHandler: (url: string, init?: RequestInit) => Promise<Response>;

  before(() => {
    originalFetch = globalThis.fetch;
    globalThis.fetch = ((url: any, init?: any) => {
      if (mockFetchHandler) {
        return mockFetchHandler(String(url), init);
      }
      return originalFetch(url, init);
    }) as any;
  });

  after(() => {
    globalThis.fetch = originalFetch;
  });

  describe("1. Blog Service & Story Discovery", () => {
    it("fetches published stories through the CMS endpoint", async () => {
      mockFetchHandler = async (url) => {
        assert.ok(url.includes("/api/cms/blogs?status=published"));
        return new Response(
          JSON.stringify({
            data: [
              {
                id: "b-1",
                title: "Over 500 Meals Rescued in Bandra",
                slug: "500-meals-rescued-bandra",
                content: "Detailed story about local food redistribution...",
                status: "published",
                createdAt: new Date().toISOString(),
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      };

      const service = getBlogsService();
      const { data, error } = await service.getBlogs("published");

      assert.equal(error, null);
      assert.ok(Array.isArray(data));
      assert.equal(data.length, 1);
      assert.equal(data[0].title, "Over 500 Meals Rescued in Bandra");
      assert.equal(data[0].slug, "500-meals-rescued-bandra");
    });

    it("fetches a single blog by slug with fallback handling", async () => {
      mockFetchHandler = async (url) => {
        assert.ok(url.includes("slug=test-slug"));
        return new Response(
          JSON.stringify({
            data: [
              {
                id: "b-2",
                title: "Test Blog Article",
                slug: "test-slug",
                content: "Content",
                status: "published",
                createdAt: new Date().toISOString(),
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      };

      const service = getBlogsService();
      const { data, error } = await service.getBlogBySlug("test-slug");

      assert.equal(error, null);
      assert.ok(data);
      assert.equal(data.slug, "test-slug");
    });

    it("creates a blog post through admin endpoint with authorized headers", async () => {
      mockFetchHandler = async (url, init) => {
        assert.ok(url.includes("/api/cms/blogs"));
        assert.equal(init?.method, "POST");
        const body = JSON.parse(String(init?.body));
        assert.equal(body.title, "New Community Drive");
        return new Response(
          JSON.stringify({
            data: {
              id: "b-new",
              title: body.title,
              slug: "new-community-drive",
              content: body.content,
              status: "published",
              createdAt: new Date().toISOString(),
            },
          }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        );
      };

      const service = getBlogsService();
      const { data, error } = await service.createBlog({
        title: "New Community Drive",
        slug: "new-community-drive",
        content: "We hosted a massive food collection.",
        status: "published",
      });

      assert.equal(error, null);
      assert.ok(data);
      assert.equal(data.id, "b-new");
    });
  });

  describe("2. Events Service & Drive Scheduling", () => {
    it("fetches upcoming community events", async () => {
      mockFetchHandler = async (url) => {
        assert.ok(url.includes("/api/cms/events"));
        return new Response(
          JSON.stringify({
            data: [
              {
                id: "ev-1",
                title: "Weekend Food Relief Drive",
                description: "Meet at central distribution hub",
                date: new Date(Date.now() + 86400000).toISOString(),
                location: "Dadar Hub, Mumbai",
                createdAt: new Date().toISOString(),
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      };

      const service = getEventsService();
      const { data, error } = await service.getEvents();

      assert.equal(error, null);
      assert.ok(Array.isArray(data));
      assert.equal(data.length, 1);
      assert.equal(data[0].title, "Weekend Food Relief Drive");
    });

    it("creates and schedules an event through admin route", async () => {
      mockFetchHandler = async (url, init) => {
        assert.ok(url.includes("/api/cms/events"));
        assert.equal(init?.method, "POST");
        const body = JSON.parse(String(init?.body));
        return new Response(
          JSON.stringify({
            data: {
              id: "ev-2",
              ...body,
              createdAt: new Date().toISOString(),
            },
          }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        );
      };

      const service = getEventsService();
      const { data, error } = await service.createEvent({
        title: "Youth Volunteer Orientation",
        description: "Onboarding and food hygiene training",
        date: new Date(Date.now() + 172800000).toISOString(),
        location: "Bandra Center",
      });

      assert.equal(error, null);
      assert.ok(data);
      assert.equal(data.title, "Youth Volunteer Orientation");
    });
  });

  describe("3. FAQs Service & Educational Guidelines", () => {
    it("fetches categorized knowledge base FAQs", async () => {
      mockFetchHandler = async (url) => {
        assert.ok(url.includes("/api/cms/faqs"));
        return new Response(
          JSON.stringify({
            data: [
              {
                id: "faq-1",
                question: "How do volunteers conduct QC?",
                answer: "Volunteers inspect food temperature, packaging seal, and appearance.",
                category: "Food Safety & Logistics",
                createdAt: new Date().toISOString(),
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      };

      const service = getFaqsService();
      const { data, error } = await service.getFaqs();

      assert.equal(error, null);
      assert.ok(Array.isArray(data));
      assert.equal(data.length, 1);
      assert.equal(data[0].category, "Food Safety & Logistics");
    });

    it("creates an FAQ entry through admin API", async () => {
      mockFetchHandler = async (url, init) => {
        assert.equal(init?.method, "POST");
        const body = JSON.parse(String(init?.body));
        return new Response(
          JSON.stringify({
            data: {
              id: "faq-2",
              ...body,
              createdAt: new Date().toISOString(),
            },
          }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        );
      };

      const service = getFaqsService();
      const { data, error } = await service.createFaq({
        question: "Can restaurants donate raw ingredients?",
        answer: "Yes, unopened unexpired staples and intact fresh produce are accepted.",
        category: "For Donors",
      });

      assert.equal(error, null);
      assert.ok(data);
      assert.equal(data.question, "Can restaurants donate raw ingredients?");
    });
  });

  describe("4. Gallery Service & Media Assets", () => {
    it("fetches gallery photos from the backend API", async () => {
      mockFetchHandler = async (url) => {
        assert.ok(url.includes("/api/cms/gallery"));
        return new Response(
          JSON.stringify({
            data: [
              {
                id: "g-1",
                title: "Food Distribution at Shelter",
                imageUrl: "https://example.com/gallery/shelter-1.jpg",
                createdAt: new Date().toISOString(),
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      };

      const service = getGalleryService();
      const { data, error } = await service.getGalleryItems();

      assert.equal(error, null);
      assert.ok(Array.isArray(data));
      assert.equal(data.length, 1);
      assert.equal(data[0].title, "Food Distribution at Shelter");
    });

    it("adds a gallery item through admin API", async () => {
      mockFetchHandler = async (url, init) => {
        assert.equal(init?.method, "POST");
        const body = JSON.parse(String(init?.body));
        return new Response(
          JSON.stringify({
            data: {
              id: "g-2",
              title: body.title,
              imageUrl: body.imageUrl,
              createdAt: new Date().toISOString(),
            },
          }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        );
      };

      const service = getGalleryService();
      const { data, error } = await service.addGalleryItem({
        title: "Volunteer Team Photo",
        imageUrl: "https://example.com/gallery/team.jpg",
      });

      assert.equal(error, null);
      assert.ok(data);
      assert.equal(data.title, "Volunteer Team Photo");
    });
  });

  describe("5. Contact Form Submission & Rate Limiting", () => {
    it("submits contact message and returns structured confirmation", async () => {
      mockFetchHandler = async (url, init) => {
        assert.ok(url.includes("/api/contact"));
        assert.equal(init?.method, "POST");
        const body = JSON.parse(String(init?.body));
        assert.equal(body.name, "Rohan Patel");
        assert.equal(body.email, "rohan@example.com");
        return new Response(
          JSON.stringify({
            data: { success: true, messageId: "msg-1" },
            error: null,
          }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        );
      };

      const service = getContactService();
      const { data, error, status } = await service.submitMessage({
        name: "Rohan Patel",
        email: "rohan@example.com",
        message: "We have regular catering excess on weekends. How can we partner?",
      });

      assert.equal(error, null);
      assert.equal(status, 201);
      assert.equal(data.success, true);
      assert.equal(data.messageId, "msg-1");
    });

    it("handles 429 rate limit response explicitly", async () => {
      mockFetchHandler = async () => {
        return new Response(
          JSON.stringify({
            data: null,
            error: {
              message: "Too many messages sent. Please wait before trying again.",
              code: "RATE_LIMITED",
            },
          }),
          { status: 429, headers: { "Content-Type": "application/json" } }
        );
      };

      const service = getContactService();
      const { data, error, status } = await service.submitMessage({
        name: "Spam Bot",
        email: "spam@example.com",
        message: "Spam message content...",
      });

      assert.equal(data, null);
      assert.equal(status, 429);
      assert.ok(error);
      assert.ok(error.message.includes("Too many messages"));
    });

    it("admin retrieves visitor messages securely", async () => {
      mockFetchHandler = async (url) => {
        assert.ok(url.includes("/api/cms/messages"));
        return new Response(
          JSON.stringify({
            data: [
              {
                id: "msg-101",
                name: "Aarti Verma",
                email: "aarti@example.com",
                phone: "+919876543210",
                message: "Interested in organizing a community drive in Andheri.",
                createdAt: new Date().toISOString(),
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      };

      const service = getContactService();
      const { data, error } = await service.getMessages();

      assert.equal(error, null);
      assert.ok(Array.isArray(data));
      assert.equal(data.length, 1);
      assert.equal(data[0].name, "Aarti Verma");
      assert.equal(data[0].phone, "+919876543210");
    });
  });

  describe("6. In-App Notifications Experience", () => {
    it("fetches caller notifications from /api/notifications", async () => {
      mockFetchHandler = async (url) => {
        assert.ok(url.includes("/api/notifications"));
        return new Response(
          JSON.stringify({
            data: { notifications: [
              {
                id: "notif-1",
                userId: "user-1",
                title: "Listing Claimed",
                message: 'Your food listing "Surplus Rice & Dal" has been claimed.',
                type: "claim",
                link: "/dashboard/donor",
                read: false,
                createdAt: new Date().toISOString(),
              },
              {
                id: "notif-2",
                userId: "user-1",
                title: "Delivery Completed",
                message: "Your food donation was safely delivered to the community kitchen.",
                type: "delivery",
                link: "/dashboard/donor",
                read: true,
                createdAt: new Date(Date.now() - 3600000).toISOString(),
              },
            ], unreadCount: 1 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      };

      const service = getNotificationsService();
      const { data, error } = await service.getNotifications();

      assert.equal(error, null);
      assert.ok(Array.isArray(data));
      assert.equal(data.length, 2);
      assert.equal(data[0].read, false);
      assert.equal(data[1].read, true);
    });

    it("returns empty notifications gracefully when unauthenticated (401)", async () => {
      mockFetchHandler = async () => {
        return new Response(
          JSON.stringify({ error: "Authentication required" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      };

      const service = getNotificationsService();
      const { data, error } = await service.getNotifications();

      assert.equal(error, null);
      assert.ok(Array.isArray(data));
      assert.equal(data.length, 0);
    });

    it("marks a notification as read via POST /api/notifications/[id]/read", async () => {
      mockFetchHandler = async (url, init) => {
        assert.ok(url.includes("/api/notifications/notif-1/read"));
        assert.equal(init?.method, "POST");
        return new Response(
          JSON.stringify({
            data: {
              id: "notif-1",
              userId: "user-1",
              title: "Listing Claimed",
              message: "Clean notification preview without PII",
              type: "claim",
              read: true,
              createdAt: new Date().toISOString(),
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      };

      const service = getNotificationsService();
      const { data, error } = await service.markAsRead("notif-1");

      assert.equal(error, null);
      assert.ok(data);
      assert.equal(data.read, true);
    });
  });

  describe("7. Admin Dashboard Operational Stats", () => {
    it("fetches real administrative metrics", async () => {
      mockFetchHandler = async (url) => {
        assert.ok(url.includes("/api/admin/stats"));
        return new Response(
          JSON.stringify({
            activeListings: 14,
            completedDeliveries: 42,
            totalDonors: 28,
            totalRequesters: 19,
            totalVolunteers: 35,
            unreadMessages: 3,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      };

      const res = await fetch("/api/admin/stats");
      assert.equal(res.status, 200);
      const json = await res.json();

      assert.equal(json.activeListings, 14);
      assert.equal(json.completedDeliveries, 42);
      assert.equal(json.totalDonors, 28);
      assert.equal(json.totalRequesters, 19);
      assert.equal(json.totalVolunteers, 35);
      assert.equal(json.unreadMessages, 3);
    });
  });
});
