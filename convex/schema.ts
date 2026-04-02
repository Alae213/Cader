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
    bio: v.optional(v.string()), // Max 160 chars - user profile bio
    wilaya: v.optional(v.string()), // Algerian wilaya (58 options)
    timezone: v.optional(v.string()), // IANA timezone for streak day boundaries (e.g. "Africa/Algiers")
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()),
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
    wilaya: v.optional(v.string()), // Deprecated - kept for data migration

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

    // Denormalized counters (avoid scanning memberships table)
    activeMemberCount: v.optional(v.number()),

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
    color: v.string(), // hex color #RRGGBB
    order: v.number(), // drag‑and‑drop order
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_community_id", ["communityId"])
    .index("by_community_and_name", ["communityId", "name"])
    .index("by_community_and_order", ["communityId", "order"]),

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
    .index("by_community_and_pinned_and_created", ["communityId", "isPinned", "createdAt"])
    .index("by_community_and_category_and_pinned_and_created", ["communityId", "categoryId", "isPinned", "createdAt"]),

  // Comments on posts
  comments: defineTable({
    postId: v.id("posts"),
    authorId: v.id("users"),
    parentCommentId: v.optional(v.id("comments")),
    
    content: v.string(),
    mentions: v.optional(v.array(v.id("users"))),
    mediaUrls: v.optional(v.array(v.string())),
    
    upvoteCount: v.optional(v.number()),
    
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

  // Comment Upvotes - one per user per comment
  commentUpvotes: defineTable({
    commentId: v.id("comments"),
    userId: v.id("users"),
    createdAt: v.number(),
  }).index("by_comment_id", ["commentId"])
    .index("by_user_id", ["userId"])
    .index("by_comment_and_user", ["commentId", "userId"]),

  // Point events - append-only log for gamification
  pointEvents: defineTable({
    communityId: v.id("communities"),
    userId: v.id("users"),

    // User who triggered the event (for interaction-driven events like upvotes)
    actorUserId: v.optional(v.id("users")),

    eventType: v.union(
      // Post events
      v.literal("post_created_awarded"),
      v.literal("post_created_reversed"),
      // Comment events
      v.literal("comment_created_awarded"),
      v.literal("comment_created_reversed"),
      // Upvote events
      v.literal("post_upvote_received"),
      v.literal("post_upvote_reversed"),
      v.literal("comment_upvote_received"),
      v.literal("comment_upvote_reversed"),
      // Lesson events
      v.literal("lesson_completed_awarded"),
      // Streak events
      v.literal("streak_day_awarded"),
      v.literal("streak_bonus"),
      v.literal("streak_reversal"),
      // Legacy aliases (kept for backward compatibility with existing data)
      v.literal("post"),
      v.literal("comment"),
      v.literal("upvote_received"),
      v.literal("upvote_given"),
      v.literal("lesson_completed"),
      v.literal("upvote_reversal"),
      v.literal("post_deletion"),
      v.literal("comment_deletion")
    ),

    points: v.number(),
    sourceType: v.optional(v.union(v.literal("post"), v.literal("comment"), v.literal("lesson"), v.literal("streak"))),
    sourceId: v.optional(v.string()), // Can be postId or commentId

    createdAt: v.number(),
  }).index("by_community_id", ["communityId"])
    .index("by_user_id", ["userId"])
    .index("by_created_at", ["createdAt"])
    // Composite indexes for efficient leaderboard and dedup queries
    .index("by_community_and_user", ["communityId", "userId"])
    .index("by_user_event_source", ["userId", "eventType", "sourceId"])
    .index("by_user_community_created", ["userId", "communityId", "createdAt"]),

  // Classrooms - structured courses within a community
  classrooms: defineTable({
    communityId: v.id("communities"),
    
    title: v.string(),
    description: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    
    // Access rules
    accessType: v.union(v.literal("open"), v.literal("level"), v.literal("price"), v.literal("level_and_price")),
    minLevel: v.optional(v.number()),
    priceDzd: v.optional(v.number()),
    
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_community_id", ["communityId"])
    .index("by_community_and_access", ["communityId", "accessType", "minLevel"]),

  // Chapters - folders within a classroom (formerly modules)
  // Note: Keeping 'modules' table name for backward compatibility with existing data
  // In v2, this will be renamed to 'chapters'
  modules: defineTable({
    classroomId: v.id("classrooms"),
    title: v.string(),
    order: v.number(),
    createdAt: v.number(),
  }).index("by_classroom_id", ["classroomId"]),

  // Pages - lessons within a chapter
  // Note: 'moduleId' kept for backward compatibility, 'chapterId' alias in queries
  pages: defineTable({
    moduleId: v.id("modules"),
    
    title: v.string(),
    content: v.string(), // JSON string of blocks (legacy)
    videoUrl: v.optional(v.string()), // Video embed URL (YouTube/Vimeo/GDrive)
    description: v.optional(v.string()), // Plain text description
    
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
    .index("by_classroom_and_user", ["classroomId", "userId"])
    .index("by_user_and_page", ["userId", "pageId"]),

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

  // Notification preferences - per-user notification settings
  notificationPreferences: defineTable({
    userId: v.id("users"),
    
    // Global toggles
    emailEnabled: v.boolean(),
    inAppEnabled: v.boolean(),
    
    // Event-specific toggles
    commentOnPost: v.boolean(),
    mention: v.boolean(),
    newMember: v.boolean(), // Owner only
    
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user_id", ["userId"]),

  // Rate limits - server-side abuse prevention (SECURITY: C-5)
  rateLimits: defineTable({
    userId: v.string(), // tokenIdentifier from Clerk
    action: v.union(
      v.literal("community_creation"),
      v.literal("post_creation"),
      v.literal("comment_creation"),
      v.literal("checkout_creation"),
    ),
    timestamp: v.number(),
  }).index("by_user_and_action", ["userId", "action"])
    .index("by_timestamp", ["timestamp"]),

  // Poll votes - one per user per poll (M-3: prevents duplicate voting)
  pollVotes: defineTable({
    postId: v.id("posts"),
    userId: v.id("users"),
    optionIndex: v.number(),
    createdAt: v.number(),
  }).index("by_post_id", ["postId"])
    .index("by_user_id", ["userId"])
    .index("by_post_and_user", ["postId", "userId"]),
});
