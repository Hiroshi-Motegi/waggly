// src/app/api/bag/witb-image/route.tsx
import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

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
  try {
    // Edge-compatible auth: cookie or Bearer token
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const admin = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = request.headers.get("authorization");
    let authUserId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: { user } } = await admin.auth.getUser(token);
      authUserId = user?.id ?? null;
    } else {
      // Cookie-based auth: extract access token from sb-* chunked cookies
      const cookies = request.headers.get("cookie") ?? "";
      const cookieParts = cookies.split(";").map(c => c.trim());
      const supabaseHost = new URL(supabaseUrl).hostname.split(".")[0];
      const prefix = `sb-${supabaseHost}-auth-token`;

      // Reassemble chunked cookies (.0, .1, .2, ...) or single cookie
      let raw = "";
      const singleCookie = cookieParts.find(c => c.startsWith(`${prefix}=`));
      if (singleCookie) {
        raw = decodeURIComponent(singleCookie.split("=").slice(1).join("="));
      } else {
        // Chunked: prefix.0, prefix.1, ...
        for (let i = 0; ; i++) {
          const chunk = cookieParts.find(c => c.startsWith(`${prefix}.${i}=`));
          if (!chunk) break;
          raw += decodeURIComponent(chunk.split("=").slice(1).join("="));
        }
      }

      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          const accessToken = Array.isArray(parsed) ? parsed[0] : parsed?.access_token;
          if (accessToken) {
            const { data: { user } } = await admin.auth.getUser(accessToken);
            authUserId = user?.id ?? null;
          }
        } catch {}
      }
    }

    if (!authUserId) {
      // Debug: show what we found
      const cookies = request.headers.get("cookie") ?? "";
      const cookieParts = cookies.split(";").map(c => c.trim());
      const supabaseHost2 = new URL(supabaseUrl).hostname.split(".")[0];
      const prefix2 = `sb-${supabaseHost2}-auth-token`;
      const matchingCookies = cookieParts.filter(c => c.startsWith(prefix2)).map(c => c.substring(0, 60) + "...");
      return new Response(JSON.stringify({
        error: "Unauthorized",
        debug: { prefix: prefix2, matchingCookies },
      }), { status: 401 });
    }

    // Resolve users.id from auth_user_id via user_providers
    const { data: provider } = await admin
      .from("user_providers")
      .select("user_id")
      .eq("auth_user_id", authUserId)
      .limit(1)
      .maybeSingle();

    if (!provider) {
      return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
    }
    const userId = provider.user_id;

    const bagNumber = Number(request.nextUrl.searchParams.get("bag") ?? "1");

    const { data: clubs } = await admin
      .from("clubs")
      .select("club_number, maker, model, category, distance, shaft_name, shaft_flex")
      .eq("user_id", userId)
      .eq("status", "bag")
      .eq("bag_number", bagNumber)
      .order("sort_order", { ascending: true });

    if (!clubs || clubs.length === 0) {
      return new Response("No clubs found", { status: 404 });
    }

    const { data: user } = await admin
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

    // Fetch image assets via URL
    const origin = request.nextUrl.origin;
    const [grassBg, ballLogo, wagglyText] = await Promise.all([
      fetchAsBase64(`${origin}/images/grass-bg.jpg`, "image/jpeg"),
      fetchAsBase64(`${origin}/images/witb-ball-logo.png`, "image/png"),
      fetchAsBase64(`${origin}/images/witb-waggly-text.png`, "image/png"),
    ]);

    return new ImageResponse(
      (
        <div
          style={{
            width: "1200px",
            height: "810px",
            display: "flex",
            flexDirection: "column",
            fontFamily: "sans-serif",
            color: "white",
            position: "relative",
            backgroundColor: "#27b135",
          }}
        >
          <img
            src={grassBg}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "1200px",
              height: "810px",
              objectFit: "cover",
              opacity: 0.5,
            }}
          />

          <div style={{ display: "flex", flexDirection: "column", padding: "40px", flex: 1, position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "36px", fontWeight: "bold" }}>{displayName}&apos;s Bag</span>
                <span style={{ fontSize: "18px", opacity: 0.8 }}>{clubs.length} clubs</span>
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
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", padding: "0 24px 24px", position: "relative" }}>
            <img src={ballLogo} style={{ width: "64px", height: "67px" }} />
            <img src={wagglyText} style={{ width: "200px", height: "66px" }} />
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 810,
      }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message, stack: e.stack }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function fetchAsBase64(url: string, mime: string): Promise<string> {
  const res = await fetch(url);
  const arrayBuffer = await res.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:${mime};base64,${btoa(binary)}`;
}
