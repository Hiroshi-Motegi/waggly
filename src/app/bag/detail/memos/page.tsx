"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ActivityListPage from "@/app/bag/[clubId]/memos/page-client";

function Inner() {
  const clubId = useSearchParams().get("id") ?? "";
  return <ActivityListPage params={Promise.resolve({ clubId })} />;
}

export default function Page() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}
