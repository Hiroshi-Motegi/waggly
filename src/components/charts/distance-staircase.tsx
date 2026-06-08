"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from "recharts";
import type { DistanceStaircaseItem } from "@/lib/gap-analysis";

interface Props {
  data: DistanceStaircaseItem[];
}

export function DistanceStaircase({ data }: Props) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[#8b8b8b]">
        飛距離を入力するとグラフが表示されます
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="club_number" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} unit="yd" />
        <Tooltip
          formatter={(value) => [`${value} yd`, "飛距離"]}
          contentStyle={{ fontSize: 12 }}
        />
        <Bar dataKey="distance" radius={[4, 4, 0, 0]}>
          {data.map((item, i) => (
            <Cell
              key={i}
              fill={item.hasGap ? "#e74c3c" : "#006728"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
