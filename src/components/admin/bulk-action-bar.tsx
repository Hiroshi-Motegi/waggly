"use client";

interface BulkActionBarProps {
  count: number;
  actions: { label: string; onClick: () => void; variant?: "danger" }[];
  onClear: () => void;
}

export function BulkActionBar({ count, actions, onClear }: BulkActionBarProps) {
  if (count === 0) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-[#006728] bg-[#e6f2eb] px-4 py-2 text-sm">
      <span className="font-medium text-[#006728]">{count}件選択中</span>
      {actions.map((a) => (
        <button
          key={a.label}
          onClick={a.onClick}
          className={`rounded px-3 py-1 text-xs font-bold ${
            a.variant === "danger"
              ? "bg-red-600 text-white hover:bg-red-700"
              : "bg-[#006728] text-white hover:bg-[#005520]"
          }`}
        >
          {a.label}
        </button>
      ))}
      <button onClick={onClear} className="ml-auto text-xs text-[#888] hover:underline">
        選択解除
      </button>
    </div>
  );
}
