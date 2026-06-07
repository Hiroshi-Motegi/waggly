import { NextRequest, NextResponse } from "next/server";

const RAKUTEN_APP_ID = process.env.RAKUTEN_APP_ID;
const RAKUTEN_AFFILIATE_ID = process.env.NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params;
  if (!RAKUTEN_APP_ID) {
    return NextResponse.json({ error: "Rakuten API not configured" }, { status: 500 });
  }

  const urlParams = new URLSearchParams({
    applicationId: RAKUTEN_APP_ID,
    golfCourseId: courseId,
    formatVersion: "2",
  });

  if (RAKUTEN_AFFILIATE_ID) {
    urlParams.set("affiliateId", RAKUTEN_AFFILIATE_ID);
  }

  const res = await fetch(
    `https://app.rakuten.co.jp/services/api/Gora/GoraGolfCourseDetail/20170623?${urlParams}`,
    { next: { revalidate: 3600 } }
  );

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to fetch course detail" }, { status: 500 });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
