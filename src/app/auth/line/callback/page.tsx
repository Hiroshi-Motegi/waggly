"use client";

import { useEffect, useRef } from "react";
import { Loading } from "@/components/loading";

export default function LineCallbackPage() {
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

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
          const originalUserId = sessionStorage.getItem("link_original_user") || params.get("originalUser");
          const { apiFetch } = await import("@/lib/api-client");

          const res = await apiFetch("/api/auth/link-provider", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              provider: "line",
              code,
              redirectUri: `${window.location.origin}/auth/line/callback?link=1`,
            }),
          });

          const result = await res.json();
          alert(`link-provider: status=${res.status} result=${JSON.stringify(result).substring(0, 200)}`);

          if (!res.ok) {
            alert(result.error || "連携に失敗しました");
            window.location.href = "/settings";
            return;
          }

          if (result.needsConfirm) {
            const conflictInfo = JSON.stringify({
              scenario: "account-linking",
              provider: "line",
              providerSub: result.providerId,
              sourceA: {
                label: "現在のアカウントのデータ",
                isNew: true,
                wid: originalUserId,
                lastUpdated: result.currentAccount?.lastUpdated ?? null,
                counts: result.currentAccount?.counts ?? { clubs: 0, practices: 0, accessories: 0 },
              },
              sourceB: {
                label: "LINEアカウントのデータ",
                isNew: false,
                wid: result.existingAccount?.id,
                lastUpdated: result.existingAccount?.lastUpdated ?? null,
                counts: result.existingAccount?.counts ?? { clubs: 0, practices: 0, accessories: 0 },
              },
            });
            sessionStorage.setItem("conflict_info", conflictInfo);
            localStorage.setItem("conflict_info", conflictInfo);
            window.location.href = "/settings?conflict=line";
            return;
          }

          sessionStorage.removeItem("link_original_user");
          window.location.href = "/settings?linked=line";
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

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            console.error("[LINE callback] API error:", res.status, errData);
            throw new Error(errData.error || "Auth failed");
          }

          const { access_token, refresh_token } = await res.json();

          const { createClient } = await import("@/lib/supabase/client");
          const supabase = createClient();
          await supabase.auth.setSession({ access_token, refresh_token });
          localStorage.setItem("login_method", "line");

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
