"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import MaintenanceEditPage from "@/app/bag/[clubId]/maintenances/[maintenanceId]/edit/page-client";

function Inner() {
  const sp = useSearchParams();
  const clubId = sp.get("clubId") ?? "";
  const maintenanceId = sp.get("maintenanceId") ?? "";
  return <MaintenanceEditPage params={Promise.resolve({ clubId, maintenanceId })} />;
}

export default function Page() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}
