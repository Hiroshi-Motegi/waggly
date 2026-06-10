import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";

export function generateStaticParams() {
  return [{ courseId: "_" }];
}

const RAKUTEN_APP_ID = process.env.RAKUTEN_APP_ID;
const RAKUTEN_ACCESS_KEY = process.env.RAKUTEN_ACCESS_KEY;
const RAKUTEN_AFFILIATE_ID = process.env.NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID;
const APP_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ? "https://waggly.jp" : "http://localhost:3000";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();

  const { courseId } = await params;
  if (!RAKUTEN_APP_ID || !RAKUTEN_ACCESS_KEY) {
    return NextResponse.json({ error: "Rakuten API not configured" }, { status: 500 });
  }

  const urlParams = new URLSearchParams({
    applicationId: RAKUTEN_APP_ID,
    accessKey: RAKUTEN_ACCESS_KEY,
    golfCourseId: courseId,
    formatVersion: "2",
  });

  if (RAKUTEN_AFFILIATE_ID) {
    urlParams.set("affiliateId", RAKUTEN_AFFILIATE_ID);
  }

  const res = await fetch(
    `https://openapi.rakuten.co.jp/engine/api/Gora/GoraGolfCourseDetail/20170623?${urlParams}`,
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
    console.error("[course detail] Rakuten API error:", JSON.stringify(data));
    return NextResponse.json({ error: "Failed to fetch course detail", detail: data }, { status: 500 });
  }

  return NextResponse.json(data);
}
