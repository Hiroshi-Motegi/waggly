"use client";

import { Onboarding } from "@/components/onboarding";
import { ONBOARDING_VERSION } from "@/lib/constants";

export default function OnboardingPreview() {
  return (
    <div className="mx-auto max-w-md min-h-dvh shadow-sm bg-black/20">
      <Onboarding
        onComplete={() => {
          localStorage.setItem("onboarding_version", String(ONBOARDING_VERSION));
          window.location.href = "/";
        }}
      />
    </div>
  );
}
