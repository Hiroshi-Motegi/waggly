import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";

export const dynamic = "force-static";
export function generateStaticParams() {
  return [{ clubId: "_" }];
}


/**
 * Returns a unified activity timeline (memos + practice + maintenance) for a club,
 * sorted by date descending.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  const { clubId } = await params;
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const { data: club } = await supabase
    .from("clubs")
    .select("id")
    .eq("id", clubId)
    .eq("user_id", userId)
    .single();

  if (!club) return NextResponse.json({ error: "Club not found" }, { status: 404 });

  // Fetch memos
  const { data: memos } = await supabase
    .from("club_memos")
    .select("id, distance, memo, condition, symptom_tags, feeling_tags, gear_tags, created_at")
    .eq("club_id", clubId)
    .order("created_at", { ascending: false });

  // Fetch practice records
  const { data: practiceClubs } = await supabase
    .from("practice_clubs")
    .select("id, balls, avg_distance, session:practice_sessions(id, practiced_at, location, created_at)")
    .eq("club_id", clubId)
    .order("id", { ascending: false });

  // Fetch maintenances
  const { data: maintenances } = await supabase
    .from("maintenances")
    .select("id, type, description, shop, cost, done_at, created_at")
    .eq("club_id", clubId)
    .order("done_at", { ascending: false });

  const maintenanceTypeLabels: Record<string, string> = {
    grip_change: "グリップ交換",
    reshaft: "リシャフト",
    loft_adjust: "ロフト調整",
    other: "その他",
  };

  // Build unified timeline
  const timeline: any[] = [];

  if (memos) {
    for (const m of memos) {
      timeline.push({
        type: "memo",
        id: m.id,
        date: m.created_at,
        distance: m.distance,
        memo: m.memo,
        condition: m.condition,
        symptom_tags: m.symptom_tags,
        feeling_tags: m.feeling_tags,
        gear_tags: m.gear_tags,
      });
    }
  }

  if (practiceClubs) {
    for (const pc of practiceClubs) {
      const session = pc.session as any;
      if (!session) continue;
      timeline.push({
        type: "practice",
        id: pc.id,
        session_id: session.id,
        date: session.created_at ?? session.practiced_at,
        practiced_at: session.practiced_at,
        location: session.location,
        balls: pc.balls,
        avg_distance: pc.avg_distance,
      });
    }
  }

  if (maintenances) {
    for (const m of maintenances) {
      timeline.push({
        type: "maintenance",
        id: m.id,
        date: m.created_at ?? m.done_at,
        done_at: m.done_at,
        maintenance_type: m.type,
        maintenance_label: maintenanceTypeLabels[m.type] ?? m.type,
        description: m.description,
        shop: m.shop,
        cost: m.cost,
      });
    }
  }

  // Sort by date desc
  timeline.sort((a, b) => b.date.localeCompare(a.date));

  return NextResponse.json(timeline);
}
