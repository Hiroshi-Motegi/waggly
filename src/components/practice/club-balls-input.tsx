"use client";

import type { Club } from "@/types/database";

export interface ClubBallsValue {
  club_id: string;
  balls: number;
  avg_distance?: number | null;
}

interface ClubBallsInputProps {
  clubs: Club[];
  value: ClubBallsValue[];
  onChange: (value: ClubBallsValue[]) => void;
}

export function ClubBallsInput({ clubs, value, onChange }: ClubBallsInputProps) {
  function getEntry(clubId: string): ClubBallsValue | undefined {
    return value.find((v) => v.club_id === clubId);
  }

  function update(clubId: string, patch: Partial<ClubBallsValue>) {
    const existing = value.filter((v) => v.club_id !== clubId);
    const current = getEntry(clubId) ?? { club_id: clubId, balls: 0, avg_distance: null };
    const updated = { ...current, ...patch };
    if (updated.balls > 0 || (updated.avg_distance != null && updated.avg_distance > 0)) {
      onChange([...existing, updated]);
    } else {
      onChange(existing);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {clubs.map((club) => {
        const entry = getEntry(club.id);
        const currentBalls = entry?.balls ?? 0;

        return (
          <div key={club.id} className="flex flex-col gap-1 border-b border-[#c4c4c4] pb-3">
            {/* Row 1: club name + yd input */}
            <div className="flex items-center">
              <span className="flex-1 text-sm">{club.club_number}</span>
              <div className="flex items-center gap-1 w-[72px] shrink-0">
                <input
                  type="number"
                  inputMode="decimal"
                  value={entry?.avg_distance ?? ""}
                  onChange={(e) =>
                    update(club.id, {
                      avg_distance: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  placeholder="—"
                  className="w-[52px] rounded-md border border-[#c4c4c4] bg-white px-1 py-1.5 text-xs text-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]"
                />
                <span className="text-xs">yd</span>
              </div>
            </div>

            {/* Row 2: slider + ball input */}
            <div className="flex items-center gap-2 pt-1">
              <div className="flex-1 flex items-center">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={currentBalls}
                  onChange={(e) => update(club.id, { balls: Number(e.target.value) })}
                  className="club-balls-slider w-full"
                />
              </div>
              <div className="flex items-center gap-1 w-[72px] shrink-0">
                <input
                  type="number"
                  inputMode="numeric"
                  value={currentBalls || ""}
                  onChange={(e) =>
                    update(club.id, { balls: e.target.value ? Number(e.target.value) : 0 })
                  }
                  placeholder="—"
                  className="w-[52px] rounded-md border border-[#c4c4c4] bg-white px-1 py-1.5 text-xs text-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]"
                />
                <span className="text-xs">球</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
