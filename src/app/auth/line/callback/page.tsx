"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loading } from "@/components/loading";

export default function LineCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    async function handleCallback() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const error = params.get("error");
      const isLinking = params.has("link");

      if (error || !code) {
        router.replace("/?error=line_auth_failed");
        return;
      }

      try {
        if (isLinking) {
          // Account linking mode: verify LINE token and link to current account
          const { apiFetch } = await import("@/lib/api-client");

          // First get LINE user ID by exchanging code
          const tokenRes = await fetch("/api/auth/line-oauth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code,
              redirectUri: `${window.location.origin}/auth/line/callback?link=1`,
            }),
          });

          // We need the LINE user ID, extract from the response or verify separately
          const verifyRes = await apiFetch("/api/auth/link", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              provider: "line",
              providerId: null, // Will be resolved server-side
              code,
              redirectUri: `${window.location.origin}/auth/line/callback?link=1`,
            }),
          });

          if (!verifyRes.ok) throw new Error("Link failed");

          const result = await verifyRes.json();

          if (result.merged) {
            // Account was merged — need to re-login
            alert(result.message);
            const { createClient } = await import("@/lib/supabase/client");
            const supabase = createClient();
            await supabase.auth.signOut();
            window.location.href = "/";
          } else {
            alert(result.message);
            window.location.href = "/settings";
          }
        } else {
          // Normal login mode
          const res = await fetch("/api/auth/line-oauth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code,
              redirectUri: `${window.location.origin}/auth/line/callback`,
            }),
          });

          if (!res.ok) throw new Error("Auth failed");

          const { access_token, refresh_token } = await res.json();

          const { createClient } = await import("@/lib/supabase/client");
          const supabase = createClient();
          await supabase.auth.setSession({ access_token, refresh_token });

          window.location.href = "/";
        }
      } catch (e) {
        console.error("LINE auth error:", e);
        router.replace("/?error=line_auth_failed");
      }
    }

    handleCallback();
  }, [router]);

  return <Loading variant="light" />;
}
