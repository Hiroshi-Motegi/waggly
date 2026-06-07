"use client";

import { Badge } from "@/components/ui/badge";
import type { Club } from "@/types/database";

const presets = [10, 20, 30, 50];

interface ClubBallsValue {
  club_id: string;
  balls: number;
}

interface ClubBallsInputProps {
  clubs: Club[];
  value: ClubBallsValue[];
  onChange: (value: ClubBallsValue[]) => void;
}

export function ClubBallsInput({ clubs, value, onChange }: ClubBallsInputProps) {
  function getBalls(clubId: string): number {
    return value.find((v) => v.club_id === clubId)?.balls ?? 0;
  }

  function setBalls(clubId: string, balls: number) {
    const existing = value.filter((v) => v.club_id !== clubId);
    if (balls > 0) {
      onChange([...existing, { club_id: clubId, balls }]);
    } else {
      onChange(existing);
    }
  }

  function togglePreset(clubId: string, preset: number) {
    const current = getBalls(clubId);
    setBalls(clubId, current === preset ? 0 : preset);
  }

  return (
    <div className="space-y-3">
      {clubs.map((club) => {
        const currentBalls = getBalls(club.id);
        return (
          <div key={club.id} className="flex items-center gap-3">
            <span className="w-10 text-sm font-semibold">{club.club_number}</span>
            <div className="flex gap-1.5">
              {presets.map((p) => (
                <Badge
                  key={p}
                  variant={currentBalls === p ? "default" : "outline"}
                  className="cursor-pointer px-2.5 py-1"
                  onClick={() => togglePreset(club.id, p)}
                >
                  {p}
                </Badge>
              ))}
            </div>
            {currentBalls > 0 && (
              <span className="text-sm text-muted-foreground">{currentBalls}球</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
