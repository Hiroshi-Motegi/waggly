"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PracticePlanWithItems } from "@/types/database";

interface LatestPlanProps {
  plan: PracticePlanWithItems | null;
}

export function LatestPlan({ plan }: LatestPlanProps) {
  if (!plan) return null;

  return (
    <Link href="/coach/plans">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">AIの練習提案</CardTitle>
            <Badge variant="default">NEW</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="font-medium">{plan.title}</p>
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{plan.summary}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
