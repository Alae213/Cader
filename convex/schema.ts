import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users - synced from Clerk via webhook
  users: defineTable({
    clerkId: v.string(),
    displayName: v.string(),
    email: v.string(),
    avatarUrl: v.optional(v.string()),
    phone: v.optional(v.string()),
    wilaya: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  // Communities - created by users
  communities: defineTable({
    slug: v.string(),
    name: v.string(),
    tagline: v.optional(v.string()),
    description: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    links: v.optional(v.array(v.string())),
    wilaya: v.optional(v.string()),
    
    // Ownership
    ownerId: v.id("users"),
    
    // Pricing
    pricingType: v.union(v.literal("free"), v.literal("monthly"), v.literal("annual"), v.literal("one_time")),
    priceDzd: v.optional(v.number()),
    
    // Chargily keys (encrypted)
    chargilyApiKey: v.optional(v.string()),
    chargilyWebhookSecret: v.optional(v.string()),
    
    // Platform tier
    platformTier: v.optional(v.union(v.literal("free"), v.literal("subscribed"))),
    
    // Limits
    memberLimit: v.number(),
    
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_slug", ["slug"])
    .index("by_owner_id", ["ownerId"]),

  // Memberships - community members
  memberships: defineTable({
    communityId: v.id("communities"),
    userId: v.id("users"),
    role: v.union(v.literal("member"), v.literal("admin"), v.literal("owner")),
    status: v.union(v.literal("active"), v.literal("inactive"), v.literal("blocked"), v.literal("pending")),
    
    // Payment tracking
    subscriptionType: v.optional(v.union(v.literal("free"), v.literal("monthly"), v.literal("annual"), v.literal("one_time"))),
    subscriptionStartDate: v.optional(v.number()),
    subscriptionEndDate: v.optional(v.number()),
    paymentReference: v.optional(v.string()),
    
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_community_id", ["communityId"])
    .index("by_user_id", ["userId"])
    .index("by_community_and_user", ["communityId", "userId"])
    .index("by_status", ["status"]),

  // Categories - for organizing posts within a community
  categories: defineTable({
    communityId: v.id("communities"),
    name: v.string(),
    color: v.string(),
    createdAt: v.number(),
  }).index("by_community_id", ["communityId"]),

  // Posts in community feed
  posts: defineTable({
    communityId: v.id("communities"),
    authorId: v.id("users"),
    categoryId: v.optional(v.id("categories")),
    
    // Content
    content: v.string(),
    contentType: v.union(v.literal("text"), v.literal("image"), v.literal("video"), v.literal("gif"), v.literal("poll")),
    
    // Media
    mediaUrls: v.optional(v.array(v.string())),
    videoUrl: v.optional(v.string()),
    
    // Poll
    pollOptions: v.optional(v.array(v.object({
      text: v.string(),
      votes: v.number(),
    }))),
    pollEndDate: v.optional(v.number()),
    
    // Pinning
    isPinned: v.boolean(),
    
    // Mentions
    mentions: v.optional(v.array(v.id("users"))),
    
    // Counts
    upvoteCount: v.number(),
    commentCount: v.number(),
    
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_community_id", ["communityId"])
    .index("by_author_id", ["authorId"])
    .index("by_category_id", ["categoryId"])
    .index("by_created_at", ["createdAt"])
    .index("by_pinned", ["isPinned"]),

  // Comments on posts
  comments: defineTable({
    postId: v.id("posts"),
    authorId: v.id("users"),
    parentCommentId: v.optional(v.id("comments")),
    
    content: v.string(),
    mentions: v.optional(v.array(v.id("users"))),
    
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_post_id", ["postId"])
    .index("by_author_id", ["authorId"])
    .index("by_parent_comment_id", ["parentCommentId"]),

  // Upvotes - one per user per post
  upvotes: defineTable({
    postId: v.id("posts"),
    userId: v.id("users"),
    createdAt: v.number(),
  }).index("by_post_id", ["postId"])
    .index("by_user_id", ["userId"])
    .index("by_post_and_user", ["postId", "userId"]),

  // Point events - append-only log for gamification
  pointEvents: defineTable({
    communityId: v.id("communities"),
    userId: v.id("users"),
    
    eventType: v.union(
      v.literal("post"),
      v.literal("comment"),
      v.literal("upvote_received"),
      v.literal("upvote_given"),
      v.literal("lesson_completed"),
      v.literal("streak_bonus"),
      v.literal("streak_reversal"),
      v.literal("upvote_reversal"),
      v.literal("post_deletion"),
      v.literal("comment_deletion")
    ),
    
    points: v.number(),
    sourceType: v.optional(v.union(v.literal("post"), v.literal("comment"))),
    sourceId: v.optional(v.id("posts")),
    
    createdAt: v.number(),
  }).index("by_community_id", ["communityId"])
    .index("by_user_id", ["userId"])
    .index("by_created_at", ["createdAt"]),

  // Classrooms - structured courses within a community
  classrooms: defineTable({
    communityId: v.id("communities"),
    
    title: v.string(),
    thumbnailUrl: v.optional(v.string()),
    
    // Access rules
    accessType: v.union(v.literal("open"), v.literal("level"), v.literal("price"), v.literal("level_and_price")),
    minLevel: v.optional(v.number()),
    priceDzd: v.optional(v.number()),
    
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_community_id", ["communityId"]),

  // Modules - chapters within a classroom
  modules: defineTable({
    classroomId: v.id("classrooms"),
    title: v.string(),
    order: v.number(),
    createdAt: v.number(),
  }).index("by_classroom_id", ["classroomId"]),

  // Pages - lessons within a module
  pages: defineTable({
    moduleId: v.id("modules"),
    
    title: v.string(),
    content: v.string(), // JSON string of blocks
    order: v.number(),
    
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_module_id", ["moduleId"]),

  // Lesson progress - tracks member progress through classrooms
  lessonProgress: defineTable({
    classroomId: v.id("classrooms"),
    userId: v.id("users"),
    pageId: v.id("pages"),
    
    completedAt: v.number(),
  }).index("by_classroom_id", ["classroomId"])
    .index("by_user_id", ["userId"])
    .index("by_classroom_and_user", ["classroomId", "userId"]),

  // Classroom access - tracks which members have access to which classrooms
  classroomAccess: defineTable({
    classroomId: v.id("classrooms"),
    userId: v.id("users"),
    accessType: v.union(v.literal("free"), v.literal("purchased"), v.literal("level_unlocked")),
    
    purchasedAt: v.optional(v.number()),
    paymentReference: v.optional(v.string()),
    
    createdAt: v.number(),
  }).index("by_classroom_id", ["classroomId"])
    .index("by_user_id", ["userId"])
    .index("by_classroom_and_user", ["classroomId", "userId"]),

  // Notifications - user notifications
  notifications: defineTable({
    recipientId: v.id("users"),
    senderId: v.optional(v.id("users")),
    
    type: v.union(
      v.literal("mention"),
      v.literal("reply"),
      v.literal("upvote"),
      v.literal("new_post"),
      v.literal("membership_granted")
    ),
    
    referenceType: v.optional(v.union(v.literal("post"), v.literal("comment"))),
    referenceId: v.optional(v.id("posts")),
    
    message: v.string(),
    isRead: v.boolean(),
    
    createdAt: v.number(),
  }).index("by_recipient_id", ["recipientId"])
    .index("by_read", ["isRead"])
    .index("by_created_at", ["createdAt"]),
});
