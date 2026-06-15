"use client";

export function UsageBadge({
  used,
  limit,
}: {
  used: number;
  limit: number;
}) {
  const remaining = Math.max(0, limit - used);
  return (
    <span className="text-xs text-white/70">
      残り{remaining}/{limit}回
    </span>
  );
}
