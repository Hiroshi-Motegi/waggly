"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ClubDetailPage from "@/app/bag/[clubId]/page-client";

function Inner() {
  const clubId = useSearchParams().get("id") ?? "";
  return <ClubDetailPage params={Promise.resolve({ clubId })} />;
}

export default function Page() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}
