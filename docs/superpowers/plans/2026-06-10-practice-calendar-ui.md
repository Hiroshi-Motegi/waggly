# Practice Calendar UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat practice session list at `/practice` with an iPhone Calendar-style calendar + date-grouped list view.

**Architecture:** A new `MonthCalendar` component handles month display, date markers, swipe navigation, and month picker. The existing practice page gains a view toggle (calendar/list) with the calendar view as default. The API gets a `?month=` parameter for month-filtered queries. State is managed with `useState` — no URL sync needed.

**Tech Stack:** Next.js (App Router), React, Tailwind CSS, SWR, lucide-react icons

**Spec:** `docs/superpowers/specs/2026-06-10-practice-calendar-ui-design.md`

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/components/practice/month-calendar.tsx` | Calendar grid, day cells, markers, swipe nav, today button |
| Create | `src/components/practice/month-picker.tsx` | Year/month picker dropdown modal |
| Create | `src/components/practice/session-list-grouped.tsx` | Date-grouped session list with date badges + session cards |
| Create | `src/lib/calendar-utils.ts` | Pure date helper functions (build grid, weekday names, format) |
| Modify | `src/app/practice/page.tsx` | Add view toggle, calendar mode, wire up components |
| Modify | `src/hooks/use-practice.ts` | Add `usePracticeSessionsByMonth(month)` hook |
| Modify | `src/app/api/practice/route.ts` | Support `?month=2026-06` query parameter |
| Modify | `src/lib/api-client.ts` | Update local SQLite handler for month filter |

---

### Task 1: Calendar date utilities

**Files:**
- Create: `src/lib/calendar-utils.ts`

- [ ] **Step 1: Create calendar utility functions**

```ts
// src/lib/calendar-utils.ts

const WEEKDAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"] as const;

interface CalendarDay {
  date: number;       // day of month (1-31)
  month: number;      // 0-indexed month
  year: number;
  isCurrentMonth: boolean;
  dateString: string;  // "YYYY-MM-DD" for comparison
}

/**
 * Build a 6-row × 7-column grid for the given year/month (Monday-start).
 */
