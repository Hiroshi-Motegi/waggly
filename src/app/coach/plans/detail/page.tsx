"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PlanDetailPage from "@/app/coach/plans/[planId]/page-client";

function Inner() {
  const planId = useSearchParams().get("id") ?? "";
  return <PlanDetailPage params={Promise.resolve({ planId })} />;
}

export default function Page() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}
