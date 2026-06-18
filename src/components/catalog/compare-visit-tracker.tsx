"use client";

import { useEffect } from "react";
import { saveCompareVisit } from "./recent-compares";

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
  }, [category, slug, nameA, nameB]);

  return null;
}
