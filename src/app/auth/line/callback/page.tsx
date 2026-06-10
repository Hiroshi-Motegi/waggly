"use client";

import { useEffect } from "react";
import { Loading } from "@/components/loading";

export default function LineCallbackPage() {
  useEffect(() => {
    async function handleCallback() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const error = params.get("error");
      const isLinking = params.has("link");

      if (error || !code) {
        window.location.href = "/?error=line_auth_failed";
        return;
      }

      try {
        if (isLinking) {
          const originalUserId = sessionStorage.getItem("link_original_user");
          const { apiFetch } = await import("@/lib/api-client");

          // First call: check if merge is needed
          const res = await apiFetch("/api/auth/link", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              provider: "line",
              code,
              redirectUri: `${window.location.origin}/auth/line/callback?link=1`,
              originalUserId,
            }),
          });

          if (!res.ok) {
            const err = await res.json();
            alert(err.error || "連携に失敗しました");
            window.location.href = "/settings";
            return;
          }

          const result = await res.json();

          if (result.needsConfirm) {
            const ok = confirm(result.message + "\n\nよろしいですか？");
            if (!ok) {
              window.location.href = "/settings";
              return;
            }

            // Confirmed — call again (need to re-verify LINE since code is used)
            // Use the providerId from the first call
            const confirmRes = await apiFetch("/api/auth/link", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                provider: "line",
                providerId: result.existingUser?.lineUserId,
                originalUserId,
                confirmMerge: true,
              }),
            });

            if (confirmRes.ok) {
              const confirmResult = await confirmRes.json();
              if (confirmResult.merged) {
                alert(confirmResult.message);
                const { createClient } = await import("@/lib/supabase/client");
                await createClient().auth.signOut();
                sessionStorage.removeItem("link_original_user");
                window.location.href = "/";
                return;
              }
            }
          }

          if (result.merged) {
            alert(result.message);
            const { createClient } = await import("@/lib/supabase/client");
            await createClient().auth.signOut();
          }

          sessionStorage.removeItem("link_original_user");
          window.location.href = result.merged ? "/" : "/settings?linked=line";
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
        window.location.href = "/?error=line_auth_failed";
      }
    }

    handleCallback();
  }, []);

  return <Loading variant="light" />;
}
