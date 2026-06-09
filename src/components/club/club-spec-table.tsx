import type { Club } from "@/types/database";

interface ClubSpecTableProps {
  club: Club;
}

const specs: { key: keyof Club; label: string; suffix?: string }[] = [
  { key: "shaft_name", label: "シャフト" },
  { key: "shaft_flex", label: "フレックス" },
  { key: "loft", label: "ロフト角", suffix: "°" },
  { key: "lie", label: "ライ角", suffix: "°" },
  { key: "length", label: "長さ", suffix: "inch" },
  { key: "distance", label: "飛距離", suffix: "yd" },
];

export function ClubSpecTable({ club }: ClubSpecTableProps) {
  return (
    <div className="space-y-2">
      {specs.map((spec) => {
        const value = club[spec.key];
        if (value == null || value === "") return null;
        return (
          <div key={spec.key} className="flex justify-between text-base">
            <span className="text-muted-foreground">{spec.label}</span>
            <span className="font-medium">
              {String(value)}{spec.suffix ? ` ${spec.suffix}` : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}
