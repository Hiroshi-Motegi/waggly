"use client";

import { useEffect } from "react";
import { Loading } from "@/components/loading";

export default function LinkCompletePage() {
  useEffect(() => {
    async function completeLink() {
      const params = new URLSearchParams(window.location.search);
      const provider = params.get("provider");
      const providerId = params.get("providerId");
      const originalUserId = sessionStorage.getItem("link_original_user");

      if (!provider || !providerId) {
        window.location.href = "/settings";
        return;
      }

      try {
        const { apiFetch } = await import("@/lib/api-client");

        // First call: check if merge is needed
        const res = await apiFetch("/api/auth/link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider, providerId, originalUserId }),
        });

        if (!res.ok) {
          const err = await res.json();
          alert(err.error || "連携に失敗しました");
          window.location.href = "/settings";
          return;
        }

        const result = await res.json();

        if (result.needsConfirm) {
          // Ask user to confirm merge
          const ok = confirm(result.message + "\n\nよろしいですか？");
          if (!ok) {
            window.location.href = "/settings";
            return;
          }

          // Confirmed — call again with confirmMerge
          const confirmRes = await apiFetch("/api/auth/link", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ provider, providerId, originalUserId, confirmMerge: true }),
          });

          if (!confirmRes.ok) {
            alert("統合に失敗しました");
            window.location.href = "/settings";
            return;
          }

          const confirmResult = await confirmRes.json();
          if (confirmResult.merged) {
            alert(confirmResult.message);
            const { createClient } = await import("@/lib/supabase/client");
            const supabase = createClient();
            await supabase.auth.signOut();
            sessionStorage.removeItem("link_original_user");
            window.location.href = "/";
            return;
          }
        }

        if (result.merged) {
          alert(result.message);
          const { createClient } = await import("@/lib/supabase/client");
          const supabase = createClient();
          await supabase.auth.signOut();
          sessionStorage.removeItem("link_original_user");
          window.location.href = "/";
        } else {
          // Simple link — sign back in as original user
          sessionStorage.removeItem("link_original_user");
          // Sign out the Google session, then redirect to home
          // The original session (LINE) should be restored on reload
          const { createClient } = await import("@/lib/supabase/client");
          const supabase = createClient();
          await supabase.auth.signOut();
          window.location.href = "/settings?linked=" + encodeURIComponent(provider);
        }
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
