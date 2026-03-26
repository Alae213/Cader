import { query } from "../_generated/server";
import { v } from "convex/values";

// List discoverable communities with optional search filter
export const listDiscoverableCommunities = query({
  args: {
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    const searchTerm = args.search?.toLowerCase() || "";

    // Get all communities (for now, all communities are discoverable)
    let communities = await ctx.db.query("communities").collect();

    // Filter by search term (name or tagline or description)
    if (searchTerm) {
      communities = communities.filter((c) =>
        c.name.toLowerCase().includes(searchTerm) ||
        (c.tagline && c.tagline.toLowerCase().includes(searchTerm)) ||
        (c.description && c.description.toLowerCase().includes(searchTerm))
      );
    }

    // Get member count for each community
    const communitiesWithCounts = await Promise.all(
      communities.map(async (c) => {
        const memberships = await ctx.db
          .query("memberships")
          .withIndex("by_community_id", (q) => q.eq("communityId", c._id))
          .collect();

        const activeMembers = memberships.filter((m) => m.status === "active").length;
        
        // Check if community is locked (at limit and not subscribed)
        const isLocked = c.platformTier !== "subscribed" && activeMembers >= c.memberLimit;

        // Get owner info
        const owner = await ctx.db.get(c.ownerId);

        return {
          _id: c._id,
          name: c.name,
          slug: c.slug,
          tagline: c.tagline,
          description: c.description,
          logoUrl: c.logoUrl,
          pricingType: c.pricingType,
          priceDzd: c.priceDzd,
          memberCount: activeMembers,
          isLocked,
          ownerName: owner?.displayName || "Unknown",
        };
      })
    );

    // Sort by member count (most popular first)
    communitiesWithCounts.sort((a, b) => b.memberCount - a.memberCount);

    return communitiesWithCounts.slice(0, limit);
  },
});