"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api-client";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { PageTransition } from "@/components/layout/page-transition";
import { Onboarding } from "@/components/onboarding";
import { TermsAgreement } from "@/components/terms-agreement";
import { Loading } from "@/components/loading";
import { CookieConsent } from "@/components/cookie-consent";
import { TERMS_UPDATED_AT, ONBOARDING_VERSION } from "@/lib/constants";
import { isNative } from "@/lib/platform";
import { PublicFooter } from "@/components/public-footer";

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

  // Merge localStorage → DB on login (one-time, only after onboarding is done)
  const mergedRef = useRef(false);
  useEffect(() => {
    if (!user || mergedRef.current) return;
    const dbVersion = user.onboarding_version ?? 0;
    if (dbVersion < ONBOARDING_VERSION) return; // still needs onboarding — don't merge yet
    mergedRef.current = true;
    const localVersion = parseInt(localStorage.getItem("onboarding_version") || "0", 10);
    if (localVersion > dbVersion) {
      apiFetch("/api/auth/onboarding-complete", { method: "POST" }).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    if (!isNative()) return;

    let removeNetworkListener: (() => void) | undefined;
    let removeAppListener: (() => void) | undefined;
    let unmounted = false;

    (async () => {
      const { runMigrations } = await import("@/lib/sqlite/migrations");
      const { fullSync } = await import("@/lib/sync");

      // Run SQLite migrations on startup
      await runMigrations();
      if (unmounted) return;

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
      if (unmounted) { networkHandle.remove(); return; }
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
      if (unmounted) { appHandle.remove(); return; }
      removeAppListener = () => appHandle.remove();
    })();

    return () => {
      unmounted = true;
      removeNetworkListener?.();
      removeAppListener?.();
    };
  }, []);

  // Skip onboarding for admin pages
  if (pathname?.startsWith("/admin") || pathname === "/onboarding" || pathname === "/terms-agreement") {
    return <>{children}</>;
  }

  const native = isNative();

  // Wait for localStorage check on native
  if (native && !onboardingChecked) {
    return (
      <div className="min-h-dvh w-full bg-[#f7fff3]" />
    );
  }

  // Gate 1: Onboarding — DB for logged-in, localStorage for native unsigned only
  // Web未ログイン時はオンボーディングをスキップ（PR等の直接アクセス対応）
  const effectiveOnboardingVersion = user
    ? (user.onboarding_version ?? 0)
    : native && typeof window !== "undefined"
        ? parseInt(localStorage.getItem("onboarding_version") || "0", 10)
        : ONBOARDING_VERSION;
  const needsOnboarding = effectiveOnboardingVersion < ONBOARDING_VERSION;

  // Wait for user data before judging (prevents flash of onboarding for logged-in users)
  if (!native && isLoading) {
    return (
      <div className="mx-auto max-w-screen-sm min-h-dvh">
        <Loading variant="light" />
      </div>
    );
  }

  if (needsOnboarding) {
    return (
      <div className={`min-h-dvh shadow-sm bg-black/20 ${native ? "w-full" : "mx-auto max-w-screen-sm"}`}>
        <Onboarding
          onComplete={async () => {
            if (user) {
              try {
                await apiFetch("/api/auth/onboarding-complete", { method: "POST" });
                localStorage.setItem("onboarding_version", String(ONBOARDING_VERSION));
              } catch {
                // API failed — don't update localStorage, retry next time
              }
              window.location.reload();
            } else {
              localStorage.setItem("onboarding_version", String(ONBOARDING_VERSION));
              setOnboardingDone(true);
            }
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
      <div className={`min-h-dvh border-x border-border shadow-sm bg-white ${native ? "w-full" : "mx-auto max-w-screen-sm"}`}>
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

  // Login page: no header/nav
  if (pathname === "/login") {
    return (
      <div className="mx-auto max-w-screen-sm min-h-dvh shadow-sm relative animate-fade-in">
        {children}
      </div>
    );
  }

  // Normal app
  const isPublicPage = pathname.startsWith("/p/");
  const hideChrome = isPublicPage || (!user && !native);
  return (
    <div className={`min-h-dvh flex flex-col relative animate-fade-in bg-black/20 ${native ? "w-full overflow-x-hidden" : "mx-auto max-w-screen-sm shadow-sm"}`}>
      {!hideChrome && <Header />}
      <main className={hideChrome ? "flex-1 flex flex-col" : "flex-1"} style={{ paddingBottom: hideChrome || pathname === "/coach" ? undefined : "var(--bottom-nav-height)" }}>
        <PageTransition>{children}</PageTransition>
        {hideChrome && pathname !== "/" && !isPublicPage && !isLoading && <PublicFooter />}
        <CookieConsent hasBottomNav={!hideChrome} />
      </main>
      {!hideChrome && <BottomNav />}
    </div>
  );
}
