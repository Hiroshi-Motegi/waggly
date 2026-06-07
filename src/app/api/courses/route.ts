import { NextRequest, NextResponse } from "next/server";

const RAKUTEN_APP_ID = process.env.RAKUTEN_APP_ID;
const RAKUTEN_AFFILIATE_ID = process.env.NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID;

export async function GET(request: NextRequest) {
  if (!RAKUTEN_APP_ID) {
    return NextResponse.json({ error: "Rakuten API not configured" }, { status: 500 });
  }

  const keyword = request.nextUrl.searchParams.get("keyword") ?? "";
  const areaCode = request.nextUrl.searchParams.get("areaCode") ?? "";
  const page = request.nextUrl.searchParams.get("page") ?? "1";

  const params = new URLSearchParams({
    applicationId: RAKUTEN_APP_ID,
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
    `https://app.rakuten.co.jp/services/api/Gora/GoraGolfCourseSearch/20170623?${params}`,
    { next: { revalidate: 3600 } }
  );

  const data = await res.json();

  if (!res.ok) {
    console.error("[courses] Rakuten API error:", JSON.stringify(data));
    return NextResponse.json({ error: "Failed to fetch courses", detail: data }, { status: 500 });
  }

  return NextResponse.json(data);
}
