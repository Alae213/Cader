import { query, mutation } from "../_generated/server";
import { v } from "convex/values";

// List classrooms for a community (with access status for current user)
export const listClassrooms = query({
  args: {
    communityId: v.id("communities"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const classrooms = await ctx.db
      .query("classrooms")
      .withIndex("by_community_id", (q) => q.eq("communityId", args.communityId))
      .collect();

    // If no user provided, return classrooms without access info
    if (!args.userId) {
      return classrooms.map((c) => ({
        ...c,
        hasAccess: false,
        progress: 0,
      }));
    }

    // Get user's membership to check role
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_community_and_user", (q) =>
        q.eq("communityId", args.communityId).eq("userId", args.userId!)
      )
      .first();

    // Get user's classroom access records
    const userAccessRecords = await ctx.db
      .query("classroomAccess")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId!))
      .collect();

    // Get user's lesson progress
    const userProgress = await ctx.db
      .query("lessonProgress")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId!))
      .collect();

    // Calculate progress for each classroom
    const classroomsWithAccess = await Promise.all(
      classrooms.map(async (classroom) => {
        // Owner/admin always has access
        const isOwner = membership && (membership.role === "owner" || membership.role === "admin");
        
        // Check access based on type
        let hasAccess = false;
        
        if (isOwner) {
          hasAccess = true;
        } else if (classroom.accessType === "open") {
          hasAccess = membership?.status === "active";
        } else if (classroom.accessType === "level") {
          // For level-gated, need to check user's points/level
          // For MVP, we'll simplify: if they're a member, they can access
          hasAccess = membership?.status === "active";
        } else if (classroom.accessType === "price") {
          const accessRecord = userAccessRecords.find(
            (a) => a.classroomId === classroom._id
          );
          hasAccess = !!accessRecord;
        } else if (classroom.accessType === "level_and_price") {
          // Need BOTH level and purchase
          const accessRecord = userAccessRecords.find(
            (a) => a.classroomId === classroom._id
          );
          hasAccess = membership?.status === "active" && !!accessRecord;
        }

        // Calculate progress (lessons completed / total lessons)
        let progress = 0;
        if (hasAccess) {
          const classroomModules = await ctx.db
            .query("modules")
            .withIndex("by_classroom_id", (q) => q.eq("classroomId", classroom._id))
            .collect();

          const allPageIds: string[] = [];
          for (const mod of classroomModules) {
            const modPages = await ctx.db
              .query("pages")
              .withIndex("by_module_id", (q) => q.eq("moduleId", mod._id))
              .collect();
            allPageIds.push(...modPages.map((p) => p._id));
          }

          const viewedPages = userProgress.filter(
            (p) => p.classroomId === classroom._id && allPageIds.includes(p.pageId)
          );

          progress = allPageIds.length > 0 
            ? Math.round((viewedPages.length / allPageIds.length) * 100)
            : 0;
        }

        return {
          ...classroom,
          hasAccess,
          progress,
        };
      })
    );

    return classroomsWithAccess;
  },
});

