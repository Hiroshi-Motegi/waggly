"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import MaintenanceDetailPage from "@/app/bag/[clubId]/maintenances/[maintenanceId]/page-client";

function Inner() {
  const sp = useSearchParams();
  const clubId = sp.get("clubId") ?? "";
  const maintenanceId = sp.get("maintenanceId") ?? "";
  return <MaintenanceDetailPage params={Promise.resolve({ clubId, maintenanceId })} />;
}

export default function Page() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}
