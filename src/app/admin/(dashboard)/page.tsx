"use client";

import { Suspense } from "react";
import useSWR from "swr";
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb";
import { DashboardChart } from "@/components/admin/dashboard-chart";
import { apiFetch } from "@/lib/api-client";

interface DashboardData {
  kpi: {
    totalUsers: number;
    paidUsers: number;
    totalClubs: number;
    practiceThisWeek: number;
    newUsersWeek: number;
    newClubsWeek: number;
  };
  trends: {
    users: { week: string; count: number }[];
    clubs: { week: string; count: number }[];
  };
}

function KpiCard({ label, value, delta }: { label: string; value: number; delta?: number }) {
  return (
    <div className="rounded-xl border border-[#e0e0e0] bg-white p-4">
      <p className="text-xs text-[#888]">{label}</p>
      <p className="text-2xl font-bold text-[#333] mt-1">{value.toLocaleString()}</p>
      {delta != null && delta > 0 && (
        <p className="text-xs text-[#006728] mt-1">+{delta} 先週比</p>
      )}
    </div>
  );
}

function Dashboard() {
  const { data, isLoading } = useSWR<DashboardData>(
    "/api/admin/dashboard",
    async (url: string) => {
      const res = await apiFetch(url);
      return res.ok ? res.json() : null;
    }
  );

  if (isLoading || !data) {
    return <div className="p-4 text-sm text-[#888]">読み込み中...</div>;
  }

  const { kpi, trends } = data;

  return (
    <div className="space-y-6 p-4">
      <AdminBreadcrumb items={[{ label: "ダッシュボード" }]} />
      <h1 className="text-xl font-bold">ダッシュボード</h1>

      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="総会員数" value={kpi.totalUsers} delta={kpi.newUsersWeek} />
        <KpiCard label="有料会員数" value={kpi.paidUsers} />
        <KpiCard label="総クラブ登録数" value={kpi.totalClubs} delta={kpi.newClubsWeek} />
        <KpiCard label="練習記録数（今週）" value={kpi.practiceThisWeek} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-[#e0e0e0] bg-white p-4">
          <DashboardChart data={trends.users} label="新規登録数（過去12週）" color="#006728" />
        </div>
        <div className="rounded-xl border border-[#e0e0e0] bg-white p-4">
          <DashboardChart data={trends.clubs} label="クラブ登録数（過去12週）" color="#4a90d9" />
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense>
      <Dashboard />
    </Suspense>
  );
}
