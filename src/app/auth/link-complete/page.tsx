"use client";

import { useEffect, useRef } from "react";
import { Loading } from "@/components/loading";

export default function LinkCompletePage() {
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    async function completeLink() {
      const params = new URLSearchParams(window.location.search);
      const provider = params.get("provider");
      const providerId = params.get("providerId");
      const originalUserId = sessionStorage.getItem("link_original_user") || params.get("originalUserId");

      if (!provider || !providerId) {
        window.location.href = "/settings";
        return;
      }

      try {
        console.log("[link-complete] Starting link:", { provider, providerId: providerId?.substring(0, 10), originalUserId });

        // Get current session info for debugging
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        console.log("[link-complete] Session:", session ? `user=${session.user.id}` : "null");

        const { apiFetch } = await import("@/lib/api-client");

        const res = await apiFetch("/api/auth/link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider, providerId, originalUserId }),
        });

        console.log("[link-complete] API response status:", res.status);

        if (!res.ok) {
          const err = await res.json();
          console.error("[link-complete] API error:", err);
          alert(err.error || "連携に失敗しました");
          window.location.href = "/settings";
          return;
        }

        const result = await res.json();

        if (result.needsConfirm) {
          // Redirect to merge page
          sessionStorage.setItem("merge_info", JSON.stringify({
            provider,
            providerId,
            originalUserId,
            currentAccount: result.currentAccount,
            existingAccount: result.existingAccount,
          }));
          window.location.href = "/auth/merge";
          return;
        }

        // Simple link completed
        sessionStorage.removeItem("link_original_user");
        await supabase.auth.signOut();
        alert(`${provider === "google" ? "Google" : "LINE"}を連携しました。再ログインしてください。`);
        window.location.href = "/";
      } catch (e) {
        console.error("Link error:", e);
        alert("連携に失敗しました");
        window.location.href = "/settings";
      }
    }

    completeLink();
  }, []);

  return <Loading variant="light" />;
}
