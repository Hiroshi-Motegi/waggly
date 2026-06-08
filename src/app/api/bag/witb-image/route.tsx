// src/app/api/bag/witb-image/route.tsx
import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";

const categoryLabels: Record<string, string> = {
  driver: "ドライバー",
  fairway_wood: "FW",
  utility: "UT",
  iron: "アイアン",
  wedge: "ウェッジ",
  putter: "パター",
};

const categoryOrder = ["driver", "fairway_wood", "utility", "iron", "wedge", "putter"];

export async function GET(request: NextRequest) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const bagNumber = Number(request.nextUrl.searchParams.get("bag") ?? "1");

  const { data: clubs } = await supabase
    .from("clubs")
    .select("club_number, maker, model, category, distance, shaft_name, shaft_flex")
    .eq("user_id", userId)
    .eq("status", "bag")
    .eq("bag_number", bagNumber)
    .order("sort_order", { ascending: true });

  if (!clubs || clubs.length === 0) {
    return new Response("No clubs found", { status: 404 });
  }

  const { data: user } = await supabase
    .from("users")
    .select("display_name")
    .eq("id", userId)
    .single();

  const displayName = user?.display_name ?? "Golfer";

  const grouped = categoryOrder
    .map((cat) => ({
      category: cat,
      label: categoryLabels[cat] ?? cat,
      clubs: clubs.filter((c: any) => c.category === cat),
    }))
    .filter((g) => g.clubs.length > 0);

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#006728",
          fontFamily: "sans-serif",
          padding: "40px",
          color: "white",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "36px", fontWeight: "bold" }}>{displayName}&apos;s Bag</span>
            <span style={{ fontSize: "18px", opacity: 0.8 }}>{clubs.length} clubs</span>
          </div>
          <div style={{ display: "flex", alignItems: "center" }}>
            <span style={{ fontSize: "24px", fontWeight: "bold", opacity: 0.9 }}>Waggly</span>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", flex: 1 }}>
          {grouped.map((group) => (
            <div
              key={group.category}
              style={{
                display: "flex",
                flexDirection: "column",
                backgroundColor: "rgba(255,255,255,0.12)",
                borderRadius: "12px",
                padding: "12px 16px",
                minWidth: "170px",
              }}
            >
              <span style={{ fontSize: "12px", opacity: 0.7, marginBottom: "8px", textTransform: "uppercase" as const }}>
                {group.label}
              </span>
              {group.clubs.map((club: any, i: number) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", marginBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                    <span style={{ fontSize: "20px", fontWeight: "bold" }}>{club.club_number}</span>
                    {club.distance && (
                      <span style={{ fontSize: "14px", opacity: 0.7 }}>{club.distance}yd</span>
                    )}
                  </div>
                  <span style={{ fontSize: "14px", opacity: 0.9 }}>
                    {[club.maker, club.model].filter(Boolean).join(" ") || "—"}
                  </span>
                  {club.shaft_name && (
                    <span style={{ fontSize: "11px", opacity: 0.6 }}>
                      {[club.shaft_name, club.shaft_flex].filter(Boolean).join(" ")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
          <span style={{ fontSize: "14px", opacity: 0.5 }}>waggly.app</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
