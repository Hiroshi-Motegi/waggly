"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ItemDetailPage from "@/app/items/[id]/page-client";

function Inner() {
  const id = useSearchParams().get("id") ?? "";
  return <ItemDetailPage params={Promise.resolve({ id })} />;
}

export default function Page() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}
