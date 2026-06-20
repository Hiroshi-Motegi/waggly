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

export async function middleware(request: NextRequest) {
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

  // CSRF protection for state-changing API requests
  if (
    pathname.startsWith("/api/") &&
    !["GET", "HEAD", "OPTIONS"].includes(request.method)
  ) {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    // Allow requests without Origin header (non-browser clients, native apps with Bearer token)
    if (origin && host) {
      const isDev = process.env.NODE_ENV !== "production";
      const vercelUrl = process.env.VERCEL_URL;
      const allowedOrigins = [
        // 自ホスト（staging.waggly.jp等カスタムドメイン含む）は常に許可
        `https://${host}`,
        "https://waggly.jp",
        "capacitor://localhost",
        // Vercel preview/staging deployments
        ...(vercelUrl ? [`https://${vercelUrl}`] : []),
        // Development only
        ...(isDev ? [`http://${host}`, "http://localhost"] : []),
      ];
      if (!allowedOrigins.some((allowed) => origin === allowed)) {
        return NextResponse.json(
          { error: "Forbidden: invalid origin" },
          { status: 403 }
        );
      }
    }
  }

  // Skip auth in development only
  if (process.env.NEXT_PUBLIC_DEV_SKIP_AUTH === "true") {
    if (process.env.NODE_ENV !== "development") {
      // Defense-in-depth: hard-block auth bypass outside development
      console.error("CRITICAL: DEV_SKIP_AUTH is set in non-development environment. Blocking.");
      return NextResponse.json(
        { error: "Server misconfiguration" },
        { status: 500 }
      );
    }
    if (process.env.NODE_ENV === "development") {
      const response = NextResponse.next();
      addSecurityHeaders(response);
      return response;
    }
  }

  const response = await updateSession(request);
  addSecurityHeaders(response);
  return response;
}

function addSecurityHeaders(response: NextResponse) {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(self), microphone=(), geolocation=()"
  );
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://*.googlesyndication.com https://ep2.adtrafficquality.google https://www.google.com https://adservice.google.com https://vercel.live",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.supabase.co https://*.rakuten.co.jp https://*.googlesyndication.com https://*.googleadservices.com https://*.doubleclick.net https://www.google.com https://www.google.co.jp https://*.a8.net https://www.googletagmanager.com",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://*.supabase.co https://api.anthropic.com https://*.googlesyndication.com https://*.google-analytics.com https://*.doubleclick.net wss://*.supabase.co",
    "frame-src https://*.googlesyndication.com https://*.doubleclick.net https://ep2.adtrafficquality.google https://www.google.com",
    "object-src 'none'",
    "base-uri 'self'",
  ].join("; ");
  response.headers.set("Content-Security-Policy", csp);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
