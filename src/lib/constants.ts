// Level thresholds - all-time points sum determines level
// 0 → L1, 20 → L2, 60 → L3, 140 → L4, 280 → L5
export const LEVEL_THRESHOLDS = [0, 20, 60, 140, 280, Infinity];

export const LEVEL_NAMES = [
  "Level 1",
  "Level 2", 
  "Level 3",
  "Level 4",
  "Level 5",
] as const;

export function getLevelFromPoints(points: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (points >= LEVEL_THRESHOLDS[i]) {
      return i + 1;
    }
  }
  return 1;
}

export function getPointsForNextLevel(currentLevel: number): number | null {
  if (currentLevel >= LEVEL_THRESHOLDS.length - 1) {
    return null; // Max level reached
  }
  return LEVEL_THRESHOLDS[currentLevel];
}

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

// Algeria Wilayas (58 provinces - 2019 reorganization)
export const WILAYAS = [
  "Adrar",
  "Ain Defla",
  "Ain Temouchent",
  "Alger",
  "Annaba",
  "Batna",
  "Bechar",
  "Bejaia",
  "Biskra",
  "Blida",
  "Bordj Bou Arreridj",
  "Bouira",
  "Boumerdes",
  "Chlef",
  "Constantine",
  "Djelfa",
  "El Bayadh",
  "El Oued",
  "El Tarf",
  "Ghardaia",
  "Guelma",
  "Illizi",
  "Jijel",
  "Khenchela",
  "Laghouat",
  "Lamar",
  "Mascara",
  "Medea",
  "Mila",
  "Mostaganem",
  "Naama",
  "Oran",
  "Ouargla",
  "Oum el Bouaghi",
  "Relizane",
  "Saida",
  "Setif",
  "Sidi Bel Abbes",
  "Skikda",
  "Souk Ahras",
  "Tamanrasset",
  "Tebessa",
  "Tiaret",
  "Tindouf",
  "Tipaza",
  "Tissemsilt",
  "Tizi Ouzou",
  "Tlemcen",
  "Al-Muraba",
  "Al-Mahdi",
  "Al-Mansour",
  "Al-Mouhammedia",
  "Al-Mokrani",
  "Al-Mokhtara",
  "Belhadj",
  "Beni Amrane",
  "Beraghda",
  "Berriane",
] as const;

export type Wilaya = typeof WILAYAS[number];
