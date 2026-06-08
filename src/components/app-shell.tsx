"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { PageTransition } from "@/components/layout/page-transition";
import { Onboarding } from "@/components/onboarding";
import { Loading } from "@/components/loading";
import { TERMS_UPDATED_AT } from "@/lib/constants";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const [onboardingDone, setOnboardingDone] = useState(false);

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
            await fetch("/api/auth/agree", { method: "POST" });
            setOnboardingDone(true);
          }}
        />
      </div>
    );
  }

  // Normal app
  return (
    <div className={`mx-auto max-w-md min-h-dvh shadow-sm relative animate-fade-in ${pathname === "/" ? "bg-[#139847]" : "bg-[#ebf1eb]"}`}>
      <Header />
      <main style={{ paddingBottom: pathname === "/coach" ? undefined : "var(--bottom-nav-height)" }}>
        <PageTransition>{children}</PageTransition>
      </main>
      <BottomNav />
    </div>
  );
}
