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
            sessionStorage.setItem("merge_info", JSON.stringify({
              provider: "line",
              providerId: result.existingAccount?.lineUserId,
              originalUserId,
              currentAccount: result.currentAccount,
              existingAccount: result.existingAccount,
            }));
            window.location.href = "/auth/merge";
            return;
          }

          sessionStorage.removeItem("link_original_user");
          alert("LINEを連携しました。");
          window.location.href = "/settings";
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
