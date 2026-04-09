import { mutation, query, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { enforceRateLimit } from "../lib/rateLimit";
import { makeCIBTransaction, verifyPaymentByMemo } from "../lib/sofizpay";

const MIN_PAYMENT_AMOUNT = 1000; // Minimum 1000 DZD per SofizPay/CIB requirements
export const getExpectedPrice = query({
  args: {
    communityId: v.id("communities"),
    type: v.union(v.literal("community"), v.literal("classroom"), v.literal("platform")),
    classroomId: v.optional(v.id("classrooms")),
  },
  handler: async (ctx, args) => {
    if (args.type === "platform") {
      return { expectedAmount: 2000, currency: "dzd" };
    }

    const community = await ctx.db.get(args.communityId);
    if (!community) return null;

    if (args.type === "classroom" && args.classroomId) {
      const classroom = await ctx.db.get(args.classroomId);
      if (!classroom?.priceDzd) return null;
      return { expectedAmount: classroom.priceDzd, currency: "dzd" };
    }

    if (!community.priceDzd) return null;
    return { expectedAmount: community.priceDzd, currency: "dzd" };
  },
});

// Validate SofizPay public key format
export const validateSofizpayKeys = mutation({
  args: {
    publicKey: v.string(),
  },
  handler: async (ctx, args) => {
    // SECURITY: Require authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("You must be signed in");
    }

    // Check basic format
    if (!args.publicKey || typeof args.publicKey !== "string") {
      return { valid: false, error: "Public key is required" };
    }

    // Stellar public key format: starts with G, 56 characters
    const stellarPublicKeyRegex = /^G[A-Z0-9]{55}$/;
    if (!stellarPublicKeyRegex.test(args.publicKey)) {
      return {
        valid: false,
        error: "Invalid public key format. Expected Stellar public key (starts with G, 56 characters)",
      };
    }

    return { valid: true, message: "Public key format validated" };
  },
});

// Create SofizPay checkout session
// NOTE: The actual payment creation happens in the Next.js API route
// This mutation just returns the data needed to call that API
export const createSofizpayCheckout = mutation({
  args: {
    communityId: v.id("communities"),
    userId: v.id("users"),
    type: v.union(v.literal("community"), v.literal("classroom")),
    classroomId: v.optional(v.id("classrooms")),
    successUrl: v.string(),
    cancelUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const community = await ctx.db.get(args.communityId);
    if (!community) throw new Error("Community not found");

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    // Check if user has email - required for SofizPay
    if (!user.email || user.email.trim() === "") {
      throw new Error("Your account doesn't have an email.");
    }

    // Check if this is a paid community
    const isPaidCommunity = ["monthly", "annual", "one_time"].includes(community.pricingType || "");
    if (isPaidCommunity && !community.sofizpayPublicKey) {
      throw new Error("This community is not configured for payments.");
    }

    const sofizpayPublicKey = community.sofizpayPublicKey;
    if (!sofizpayPublicKey) throw new Error("Community payment configuration not found");

    // Get amount
    let amount: number;
    let paymentType: string;

    if (args.type === "classroom" && args.classroomId) {
      const classroom = await ctx.db.get(args.classroomId);
      if (!classroom) throw new Error("Classroom not found");
      amount = classroom.priceDzd || 0;
      paymentType = "classroom";
    } else {
      amount = community.priceDzd || 0;
      paymentType = "community";
    }

    if (amount <= 0) throw new Error("Invalid price for this purchase");
    if (amount < MIN_PAYMENT_AMOUNT) {
      throw new Error(`Minimum payment amount is ${MIN_PAYMENT_AMOUNT} DZD`);
    }

    // Build memo for payment tracking
    const memo = `Community:${community.slug} - User:${user.email} - Type:${paymentType}`;

    // Return the data needed to create payment via API
    // The frontend will call the Next.js API route to create the actual payment
    return {
      paymentData: {
        account: sofizpayPublicKey,
        amount,
        full_name: user.displayName || "User",
        phone: user.phone || "+213000000000",
        email: user.email,
        memo,
        return_url: args.successUrl,
        redirect: "yes",
      },
      memo,
      amount,
    };
  },
});

