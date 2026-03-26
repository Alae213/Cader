import { query, mutation } from "../_generated/server";
import { v } from "convex/values";

// List categories for a community (ordered by order field)
export const listCategories = query({
  args: {
    communityId: v.id("communities"),
  },
  handler: async (ctx, args) => {
    const categories = await ctx.db
      .query("categories")
      .withIndex("by_community_id", (q) => q.eq("communityId", args.communityId))
      .collect();

    // Sort by order
    categories.sort((a: { order: number }, b: { order: number }) => a.order - b.order);

    return categories;
  },
});

// Create a new category (owner/admin only, max 10 per community)
export const createCategory = mutation({
  args: {
    communityId: v.id("communities"),
    name: v.string(),
    color: v.string(),
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

    // Check max categories (10)
    const existingCategories = await ctx.db
      .query("categories")
      .withIndex("by_community_id", (q) => q.eq("communityId", args.communityId))
      .collect();

    if (existingCategories.length >= 10) {
      throw new Error("Maximum 10 categories allowed per community");
    }

    // Check for duplicate name (case-insensitive)
    const duplicateName = existingCategories.find(
      (c: { name: string }) => c.name.toLowerCase() === args.name.toLowerCase()
    );
    if (duplicateName) {
      throw new Error("A category with this name already exists");
    }

    // Get the next order value
    const maxOrder = existingCategories.reduce(
      (max: number, c: { order: number }) => Math.max(max, c.order),
      -1
    );

    const now = Date.now();
    const categoryId = await ctx.db.insert("categories", {
      communityId: args.communityId,
      name: args.name,
      color: args.color,
      order: maxOrder + 1,
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
    color: v.optional(v.string()),
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

      const duplicateName = existingCategories.find(
        (c) => c._id !== args.categoryId && c.name.toLowerCase() === (args.name ?? "").toLowerCase()
      );
      if (duplicateName) {
        throw new Error("A category with this name already exists");
      }
    }

    // Build update object
    const updateFields: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) {
      updateFields.name = args.name;
    }
    if (args.color !== undefined) {
      updateFields.color = args.color;
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

    // Reorder remaining categories
    const remainingCategories = await ctx.db
      .query("categories")
      .withIndex("by_community_id", (q) => q.eq("communityId", category.communityId))
      .collect();

    remainingCategories.sort((a: { order: number }, b: { order: number }) => a.order - b.order);

    for (let i = 0; i < remainingCategories.length; i++) {
      await ctx.db.patch(remainingCategories[i]._id, {
        order: i,
        updatedAt: Date.now(),
      });
    }

    return args.categoryId;
  },
});

// Reorder categories (owner/admin only)
export const reorderCategories = mutation({
  args: {
    communityId: v.id("communities"),
    categoryIds: v.array(v.id("categories")),
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
      throw new Error("Only the owner or admin can reorder categories");
    }

    // Validate all categoryIds belong to this community
    const categories = await ctx.db
      .query("categories")
      .withIndex("by_community_id", (q) => q.eq("communityId", args.communityId))
      .collect();

    const categoryMap = new Map(categories.map((c) => [c._id, c]));

    if (args.categoryIds.length !== categories.length) {
      throw new Error("Category count mismatch");
    }

    for (const catId of args.categoryIds) {
      if (!categoryMap.has(catId)) {
        throw new Error("Invalid category ID");
      }
    }

    // Update order for each category
    const now = Date.now();
    for (let i = 0; i < args.categoryIds.length; i++) {
      await ctx.db.patch(args.categoryIds[i], {
        order: i,
        updatedAt: now,
      });
    }

    return args.categoryIds;
  },
});