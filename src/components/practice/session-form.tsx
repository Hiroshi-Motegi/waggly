"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ClubBallsInput } from "./club-balls-input";
import type { Club } from "@/types/database";

const totalBallsPresets = [50, 100, 150, 200, 300];

interface SessionFormProps {
  clubs: Club[];
  onSubmit: (data: {
    practiced_at: string;
    location: string;
    total_balls: number;
    memo: string;
    clubs: { club_id: string; balls: number }[];
  }) => void;
  isSubmitting?: boolean;
}

export function SessionForm({ clubs, onSubmit, isSubmitting }: SessionFormProps) {
  const today = new Date().toISOString().split("T")[0];
  const [practicedAt, setPracticedAt] = useState(today);
  const [location, setLocation] = useState("");
  const [totalBalls, setTotalBalls] = useState(0);
  const [clubBalls, setClubBalls] = useState<{ club_id: string; balls: number }[]>([]);
  const [memo, setMemo] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      practiced_at: practicedAt,
      location,
      total_balls: totalBalls,
      memo,
      clubs: clubBalls,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-4">
      <div>
        <Label htmlFor="practiced_at">日付</Label>
        <Input
          id="practiced_at"
          type="date"
          value={practicedAt}
          onChange={(e) => setPracticedAt(e.target.value)}
        />
      </div>

      <div>
        <Label htmlFor="location">練習場</Label>
        <Input
          id="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="練習場名を入力"
        />
      </div>

      <div>
        <Label>総球数</Label>
        <div className="mt-1 flex gap-2">
          {totalBallsPresets.map((p) => (
            <Badge
              key={p}
              variant={totalBalls === p ? "default" : "outline"}
              className="cursor-pointer px-3 py-1.5"
              onClick={() => setTotalBalls(totalBalls === p ? 0 : p)}
            >
              {p}
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <Label>番手別球数</Label>
        <div className="mt-2">
          <ClubBallsInput clubs={clubs} value={clubBalls} onChange={setClubBalls} />
        </div>
      </div>

      <div>
        <Label htmlFor="memo">気づきメモ</Label>
        <Textarea
          id="memo"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="今日の気づきや感覚をメモ..."
          rows={4}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "保存中..." : "保存"}
      </Button>
    </form>
  );
}
