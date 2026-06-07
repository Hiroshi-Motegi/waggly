"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PracticePlanWithItems } from "@/types/database";

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  new: { label: "未実行", variant: "default" },
  done: { label: "実行済み", variant: "secondary" },
  skipped: { label: "スキップ", variant: "outline" },
};

interface PlanCardProps {
  plan: PracticePlanWithItems;
  onStatusChange?: (planId: string, status: "done" | "skipped") => void;
}

export function PlanCard({ plan, onStatusChange }: PlanCardProps) {
  const statusInfo = statusLabels[plan.status];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{plan.title}</CardTitle>
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{plan.summary}</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {plan.practice_plan_items?.map((item) => (
          <div key={item.id} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{item.club?.club_number ?? "?"}</Badge>
              <span>{item.focus}</span>
            </div>
            <span className="font-medium">{item.balls}球</span>
          </div>
        ))}
        {plan.status === "new" && onStatusChange && (
          <div className="flex gap-2 pt-2">
            <Button size="sm" className="flex-1" onClick={() => onStatusChange(plan.id, "done")}>
              実行した
            </Button>
            <Button size="sm" variant="outline" className="flex-1" onClick={() => onStatusChange(plan.id, "skipped")}>
              スキップ
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
