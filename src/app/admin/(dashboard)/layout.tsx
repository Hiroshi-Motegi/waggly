import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { getApiAuth, getAdminClient } from "@/lib/supabase/api";

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const auth = await getApiAuth();

  if (!auth) {
    redirect("/admin/login");
  }

  const { data: user } = await getAdminClient()
    .from("users")
    .select("is_admin")
    .eq("id", auth.userId)
    .single();

  if (!user?.is_admin) {
    redirect("/admin/login");
  }

  return (
    <div className="flex min-h-screen bg-[#f5f5f5]">
      <Suspense>
        <AdminSidebar />
      </Suspense>
      <main className="flex-1 min-w-0 p-6">{children}</main>
    </div>
  );
}
