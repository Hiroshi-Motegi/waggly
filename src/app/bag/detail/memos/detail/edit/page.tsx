"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import MemoEditPage from "@/app/bag/[clubId]/memos/[memoId]/edit/page-client";

function Inner() {
  const sp = useSearchParams();
  const clubId = sp.get("clubId") ?? "";
  const memoId = sp.get("memoId") ?? "";
  return <MemoEditPage params={Promise.resolve({ clubId, memoId })} />;
}

export default function Page() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}
