"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import MemoDetailPage from "@/app/bag/[clubId]/memos/[memoId]/page-client";

function Inner() {
  const sp = useSearchParams();
  const clubId = sp.get("clubId") ?? "";
  const memoId = sp.get("memoId") ?? "";
  return <MemoDetailPage params={Promise.resolve({ clubId, memoId })} />;
}

export default function Page() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}
