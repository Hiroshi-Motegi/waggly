"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api-client";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { PageTransition } from "@/components/layout/page-transition";
import { Onboarding } from "@/components/onboarding";
import { TermsAgreement } from "@/components/terms-agreement";
import { Loading } from "@/components/loading";
import { TERMS_UPDATED_AT, ONBOARDING_VERSION } from "@/lib/constants";
import { isNative } from "@/lib/platform";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  useEffect(() => {
    const seenVersion = parseInt(localStorage.getItem("onboarding_version") || "0", 10);
    setOnboardingDone(seenVersion >= ONBOARDING_VERSION);
    setOnboardingChecked(true);
  }, []);

  useEffect(() => {
    if (!isNative()) return;

    let removeNetworkListener: (() => void) | undefined;
    let removeAppListener: (() => void) | undefined;

    (async () => {
      const { runMigrations } = await import("@/lib/sqlite/migrations");
      const { fullSync } = await import("@/lib/sync");

      // Run SQLite migrations on startup
      await runMigrations();

      // Initial sync — auth-provider が衝突判定を行うので、
      // ここでの fullSync はスキップ。auth-provider / resolveSessionAfterSignIn が
      // 衝突なしと判断した後に fullSync を呼ぶ。

      // Sync on network recovery (衝突未解決の場合はスキップ)
      const { Network } = await import("@capacitor/network");
      const networkHandle = await Network.addListener(
        "networkStatusChange",
        async (status) => {
          if (status.connected && !localStorage.getItem("conflict_info")) {
            try {
              await fullSync();
            } catch (e) {
              console.error("Sync on network recovery failed:", e);
            }
          }
        }
      );
      removeNetworkListener = () => networkHandle.remove();

      // Sync on app resume (衝突未解決の場合はスキップ)
      const { App } = await import("@capacitor/app");
      const appHandle = await App.addListener("appStateChange", async (state) => {
        if (state.isActive && !localStorage.getItem("conflict_info")) {
          const networkStatus = await Network.getStatus();
          if (networkStatus.connected) {
            try {
              await fullSync();
            } catch (e) {
              console.error("Sync on resume failed:", e);
            }
          }
        }
      });
      removeAppListener = () => appHandle.remove();
    })();

    return () => {
      removeNetworkListener?.();
      removeAppListener?.();
    };
  }, []);

  // Skip onboarding for admin pages
  if (pathname?.startsWith("/admin")) {
    return <>{children}</>;
  }

  const native = isNative();

  // Wait for localStorage check on native
  if (native && !onboardingChecked) {
    return (
      <div className="min-h-dvh w-full bg-[#f7fff3]" />
    );
  }

  // Gate 1: Onboarding (app intro) — localStorage only, login state irrelevant
  if (!onboardingDone) {
    return (
      <div className={`min-h-dvh border-x border-border shadow-sm bg-background ${native ? "w-full" : "mx-auto max-w-md"}`}>
        <Onboarding
          onComplete={() => {
            localStorage.setItem("onboarding_version", String(ONBOARDING_VERSION));
            setOnboardingDone(true);
          }}
        />
      </div>
    );
  }

  // Gate 2: Terms agreement — logged-in users only, DB agreed_terms_at
  // Onboarding and terms are fully independent; children not rendered until both pass
  const needsTermsAgreement = user && (
    !user.agreed_terms_at || new Date(user.agreed_terms_at) < new Date(TERMS_UPDATED_AT)
  );

  if (needsTermsAgreement) {
    return (
      <div className={`min-h-dvh border-x border-border shadow-sm bg-background ${native ? "w-full" : "mx-auto max-w-md"}`}>
        <TermsAgreement
          isReagreement={!!user.agreed_terms_at}
          onAgree={async () => {
            await apiFetch("/api/auth/agree", { method: "POST" });
            window.location.reload();
          }}
        />
      </div>
    );
  }

  // Show loading (web only, after onboarding check)
  if (isLoading && !native) {
    return (
      <div className="mx-auto max-w-md min-h-dvh flex items-center justify-center bg-[#ebf1eb]">
        <Loading />
      </div>
    );
  }

  // Login page: no header/nav
  if (pathname === "/login") {
    return (
      <div className="mx-auto max-w-md min-h-dvh shadow-sm relative animate-fade-in">
        {children}
      </div>
    );
  }

  // Normal app
  const isPublicPage = pathname.startsWith("/p/");
  const hideChrome = isPublicPage || (!user && !native);
  return (
    <div className={`min-h-dvh relative animate-fade-in bg-[#ebf1eb] ${native ? "w-full overflow-x-hidden" : "mx-auto max-w-md shadow-sm"}`}>
      {!hideChrome && <Header />}
      <main style={{ paddingBottom: hideChrome || pathname === "/coach" ? undefined : "var(--bottom-nav-height)" }}>
        <PageTransition>{children}</PageTransition>
      </main>
      {!hideChrome && <BottomNav />}
    </div>
  );
}
