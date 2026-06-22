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
  agreed_terms_at: string | null;
  onboarding_version: number;
  is_admin: boolean;
  ad_free: boolean;
  created_at: string;
}

export interface UserProvider {
  id: string;
  user_id: string;
  provider: string;
  auth_user_id: string | null;
  provider_sub: string;
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
  grip_name: string | null;       // グリップ名
  grip_size: string | null;       // グリップ太さ (M58, M60, M62等)
  bounce: number | null;          // バウンス角 (°) — ウェッジ用
  sole_shape: string | null;      // ソール形状 — ウェッジ用
  face_angle: number | null;      // フェース角 (°) — ドライバー用
  shaft_weight: number | null;    // シャフト重量 (g)
  rating: number | null;
  hidden_from_profile: boolean;
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
  club_number: string | null;
  detail: string | null;
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
  hidden_from_profile: boolean;
  created_at: string;
}

export interface AccessoryImage {
  id: string;
  accessory_id: string;
  image_url: string;
  is_primary: boolean;
  created_at: string;
}

export interface ProfileCoverImage {
  id: string;
  user_id: string;
  image_url: string;
  sort_order: number;
  created_at: string;
}

// Joined types for convenience
export interface ClubWithImages extends Club {
  club_images: ClubImage[];
  latest_avg_distance?: number | null;
}

export interface AccessoryWithImages extends Accessory {
  accessory_images: AccessoryImage[];
}

export interface PracticeSessionWithClubs extends PracticeSession {
  practice_clubs: (PracticeClub & { club: Club; memo: ClubMemo | null })[];
}

export interface PracticePlanWithItems extends PracticePlan {
  practice_plan_items: PracticePlanItem[];
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

export interface Inquiry {
  id: string;
  user_id: string | null;
  name: string | null;
  email: string;
  category: 'bug' | 'feature' | 'question' | 'other';
  message: string;
  status: 'open' | 'in_progress' | 'closed';
  created_at: string;
}

export interface Report {
  id: string;
  reported_username: string;
  reason: 'inappropriate' | 'spam' | 'harassment' | 'other';
  detail: string | null;
  reporter_email: string | null;
  status: 'open' | 'in_progress' | 'closed';
  created_at: string;
}

export interface ClubSpec {
  id: string;
  maker: string;
  model: string;
  category: string;
  club_number: string | null;
  maker_normalized: string;
  model_normalized: string;
  loft: number | null;
  lie: number | null;
  length: number | null;
  distance: number | null;
  weight: number | null;
  swing_weight: string | null;
  head_volume: number | null;
  head_weight: number | null;
  image_url: string | null;
  affiliate_url: string | null;
  source: 'ai' | 'manual';
  verified: boolean;
  created_at: string;
  updated_at: string;
}
