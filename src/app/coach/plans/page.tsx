"use client";

import { usePlans, updatePlanStatus } from "@/hooks/use-plans";
import { PlanList } from "@/components/coach/plan-list";

export default function PlansPage() {
  const { plans, isLoading, refetch } = usePlans();

  async function handleStatusChange(planId: string, status: "done" | "skipped") {
    await updatePlanStatus(planId, status);
    refetch();
  }

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-xl font-bold">練習提案履歴</h2>
      {isLoading ? (
        <p className="text-center text-muted-foreground">読み込み中...</p>
      ) : (
        <PlanList plans={plans} onStatusChange={handleStatusChange} />
      )}
    </div>
  );
}
