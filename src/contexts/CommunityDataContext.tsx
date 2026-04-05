import { createContext, useContext } from "react";
import { Id } from "@/convex/_generated/dataModel";

export interface CommunityPageData {
  _id: Id<"communities">;
  _creationTime: number;
  slug: string;
  name: string;
  tagline?: string;
  description?: string;
  logoUrl?: string;
  videoUrl?: string;
  links?: string[];
  pricingType: "free" | "monthly" | "annual" | "one_time";
  priceDzd?: number;
  platformTier?: "free" | "subscribed";
  ownerId: Id<"users">; // For ownership checks
  memberCount: number;
  onlineCount: number;
  streak: number;
  ownerName: string;
  ownerAvatar: string | null;
  [key: string]: unknown; // Allow extra fields for component compatibility
}

interface CommunityDataContextValue {
  community: CommunityPageData;
}

export const CommunityDataContext = createContext<CommunityDataContextValue | null>(null);

export function useCommunityData() {
  const context = useContext(CommunityDataContext);
  if (!context) {
    throw new Error("useCommunityData must be used within CommunityDataProvider");
  }
  return context;
}
