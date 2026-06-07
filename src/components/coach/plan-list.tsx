"use client";

import { PlanCard } from "./plan-card";
import type { PracticePlanWithItems } from "@/types/database";

interface PlanListProps {
  plans: PracticePlanWithItems[];
  onStatusChange?: (planId: string, status: "done" | "skipped") => void;
}

export function PlanList({ plans, onStatusChange }: PlanListProps) {
  if (plans.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        まだ練習提案がありません
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {plans.map((plan) => (
        <PlanCard key={plan.id} plan={plan} onStatusChange={onStatusChange} />
      ))}
    </div>
  );
}
