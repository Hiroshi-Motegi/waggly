"use client";

import { List, LayoutGrid } from "lucide-react";

type ViewMode = "list" | "gallery";

export function ViewModeToggle({
  mode,
  onChange,
}: {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}) {
  return (
    <div className="flex items-center h-[40px] rounded-full bg-white px-1">
      <button
        onClick={() => onChange("list")}
        className={`flex items-center justify-center size-[32px] rounded-full ${
          mode === "list" ? "bg-[#006728]" : ""
        }`}
      >
        <List
          className={`h-4 w-4 ${
            mode === "list" ? "text-white" : "text-[#8b8b8b]"
          }`}
        />
      </button>
      <button
        onClick={() => onChange("gallery")}
        className={`flex items-center justify-center size-[32px] rounded-full ${
          mode === "gallery" ? "bg-[#006728]" : ""
        }`}
      >
        <LayoutGrid
          className={`h-4 w-4 ${
            mode === "gallery" ? "text-white" : "text-[#8b8b8b]"
          }`}
        />
      </button>
    </div>
  );
}
