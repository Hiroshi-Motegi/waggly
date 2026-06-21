"use client";

import { useEffect } from "react";
import { saveCompareVisit } from "./recent-compares";
import { trackEvent } from "@/lib/gtm";

export function CompareVisitTracker({
  category,
  slug,
  nameA,
  nameB,
}: {
  category: string;
  slug: string;
  nameA: string;
  nameB: string;
}) {
  useEffect(() => {
    saveCompareVisit({ category, slug, nameA, nameB });
    trackEvent("spec_compared", { category, model_a: nameA, model_b: nameB });
  }, [category, slug, nameA, nameB]);

  return null;
}
