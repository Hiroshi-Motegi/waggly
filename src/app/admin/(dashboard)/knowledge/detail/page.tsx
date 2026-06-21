"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import KnowledgeEditPage from "@/app/admin/(dashboard)/knowledge/[id]/page-client";

function Inner() {
  const id = useSearchParams().get("id") ?? "";
  return <KnowledgeEditPage overrideId={id} />;
}

export default function Page() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}
