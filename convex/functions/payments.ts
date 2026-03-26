import { mutation } from "../_generated/server";
import { v } from "convex/values";

// Validate Chargily API keys - mutation that tests keys via Chargily API
export const validateChargilyKeys = mutation({
  args: {
    apiKey: v.string(),
    webhookSecret: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Test the keys by calling Chargily's API to get current user info
      // This validates that the keys are valid and have the correct permissions
      const response = await fetch("https://pay.chargily.net/api/v2/user", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${args.apiKey}`,
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          valid: false,
          error: errorData.message || `API returned ${response.status}`,
        };
      }
      
      const userData = await response.json();
      
      // Verify webhook secret format (basic validation)
      if (!args.webhookSecret || args.webhookSecret.length < 10) {
        return {
          valid: false,
          error: "Invalid webhook secret format",
        };
      }
      
      return {
        valid: true,
        // Return non-sensitive info for UI feedback
        email: userData.email,
        name: userData.name,
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : "Failed to validate keys",
      };
    }
  },
});

// Create Chargily checkout session for community or classroom purchase
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
    if (!community) {
      throw new Error("Community not found");
    }
    
    // Get the user
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    // Check if community has Chargily keys (required for paid communities)
    const isPaidCommunity = ["monthly", "annual", "one_time"].includes(community.pricingType || "");
    
    if (isPaidCommunity && !community.chargilyApiKey) {
      throw new Error("This community is not configured for payments. Contact the owner.");
    }
    
    // Determine price based on type
    let amount: number;
    let description: string;
    
    if (args.type === "classroom" && args.classroomId) {
      // Get classroom price
      const classroom = await ctx.db.get(args.classroomId);
      if (!classroom) {
        throw new Error("Classroom not found");
      }
      amount = classroom.priceDzd || 0;
      description = `Classroom: ${classroom.title}`;
    } else {
      // Community membership price
      amount = community.priceDzd || 0;
      description = `Community: ${community.name}`;
    }
    
    if (amount <= 0) {
      throw new Error("Invalid price for this purchase");
    }
    
    // Get Chargily API key (use community's key for creator payments)
    const chargilyApiKey = community.chargilyApiKey;
    if (!chargilyApiKey) {
      throw new Error("Community payment configuration not found");
    }
    
    // Create checkout session via Chargily API
    const checkoutData = {
      amount: amount * 100, // Chargily expects amount in centimes
      currency: "dzd",
      description,
      patient: {
        email: user.email,
        first_name: user.displayName?.split(" ")[0] || "User",
        last_name: user.displayName?.split(" ").slice(1).join(" ") || "",
      },
      callback_url: args.successUrl,
      return_url: args.cancelUrl,
      metadata: {
        communityId: args.communityId,
        userId: args.userId,
        type: args.type,
        classroomId: args.classroomId || "",
      },
    };
    
    try {
      const response = await fetch("https://pay.chargily.net/api/v2/checkouts", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${chargilyApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(checkoutData),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Chargily API error: ${response.status}`);
      }
      
      const checkout = await response.json();
      
      return {
        checkoutUrl: checkout.url,
        checkoutId: checkout.id,
      };
    } catch (error) {
      console.error("Chargily checkout creation failed:", error);
      throw new Error(error instanceof Error ? error.message : "Failed to create checkout session");
    }
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
    // Get classroom to confirm it exists and has a price
    const classroom = await ctx.db.get(args.classroomId);
    if (!classroom) {
      throw new Error("Classroom not found");
    }

    // Check if user already has access
    const existingAccess = await ctx.db
      .query("classroomAccess")
      .withIndex("by_classroom_and_user", (q) =>
        q.eq("classroomId", args.classroomId).eq("userId", args.userId)
      )
      .first();

    if (existingAccess) {
      // Update existing access
      await ctx.db.patch(existingAccess._id, {
        accessType: "purchased",
        purchasedAt: Date.now(),
        paymentReference: args.paymentReference,
      });
      return existingAccess._id;
    }

    // Create new classroom access
    const now = Date.now();
    const accessId = await ctx.db.insert("classroomAccess", {
      classroomId: args.classroomId,
      userId: args.userId,
      accessType: "purchased",
      purchasedAt: now,
      paymentReference: args.paymentReference,
      createdAt: now,
    });

    return accessId;
  },
});
