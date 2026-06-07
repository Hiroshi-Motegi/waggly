"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Onboarding } from "@/components/onboarding";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [onboardingDone, setOnboardingDone] = useState(false);

  // Show loading
  if (isLoading) {
    return (
      <div className="mx-auto max-w-md min-h-dvh flex items-center justify-center bg-background">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  // Show onboarding if user hasn't agreed to terms
  if (user && !user.agreed_terms_at && !onboardingDone) {
    return (
      <div className="mx-auto max-w-md min-h-dvh border-x border-border shadow-sm bg-background">
        <Onboarding
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
    <div className="mx-auto max-w-md min-h-dvh border-x border-border shadow-sm bg-background relative">
      <Header />
      <main className="pb-20 overflow-x-hidden">{children}</main>
      <BottomNav />
    </div>
  );
}