function buildCalendarGrid(year: number, month: number): CalendarDay[] {
  const firstDay = new Date(year, month, 1);
  // getDay(): 0=Sun..6=Sat → convert to Mon-start: (day + 6) % 7
  const startOffset = (firstDay.getDay() + 6) % 7;

  const days: CalendarDay[] = [];

  // Previous month overflow
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const prevMonthDays = new Date(prevYear, prevMonth + 1, 0).getDate();
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    days.push({
      date: d, month: prevMonth, year: prevYear, isCurrentMonth: false,
      dateString: `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    });
  }

  // Current month
  const totalDays = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= totalDays; d++) {
    days.push({
      date: d, month, year, isCurrentMonth: true,
      dateString: `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    });
  }

  // Next month fill to 42 cells (6 rows × 7)
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  let d = 1;
  while (days.length < 42) {
    days.push({
      date: d, month: nextMonth, year: nextYear, isCurrentMonth: false,
      dateString: `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    });
    d++;
  }

  return days;
}

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function formatWeekday(dateString: string): string {
  const d = new Date(dateString + "T00:00:00");
  return ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
}

export { WEEKDAY_LABELS, buildCalendarGrid, todayString, monthKey, formatWeekday };
export type { CalendarDay };
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/calendar-utils.ts
git commit -m "feat(calendar): add calendar date utility functions"
```

---

### Task 2: Month picker component

**Files:**
- Create: `src/components/practice/month-picker.tsx`

- [ ] **Step 1: Create month picker component**

The month picker is a dropdown that opens when "2026年6月 ∨" is tapped. Year is navigated with left/right arrows, months shown as a 4×3 grid.

```tsx
// src/components/practice/month-picker.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";

const MONTH_LABELS = [
  "1月", "2月", "3月", "4月", "5月", "6月",
  "7月", "8月", "9月", "10月", "11月", "12月",
];

interface MonthPickerProps {
  year: number;
  month: number; // 0-indexed
  onChange: (year: number, month: number) => void;
}

export function MonthPicker({ year, month, onChange }: MonthPickerProps) {
  const [open, setOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(year);
  const ref = useRef<HTMLDivElement>(null);

  // Sync pickerYear when prop changes
  useEffect(() => { setPickerYear(year); }, [year]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function selectMonth(m: number) {
    onChange(pickerYear, m);
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-sm font-bold text-white"
      >
        {year}年{month + 1}月
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-20 w-[260px] rounded-lg bg-white p-3 shadow-lg">
          {/* Year nav */}
          <div className="flex items-center justify-between pb-2">
            <button onClick={() => setPickerYear(pickerYear - 1)} className="p-1">
              <ChevronLeft className="h-5 w-5 text-[#006728]" />
            </button>
            <span className="text-base font-bold text-black">{pickerYear}年</span>
            <button onClick={() => setPickerYear(pickerYear + 1)} className="p-1">
              <ChevronRight className="h-5 w-5 text-[#006728]" />
            </button>
          </div>

          {/* Month grid 4×3 */}
          <div className="grid grid-cols-4 gap-1">
            {MONTH_LABELS.map((label, i) => {
              const isSelected = pickerYear === year && i === month;
              return (
                <button
                  key={i}
                  onClick={() => selectMonth(i)}
                  className={`rounded-lg py-2 text-sm font-bold transition-colors ${
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/practice/month-picker.tsx
git commit -m "feat(calendar): add month picker dropdown component"
```

---

### Task 3: Month calendar component

**Files:**
- Create: `src/components/practice/month-calendar.tsx`

- [ ] **Step 1: Create the month calendar component**

This is the main calendar grid with day cells, markers, swipe navigation, and today button.

```tsx
// src/components/practice/month-calendar.tsx
"use client";

import { useRef, useCallback } from "react";
import { Calendar, List } from "lucide-react";
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
  year, month, selectedDate, practicedDates,
  onSelectDate, onChangeMonth, onToggleView,
}: MonthCalendarProps) {
  const today = todayString();
  const days = buildCalendarGrid(year, month);
  const touchRef = useRef<{ startY: number; startX: number } | null>(null);

  const isCurrentMonth = (() => {
    const now = new Date();
    return year === now.getFullYear() && month === now.getMonth();
  })();

  function goToToday() {
    const now = new Date();
    onChangeMonth(now.getFullYear(), now.getMonth());
    onSelectDate(todayString());
  }

  // Swipe handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchRef.current = { startY: touch.clientY, startX: touch.clientX };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchRef.current) return;
    const touch = e.changedTouches[0];
    const deltaY = touchRef.current.startY - touch.clientY;
    const deltaX = Math.abs(touchRef.current.startX - touch.clientX);
    touchRef.current = null;

    // Only trigger if vertical swipe dominates horizontal
    if (Math.abs(deltaY) < 50 || deltaX > Math.abs(deltaY)) return;

    if (deltaY > 0) {
      // Swipe up → next month
      const next = month === 11 ? { y: year + 1, m: 0 } : { y: year, m: month + 1 };
      onChangeMonth(next.y, next.m);
    } else {
      // Swipe down → prev month
      const prev = month === 0 ? { y: year - 1, m: 11 } : { y: year, m: month - 1 };
      onChangeMonth(prev.y, prev.m);
    }
  }, [year, month, onChangeMonth]);

  function dayCellClass(day: CalendarDay): string {
    const isToday = day.dateString === today;
    const isPracticed = practicedDates.has(day.dateString);
    const isSelected = day.dateString === selectedDate;

    let base = "flex items-center justify-center w-full aspect-square rounded-full text-sm font-medium transition-colors ";

    if (!day.isCurrentMonth) {
      base += "text-white/30 ";
    } else if (isToday) {
      base += "bg-amber-400 text-white font-bold ";
    } else if (isPracticed) {
      base += "bg-white text-[#006728] font-bold ";
    } else {
      base += "text-white/80 ";
    }

    if (isSelected && day.isCurrentMonth) {
      base += "ring-2 ring-[#006728] ring-offset-1 ring-offset-[#2d6e3f] ";
    }

    return base;
  }

  return (
    <div className="rounded-lg bg-[#2d6e3f] p-3">
      {/* Header: month picker + view toggle + today button */}
      <div className="flex items-center gap-2 pb-3">
        <MonthPicker year={year} month={month} onChange={onChangeMonth} />
        <div className="flex-1" />
        {!isCurrentMonth && (
          <button
            onClick={goToToday}
            className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold text-white"
          >
            今日
          </button>
        )}
        <button onClick={onToggleView} className="rounded-full bg-white/20 p-1.5">
          <List className="h-4 w-4 text-white" />
        </button>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 pb-1">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="text-center text-xs font-medium text-white/60">
            {label}
          </div>
        ))}
      </div>

      {/* Calendar grid - 6 rows fixed */}
      <div
        className="grid grid-cols-7 gap-y-1"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {days.map((day, i) => (
          <button
            key={i}
            onClick={() => {
              if (day.isCurrentMonth) {
                onSelectDate(day.dateString);
              } else {
                onChangeMonth(day.year, day.month);
                onSelectDate(day.dateString);
              }
            }}
            className="flex items-center justify-center p-0.5"
          >
            <div className={dayCellClass(day)}>
              {day.date}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/practice/month-calendar.tsx
git commit -m "feat(calendar): add month calendar component with markers and swipe"
```

---

### Task 4: Date-grouped session list component

**Files:**
- Create: `src/components/practice/session-list-grouped.tsx`

- [ ] **Step 1: Create the grouped session list**

```tsx
// src/components/practice/session-list-grouped.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { nativeHref } from "@/lib/native-routes";
import { formatWeekday } from "@/lib/calendar-utils";
import type { PracticeSessionWithClubs } from "@/types/database";

interface SessionListGroupedProps {
  sessions: PracticeSessionWithClubs[];
  selectedDate: string;
}

/**
 * Displays sessions from selectedDate backwards (within the loaded data),
 * grouped by date with a date badge for the first session of each day.
 */
export function SessionListGrouped({ sessions, selectedDate }: SessionListGroupedProps) {
  // Filter: sessions on or before selectedDate, sorted descending
  const filtered = sessions
    .filter((s) => s.practiced_at <= selectedDate)
    .sort((a, b) => b.practiced_at.localeCompare(a.practiced_at));

  if (filtered.length === 0) {
    return (
      <div className="rounded-lg bg-white p-6 text-center">
        <p className="text-base text-[#8b8b8b]">練習記録がありません</p>
      </div>
    );
  }

  // Group by date
  const groups: { date: string; sessions: PracticeSessionWithClubs[] }[] = [];
  for (const s of filtered) {
    const last = groups[groups.length - 1];
    if (last && last.date === s.practiced_at) {
      last.sessions.push(s);
    } else {
      groups.push({ date: s.practiced_at, sessions: [s] });
    }
  }

  return (
    <div className="flex flex-col gap-px rounded-lg bg-white overflow-hidden">
      {groups.map((group) => (
        <div key={group.date}>
          {group.sessions.map((s, i) => (
            <SessionCard
              key={s.id}
              session={s}
              showDateBadge={i === 0}
              isLast={false}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function SessionCard({
  session,
  showDateBadge,
}: {
  session: PracticeSessionWithClubs;
  showDateBadge: boolean;
  isLast: boolean;
}) {
  const d = new Date(session.practiced_at + "T00:00:00");
  const day = d.getDate();
  const weekday = formatWeekday(session.practiced_at);

  return (
    <Link href={nativeHref(`/practice/${session.id}`)}>
      <div className="flex gap-3 px-3 py-3 border-b border-[#efefef]">
        {/* Date badge column - fixed width */}
        <div className="w-[38px] shrink-0 flex flex-col items-center">
          {showDateBadge && (
            <>
              <span className="text-lg font-bold text-black leading-tight">{day}</span>
              <span className="text-xs text-[#8b8b8b]">{weekday}</span>
            </>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-black truncate flex-1">
              {session.location || "場所未入力"}
            </span>
            {session.total_balls != null && session.total_balls > 0 && (
              <span className="shrink-0 rounded-full border border-[#8b8b8b] px-2 py-0.5 text-xs font-bold text-black">
                {session.total_balls}球
              </span>
            )}
          </div>
          {session.rating != null && (
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <span
                  key={i}
                  className={`text-sm ${i <= session.rating! ? "text-amber-400" : "text-gray-300"}`}
                >
                  ★
                </span>
              ))}
            </div>
          )}
          {session.memo && (
            <p className="text-sm text-[#666] line-clamp-2">{session.memo}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/practice/session-list-grouped.tsx
git commit -m "feat(calendar): add date-grouped session list component"
```

---

### Task 5: API — add month filter to practice sessions

**Files:**
- Modify: `src/app/api/practice/route.ts`
- Modify: `src/lib/api-client.ts` (local SQLite handler)

- [ ] **Step 1: Update the Supabase API route**

In `src/app/api/practice/route.ts`, update the GET handler to support `?month=2026-06`:

```ts
// Replace the existing GET function
export async function GET(request: NextRequest) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const month = request.nextUrl.searchParams.get("month"); // "2026-06"

  let query = supabase
    .from("practice_sessions")
    .select("*, practice_clubs(*, club:clubs(id, club_number, category))")
    .eq("user_id", userId)
    .order("practiced_at", { ascending: false });

  if (month) {
    // Filter to specific month: month is "YYYY-MM"
    const start = `${month}-01`;
    // End of month: add 1 month
    const [y, m] = month.split("-").map(Number);
    const endDate = new Date(y, m, 1); // m is already 1-indexed, so this is first of next month
    const end = endDate.toISOString().split("T")[0];
    query = query.gte("practiced_at", start).lt("practiced_at", end);
  } else {
    query = query.limit(20);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
```

- [ ] **Step 2: Update local SQLite handler**

In `src/lib/api-client.ts`, update the `GET /api/practice` handler (around line 334):

```ts
  // GET /api/practice
  if (path.match(/^\/api\/practice(\?|$)/) && method === "GET") {
    const params = new URLSearchParams(path.split("?")[1] ?? "");
    const month = params.get("month"); // "2026-06"

    let sql = "SELECT * FROM practice_sessions";
    const sqlParams: any[] = [];

    if (month) {
      const start = `${month}-01`;
      const [y, m] = month.split("-").map(Number);
      const endDate = new Date(y, m, 1);
      const end = endDate.toISOString().split("T")[0];
      sql += " WHERE practiced_at >= ? AND practiced_at < ?";
      sqlParams.push(start, end);
    }

    sql += " ORDER BY practiced_at DESC";

    if (!month) sql += " LIMIT 20";

    const sessions = await q(sql, sqlParams);
    // Attach practice_clubs for each session
    for (const s of sessions) {
      const clubs = await q("SELECT pc.*, c.club_number, c.category FROM practice_clubs pc LEFT JOIN clubs c ON pc.club_id = c.id WHERE pc.session_id = ?", [s.id]);
      s.practice_clubs = clubs.map((pc: any) => ({ ...pc, club: { id: pc.club_id, club_number: pc.club_number, category: pc.category } }));
    }
    return sessions;
  }
```

- [ ] **Step 3: Add SWR hook for month-filtered sessions**

In `src/hooks/use-practice.ts`, add a new hook:

```ts
export function usePracticeSessionsByMonth(monthKey: string | null) {
  const { user } = useAuth();
  const key = (user || isNative()) && monthKey
    ? `/api/practice?month=${monthKey}`
    : null;

  const { data, isLoading } = useSWR<PracticeSessionWithClubs[]>(key, fetcher);

  return { sessions: data ?? [], isLoading };
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/practice/route.ts src/lib/api-client.ts src/hooks/use-practice.ts
git commit -m "feat(calendar): add month filter to practice sessions API"
```

---

### Task 6: Wire up the practice page

**Files:**
- Modify: `src/app/practice/page.tsx`

- [ ] **Step 1: Rewrite practice page with calendar/list toggle**

Replace the entire content of `src/app/practice/page.tsx`:

```tsx
"use client";
import { Loading } from "@/components/loading";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Calendar, List } from "lucide-react";
import { nativeHref } from "@/lib/native-routes";
import { PageHeader } from "@/components/layout/page-header";
import { MonthCalendar } from "@/components/practice/month-calendar";
import { SessionListGrouped } from "@/components/practice/session-list-grouped";
import { usePracticeSessions, usePracticeSessionsByMonth } from "@/hooks/use-practice";
import { todayString, monthKey } from "@/lib/calendar-utils";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function PracticePage() {
  const now = new Date();
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth()); // 0-indexed
  const [selectedDate, setSelectedDate] = useState(todayString());

  // Calendar mode: fetch by month
  const currentMonthKey = monthKey(calYear, calMonth);
  const { sessions: monthSessions, isLoading: monthLoading } =
    usePracticeSessionsByMonth(viewMode === "calendar" ? currentMonthKey : null);

  // List mode: fetch all (existing behavior)
  const { sessions: allSessions, isLoading: listLoading } =
    usePracticeSessions();

  // Extract practiced dates for calendar markers
  const practicedDates = new Set(monthSessions.map((s) => s.practiced_at));

  function handleChangeMonth(year: number, month: number) {
    setCalYear(year);
    setCalMonth(month);
  }

  return (
    <div
      className="relative flex flex-col px-2 py-2 space-y-2 bg-[#139847]"
      style={{
        minHeight: "100dvh",
        paddingBottom: "var(--bottom-nav-height)",
        marginBottom: "calc(-1 * var(--bottom-nav-height))",
      }}
    >
      <img
        src="/images/home-bg.jpg"
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none"
      />
      <div className="relative z-10 flex flex-col space-y-2">
        <PageHeader title="練習記録" showBack={false} variant="dark">
          <Link href="/practice/new">
            <button className="flex items-center gap-1 rounded-full bg-white px-4 py-1.5 text-sm font-bold text-[#006728]">
              <Plus className="h-4 w-4" />
              記録する
            </button>
          </Link>
        </PageHeader>

        {viewMode === "calendar" ? (
          <>
            <MonthCalendar
              year={calYear}
              month={calMonth}
              selectedDate={selectedDate}
              practicedDates={practicedDates}
              onSelectDate={setSelectedDate}
              onChangeMonth={handleChangeMonth}
              onToggleView={() => setViewMode("list")}
            />

            {monthLoading ? (
              <div className="rounded-lg bg-white p-4">
                <Loading />
              </div>
            ) : monthSessions.length === 0 ? (
              <div className="rounded-lg bg-white p-6 text-center">
                <p className="text-base text-[#8b8b8b]">今月の練習: 0回</p>
                <Link href="/practice/new">
                  <button className="mt-3 rounded-full bg-[#006728] px-5 py-2 text-sm font-bold text-white">
                    記録する
                  </button>
                </Link>
              </div>
            ) : (
              <SessionListGrouped
                sessions={monthSessions}
                selectedDate={selectedDate}
              />
            )}
          </>
        ) : (
          <>
            {/* List mode header - toggle back to calendar */}
            <div className="flex justify-end px-1">
              <button
                onClick={() => setViewMode("calendar")}
                className="rounded-full bg-white/20 p-1.5"
              >
                <Calendar className="h-4 w-4 text-white" />
              </button>
            </div>

            <div className="flex flex-col rounded-lg bg-white p-3">
              {listLoading ? (
                <Loading />
              ) : allSessions.length === 0 ? (
                <p className="py-8 text-center text-base text-muted-foreground">
                  まだ練習記録がありません
                </p>
              ) : (
                <div className="flex flex-col">
                  {allSessions.map((s, i) => (
                    <Link key={s.id} href={nativeHref(`/practice/${s.id}`)}>
                      <div
                        className={`flex items-center gap-2.5 py-2 ${
                          i < allSessions.length - 1
                            ? "border-b border-[#dfdfdf]"
                            : ""
                        }`}
                      >
                        <div className="flex flex-1 flex-col gap-px">
                          <span className="text-sm font-medium text-[#8b8b8b]">
                            {formatDate(s.practiced_at)}
                          </span>
                          <span className="text-base font-bold text-black">
                            {s.location || "場所未入力"}
                          </span>
                        </div>
                        {s.total_balls && (
                          <span className="rounded-full border border-[#8b8b8b] px-2.5 py-1 text-xs font-bold text-black">
                            {s.total_balls}球
                          </span>
                        )}
                        <Image
                          src="/icons/chevron-right.svg"
                          alt=""
                          width={6}
                          height={10}
                          className="opacity-60"
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser**

Run: Open `http://localhost:3000/practice` in the browser.

Expected:
- Calendar view renders as default with current month
- Today is highlighted in yellow
- Practice dates shown with white background
- Tapping a date updates the session list below
- Swipe up/down changes month
- Month picker opens on year/month tap
- "今日" button appears when not viewing current month
- List toggle switches to flat list view
- List toggle in list view switches back to calendar

- [ ] **Step 3: Commit**

```bash
git add src/app/practice/page.tsx
git commit -m "feat(calendar): wire up practice page with calendar/list toggle"
```

---

### Task 7: Visual polish and edge cases

**Files:**
- Modify: `src/components/practice/month-calendar.tsx`
- Modify: `src/components/practice/session-list-grouped.tsx`

- [ ] **Step 1: Test and fix edge cases**

Manually verify in the browser:

1. Navigate to months with no practice sessions → should show "今月の練習: 0回"
2. Select a date with no prior sessions → should show "練習記録がありません"
3. Navigate to December → January boundary (year change)
4. Month picker: change year and month
5. Tap a date that is in the previous/next month overflow → should navigate to that month
6. Verify 6-row grid renders correctly for months needing 4, 5, or 6 rows

Fix any issues found during testing.

- [ ] **Step 2: Commit final polish**

```bash
git add -A
git commit -m "fix(calendar): polish edge cases and visual adjustments"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Calendar date utilities | `calendar-utils.ts` |
| 2 | Month picker component | `month-picker.tsx` |
| 3 | Month calendar component | `month-calendar.tsx` |
| 4 | Date-grouped session list | `session-list-grouped.tsx` |
| 5 | API month filter | `route.ts`, `api-client.ts`, `use-practice.ts` |
| 6 | Wire up practice page | `page.tsx` |
| 7 | Visual polish & edge cases | Various |
