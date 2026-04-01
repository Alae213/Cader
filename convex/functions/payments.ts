import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { safeDecrypt } from "../lib/encryption";

interface ChargilyCheckoutArgs {
  apiKey: string;
  amount: number;
  description: string;
  email: string;
  displayName: string;
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
}

async function createChargilySession(args: ChargilyCheckoutArgs) {
  const mode = process.env.CHARGILY_MODE === "live" ? "live" : "test";
  const baseUrl = mode === "live"
    ? "https://pay.chargily.net/api/v2"
    : "https://pay.chargily.net/test/api/v2";

  const nameParts = args.displayName.split(" ");
  const checkoutData = {
    amount: args.amount,
    currency: "dzd",
    description: args.description,
    patient: {
      email: args.email,
      first_name: nameParts[0] || "User",
      last_name: nameParts.slice(1).join(" ") || "",
    },
    success_url: args.successUrl,
    failure_url: args.cancelUrl,
    metadata: { ...args.metadata, mode },
  };

  const response = await fetch(`${baseUrl}/checkouts`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(checkoutData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: "" }));
    throw new Error(errorData.message || `Chargily API error: ${response.status}`);
  }

  const checkout = await response.json() as { checkout_url: string; id: string };
  return { checkoutUrl: checkout.checkout_url, checkoutId: checkout.id };
}

// Get expected price for webhook verification
export const getExpectedPrice = query({
  args: {
    communityId: v.id("communities"),
    type: v.union(v.literal("community"), v.literal("classroom"), v.literal("platform")),
    classroomId: v.optional(v.id("classrooms")),
  },
  handler: async (ctx, args) => {
    if (args.type === "platform") {
      return { expectedAmount: 2000 * 100, currency: "dzd" };
    }

    const community = await ctx.db.get(args.communityId);
    if (!community) return null;

    if (args.type === "classroom" && args.classroomId) {
      const classroom = await ctx.db.get(args.classroomId);
      if (!classroom?.priceDzd) return null;
      return { expectedAmount: classroom.priceDzd * 100, currency: "dzd" };
    }

    if (!community.priceDzd) return null;
    return { expectedAmount: community.priceDzd * 100, currency: "dzd" };
  },
});

// Validate Chargily API keys
export const validateChargilyKeys = mutation({
  args: {
    apiKey: v.string(),
    webhookSecret: v.string(),
  },
  handler: async (_ctx, args) => {
    try {
      const response = await fetch("https://pay.chargily.net/api/v2/checkouts", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${args.apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "" }));
        return { valid: false, error: errorData.message || `API returned ${response.status}` };
      }

      if (!args.webhookSecret || args.webhookSecret.length < 10) {
        return { valid: false, error: "Invalid webhook secret format" };
      }

      return { valid: true, message: "API keys validated successfully" };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : "Failed to validate keys",
      };
    }
  },
});

// Create Chargily checkout session (community/classroom payments)
export const createChargilyCheckout = mutation({
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

    const isPaidCommunity = ["monthly", "annual", "one_time"].includes(community.pricingType || "");
    if (isPaidCommunity && !community.chargilyApiKey) {
      throw new Error("This community is not configured for payments. Contact the owner.");
    }

    const encryptedApiKey = community.chargilyApiKey;
    if (!encryptedApiKey) throw new Error("Community payment configuration not found");

    const chargilyApiKey = await safeDecrypt(encryptedApiKey);
    if (!chargilyApiKey) throw new Error("Failed to decrypt payment configuration");

    let amount: number;
    let description: string;

    if (args.type === "classroom" && args.classroomId) {
      const classroom = await ctx.db.get(args.classroomId);
      if (!classroom) throw new Error("Classroom not found");
      amount = classroom.priceDzd || 0;
      description = `Classroom: ${classroom.title}`;
    } else {
      amount = community.priceDzd || 0;
      description = `Community: ${community.name}`;
    }

    if (amount <= 0) throw new Error("Invalid price for this purchase");

    return createChargilySession({
      apiKey: chargilyApiKey,
      amount: amount * 100,
      description,
      email: user.email,
      displayName: user.displayName || "User",
      successUrl: args.successUrl,
      cancelUrl: args.cancelUrl,
      metadata: {
        communityId: args.communityId,
        userId: args.userId,
        type: args.type,
        classroomId: args.classroomId || "",
        priceAmount: String(amount * 100),
      },
    });
  },
});

// Create platform subscription checkout
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

    const platformApiKey = process.env.CHARGILY_PLATFORM_API_KEY;
    if (!platformApiKey) throw new Error("Platform payment configuration not found");

    const amount = 2000 * 100;

    return createChargilySession({
      apiKey: platformApiKey,
      amount,
      description: `Platform subscription: ${community.name}`,
      email: user.email,
      displayName: user.displayName || "User",
      successUrl: args.successUrl,
      cancelUrl: args.cancelUrl,
      metadata: {
        communityId: args.communityId,
        userId: args.userId,
        type: "platform",
        priceAmount: String(amount),
      },
    });
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

// Grant classroom access after successful payment
export const grantClassroomAccess = mutation({
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
