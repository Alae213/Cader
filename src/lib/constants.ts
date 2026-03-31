// Platform constants
export const PLATFORM_PRICE_DZD = 2000; // Monthly subscription
export const FREE_MEMBER_LIMIT = 50; // Free tier member limit

// Pricing types
export const PRICING_TYPES = ["free", "monthly", "annual", "one_time"] as const;
export type PricingType = typeof PRICING_TYPES[number];

// Membership roles
export const MEMBER_ROLES = ["member", "admin", "owner"] as const;
export type MemberRole = typeof MEMBER_ROLES[number];

// Membership status
export const MEMBERSHIP_STATUSES = ["active", "inactive", "blocked", "pending"] as const;
export type MembershipStatus = typeof MEMBERSHIP_STATUSES[number];

// Classroom access types
export const CLASSROOM_ACCESS_TYPES = ["open", "level", "price", "level_and_price"] as const;
export type ClassroomAccessType = typeof CLASSROOM_ACCESS_TYPES[number];

// Point event types
export const POINT_EVENT_TYPES = [
  "post",
  "comment", 
  "upvote_received",
  "upvote_given",
  "lesson_completed",
  "streak_bonus",
  "streak_reversal",
  "upvote_reversal",
  "post_deletion",
  "comment_deletion",
] as const;

// Point values
export const POINTS = {
  POST: 2,
  COMMENT: 1,
  UPVOTE_RECEIVED: 1,
  UPVOTE_GIVEN: 0, // No points for upvoting others
  LESSON_COMPLETED: 10,
  STREAK_BONUS: [1, 2, 3], // Day 1: +1, Day 2: +2, Day 3+: +3
} as const;
