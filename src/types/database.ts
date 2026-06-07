export type ClubCategory = "driver" | "fairway_wood" | "utility" | "iron" | "wedge" | "putter";
export type ClubStatus = "active" | "stored" | "sold";
export type MaintenanceType = "grip_change" | "reshaft" | "loft_adjust" | "other";
export type PlanSource = "auto" | "chat";
export type PlanStatus = "new" | "done" | "skipped";
export type ChatRole = "user" | "assistant";

export interface User {
  id: string;
  line_user_id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Club {
  id: string;
  user_id: string;
  category: ClubCategory;
  club_number: string;
  maker: string | null;
  model: string | null;
  shaft_name: string | null;
  shaft_flex: string | null;
  loft: number | null;
  lie: number | null;
  length: number | null;
  distance: number | null;
  purchase_date: string | null;
  purchase_shop: string | null;
  purchase_price: number | null;
  status: ClubStatus;
  sort_order: number;
  created_at: string;
}

export interface ClubImage {
  id: string;
  club_id: string;
  image_url: string;
  is_primary: boolean;
  created_at: string;
}

export interface Maintenance {
  id: string;
  club_id: string;
  type: MaintenanceType;
  description: string | null;
  shop: string | null;
  cost: number | null;
  done_at: string;
  created_at: string;
}

export interface PracticeSession {
  id: string;
  user_id: string;
  practiced_at: string;
  location: string | null;
  total_balls: number | null;
  memo: string | null;
  created_at: string;
}

export interface PracticeClub {
  id: string;
  session_id: string;
  club_id: string;
  balls: number;
}

export interface PracticePlan {
  id: string;
  user_id: string;
  title: string;
  summary: string;
  source: PlanSource;
  status: PlanStatus;
  created_at: string;
}

export interface PracticePlanItem {
  id: string;
  plan_id: string;
  club_id: string | null;
  balls: number;
  focus: string;
  sort_order: number;
}

export interface AiChat {
  id: string;
  user_id: string;
  conversation_id: string;
  role: ChatRole;
  message: string;
  created_at: string;
}

// Joined types for convenience
export interface ClubWithImages extends Club {
  club_images: ClubImage[];
}

export interface PracticeSessionWithClubs extends PracticeSession {
  practice_clubs: (PracticeClub & { club: Club })[];
}

export interface PracticePlanWithItems extends PracticePlan {
  practice_plan_items: (PracticePlanItem & { club: Club | null })[];
}
