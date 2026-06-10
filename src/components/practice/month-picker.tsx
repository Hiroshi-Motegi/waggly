"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

interface MonthPickerProps {
  year: number;
  month: number; // 0-indexed
  onChange: (year: number, month: number) => void;
}

const MONTHS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

export function MonthPicker({ year, month, onChange }: MonthPickerProps) {
  const [open, setOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(year);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPickerYear(year);
  }, [year]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function handleMonthSelect(m: number) {
    onChange(pickerYear, m);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="rounded-full bg-white/20 px-3 py-1 text-sm font-bold text-white flex items-center gap-1"
      >
        {year}年{month + 1}月
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-20 w-[260px] rounded-lg bg-white p-3 shadow-lg">
          {/* Year navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setPickerYear((y) => y - 1)}
              className="p-1"
              aria-label="前の年"
            >
              <ChevronLeft className="h-5 w-5 text-[#006728]" />
            </button>
            <span className="text-base font-bold text-black">{pickerYear}年</span>
            <button
              type="button"
              onClick={() => setPickerYear((y) => y + 1)}
              className="p-1"
              aria-label="次の年"
            >
              <ChevronRight className="h-5 w-5 text-[#006728]" />
            </button>
          </div>

          {/* Month grid: 4 columns × 3 rows */}
          <div className="grid grid-cols-4 gap-1">
            {MONTHS.map((label, i) => {
              const isSelected = pickerYear === year && i === month;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleMonthSelect(i)}
                  className={`rounded py-1.5 text-sm font-medium ${
                    isSelected
                      ? "bg-[#006728] text-white"
                      : "text-black hover:bg-[#e8f5e9]"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
