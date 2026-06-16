import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const USER_ID = "118dc9b6-deff-4d05-9015-a7d39bf01d0f";

const clubs = [
  // Driver
  { category: "driver", club_number: "1W", maker: "WAGGLE", model: "DUMMY-DR-1", shaft_name: "WAGGLE DUMMY-S65", shaft_flex: "S", loft: 10.5, lie: 59, length: 45.5, distance: 230, weight: 305, swing_weight: "D2", head_volume: 460, head_weight: 198, face_angle: -0.5, shaft_weight: 65, kick_point: "中調子", grip_name: "WAGGLE DUMMY-GRIP", grip_size: "M60", sort_order: 0 },
  // Fairway woods
  { category: "fairway_wood", club_number: "3W", maker: "WAGGLE", model: "DUMMY-FW-3", shaft_name: "WAGGLE DUMMY-S65", shaft_flex: "S", loft: 15, lie: 58, length: 43, distance: 210, weight: 315, swing_weight: "D1", head_volume: 175, head_weight: 205, shaft_weight: 65, kick_point: "中調子", grip_name: "WAGGLE DUMMY-GRIP", grip_size: "M60", sort_order: 1 },
  { category: "fairway_wood", club_number: "5W", maker: "WAGGLE", model: "DUMMY-FW-5", shaft_name: "WAGGLE DUMMY-S65", shaft_flex: "S", loft: 18, lie: 58.5, length: 42.5, distance: 195, weight: 320, swing_weight: "D1", head_volume: 155, head_weight: 210, shaft_weight: 65, kick_point: "中調子", grip_name: "WAGGLE DUMMY-GRIP", grip_size: "M60", sort_order: 2 },
  // Utilities
  { category: "utility", club_number: "4U", maker: "WAGGLE", model: "DUMMY-UT-4", shaft_name: "WAGGLE DUMMY-S75", shaft_flex: "S", loft: 22, lie: 60, length: 39.5, distance: 185, weight: 345, swing_weight: "D1", head_weight: 230, shaft_weight: 75, kick_point: "中元調子", grip_name: "WAGGLE DUMMY-GRIP", grip_size: "M60", sort_order: 3 },
  { category: "utility", club_number: "5U", maker: "WAGGLE", model: "DUMMY-UT-5", shaft_name: "WAGGLE DUMMY-S75", shaft_flex: "S", loft: 25, lie: 60.5, length: 39, distance: 175, weight: 350, swing_weight: "D1", head_weight: 235, shaft_weight: 75, kick_point: "中元調子", grip_name: "WAGGLE DUMMY-GRIP", grip_size: "M60", sort_order: 4 },
  // Irons
  { category: "iron", club_number: "6I", maker: "WAGGLE", model: "DUMMY-IR-6", shaft_name: "WAGGLE DUMMY-T90", shaft_flex: "S", loft: 26, lie: 61, length: 37.5, distance: 165, weight: 395, swing_weight: "D2", head_weight: 255, shaft_weight: 90, kick_point: "元調子", grip_name: "WAGGLE DUMMY-GRIP", grip_size: "M60", sort_order: 5 },
  { category: "iron", club_number: "7I", maker: "WAGGLE", model: "DUMMY-IR-7", shaft_name: "WAGGLE DUMMY-T90", shaft_flex: "S", loft: 30, lie: 61.5, length: 37, distance: 155, weight: 405, swing_weight: "D2", head_weight: 262, shaft_weight: 90, kick_point: "元調子", grip_name: "WAGGLE DUMMY-GRIP", grip_size: "M60", sort_order: 6 },
  { category: "iron", club_number: "8I", maker: "WAGGLE", model: "DUMMY-IR-8", shaft_name: "WAGGLE DUMMY-T90", shaft_flex: "S", loft: 34, lie: 62, length: 36.5, distance: 145, weight: 415, swing_weight: "D2", head_weight: 269, shaft_weight: 90, kick_point: "元調子", grip_name: "WAGGLE DUMMY-GRIP", grip_size: "M60", sort_order: 7 },
  { category: "iron", club_number: "9I", maker: "WAGGLE", model: "DUMMY-IR-9", shaft_name: "WAGGLE DUMMY-T90", shaft_flex: "S", loft: 38, lie: 62.5, length: 36, distance: 135, weight: 425, swing_weight: "D2", head_weight: 276, shaft_weight: 90, kick_point: "元調子", grip_name: "WAGGLE DUMMY-GRIP", grip_size: "M60", sort_order: 8 },
  { category: "iron", club_number: "PW", maker: "WAGGLE", model: "DUMMY-IR-PW", shaft_name: "WAGGLE DUMMY-T90", shaft_flex: "S", loft: 43, lie: 63, length: 35.5, distance: 120, weight: 435, swing_weight: "D2", head_weight: 283, shaft_weight: 90, kick_point: "元調子", grip_name: "WAGGLE DUMMY-GRIP", grip_size: "M60", sort_order: 9 },
  // Wedges
  { category: "wedge", club_number: "AW", maker: "WAGGLE", model: "DUMMY-WG-50", shaft_name: "WAGGLE DUMMY-W75", shaft_flex: "S", loft: 50, lie: 63.5, length: 35.25, distance: 100, weight: 460, swing_weight: "D3", head_weight: 290, shaft_weight: 75, bounce: 10, sole_shape: "セミグラインド", kick_point: "元調子", grip_name: "WAGGLE DUMMY-GRIP", grip_size: "M60", sort_order: 10 },
  { category: "wedge", club_number: "SW", maker: "WAGGLE", model: "DUMMY-WG-56", shaft_name: "WAGGLE DUMMY-W75", shaft_flex: "S", loft: 56, lie: 63.5, length: 35.25, distance: 80, weight: 465, swing_weight: "D3", head_weight: 294, shaft_weight: 75, bounce: 12, sole_shape: "フルソール", kick_point: "元調子", grip_name: "WAGGLE DUMMY-GRIP", grip_size: "M60", sort_order: 11 },
  { category: "wedge", club_number: "LW", maker: "WAGGLE", model: "DUMMY-WG-58", shaft_name: "WAGGLE DUMMY-W75", shaft_flex: "S", loft: 58, lie: 63.5, length: 35, distance: 60, weight: 468, swing_weight: "D3", head_weight: 296, shaft_weight: 75, bounce: 8, sole_shape: "ローバウンス", kick_point: "元調子", grip_name: "WAGGLE DUMMY-GRIP", grip_size: "M60", sort_order: 12 },
  // Putter
  { category: "putter", club_number: "PT", maker: "WAGGLE", model: "DUMMY-PT-1", loft: 3, lie: 70, length: 34, weight: 540, swing_weight: "E2", head_weight: 350, grip_name: "WAGGLE DUMMY-PUTTER-GRIP", sort_order: 13 },
];

