"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import MaintenanceListPage from "@/app/bag/[clubId]/maintenances/page-client";

function Inner() {
  const clubId = useSearchParams().get("id") ?? "";
  return <MaintenanceListPage params={Promise.resolve({ clubId })} />;
}

export default function Page() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}
