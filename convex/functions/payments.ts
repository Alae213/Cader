import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { safeDecrypt } from "../lib/encryption";

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

// Validate Chargily API keys (runs in browser/edge, uses fetch)
export const validateChargilyKeys = mutation({
  args: {
    apiKey: v.string(),
    webhookSecret: v.string(),
  },
  handler: async (_ctx, args) => {
    try {
      // Test the keys by calling Chargily's API
      const response = await fetch("https://pay.chargily.net/api/v2/checkouts", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${args.apiKey}`,
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "" }));
        return {
          valid: false,
          error: errorData.message || `API returned ${response.status}`,
        };
      }
      
      // Verify webhook secret format
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

// Create Chargily checkout session (uses fetch, works in Convex)
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
    // Get the community
    const community = await ctx.db.get(args.communityId);
    if (!community) throw new Error("Community not found");
    
    // Get the user
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    
    // Check if community has Chargily keys
    const isPaidCommunity = ["monthly", "annual", "one_time"].includes(community.pricingType || "");
    if (isPaidCommunity && !community.chargilyApiKey) {
      throw new Error("This community is not configured for payments. Contact the owner.");
    }
    
    // Get and decrypt Chargily API key
    const encryptedApiKey = community.chargilyApiKey;
    if (!encryptedApiKey) throw new Error("Community payment configuration not found");
    
    const chargilyApiKey = await safeDecrypt(encryptedApiKey);
    if (!chargilyApiKey) throw new Error("Failed to decrypt payment configuration");
    
    // Determine price
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
    
    // Create checkout via Chargily API (using fetch)
    const mode = process.env.CHARGILY_MODE === "live" ? "live" : "test";
    const baseUrl = mode === "live" 
      ? "https://pay.chargily.net/api/v2" 
      : "https://pay.chargily.net/test/api/v2";
    
    const checkoutData = {
      amount: amount * 100, // Chargily expects amount in centimes
      currency: "dzd",
      description,
      patient: {
        email: user.email,
        first_name: user.displayName?.split(" ")[0] || "User",
        last_name: user.displayName?.split(" ").slice(1).join(" ") || "",
      },
      success_url: args.successUrl,
      failure_url: args.cancelUrl,
      metadata: {
        communityId: args.communityId,
        userId: args.userId,
        type: args.type,
        classroomId: args.classroomId || "",
      },
    };
    
    const response = await fetch(`${baseUrl}/checkouts`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${chargilyApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(checkoutData),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "" }));
      throw new Error(errorData.message || `Chargily API error: ${response.status}`);
    }
    
    const checkout = await response.json() as { checkout_url: string; id: string };
    
    return {
      checkoutUrl: checkout.checkout_url,
      checkoutId: checkout.id,
    };
  },
});

// Grant classroom access after successful payment (called from webhook)
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
