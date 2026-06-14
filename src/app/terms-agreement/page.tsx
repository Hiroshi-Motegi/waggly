"use client";

import { TermsAgreement } from "@/components/terms-agreement";

export default function TermsAgreementPreview() {
  return (
    <div className="mx-auto max-w-md min-h-dvh shadow-sm bg-black/20">
      <TermsAgreement
        isReagreement={false}
        onAgree={() => window.history.back()}
      />
    </div>
  );
}
