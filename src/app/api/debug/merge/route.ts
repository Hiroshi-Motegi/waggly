import { NextResponse } from "next/server";

/**
 * POST /api/debug/merge
 * OBSOLETE: This endpoint was a one-time fix for the old schema where
 * google_id was stored directly on the users table.
 * The new schema uses user_providers junction table — account merging
 * is now handled via /api/auth/resolve-session conflict resolution.
 * Dev only.
 */
export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "dev only" }, { status: 403 });
  }

  return NextResponse.json({
    error: "Obsolete endpoint. Account merging is now handled via /api/auth/resolve-session conflict resolution flow.",
  }, { status: 410 });
}
