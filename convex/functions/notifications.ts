import { query, mutation } from "../_generated/server";
import { v } from "convex/values";

// Search members by name within a community
export const searchMembers = query({
  args: {
    communityId: v.id("communities"),
    searchQuery: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.searchQuery || args.searchQuery.trim().length < 2) {
      return [];
    }

    const searchLower = args.searchQuery.toLowerCase().trim();

    // Get all active memberships for this community
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_community_id", (q) => q.eq("communityId", args.communityId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    // Get user data and filter by search query
    const matchingMembers = await Promise.all(
      memberships.map(async (membership) => {
        const user = await ctx.db.get(membership.userId);
        if (!user) return null;

        // Case-insensitive partial match on display name
        if (
          user.displayName.toLowerCase().includes(searchLower) ||
          user.displayName
            .toLowerCase()
            .split(" ")
            .some((part) => part.startsWith(searchLower))
        ) {
          return {
            userId: user._id,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
          };
        }

        return null;
      })
    );

    // Filter out nulls and limit to 10 results
    return matchingMembers
      .filter((m): m is NonNullable<typeof m> => m != null)
      .slice(0, 10);
  },
});

// Get notifications for a user
export const getNotifications = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    // Get the user from our database
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      return [];
    }

    // Get notifications for this user — bounded read
    const limit = args.limit || 20;
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_recipient_id", (q) => q.eq("recipientId", user._id))
      .filter((q) => q.eq(q.field("isRead"), false))
      .take(limit);

    // Sort by createdAt descending
    notifications.sort((a, b) => b.createdAt - a.createdAt);

    return notifications;
  },
});

// Get unread notification count
export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    // Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return 0;
    }

    // Get the user from our database
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      return 0;
    }

    // Bounded count: if there are 100+ unread, just return 100+ (Fix #3)
    // Using .take() instead of .collect() to avoid reading all unread notifications
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_recipient_id", (q) => q.eq("recipientId", user._id))
      .filter((q) => q.eq(q.field("isRead"), false))
      .take(101);

    return notifications.length >= 100 ? 100 : notifications.length;
  },
});

// Mark notification as read
export const markNotificationRead = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    // Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("You must be signed in");
    }

    // Get the user from our database
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Get the notification
    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }

    // Verify ownership
    if (notification.recipientId !== user._id) {
      throw new Error("Not authorized");
    }

    // Mark as read
    await ctx.db.patch(args.notificationId, {
      isRead: true,
    });

    return args.notificationId;
  },
});

// Mark all notifications as read
export const markAllNotificationsRead = mutation({
  args: {},
  handler: async (ctx) => {
    // Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("You must be signed in");
    }

    // Get the user from our database
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Get all unread notifications — bounded in batches
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_recipient_id", (q) => q.eq("recipientId", user._id))
      .filter((q) => q.eq(q.field("isRead"), false))
      .take(200); // bounded: mark up to 200 at a time

    // Mark all as read
    for (const notification of notifications) {
      await ctx.db.patch(notification._id, {
        isRead: true,
      });
    }

    return { markedRead: notifications.length };
  },
});

// Create a notification (internal function, called from other mutations)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function _createNotification(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  recipientId: string,
  senderId: string | null,
  type: string,
  message: string,
  referenceType?: string,
  referenceId?: string
) {
  return await ctx.db.insert("notifications", {
    recipientId,
    senderId,
    type,
    message,
    referenceType,
    referenceId,
    isRead: false,
    createdAt: Date.now(),
  });
}

// Get notification preferences for the current user
export const getNotificationPreferences = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return null;

    const prefs = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .first();

    // Return defaults if no preferences exist
    return prefs || {
      userId: user._id,
      emailEnabled: true,
      inAppEnabled: true,
      commentOnPost: true,
      mention: true,
      newMember: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  },
});

// Update notification preferences for the current user
export const updateNotificationPreferences = mutation({
  args: {
    emailEnabled: v.optional(v.boolean()),
    inAppEnabled: v.optional(v.boolean()),
    commentOnPost: v.optional(v.boolean()),
    mention: v.optional(v.boolean()),
    newMember: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("You must be signed in");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const existing = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .first();

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.emailEnabled !== undefined) updates.emailEnabled = args.emailEnabled;
    if (args.inAppEnabled !== undefined) updates.inAppEnabled = args.inAppEnabled;
    if (args.commentOnPost !== undefined) updates.commentOnPost = args.commentOnPost;
    if (args.mention !== undefined) updates.mention = args.mention;
    if (args.newMember !== undefined) updates.newMember = args.newMember;

    if (existing) {
      await ctx.db.patch(existing._id, updates);
    } else {
      await ctx.db.insert("notificationPreferences", {
        userId: user._id,
        emailEnabled: args.emailEnabled ?? true,
        inAppEnabled: args.inAppEnabled ?? true,
        commentOnPost: args.commentOnPost ?? true,
        mention: args.mention ?? true,
        newMember: args.newMember ?? true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return true;
  },
});
