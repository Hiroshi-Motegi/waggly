"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import EditPracticePage from "@/app/practice/[sessionId]/edit/page-client";

function Inner() {
  const sessionId = useSearchParams().get("id") ?? "";
  return <EditPracticePage overrideSessionId={sessionId} />;
}

export default function Page() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}
