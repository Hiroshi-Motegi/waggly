import { Suspense } from "react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#f5f5f5]">
      <Suspense>
        <AdminSidebar />
      </Suspense>
      <main className="flex-1 min-w-0 p-6">{children}</main>
    </div>
  );
}
