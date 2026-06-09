"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PracticeDetailPage from "@/app/practice/[sessionId]/page-client";

function Inner() {
  const sessionId = useSearchParams().get("id") ?? "";
  return <PracticeDetailPage overrideSessionId={sessionId} />;
}

export default function Page() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}
