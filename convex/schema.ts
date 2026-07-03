import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    role: v.union(
      v.literal("donor"),
      v.literal("restaurant"),
      v.literal("caterer"),
      v.literal("ngo"),
      v.literal("volunteer")
    ),
    earnings: v.optional(v.number()), // For volunteer distance pay tracking (₹20/km)
  }),
  
  monetaryDonations: defineTable({
    donorName: v.string(),
    amount: v.number(),
    currency: v.string(),
    status: v.string(),
  }),
  
  foodListings: defineTable({
    title: v.string(),
    description: v.string(),
    quantity: v.string(),
    location: v.string(),
    donorId: v.optional(v.id("users")),
    donorName: v.string(),
    donorType: v.union(v.literal("individual"), v.literal("restaurant"), v.literal("caterer")),
    foodType: v.optional(v.union(v.literal("veg"), v.literal("non-veg"))),
    foodImageId: v.optional(v.id("_storage")), // Convex handles file storage via _storage
    status: v.union(
      v.literal("pending_pickup"),
      v.literal("pickup_assigned"),
      v.literal("at_warehouse"),
      v.literal("pending_delivery"),
      v.literal("delivery_assigned"),
      v.literal("delivered"),
      v.literal("donated_to_animals")
    ),
    pickupDistanceKm: v.optional(v.number()),
    etaMinutes: v.optional(v.number()),
    qualityPassed: v.optional(v.boolean()),
    volunteerId: v.optional(v.id("users")), // Volunteer assigned to pickup
  }),

  foodRequests: defineTable({
    foodListingId: v.optional(v.id("foodListings")), // Optional until matched with warehouse stock
    requesterId: v.optional(v.id("users")),
    requesterName: v.string(),
    requestType: v.union(v.literal("self"), v.literal("third_party"), v.literal("ngo")),
    location: v.string(), // Where to deliver
    beneficiaryPhotoId: v.optional(v.id("_storage")), // Proof required for third-party requests
    deliveryProofPhotoId: v.optional(v.id("_storage")),
    deliveryDistanceKm: v.optional(v.number()),
    etaMinutes: v.optional(v.number()),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"), // Delivery volunteer assigned
      v.literal("completed")
    ),
    volunteerId: v.optional(v.id("users")), // Volunteer assigned to delivery
  }),
});
