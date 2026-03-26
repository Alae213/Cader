import { z } from "zod";
import { PRICING_TYPES, WILAYAS } from "./constants";

// Common validation patterns
const phoneSchema = z
  .string()
  .regex(/^0[5-7][0-9]{8}$/, "Invalid Algerian phone number");

const slugSchema = z
  .string()
  .min(3, "Slug must be at least 3 characters")
  .max(50, "Slug must be at most 50 characters")
  .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens");

// User validation schemas
export const userProfileSchema = z.object({
  displayName: z.string().min(1, "Display name is required").max(100),
  phone: phoneSchema.optional(),
  wilaya: z.enum(WILAYAS).optional(),
});

export const userUpdateSchema = userProfileSchema.partial();

// Community validation schemas
export const communitySlugCheckSchema = z.object({
  slug: slugSchema,
});

export const communityCreateStep1Schema = z.object({
  name: z.string().min(1, "Community name is required").max(100),
  slug: slugSchema,
});

export const communityCreateStep2Schema = z.object({
  pricingType: z.enum(PRICING_TYPES),
  priceDzd: z.number().min(0).optional(),
  wilaya: z.string().optional(),
  chargilyApiKey: z.string().optional(),
  chargilyWebhookSecret: z.string().optional(),
}).refine(
  (data) => {
    if (["monthly", "annual", "one_time"].includes(data.pricingType)) {
      return data.priceDzd !== undefined && data.priceDzd > 0;
    }
    return true;
  },
  {
    message: "Price is required for paid communities",
    path: ["priceDzd"],
  }
);

export const communityUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  tagline: z.string().max(200).optional(),
  description: z.string().max(5000).optional(),
  videoUrl: z.string().url().optional().or(z.literal("")),
  links: z.array(z.string().url()).max(5).optional(),
  wilaya: z.enum(WILAYAS).optional(),
  pricingType: z.enum(PRICING_TYPES).optional(),
  priceDzd: z.number().min(0).optional(),
});

// Post validation schemas
export const postCreateSchema = z.object({
  communityId: z.string(),
  content: z.string().min(1, "Post content is required").max(10000),
  contentType: z.enum(["text", "image", "video", "gif", "poll"]),
  categoryId: z.string().optional(),
  mediaUrls: z.array(z.string().url()).max(10).optional(),
  videoUrl: z.string().url().optional().or(z.literal("")),
  pollOptions: z
    .array(
      z.object({
        text: z.string().min(1).max(200),
        votes: z.number().default(0),
      })
    )
    .min(2)
    .max(4)
    .optional(),
  pollEndDate: z.number().optional(),
});

export const postUpdateSchema = z.object({
  content: z.string().min(1).max(10000).optional(),
  categoryId: z.string().optional().nullable(),
});

// Comment validation schemas
export const commentCreateSchema = z.object({
  postId: z.string(),
  content: z.string().min(1, "Comment is required").max(2000),
  parentCommentId: z.string().optional(),
});

// Category validation schemas
export const categoryCreateSchema = z.object({
  communityId: z.string(),
  name: z.string().min(1).max(30),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color hex"),
});

export const categoryUpdateSchema = z.object({
  categoryId: z.string(),
  name: z.string().min(1).max(30).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color hex").optional(),
});

export const categoryReorderSchema = z.object({
  communityId: z.string(),
  categoryIds: z.array(z.string()).min(1).max(10),
});

// Classroom validation schemas
export const classroomCreateSchema = z.object({
  communityId: z.string(),
  title: z.string().min(1).max(200),
  thumbnailUrl: z.string().url().optional().or(z.literal("")),
  accessType: z.enum(["open", "level", "price", "level_and_price"]),
  minLevel: z.number().min(1).max(5).optional(),
  priceDzd: z.number().min(0).optional(),
});

export const classroomUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  thumbnailUrl: z.string().url().optional().or(z.literal("")).optional(),
  accessType: z.enum(["open", "level", "price", "level_and_price"]).optional(),
  minLevel: z.number().min(1).max(5).optional(),
  priceDzd: z.number().min(0).optional(),
});

// Module/Page validation schemas
export const moduleCreateSchema = z.object({
  classroomId: z.string(),
  title: z.string().min(1).max(200),
  order: z.number().min(0),
});

export const pageCreateSchema = z.object({
  moduleId: z.string(),
  title: z.string().min(1).max(200),
  content: z.string().max(100000), // JSON string
  order: z.number().min(0),
});

// Settings validation schemas
export const settingsProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().optional().or(z.literal("")).optional(),
  bio: z.string().max(160).optional(),
  wilaya: z.enum(WILAYAS).optional(),
});

// Chargily webhook validation
export const chargilyWebhookSchema = z.object({
  id: z.string(),
  event: z.enum(["checkout.paid", "checkout.failed", "checkout.canceled"]),
  data: z.object({
    id: z.string(),
    amount: z.number(),
    currency: z.string(),
    metadata: z.record(z.string(), z.string()).optional(),
  }),
});
