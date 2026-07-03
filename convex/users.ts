import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createUser = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    // Check if user exists by email, if not create
    const existing = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();
    if (existing) return existing._id;
    
    return await ctx.db.insert("users", {
      ...args,
      earnings: 0,
    });
  },
});

export const getUser = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getVolunteers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").filter(q => q.eq(q.field("role"), "volunteer")).collect();
  },
});

export const withdrawEarnings = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, { earnings: 0 });
  }
});
