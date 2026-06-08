"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Dot } from "recharts";
import type { WeightFlowItem } from "@/lib/gap-analysis";

interface Props {
  data: WeightFlowItem[];
}

function CustomDot(props: any) {
  const { cx, cy, payload } = props;
  return (
    <Dot
      cx={cx}
      cy={cy}
      r={5}
      fill={payload.isFlowCorrect ? "#006728" : "#e74c3c"}
      stroke="white"
      strokeWidth={2}
    />
  );
}

export function WeightFlow({ data }: Props) {
  const hasAnyWeight = data.some((d) => d.weight != null);
  if (!hasAnyWeight) {
    return (
      <p className="py-8 text-center text-sm text-[#8b8b8b]">
        詳細スペックで重量を入力するとグラフが表示されます
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="club_number" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} unit="g" />
        <Tooltip
          formatter={(value) => [`${value} g`, "重量"]}
          contentStyle={{ fontSize: 12 }}
        />
        <Line
          type="monotone"
          dataKey="weight"
          stroke="#006728"
          strokeWidth={2}
          dot={<CustomDot />}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
