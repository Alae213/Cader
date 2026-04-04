import { query, mutation } from "../_generated/server";
import { v } from "convex/values";

// List categories for a community
export const listCategories = query({
  args: {
    communityId: v.id("communities"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("categories")
      .withIndex("by_community_id", (q) => q.eq("communityId", args.communityId))
      .collect();
  },
});

// Create a new category (owner/admin only, max 5 per community)
export const createCategory = mutation({
  args: {
    communityId: v.id("communities"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("You must be signed in");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Check if user is owner or admin
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_community_and_user", (q) =>
        q.eq("communityId", args.communityId).eq("userId", user._id)
      )
      .first();

    if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
      throw new Error("Only the owner or admin can create categories");
    }

    // Validate name length
    if (args.name.length < 1 || args.name.length > 30) {
      throw new Error("Category name must be between 1 and 30 characters");
    }

    // Check max categories (5)
    const existingCategories = await ctx.db
      .query("categories")
      .withIndex("by_community_id", (q) => q.eq("communityId", args.communityId))
      .collect();

    if (existingCategories.length >= 5) {
      throw new Error("Maximum 5 categories allowed per community");
    }

    // Check for duplicate name (case-insensitive)
    const duplicateName = existingCategories.find(
      (c) => c.name.toLowerCase() === args.name.toLowerCase()
    );
    if (duplicateName) {
      throw new Error("A category with this name already exists");
    }

    const now = Date.now();
    const categoryId = await ctx.db.insert("categories", {
      communityId: args.communityId,
      name: args.name,
      createdAt: now,
      updatedAt: now,
    });

    return categoryId;
  },
});

// Update a category (owner/admin only)
export const updateCategory = mutation({
  args: {
    categoryId: v.id("categories"),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("You must be signed in");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new Error("Category not found");
    }

    // Check if user is owner or admin
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_community_and_user", (q) =>
        q.eq("communityId", category.communityId).eq("userId", user._id)
      )
      .first();

    if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
      throw new Error("Only the owner or admin can update categories");
    }

    // Validate name if provided
    if (args.name !== undefined) {
      if (args.name.length < 1 || args.name.length > 30) {
        throw new Error("Category name must be between 1 and 30 characters");
      }

      // Check for duplicate name (excluding current category)
      const existingCategories = await ctx.db
        .query("categories")
        .withIndex("by_community_id", (q) => q.eq("communityId", category.communityId))
        .collect();

      const newName = args.name ?? "";
      const duplicateName = existingCategories.find(
        (c) => c._id !== args.categoryId && c.name.toLowerCase() === newName.toLowerCase()
      );
      if (duplicateName) {
        throw new Error("A category with this name already exists");
      }
    }

    const updateFields: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) {
      updateFields.name = args.name;
    }

    await ctx.db.patch(args.categoryId, updateFields);

    return args.categoryId;
  },
});

// Delete a category (owner/admin only)
export const deleteCategory = mutation({
  args: {
    categoryId: v.id("categories"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("You must be signed in");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new Error("Category not found");
    }

    // Check if user is owner or admin
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_community_and_user", (q) =>
        q.eq("communityId", category.communityId).eq("userId", user._id)
      )
      .first();

    if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
      throw new Error("Only the owner or admin can delete categories");
    }

    // Remove category from all posts in this community
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_category_id", (q) => q.eq("categoryId", args.categoryId))
      .collect();

    for (const post of posts) {
      await ctx.db.patch(post._id, {
        categoryId: undefined,
        updatedAt: Date.now(),
      });
    }

    // Delete the category
    await ctx.db.delete(args.categoryId);

    return args.categoryId;
  },
});
