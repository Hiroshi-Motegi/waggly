"use client";

import { Badge } from "@/components/ui/badge";
import type { ClubStatus } from "@/types/database";

const statuses: { value: ClubStatus | "all"; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "bag", label: "マイバッグ" },
  { value: "reserve", label: "予備" },
  { value: "sold", label: "売却済" },
];

interface StatusFilterProps {
  value: ClubStatus | "all";
  onChange: (status: ClubStatus | "all") => void;
}

export function StatusFilter({ value, onChange }: StatusFilterProps) {
  return (
    <div className="flex gap-2">
      {statuses.map((s) => (
        <Badge
          key={s.value}
          variant={value === s.value ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => onChange(s.value)}
        >
          {s.label}
        </Badge>
      ))}
    </div>
  );
}
