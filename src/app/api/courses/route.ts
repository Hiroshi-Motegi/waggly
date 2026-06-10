import { NextRequest, NextResponse } from "next/server";


const RAKUTEN_APP_ID = process.env.RAKUTEN_APP_ID;
const RAKUTEN_ACCESS_KEY = process.env.RAKUTEN_ACCESS_KEY;
const RAKUTEN_AFFILIATE_ID = process.env.NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID;
const APP_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ? "https://waggly.jp" : "http://localhost:3000";

export async function GET(request: NextRequest) {
  if (!RAKUTEN_APP_ID || !RAKUTEN_ACCESS_KEY) {
    return NextResponse.json({ error: "Rakuten API not configured" }, { status: 500 });
  }

  const keyword = request.nextUrl.searchParams.get("keyword") ?? "";
  const areaCode = request.nextUrl.searchParams.get("areaCode") ?? "";
  const page = request.nextUrl.searchParams.get("page") ?? "1";

  const params = new URLSearchParams({
    applicationId: RAKUTEN_APP_ID,
    accessKey: RAKUTEN_ACCESS_KEY,
    hits: "20",
    page,
    formatVersion: "2",
  });

  if (RAKUTEN_AFFILIATE_ID) {
    params.set("affiliateId", RAKUTEN_AFFILIATE_ID);
  }
  if (keyword) params.set("keyword", keyword);
  if (areaCode) params.set("areaCode", areaCode);

  const res = await fetch(
    `https://openapi.rakuten.co.jp/engine/api/Gora/GoraGolfCourseSearch/20170623?${params}`,
    {
      headers: {
        Referer: APP_URL,
        Origin: APP_URL,
      },
      next: { revalidate: 3600 },
    }
  );

  const data = await res.json();

  if (!res.ok) {
    // "not_found" means no results — return empty, not error
    if (data?.error === "not_found") {
      return NextResponse.json({ Items: [], count: 0, page: 1, pageCount: 0, hits: 0 });
    }
    console.error("[courses] Rakuten API error:", JSON.stringify(data));
    return NextResponse.json({ error: "Failed to fetch courses", detail: data }, { status: 500 });
  }

  return NextResponse.json(data);
}
