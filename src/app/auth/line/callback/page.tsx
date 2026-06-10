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

      if (error || !code) {
        router.replace("/?error=line_auth_failed");
        return;
      }

      try {
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
      } catch (e) {
        console.error("LINE auth error:", e);
        router.replace("/?error=line_auth_failed");
      }
    }

    handleCallback();
  }, [router]);

  return <Loading variant="light" />;
}
