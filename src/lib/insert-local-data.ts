/**
 * Insert local data into Supabase under a given user ID.
 * Shared by resolve-conflict and upload-local-data APIs.
 *
 * Security: クライアント提供の club_id は信用せず、サーバーで INSERT した clubs の ID にマッピングする。
 */
import type { SupabaseClient } from "@supabase/supabase-js";

// 許可するフィールドのホワイトリスト
const CLUB_FIELDS = [
  "category", "club_number", "maker", "model", "shaft_name", "shaft_flex",
  "loft", "lie", "length", "weight", "balance", "distance", "status",
  "bag_number", "sort_order", "rating", "head_volume", "head_material",
  "head_finish", "face_angle", "grip_name", "purchase_date", "purchase_price",
  "purchase_url", "memo",
] as const;

const ACCESSORY_FIELDS = [
  "category", "brand", "model", "purchase_date", "purchase_price",
  "purchase_url", "memo", "rating", "status",
] as const;

const SESSION_FIELDS = [
  "practiced_at", "location", "total_balls", "memo", "rating",
] as const;

const PRACTICE_CLUB_FIELDS = [
  "club_id", "balls", "avg_distance",
] as const;

const MEMO_FIELDS = [
  "club_id", "distance", "memo", "condition", "symptom_tags", "feeling_tags", "gear_tags",
] as const;

const MAINTENANCE_FIELDS = [
  "club_id", "type", "description", "shop", "cost", "done_at",
] as const;

function pick<T extends Record<string, unknown>>(obj: T, fields: readonly string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of fields) {
    if (key in obj) result[key] = obj[key];
  }
  return result;
}

interface LocalClub extends Record<string, unknown> {
  id?: string;
  club_memos?: Record<string, unknown>[];
  club_images?: Record<string, unknown>[];
  maintenances?: Record<string, unknown>[];
}

interface LocalSession extends Record<string, unknown> {
  practice_clubs?: Record<string, unknown>[];
}

interface LocalData {
  clubs?: LocalClub[];
  accessories?: Record<string, unknown>[];
  practiceSessions?: LocalSession[];
}

export async function insertLocalData(supabase: SupabaseClient, userId: string, localData: LocalData) {
  const { clubs = [], accessories = [], practiceSessions = [] } = localData;

  // ローカル club_id → サーバー club_id のマッピング
  const clubIdMap = new Map<string, string>();

  for (const club of clubs) {
    const { club_memos = [], maintenances = [], ...rawClubData } = club;
    const clubData = pick(rawClubData, CLUB_FIELDS);

    const { data: inserted, error: clubErr } = await supabase
      .from("clubs")
      .insert({ ...clubData, user_id: userId })
      .select("id")
      .single();
    if (clubErr) throw new Error(`Failed to insert club: ${clubErr.message}`);

    // ローカル ID → サーバー ID をマッピング
    if (club.id && inserted) {
      clubIdMap.set(String(club.id), inserted.id);
    }

    // club_memos: サーバー発行の club_id を使用
    for (const memo of club_memos) {
      const memoData = pick(memo, MEMO_FIELDS);
      memoData.club_id = inserted.id; // サーバー発行 ID で上書き
      const { error } = await supabase.from("club_memos").insert(memoData);
      if (error) throw new Error(`Failed to insert club_memo: ${error.message}`);
    }
    // club_images are skipped here — local image URLs (capacitor://) don't work
    // on the server. The client uploads images separately after resolve completes.
    for (const maintenance of maintenances) {
      const maintenanceData = pick(maintenance, MAINTENANCE_FIELDS);
      maintenanceData.club_id = inserted.id; // サーバー発行 ID で上書き
      const { error } = await supabase.from("maintenances").insert(maintenanceData);
      if (error) throw new Error(`Failed to insert maintenance: ${error.message}`);
    }
  }

  for (const accessory of accessories) {
    const accessoryData = pick(accessory, ACCESSORY_FIELDS);
    const { error } = await supabase.from("accessories").insert({ ...accessoryData, user_id: userId });
    if (error) throw new Error(`Failed to insert accessory: ${error.message}`);
  }

  for (const session of practiceSessions) {
    const { practice_clubs = [], ...rawSessionData } = session;
    const sessionData = pick(rawSessionData, SESSION_FIELDS);

    const { data: inserted, error: sessionErr } = await supabase
      .from("practice_sessions")
      .insert({ ...sessionData, user_id: userId })
      .select("id")
      .single();
    if (sessionErr) throw new Error(`Failed to insert practice_session: ${sessionErr.message}`);

    for (const pc of practice_clubs) {
      const pcData = pick(pc, PRACTICE_CLUB_FIELDS);
      // club_id をサーバー発行 ID にマッピング
      if (pcData.club_id && clubIdMap.has(String(pcData.club_id))) {
        pcData.club_id = clubIdMap.get(String(pcData.club_id));
      }
      pcData.session_id = inserted.id;
      const { error } = await supabase.from("practice_clubs").insert(pcData);
      if (error) throw new Error(`Failed to insert practice_club: ${error.message}`);
    }
  }
}
