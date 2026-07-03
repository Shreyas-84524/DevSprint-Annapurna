import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getFoodItems = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("foodListings").order("desc").collect();
  },
});

export const addFoodItem = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    quantity: v.string(),
    location: v.string(),
    donorName: v.string(),
    donorType: v.union(v.literal("individual"), v.literal("restaurant"), v.literal("caterer")),
    foodType: v.union(v.literal("veg"), v.literal("non-veg")),
    donorId: v.optional(v.id("users")),
    foodImageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("foodListings", {
      ...args,
      status: "pending_pickup", // New workflow starts here
    });
  },
});

// Volunteer accepts pickup
export const acceptPickup = mutation({
  args: {
    id: v.id("foodListings"),
    volunteerId: v.id("users"),
    pickupDistanceKm: v.number(),
    etaMinutes: v.number(), // Used later for ETA tracking
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, { 
      status: "pickup_assigned",
      volunteerId: args.volunteerId,
      pickupDistanceKm: args.pickupDistanceKm,
      etaMinutes: args.etaMinutes,
    });
  },
});

// Volunteer drops food at warehouse and gets paid
export const dropAtWarehouse = mutation({
  args: {
    id: v.id("foodListings"),
    volunteerId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const listing = await ctx.db.get(args.id);
    if (!listing || listing.volunteerId !== args.volunteerId) {
      throw new Error("Unauthorized or invalid listing");
    }

    // Update listing status
    await ctx.db.patch(args.id, { status: "at_warehouse" });

    // Calculate pay (₹20/km)
    if (listing.pickupDistanceKm) {
      const volunteer = await ctx.db.get(args.volunteerId);
      if (volunteer) {
        const newEarnings = (volunteer.earnings || 0) + (listing.pickupDistanceKm * 20);
        await ctx.db.patch(args.volunteerId, { earnings: newEarnings });
      }
    }
  },
});

// Marking leftover food for animals
export const donateToAnimals = mutation({
  args: { id: v.id("foodListings") },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, { status: "donated_to_animals" });
  },
});

export const verifyQuality = mutation({
  args: {
    id: v.id("foodListings"),
    passed: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, { qualityPassed: args.passed });
  },
});
