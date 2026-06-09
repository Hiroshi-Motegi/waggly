"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import EditClubPageClient from "@/app/bag/[clubId]/edit/page-client";

function Inner() {
  const clubId = useSearchParams().get("id") ?? "";
  return <EditClubPageClient params={Promise.resolve({ clubId })} />;
}

export default function Page() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}
