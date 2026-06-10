"use client";

import { useRef, useCallback } from "react";
import { List } from "lucide-react";
import { MonthPicker } from "./month-picker";
import { WEEKDAY_LABELS, buildCalendarGrid, todayString } from "@/lib/calendar-utils";
import type { CalendarDay } from "@/lib/calendar-utils";

interface MonthCalendarProps {
  year: number;
  month: number; // 0-indexed
  selectedDate: string; // "YYYY-MM-DD"
  practicedDates: Set<string>; // set of "YYYY-MM-DD"
  onSelectDate: (dateString: string) => void;
  onChangeMonth: (year: number, month: number) => void;
  onToggleView: () => void;
}

export function MonthCalendar({
  year,
  month,
  selectedDate,
  practicedDates,
  onSelectDate,
  onChangeMonth,
  onToggleView,
}: MonthCalendarProps) {
  const today = todayString();
  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  const touchStartY = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartY.current === null || touchStartX.current === null) return;

      const deltaY = e.changedTouches[0].clientY - touchStartY.current;
      const deltaX = e.changedTouches[0].clientX - touchStartX.current;

      touchStartY.current = null;
      touchStartX.current = null;

      // Must exceed threshold and be more vertical than horizontal
      if (Math.abs(deltaY) < 50 || Math.abs(deltaY) <= Math.abs(deltaX)) return;

      if (deltaY < 0) {
        // Swipe up → next month
        const nextMonth = month === 11 ? 0 : month + 1;
        const nextYear = month === 11 ? year + 1 : year;
        onChangeMonth(nextYear, nextMonth);
      } else {
        // Swipe down → prev month
        const prevMonth = month === 0 ? 11 : month - 1;
        const prevYear = month === 0 ? year - 1 : year;
        onChangeMonth(prevYear, prevMonth);
      }
    },
    [year, month, onChangeMonth]
  );

  const handleTodayClick = useCallback(() => {
    onChangeMonth(now.getFullYear(), now.getMonth());
    onSelectDate(today);
  }, [now, today, onChangeMonth, onSelectDate]);

  const handleDayClick = useCallback(
    (day: CalendarDay) => {
      if (day.isCurrentMonth) {
        onSelectDate(day.dateString);
      } else {
        onChangeMonth(day.year, day.month);
        onSelectDate(day.dateString);
      }
    },
    [onSelectDate, onChangeMonth]
  );

  const cells = buildCalendarGrid(year, month);

  function getDayCellClass(day: CalendarDay): string {
    const isSelected = day.dateString === selectedDate && day.isCurrentMonth;

    if (!day.isCurrentMonth) {
      return "text-white/30";
    }

    let base = "";
    if (day.dateString === today) {
      base = "bg-amber-400 text-white font-bold";
    } else if (practicedDates.has(day.dateString)) {
      base = "bg-white text-[#006728] font-bold";
    } else {
      base = "text-white/80";
    }

    if (isSelected) {
      base += " ring-2 ring-[#006728] ring-offset-1 ring-offset-[#2d6e3f]";
    }

    return base;
  }

  return (
    <div className="rounded-lg bg-[#2d6e3f] p-3">
      {/* Header row */}
      <div className="flex items-center mb-3">
        <MonthPicker year={year} month={month} onChange={onChangeMonth} />
        <div className="flex-1" />
        {!isCurrentMonth && (
          <button
            type="button"
            onClick={handleTodayClick}
            className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold text-white mr-2"
          >
            今日
          </button>
        )}
        <button
          type="button"
          onClick={onToggleView}
          className="rounded-full bg-white/20 p-1.5"
          aria-label="リスト表示"
        >
          <List className="h-4 w-4 text-white" />
        </button>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="text-center text-xs font-medium text-white/60 py-1">
            {label}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div
        className="grid grid-cols-7 gap-y-1"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {cells.map((day) => (
          <button
            key={day.dateString}
            type="button"
            className="p-0.5"
            onClick={() => handleDayClick(day)}
            aria-label={day.dateString}
            aria-pressed={day.dateString === selectedDate && day.isCurrentMonth}
          >
            <div
              className={`aspect-square flex items-center justify-center rounded-full text-sm ${getDayCellClass(day)}`}
            >
              {day.date}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