const accessories = [
  { category: "glove", brand: "WAGGLE", model: "DUMMY-GLOVE-01", memo: "合成皮革、左手用、白" },
  { category: "apparel", brand: "WAGGLE", model: "DUMMY-HAT-01", memo: "バケットハット、ベージュ" },
  { category: "apparel", brand: "WAGGLE", model: "DUMMY-SHOES-01", memo: "スパイクレス、白/紺" },
  { category: "apparel", brand: "WAGGLE", model: "DUMMY-CAP-01", memo: "キャップ、白" },
  { category: "ball", brand: "WAGGLE", model: "DUMMY-BALL-V3", memo: "3ピース、カラーボール" },
  { category: "ball", brand: "WAGGLE", model: "DUMMY-BALL-X1", memo: "4ピース、ツアーモデル、白" },
  { category: "tee", brand: "WAGGLE", model: "DUMMY-TEE-SET", memo: "ロング&ショート各色セット" },
  { category: "rangefinder", brand: "WAGGLE", model: "DUMMY-RF-200", memo: "レーザー距離計、手ブレ補正付き" },
  { category: "other", brand: "WAGGLE", model: "DUMMY-TOWEL-01", memo: "マイクロファイバー、黒" },
  { category: "apparel", brand: "WAGGLE", model: "DUMMY-WATCH-01", memo: "GPSゴルフウォッチ" },
  { category: "apparel", brand: "WAGGLE", model: "DUMMY-RAIN-01", memo: "レインウェア上下セット、グレー" },
];

async function main() {
  console.log("Inserting clubs...");
  const clubRows = clubs.map((c) => ({ ...c, user_id: USER_ID, status: "bag", bag_number: 0 }));
  const { data: clubData, error: clubError } = await supabase.from("clubs").insert(clubRows).select("id, club_number");
  if (clubError) { console.error("Club insert error:", clubError); return; }
  console.log(`  ${clubData.length} clubs inserted`);

  console.log("Inserting accessories...");
  const accRows = accessories.map((a) => ({ ...a, user_id: USER_ID, status: "active" }));
  const { data: accData, error: accError } = await supabase.from("accessories").insert(accRows).select("id, model");
  if (accError) { console.error("Accessory insert error:", accError); return; }
  console.log(`  ${accData.length} accessories inserted`);

  console.log("Done!");
}

main();