// Verify payment status (NO WEBHOOK - uses polling/return URL pattern)
// Called after user returns from SofizPay
export const verifyPaymentStatus = mutation({
  args: {
    communityId: v.id("communities"),
    userId: v.id("users"),
    memo: v.string(),
    expectedAmount: v.number(),
    type: v.union(v.literal("community"), v.literal("classroom")),
    classroomId: v.optional(v.id("classrooms")),
  },
  handler: async (ctx, args) => {
    const community = await ctx.db.get(args.communityId);
    if (!community) throw new Error("Community not found");

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const sofizpayPublicKey = community.sofizpayPublicKey;
    if (!sofizpayPublicKey) throw new Error("Community payment configuration not found");

    // Verify payment by searching transactions
    const result = await verifyPaymentByMemo({
      ownerPublicKey: sofizpayPublicKey,
      memo: args.memo,
      expectedAmount: args.expectedAmount,
    });

    if (!result.verified) {
      return {
        verified: false,
        error: result.error || "Payment not found or amount mismatch",
      };
    }

    // Payment verified! Now grant access
    const classroomId = args.classroomId;
    if (args.type === "classroom" && classroomId) {
      // Grant classroom access
      const existingAccess = await ctx.db
        .query("classroomAccess")
        .withIndex("by_classroom_and_user", (q) =>
          q.eq("classroomId", classroomId).eq("userId", args.userId)
        )
        .first();

        if (existingAccess) {
        await ctx.db.patch(existingAccess._id, {
          accessType: "purchased",
          purchasedAt: Date.now(),
          paymentReference: result.transaction?.transaction_hash || "unknown",
        });
      } else {
        await ctx.db.insert("classroomAccess", {
          classroomId: classroomId,
          userId: args.userId,
          accessType: "purchased",
          purchasedAt: Date.now(),
          paymentReference: result.transaction?.transaction_hash || "unknown",
          createdAt: Date.now(),
        });
      }

      return { verified: true, accessType: "classroom" };
    } else {
      // Grant community membership
      const existingMembership = await ctx.db
        .query("memberships")
        .withIndex("by_community_and_user", (q) =>
          q.eq("communityId", args.communityId).eq("userId", args.userId)
        )
        .first();

      const subscriptionType = community.pricingType || "one_time";

      if (existingMembership) {
        // Update existing membership
        await ctx.db.patch(existingMembership._id, {
          status: "active",
          subscriptionType,
          subscriptionStartDate: Date.now(),
          subscriptionEndDate: subscriptionType === "monthly"
            ? Date.now() + 30 * 24 * 60 * 60 * 1000
            : subscriptionType === "annual"
              ? Date.now() + 365 * 24 * 60 * 60 * 1000
              : undefined,
          paymentReference: result.transaction?.transaction_hash || "unknown",
          updatedAt: Date.now(),
        });
      } else {
        // Create new membership
        await ctx.db.insert("memberships", {
          communityId: args.communityId,
          userId: args.userId,
          role: "member",
          status: "active",
          subscriptionType,
          subscriptionStartDate: Date.now(),
          subscriptionEndDate: subscriptionType === "monthly"
            ? Date.now() + 30 * 24 * 60 * 60 * 1000
            : subscriptionType === "annual"
              ? Date.now() + 365 * 24 * 60 * 60 * 1000
              : undefined,
          paymentReference: result.transaction?.transaction_hash || "unknown",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // Update member count
        const currentCount = community.activeMemberCount || 0;
        await ctx.db.patch(args.communityId, {
          activeMemberCount: currentCount + 1,
          updatedAt: Date.now(),
        });
      }

      return { verified: true, accessType: "community" };
    }
  },
});

// Create platform subscription checkout
// Uses platform's SofizPay account (no owner key needed)
export const createPlatformSubscriptionCheckout = mutation({
  args: {
    communityId: v.id("communities"),
    userId: v.id("users"),
    successUrl: v.string(),
    cancelUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const community = await ctx.db.get(args.communityId);
    if (!community) throw new Error("Community not found");

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    if (community.ownerId !== user._id) throw new Error("Only the owner can subscribe");
    if (community.platformTier === "subscribed") throw new Error("Already subscribed");

    const platformPublicKey = process.env.SOFIZPAY_PLATFORM_PUBLIC_KEY;
    if (!platformPublicKey) throw new Error("Platform payment configuration not found");

    const amount = 2000;

    // Build memo for platform subscription
    const memo = `Platform:${community.slug} - User:${user.email} - Type:platform`;

    const result = await makeCIBTransaction({
      account: platformPublicKey,
      amount,
      full_name: user.displayName || "User",
      phone: user.phone || "+213000000000",
      email: user.email,
      memo,
      return_url: args.successUrl,
      redirect: "yes",
    });

    if (!result.success || !result.url) {
      throw new Error(result.error || "Failed to create payment");
    }

    return {
      paymentUrl: result.url,
      memo,
      amount,
    };
  },
});

// Verify platform subscription payment
export const verifyPlatformSubscription = mutation({
  args: {
    communityId: v.id("communities"),
    userId: v.id("users"),
    memo: v.string(),
  },
  handler: async (ctx, args) => {
    const community = await ctx.db.get(args.communityId);
    if (!community) throw new Error("Community not found");

    const platformPublicKey = process.env.SOFIZPAY_PLATFORM_PUBLIC_KEY;
    if (!platformPublicKey) throw new Error("Platform payment configuration not found");

    const amount = 2000;

    // Verify payment
    const result = await verifyPaymentByMemo({
      ownerPublicKey: platformPublicKey,
      memo: args.memo,
      expectedAmount: amount,
    });

    if (!result.verified) {
      return {
        verified: false,
        error: result.error || "Payment not found or amount mismatch",
      };
    }

    // Update community platform tier
    await ctx.db.patch(args.communityId, {
      platformTier: "subscribed",
      updatedAt: Date.now(),
    });

    return { verified: true };
  },
});

// Cancel platform subscription
export const cancelPlatformSubscription = mutation({
  args: {
    communityId: v.id("communities"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    const community = await ctx.db.get(args.communityId);
    if (!community) throw new Error("Community not found");
    if (community.ownerId !== user._id) throw new Error("Only the owner can cancel subscription");

    await ctx.db.patch(args.communityId, {
      platformTier: "free",
      updatedAt: Date.now(),
    });

    return true;
  },
});

// Internal mutation to grant classroom access (called from verifyPaymentStatus)
export const _grantClassroomAccess = internalMutation({
  args: {
    classroomId: v.id("classrooms"),
    userId: v.id("users"),
    paymentReference: v.string(),
  },
  handler: async (ctx, args) => {
    const classroom = await ctx.db.get(args.classroomId);
    if (!classroom) throw new Error("Classroom not found");

    const existingAccess = await ctx.db
      .query("classroomAccess")
      .withIndex("by_classroom_and_user", (q) =>
        q.eq("classroomId", args.classroomId).eq("userId", args.userId)
      )
      .first();

    if (existingAccess) {
      await ctx.db.patch(existingAccess._id, {
        accessType: "purchased",
        purchasedAt: Date.now(),
        paymentReference: args.paymentReference,
      });
      return existingAccess._id;
    }

    return await ctx.db.insert("classroomAccess", {
      classroomId: args.classroomId,
      userId: args.userId,
      accessType: "purchased",
      purchasedAt: Date.now(),
      paymentReference: args.paymentReference,
      createdAt: Date.now(),
    });
  },
});

// Get payment history for a user
export const getPaymentHistory = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const allMemberships = await ctx.db
      .query("memberships")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .collect();

    const memberships = allMemberships.filter(
      (m) => m.subscriptionType && m.subscriptionType !== "free" && m.paymentReference
    );

    const allClassroomAccess = await ctx.db
      .query("classroomAccess")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .collect();

    const classroomAccess = allClassroomAccess.filter(
      (a) => a.paymentReference && a.accessType === "purchased"
    );

    const communityPayments = await Promise.all(
      memberships.map(async (m) => {
        const community = await ctx.db.get(m.communityId);
        return {
          type: "community" as const,
          id: m._id,
          communityId: m.communityId,
          communityName: community?.name || "Unknown",
          amount: community?.priceDzd || 0,
          currency: "DZD" as const,
          status: m.status,
          subscriptionType: m.subscriptionType,
          paymentReference: m.paymentReference,
          date: m.subscriptionStartDate || m.createdAt,
        };
      })
    );

    const classroomPayments = await Promise.all(
      classroomAccess.map(async (a) => {
        const classroom = await ctx.db.get(a.classroomId);
        const community = classroom ? await ctx.db.get(classroom.communityId) : null;
        return {
          type: "classroom" as const,
          id: a._id,
          classroomId: a.classroomId,
          classroomName: classroom?.title || "Unknown",
          communityName: community?.name || "Unknown",
          amount: classroom?.priceDzd || 0,
          currency: "DZD" as const,
          status: "active" as const,
          paymentReference: a.paymentReference,
          date: a.purchasedAt || a.createdAt,
        };
      })
    );

    return [...communityPayments, ...classroomPayments].sort((a, b) => b.date - a.date);
  },
});
