"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api-client";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { PageTransition } from "@/components/layout/page-transition";
import { Onboarding } from "@/components/onboarding";
import { Loading } from "@/components/loading";
import { TERMS_UPDATED_AT } from "@/lib/constants";
import { isNative } from "@/lib/platform";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const [onboardingDone, setOnboardingDone] = useState(false);

  useEffect(() => {
    if (!isNative()) return;

    let removeNetworkListener: (() => void) | undefined;
    let removeAppListener: (() => void) | undefined;

    (async () => {
      const { runMigrations } = await import("@/lib/sqlite/migrations");
      const { fullSync } = await import("@/lib/sync");

      // Run SQLite migrations on startup
      await runMigrations();

      // Initial sync
      try {
        await fullSync();
      } catch (e) {
        console.error("Initial sync failed:", e);
      }

      // Sync on network recovery
      const { Network } = await import("@capacitor/network");
      const networkHandle = await Network.addListener(
        "networkStatusChange",
        async (status) => {
          if (status.connected) {
            try {
              await fullSync();
            } catch (e) {
              console.error("Sync on network recovery failed:", e);
            }
          }
        }
      );
      removeNetworkListener = () => networkHandle.remove();

      // Sync on app resume
      const { App } = await import("@capacitor/app");
      const appHandle = await App.addListener("appStateChange", async (state) => {
        if (state.isActive) {
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

  // Show loading
  if (isLoading) {
    return (
      <div className="mx-auto max-w-md min-h-dvh flex items-center justify-center bg-[#ebf1eb]">
        <Loading />
      </div>
    );
  }

  // Show onboarding if user hasn't agreed or terms were updated
  const needsAgreement = user && (
    !user.agreed_terms_at || new Date(user.agreed_terms_at) < new Date(TERMS_UPDATED_AT)
  );

  if (needsAgreement && !onboardingDone) {
    return (
      <div className="mx-auto max-w-md min-h-dvh border-x border-border shadow-sm bg-background">
        <Onboarding
          isReagreement={!!user.agreed_terms_at}
          onComplete={async () => {
            await apiFetch("/api/auth/agree", { method: "POST" });
            setOnboardingDone(true);
          }}
        />
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
  return (
    <div className="mx-auto max-w-md min-h-dvh shadow-sm relative animate-fade-in bg-[#ebf1eb]">
      <Header />
      <main style={{ paddingBottom: pathname === "/coach" ? undefined : "var(--bottom-nav-height)" }}>
        <PageTransition>{children}</PageTransition>
      </main>
      <BottomNav />
    </div>
  );
}
