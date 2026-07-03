import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const createRequest = mutation({
  args: {
    requesterName: v.string(),
    requesterId: v.optional(v.id("users")),
    requestType: v.union(v.literal("self"), v.literal("third_party"), v.literal("ngo")),
    location: v.string(),
    beneficiaryPhotoId: v.optional(v.id("_storage")),
    foodListingId: v.optional(v.id("foodListings")),
  },
  handler: async (ctx, args) => {
    if (args.foodListingId) {
      await ctx.db.patch(args.foodListingId, { status: "pending_delivery" });
    }
    return await ctx.db.insert("foodRequests", {
      ...args,
      status: "pending",
    });
  },
});

export const getRequests = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("foodRequests").order("desc").collect();
  },
});

// Match request to available food and assign volunteer
export const acceptDelivery = mutation({
  args: {
    requestId: v.id("foodRequests"),
    foodListingId: v.id("foodListings"),
    volunteerId: v.id("users"),
    deliveryDistanceKm: v.number(),
    etaMinutes: v.number(),
  },
  handler: async (ctx, args) => {
    // Link request to listing and mark as assigned
    await ctx.db.patch(args.requestId, {
      status: "accepted",
      foodListingId: args.foodListingId,
      volunteerId: args.volunteerId,
      deliveryDistanceKm: args.deliveryDistanceKm,
      etaMinutes: args.etaMinutes,
    });

    // Update food listing status
    await ctx.db.patch(args.foodListingId, {
      status: "delivery_assigned",
    });
  },
});

// Complete delivery and pay volunteer
export const completeDelivery = mutation({
  args: {
    requestId: v.id("foodRequests"),
    volunteerId: v.id("users"),
    deliveryProofPhotoId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request || request.volunteerId !== args.volunteerId) {
      throw new Error("Unauthorized or invalid request");
    }

    // Complete request
    await ctx.db.patch(args.requestId, { 
      status: "completed",
      deliveryProofPhotoId: args.deliveryProofPhotoId 
    });

    // Complete listing
    if (request.foodListingId) {
      await ctx.db.patch(request.foodListingId, { status: "delivered" });
    }

    // Pay volunteer
    if (request.deliveryDistanceKm) {
      const volunteer = await ctx.db.get(args.volunteerId);
      if (volunteer) {
        const newEarnings = (volunteer.earnings || 0) + (request.deliveryDistanceKm * 20);
        await ctx.db.patch(args.volunteerId, { earnings: newEarnings });
      }
    }
  },
});
