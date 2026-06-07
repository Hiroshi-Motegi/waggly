"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { GapResult } from "@/lib/gap-analysis";

interface GapAnalysisCardProps {
  result: GapResult;
}

export function GapAnalysisCard({ result }: GapAnalysisCardProps) {
  if (result.gaps.length === 0 && result.missingDistance.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">ギャップ分析</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {result.gaps.map((gap, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <Badge variant="destructive" className="text-xs">GAP</Badge>
            <span>
              {gap.between[0]} と {gap.between[1]} の間に {gap.difference}yd の差があります
            </span>
          </div>
        ))}
        {result.missingDistance.length > 0 && (
          <p className="text-sm text-muted-foreground">
            飛距離未入力: {result.missingDistance.join(", ")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
