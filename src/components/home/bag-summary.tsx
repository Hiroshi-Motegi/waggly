"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Club } from "@/types/database";

interface BagSummaryProps {
  clubs: Club[];
}

export function BagSummary({ clubs }: BagSummaryProps) {
  const activeClubs = clubs.filter((c) => c.status === "bag");
  const totalInvestment = activeClubs.reduce((sum, c) => sum + (c.purchase_price ?? 0), 0);

  return (
    <Link href="/bag">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">マイバッグ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between">
            <div>
              <p className="text-2xl font-bold">{activeClubs.length}</p>
              <p className="text-sm text-muted-foreground">本</p>
            </div>
            {totalInvestment > 0 && (
              <div className="text-right">
                <p className="text-2xl font-bold">{totalInvestment.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">円</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
