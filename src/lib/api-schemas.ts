import { z } from "zod";

/** Reusable Zod schemas for API server-side validation. */

const CLUB_CATEGORIES = ["driver", "fairway_wood", "utility", "iron", "wedge", "putter"] as const;
const CLUB_STATUSES = ["bag", "reserve", "sold"] as const;

export const createClubSchema = z.object({
  category: z.enum(CLUB_CATEGORIES),
  club_number: z.string().min(1).max(10),
  maker: z.string().min(1).max(50),
  model: z.string().min(1).max(50),
  shaft_name: z.string().max(50).optional().nullable(),
  shaft_flex: z.string().max(10).optional().nullable(),
  loft: z.number().min(0).max(90).optional().nullable(),
  lie: z.number().min(0).max(90).optional().nullable(),
  length: z.number().min(0).max(60).optional().nullable(),
  distance: z.number().min(0).max(400).optional().nullable(),
  release_year: z.number().int().min(1950).max(new Date().getFullYear() + 1).optional().nullable(),
  memo: z.string().max(2000).optional().nullable(),
  purchase_date: z.string().max(20).optional().nullable(),
  purchase_shop: z.string().max(100).optional().nullable(),
  purchase_price: z.number().min(0).max(100_000_000).optional().nullable(),
  status: z.enum(CLUB_STATUSES).optional(),
  bag_number: z.number().int().min(1).max(10).optional().nullable(),
  weight: z.number().min(0).max(1000).optional().nullable(),
  swing_weight: z.string().max(10).optional().nullable(),
  frequency: z.number().min(0).max(500).optional().nullable(),
  kick_point: z.string().max(20).optional().nullable(),
  head_volume: z.number().min(0).max(600).optional().nullable(),
  head_weight: z.number().min(0).max(400).optional().nullable(),
  grip_name: z.string().max(50).optional().nullable(),
  grip_size: z.string().max(20).optional().nullable(),
  bounce: z.number().min(0).max(30).optional().nullable(),
  sole_shape: z.string().max(30).optional().nullable(),
  face_angle: z.number().min(-5).max(5).optional().nullable(),
  shaft_weight: z.number().min(0).max(200).optional().nullable(),
  rating: z.number().int().min(1).max(5).optional().nullable(),
  hidden_from_profile: z.boolean().optional(),
});

export const updateClubSchema = createClubSchema.partial();

const ACCESSORY_CATEGORIES = [
  "ball", "glove", "shoes", "rangefinder", "bag", "wear",
  "cap", "rain_wear", "sunglasses", "towel", "marker", "tee", "other",
] as const;

export const createAccessorySchema = z.object({
  category: z.enum(ACCESSORY_CATEGORIES),
  brand: z.string().max(50).optional().nullable(),
  model: z.string().min(1).max(50),
  memo: z.string().max(500).optional().nullable(),
  purchase_url: z.string().url().max(500).optional().nullable().or(z.literal("")),
  purchase_date: z.string().max(20).optional().nullable(),
  purchase_price: z.number().min(0).max(100_000_000).optional().nullable(),
  status: z.enum(["active", "retired"]).optional(),
  image_url: z.string().max(500).optional().nullable(),
});

const clubBallSchema = z.object({
  club_id: z.string().uuid(),
  balls: z.number().int().min(0).max(9999),
  avg_distance: z.number().min(0).max(400).optional().nullable(),
  memo: z.object({
    condition: z.string().min(1),
    memo: z.string().max(2000).optional(),
    symptom_tags: z.array(z.string()).optional(),
    feeling_tags: z.array(z.string()).optional(),
    gear_tags: z.array(z.string()).optional(),
  }).optional().nullable(),
});

export const createPracticeSchema = z.object({
  practiced_at: z.string().min(1),
  location: z.string().max(100).optional().nullable(),
  total_balls: z.number().int().min(0).max(99999).optional().nullable(),
  memo: z.string().max(2000).optional().nullable(),
  clubs: z.array(clubBallSchema).optional(),
});

export const contactSchema = z.object({
  turnstileToken: z.string().min(1),
  name: z.string().max(100).optional().nullable(),
  email: z.string().email().max(200),
  category: z.enum(["bug", "feature", "question", "other"]),
  message: z.string().min(1).max(5000),
});
