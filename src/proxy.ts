import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

function checkBasicAuth(request: NextRequest): NextResponse | null {
  const auth = request.headers.get("authorization");
  if (auth) {
    const [scheme, encoded] = auth.split(" ");
    if (scheme === "Basic" && encoded) {
      const decoded = atob(encoded);
      const [user, pass] = decoded.split(":");
      if (
        user === process.env.ADMIN_USER &&
        pass === process.env.ADMIN_PASSWORD
      ) {
        return null; // authenticated
      }
    }
  }
  return new NextResponse("Unauthorized", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Admin"' },
  });
}

export async function proxy(request: NextRequest) {
  // Basic auth for admin pages and APIs
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    // Allow Vercel Cron requests (authenticated by CRON_SECRET in the route handler)
    const authHeader = request.headers.get("authorization");
    const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
    if (!isCron) {
      const denied = checkBasicAuth(request);
      if (denied) return denied;
    }
  }

  // Skip auth in development
  if (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_DEV_SKIP_AUTH === "true") {
    return NextResponse.next();
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
