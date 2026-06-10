"use client";

import { useEffect } from "react";
import { Loading } from "@/components/loading";

export default function LinkCompletePage() {
  useEffect(() => {
    async function completeLink() {
      const params = new URLSearchParams(window.location.search);
      const provider = params.get("provider");
      const providerId = params.get("providerId");

      if (!provider || !providerId) {
        window.location.href = "/settings";
        return;
      }

      try {
        // Sign out the Google session (we want to stay logged in as the original user)
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();

        // Get the original session back — the Google OAuth may have replaced it
        // Call link API with the original session's cookie
        const { apiFetch } = await import("@/lib/api-client");
        const res = await apiFetch("/api/auth/link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider, providerId }),
        });

        if (!res.ok) {
          const err = await res.json();
          alert(err.error || "連携に失敗しました");
          window.location.href = "/settings";
          return;
        }

        const result = await res.json();

        if (result.merged) {
          await supabase.auth.signOut();
          window.location.href = "/?message=" + encodeURIComponent(result.message);
        } else {
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