// Get classroom content (module/page tree + current page content)
export const getClassroomContent = query({
  args: {
    classroomId: v.id("classrooms"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const classroom = await ctx.db.get(args.classroomId);
    if (!classroom) return null;

    // Get modules (chapters) for this classroom
    const modules = await ctx.db
      .query("modules")
      .withIndex("by_classroom_id", (q) => q.eq("classroomId", classroom._id))
      .collect();

    // Sort by order
    modules.sort((a, b) => a.order - b.order);

    // Get pages for each module
    const modulesWithPages = await Promise.all(
      modules.map(async (mod) => {
        const pages = await ctx.db
          .query("pages")
          .withIndex("by_module_id", (q) => q.eq("moduleId", mod._id))
          .collect();

          // Sort pages by order
        pages.sort((a, b) => a.order - b.order);

        // Get viewed pages for this user
        const viewedPageIds: Set<string> = new Set();
        if (args.userId) {
          const progressRecords = await ctx.db
            .query("lessonProgress")
            .withIndex("by_user_id", (q) => q.eq("userId", args.userId!))
            .collect();
          // Filter to this classroom's pages
          const pageIds = new Set(pages.map(p => p._id));
          progressRecords.forEach(pr => {
            if (pageIds.has(pr.pageId)) {
              viewedPageIds.add(pr.pageId);
            }
          });
        }

        return {
          ...mod,
          pages: pages.map((p) => ({
            _id: p._id,
            title: p.title,
            order: p.order,
            isViewed: viewedPageIds.has(p._id),
          })),
        };
      })
    );

    // Check access if user provided
    let hasAccess = false;
    if (args.userId) {
      await ctx.db.get(classroom.communityId); // Verify community exists
      const membership = await ctx.db
        .query("memberships")
        .withIndex("by_community_and_user", (q) =>
          q.eq("communityId", classroom.communityId).eq("userId", args.userId!)
        )
        .first();

      const isOwner = membership && (membership.role === "owner" || membership.role === "admin");

      if (isOwner) {
        hasAccess = true;
      } else if (classroom.accessType === "open") {
        hasAccess = membership?.status === "active";
      } else if (classroom.accessType === "price") {
        const accessRecord = await ctx.db
          .query("classroomAccess")
          .withIndex("by_classroom_and_user", (q) =>
            q.eq("classroomId", classroom._id).eq("userId", args.userId!)
          )
          .first();
        hasAccess = !!accessRecord;
      } else if (classroom.accessType === "level_and_price") {
        const accessRecord = await ctx.db
          .query("classroomAccess")
          .withIndex("by_classroom_and_user", (q) =>
            q.eq("classroomId", classroom._id).eq("userId", args.userId!)
          )
          .first();
        hasAccess = membership?.status === "active" && !!accessRecord;
      }
    }

    return {
      ...classroom,
      modules: modulesWithPages,
      hasAccess,
    };
  },
});

// Get page content (for viewer)
export const getPageContent = query({
  args: {
    pageId: v.id("pages"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const page = await ctx.db.get(args.pageId);
    if (!page) return null;

    const moduleData = await ctx.db.get(page.moduleId);
    if (!moduleData) return null;

    const classroom = await ctx.db.get(moduleData.classroomId);
    if (!classroom) return null;

    // Check access if user provided
    let hasAccess = false;
    if (args.userId) {
      const membership = await ctx.db
        .query("memberships")
        .withIndex("by_community_and_user", (q) =>
          q.eq("communityId", classroom.communityId).eq("userId", args.userId!)
        )
        .first();

      const isOwner = membership && (membership.role === "owner" || membership.role === "admin");

      if (isOwner) {
        hasAccess = true;
      } else if (classroom.accessType === "open") {
        hasAccess = membership?.status === "active";
      } else if (classroom.accessType === "level") {
        hasAccess = membership?.status === "active";
      } else if (classroom.accessType === "price") {
        const accessRecord = await ctx.db
          .query("classroomAccess")
          .withIndex("by_classroom_and_user", (q) =>
            q.eq("classroomId", classroom._id).eq("userId", args.userId!)
          )
          .first();
        hasAccess = !!accessRecord;
      } else if (classroom.accessType === "level_and_price") {
        const accessRecord = await ctx.db
          .query("classroomAccess")
          .withIndex("by_classroom_and_user", (q) =>
            q.eq("classroomId", classroom._id).eq("userId", args.userId!)
          )
          .first();
        hasAccess = membership?.status === "active" && !!accessRecord;
      }
    }

    // Get user's progress for this page
    let isViewed = false;
    if (args.userId && hasAccess) {
      const progressRecord = await ctx.db
        .query("lessonProgress")
        .withIndex("by_user_and_page", (q) =>
          q.eq("userId", args.userId!).eq("pageId", args.pageId)
        )
        .first();
      // Check if this page is in the progress
      isViewed = !!progressRecord;
    }

    return {
      _id: page._id,
      title: page.title,
      content: page.content,
      videoUrl: page.videoUrl,
      description: page.description,
      order: page.order,
      moduleId: page.moduleId,
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
      moduleTitle: moduleData.title,
      classroomTitle: classroom.title,
      classroomId: classroom._id,
      hasAccess,
      isViewed,
    };
  },
});

// Mark a page as viewed
export const markPageViewed = mutation({
  args: {
    pageId: v.id("pages"),
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

    const page = await ctx.db.get(args.pageId);
    if (!page) {
      throw new Error("Page not found");
    }

    const moduleData = await ctx.db.get(page.moduleId);
    if (!moduleData) {
      throw new Error("Module not found");
    }

    const classroom = await ctx.db.get(moduleData.classroomId);
    if (!classroom) {
      throw new Error("Classroom not found");
    }

    // Check membership and access
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_community_and_user", (q) =>
        q.eq("communityId", classroom.communityId).eq("userId", user._id)
      )
      .first();

    if (!membership || membership.status !== "active") {
      throw new Error("You must be a member to track progress");
    }

    // Check classroom access
    let hasAccess = false;
    const isOwner = membership.role === "owner" || membership.role === "admin";

    if (isOwner) {
      hasAccess = true;
    } else if (classroom.accessType === "open") {
      hasAccess = true;
    } else if (classroom.accessType === "level") {
      hasAccess = true;
    } else if (classroom.accessType === "price") {
      const accessRecord = await ctx.db
        .query("classroomAccess")
        .withIndex("by_classroom_and_user", (q) =>
          q.eq("classroomId", classroom._id).eq("userId", user._id)
        )
        .first();
      hasAccess = !!accessRecord;
    } else if (classroom.accessType === "level_and_price") {
      const accessRecord = await ctx.db
        .query("classroomAccess")
        .withIndex("by_classroom_and_user", (q) =>
          q.eq("classroomId", classroom._id).eq("userId", user._id)
        )
        .first();
      hasAccess = !!accessRecord;
    }

    if (!hasAccess) {
      throw new Error("You don't have access to this classroom");
    }

    // Check if already viewed (filter manually since pageId is not indexed)
    const existingProgress = await ctx.db
      .query("lessonProgress")
      .withIndex("by_classroom_and_user", (q) =>
        q.eq("classroomId", classroom._id).eq("userId", user._id)
      )
      .collect();
    
    const pageAlreadyViewed = existingProgress.find(p => p.pageId === args.pageId);

    if (pageAlreadyViewed) {
      return pageAlreadyViewed._id; // Already tracked
    }

    // Create progress record
    const progressId = await ctx.db.insert("lessonProgress", {
      classroomId: classroom._id,
      userId: user._id,
      pageId: args.pageId,
      completedAt: Date.now(),
    });

    return progressId;
  },
});

// Create a classroom (owner only)
export const createClassroom = mutation({
  args: {
    communityId: v.id("communities"),
    title: v.string(),
    description: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    accessType: v.union(v.literal("open"), v.literal("level"), v.literal("price"), v.literal("level_and_price")),
    minLevel: v.optional(v.number()),
    priceDzd: v.optional(v.number()),
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

    const community = await ctx.db.get(args.communityId);
    if (!community) {
      throw new Error("Community not found");
    }

    // Check ownership
    if (community.ownerId !== user._id) {
      throw new Error("Only the community owner can create classrooms");
    }

    // Validate access type
    if ((args.accessType === "price" || args.accessType === "level_and_price") && !args.priceDzd) {
      throw new Error("Price is required for price-gated classrooms");
    }

    if ((args.accessType === "level" || args.accessType === "level_and_price") && !args.minLevel) {
      throw new Error("Minimum level is required for level-gated classrooms");
    }

    const now = Date.now();
    const classroomId = await ctx.db.insert("classrooms", {
      communityId: args.communityId,
      title: args.title,
      description: args.description,
      thumbnailUrl: args.thumbnailUrl,
      accessType: args.accessType,
      minLevel: args.minLevel,
      priceDzd: args.priceDzd,
      createdAt: now,
      updatedAt: now,
    });

    return classroomId;
  },
});

// Update a classroom (owner only)
export const updateClassroom = mutation({
  args: {
    classroomId: v.id("classrooms"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    accessType: v.optional(v.union(v.literal("open"), v.literal("level"), v.literal("price"), v.literal("level_and_price"))),
    minLevel: v.optional(v.number()),
    priceDzd: v.optional(v.number()),
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

    const classroom = await ctx.db.get(args.classroomId);
    if (!classroom) {
      throw new Error("Classroom not found");
    }

    const community = await ctx.db.get(classroom.communityId);
    if (!community) {
      throw new Error("Community not found");
    }

    // Check ownership
    if (community.ownerId !== user._id) {
      throw new Error("Only the community owner can update classrooms");
    }

    const updateData: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.title !== undefined) updateData.title = args.title;
    if (args.description !== undefined) updateData.description = args.description;
    if (args.thumbnailUrl !== undefined) updateData.thumbnailUrl = args.thumbnailUrl;
    if (args.accessType !== undefined) updateData.accessType = args.accessType;
    if (args.minLevel !== undefined) updateData.minLevel = args.minLevel;
    if (args.priceDzd !== undefined) updateData.priceDzd = args.priceDzd;

    await ctx.db.patch(args.classroomId, updateData);

    return args.classroomId;
  },
});

// Delete a classroom (owner only)
export const deleteClassroom = mutation({
  args: {
    classroomId: v.id("classrooms"),
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

    const classroom = await ctx.db.get(args.classroomId);
    if (!classroom) {
      throw new Error("Classroom not found");
    }

    const community = await ctx.db.get(classroom.communityId);
    if (!community) {
      throw new Error("Community not found");
    }

    // Check ownership
    if (community.ownerId !== user._id) {
      throw new Error("Only the community owner can delete classrooms");
    }

    // Delete all modules and pages
    const modules = await ctx.db
      .query("modules")
      .withIndex("by_classroom_id", (q) => q.eq("classroomId", classroom._id))
      .collect();

    for (const mod of modules) {
      const pages = await ctx.db
        .query("pages")
        .withIndex("by_module_id", (q) => q.eq("moduleId", mod._id))
        .collect();

      for (const page of pages) {
        await ctx.db.delete(page._id);
      }
      await ctx.db.delete(mod._id);
    }

    // Delete all classroom access records
    const accessRecords = await ctx.db
      .query("classroomAccess")
      .withIndex("by_classroom_id", (q) => q.eq("classroomId", classroom._id))
      .collect();

    for (const access of accessRecords) {
      await ctx.db.delete(access._id);
    }

    // Delete all lesson progress
    const progressRecords = await ctx.db
      .query("lessonProgress")
      .withIndex("by_classroom_id", (q) => q.eq("classroomId", classroom._id))
      .collect();

    for (const progress of progressRecords) {
      await ctx.db.delete(progress._id);
    }

    // Delete the classroom
    await ctx.db.delete(args.classroomId);

    return args.classroomId;
  },
});

// Create a module (owner only)
export const createModule = mutation({
  args: {
    classroomId: v.id("classrooms"),
    title: v.string(),
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

    const classroom = await ctx.db.get(args.classroomId);
    if (!classroom) {
      throw new Error("Classroom not found");
    }

    const community = await ctx.db.get(classroom.communityId);
    if (!community) {
      throw new Error("Community not found");
    }

    // Check ownership
    if (community.ownerId !== user._id) {
      throw new Error("Only the community owner can create modules");
    }

    // Get current max order
    const existingModules = await ctx.db
      .query("modules")
      .withIndex("by_classroom_id", (q) => q.eq("classroomId", classroom._id))
      .collect();

    const maxOrder = existingModules.reduce((max, m: { order: number }) => Math.max(max, m.order), 0);

    const moduleId = await ctx.db.insert("modules", {
      classroomId: args.classroomId,
      title: args.title,
      order: maxOrder + 1,
      createdAt: Date.now(),
    });

    return moduleId;
  },
});

// Create a page (owner only)
export const createPage = mutation({
  args: {
    moduleId: v.id("modules"),
    title: v.string(),
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

    const moduleData = await ctx.db.get(args.moduleId);
    if (!moduleData) {
      throw new Error("Module not found");
    }

    const classroom = await ctx.db.get(moduleData.classroomId);
    if (!classroom) {
      throw new Error("Classroom not found");
    }

    const community = await ctx.db.get(classroom.communityId);
    if (!community) {
      throw new Error("Community not found");
    }

    // Check ownership
    if (community.ownerId !== user._id) {
      throw new Error("Only the community owner can create pages");
    }

    // Get current max order
    const existingPages = await ctx.db
      .query("pages")
      .withIndex("by_module_id", (q) => q.eq("moduleId", moduleData._id))
      .collect();

    const maxOrder = existingPages.reduce((max, p: { order: number }) => Math.max(max, p.order), 0);

    const now = Date.now();
    const pageId = await ctx.db.insert("pages", {
      moduleId: args.moduleId,
      title: args.title,
      content: "[]", // Empty blocks array
      order: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    });

    return pageId;
  },
});

// Update page/lesson content (owner only)
export const updatePageContent = mutation({
  args: {
    pageId: v.id("pages"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    description: v.optional(v.string()),
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

    const page = await ctx.db.get(args.pageId);
    if (!page) {
      throw new Error("Page not found");
    }

    const moduleData = await ctx.db.get(page.moduleId);
    if (!moduleData) {
      throw new Error("Module not found");
    }

    const classroom = await ctx.db.get(moduleData.classroomId);
    if (!classroom) {
      throw new Error("Classroom not found");
    }

    const community = await ctx.db.get(classroom.communityId);
    if (!community) {
      throw new Error("Community not found");
    }

    // Check ownership
    if (community.ownerId !== user._id) {
      throw new Error("Only the community owner can edit pages");
    }

    const updateData: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.title !== undefined) updateData.title = args.title;
    if (args.content !== undefined) updateData.content = args.content;
    if (args.videoUrl !== undefined) updateData.videoUrl = args.videoUrl;
    if (args.description !== undefined) updateData.description = args.description;

    await ctx.db.patch(args.pageId, updateData);

    return args.pageId;
  },
});

// Update chapter/module title (owner only)
export const updateChapter = mutation({
  args: {
    chapterId: v.id("modules"),
    title: v.string(),
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

    const chapter = await ctx.db.get(args.chapterId);
    if (!chapter) {
      throw new Error("Chapter not found");
    }

    const classroom = await ctx.db.get(chapter.classroomId);
    if (!classroom) {
      throw new Error("Classroom not found");
    }

    const community = await ctx.db.get(classroom.communityId);
    if (!community) {
      throw new Error("Community not found");
    }

    // Check ownership
    if (community.ownerId !== user._id) {
      throw new Error("Only the community owner can edit chapters");
    }

    await ctx.db.patch(args.chapterId, {
      title: args.title,
    });

    return args.chapterId;
  },
});

// Toggle lesson completion (add/remove from lessonProgress)
export const toggleLessonComplete = mutation({
  args: {
    pageId: v.id("pages"),
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

    const page = await ctx.db.get(args.pageId);
    if (!page) {
      throw new Error("Lesson not found");
    }

    // Get the classroomId from the chapter/module
    const chapter = await ctx.db.get(page.moduleId);
    if (!chapter) {
      throw new Error("Chapter not found");
    }

    const classroomId = chapter.classroomId;

    // Check if this specific page is already completed by this user
    const existingProgress = await ctx.db
      .query("lessonProgress")
      .withIndex("by_user_and_page", (q) =>
        q.eq("userId", user._id).eq("pageId", args.pageId)
      )
      .first();

    const isCompleted = !!existingProgress;

    if (isCompleted) {
      // Toggle OFF: remove the progress record
      await ctx.db.delete(existingProgress._id);
    } else {
      // Toggle ON: create new progress record
      await ctx.db.insert("lessonProgress", {
        classroomId,
        userId: user._id,
        pageId: args.pageId,
        completedAt: Date.now(),
      });
    }

    return { pageId: args.pageId, isCompleted: !isCompleted };
  },
});

// Delete a module (owner only)
export const deleteModule = mutation({
  args: {
    moduleId: v.id("modules"),
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

    const moduleData = await ctx.db.get(args.moduleId);
    if (!moduleData) {
      throw new Error("Module not found");
    }

    const classroom = await ctx.db.get(moduleData.classroomId);
    if (!classroom) {
      throw new Error("Classroom not found");
    }

    const community = await ctx.db.get(classroom.communityId);
    if (!community) {
      throw new Error("Community not found");
    }

    // Check ownership
    if (community.ownerId !== user._id) {
      throw new Error("Only the community owner can delete modules");
    }

    // Delete all pages in this module
    const pages = await ctx.db
      .query("pages")
      .withIndex("by_module_id", (q) => q.eq("moduleId", moduleData._id))
      .collect();

    for (const page of pages) {
      await ctx.db.delete(page._id);
    }

    // Delete the module
    await ctx.db.delete(args.moduleId);

    return args.moduleId;
  },
});

// Delete a page (owner only)
export const deletePage = mutation({
  args: {
    pageId: v.id("pages"),
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

    const page = await ctx.db.get(args.pageId);
    if (!page) {
      throw new Error("Page not found");
    }

    const moduleData = await ctx.db.get(page.moduleId);
    if (!moduleData) {
      throw new Error("Module not found");
    }

    const classroom = await ctx.db.get(moduleData.classroomId);
    if (!classroom) {
      throw new Error("Classroom not found");
    }

    const community = await ctx.db.get(classroom.communityId);
    if (!community) {
      throw new Error("Community not found");
    }

    // Check ownership
    if (community.ownerId !== user._id) {
      throw new Error("Only the community owner can delete pages");
    }

    // Delete the page
    await ctx.db.delete(args.pageId);

    return args.pageId;
  },
});

// Reorder chapters (owner only) - update order for multiple chapters
export const reorderChapters = mutation({
  args: {
    classroomId: v.id("classrooms"),
    chapterOrders: v.array(v.object({
      chapterId: v.id("modules"),
      order: v.number(),
    })),
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

    const classroom = await ctx.db.get(args.classroomId);
    if (!classroom) {
      throw new Error("Classroom not found");
    }

    const community = await ctx.db.get(classroom.communityId);
    if (!community) {
      throw new Error("Community not found");
    }

    // Check ownership
    if (community.ownerId !== user._id) {
      throw new Error("Only the community owner can reorder chapters");
    }

    // Update order for each chapter
    for (const { chapterId, order } of args.chapterOrders) {
      await ctx.db.patch(chapterId, { order });
    }

    return { success: true };
  },
});

// Reorder lessons within a chapter (owner only) - update order for multiple lessons
export const reorderLessons = mutation({
  args: {
    moduleId: v.id("modules"),
    lessonOrders: v.array(v.object({
      lessonId: v.id("pages"),
      order: v.number(),
    })),
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

    const moduleData = await ctx.db.get(args.moduleId);
    if (!moduleData) {
      throw new Error("Chapter not found");
    }

    const classroom = await ctx.db.get(moduleData.classroomId);
    if (!classroom) {
      throw new Error("Classroom not found");
    }

    const community = await ctx.db.get(classroom.communityId);
    if (!community) {
      throw new Error("Community not found");
    }

    // Check ownership
    if (community.ownerId !== user._id) {
      throw new Error("Only the community owner can reorder lessons");
    }

    // Verify all lessons belong to this module
    for (const { lessonId } of args.lessonOrders) {
      const lesson = await ctx.db.get(lessonId);
      if (!lesson || lesson.moduleId !== args.moduleId) {
        throw new Error("Lesson does not belong to this chapter");
      }
    }

    // Update order for each lesson
    for (const { lessonId, order } of args.lessonOrders) {
      await ctx.db.patch(lessonId, { order });
    }

    return { success: true };
  },
});
