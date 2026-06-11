export type ClubCategory = "driver" | "fairway_wood" | "utility" | "iron" | "wedge" | "putter";
export type AccessoryCategory = "ball" | "glove" | "tee" | "apparel" | "bag" | "rangefinder" | "grip" | "shaft" | "other";
export type AccessoryStatus = "active" | "past";
export type ClubStatus = "bag" | "reserve" | "sold";
export type MaintenanceType = "grip_change" | "reshaft" | "loft_adjust" | "other";
export type PlanSource = "auto" | "chat";
export type PlanStatus = "new" | "done" | "skipped";
export type ChatRole = "user" | "assistant";
export type MemoCondition = "good" | "normal" | "bad";

export interface User {
  id: string;
  display_name: string;
  avatar_url: string | null;
  google_email: string | null;
  agreed_terms_at: string | null;
  created_at: string;
}

export interface UserProvider {
  id: string;
  user_id: string;
  provider: string;
  auth_user_id: string | null;
  provider_sub: string;
  provider_email: string | null;
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
  release_year: number | null;
  memo: string | null;
  purchase_date: string | null;
  purchase_shop: string | null;
  purchase_price: number | null;
  status: ClubStatus;
  bag_number: number;
  sort_order: number;
  // 詳細スペック（プログレッシブディスクロージャー: 詳細層）
  weight: number | null;          // 総重量 (g)
  swing_weight: string | null;    // バランス (D0, D1, D2 等)
  frequency: number | null;       // 振動数 (cpm)
  kick_point: string | null;      // キックポイント
  head_volume: number | null;     // ヘッド体積 (cc)
  head_weight: number | null;     // ヘッド重量 (g)
  rating: number | null;
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
  rating: number | null;
  plan_id: string | null;
  created_at: string;
}

export interface PracticeClub {
  id: string;
  session_id: string;
  club_id: string;
  balls: number;
  avg_distance: number | null;
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

export interface ClubMemo {
  id: string;
  club_id: string;
  distance: number | null;
  memo: string | null;
  condition: MemoCondition | null;
  symptom_tags: string[];
  feeling_tags: string[];
  gear_tags: string[];
  practice_session_id: string | null;
  created_at: string;
}

export interface Accessory {
  id: string;
  user_id: string;
  category: AccessoryCategory;
  brand: string | null;
  model: string | null;
  memo: string | null;
  rating: number | null;
  status: AccessoryStatus;
  purchase_url: string | null;
  image_url: string | null;
  created_at: string;
}

// Joined types for convenience
export interface ClubWithImages extends Club {
  club_images: ClubImage[];
  latest_avg_distance?: number | null;
}

export interface PracticeSessionWithClubs extends PracticeSession {
  practice_clubs: (PracticeClub & { club: Club; memo: ClubMemo | null })[];
}

export interface PracticePlanWithItems extends PracticePlan {
  practice_plan_items: (PracticePlanItem & { club: Club | null })[];
}

export interface Profile {
  id: string;
  username: string | null;
  nickname: string | null;
  avatar_url: string | null;
  golf_start_date: string | null;
  average_score: number | null;
  best_score: number | null;
  home_course: string | null;
  bio: string | null;
  sns_links: { instagram?: string; x?: string };
  is_public: boolean;
  visible_fields: Record<string, boolean>;
  created_at: string;
  updated_at: string;
}

export interface FavoriteCourse {
  id: string;
  user_id: string;
  gora_course_id: number | null;
  course_name: string;
  course_image_url: string | null;
  evaluation: number | null;
  address: string | null;
  is_manual: boolean;
  sort_order: number;
  created_at: string;
}
