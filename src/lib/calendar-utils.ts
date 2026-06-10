export const WEEKDAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"] as const;

export interface CalendarDay {
  date: number;
  month: number;
  year: number;
  isCurrentMonth: boolean;
  dateString: string;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toDateString(year: number, month: number, date: number): string {
  return `${year}-${pad(month + 1)}-${pad(date)}`;
}

/**
 * Build a 6-row × 7-column (42 cells) calendar grid for the given year/month.
 * Monday-start. month is 0-indexed (JS convention).
 */
export function buildCalendarGrid(year: number, month: number): CalendarDay[] {
  const firstDay = new Date(year, month, 1);
  // Convert JS Sunday-start (0=Sun) to Monday-start (0=Mon)
  const startOffset = (firstDay.getDay() + 6) % 7;

  const cells: CalendarDay[] = [];

  // Fill cells from previous month (ascending order)
  // new Date(year, month, 0) = last day of prev month
  // new Date(year, month, -(startOffset-1)) = first cell shown from prev month
  for (let i = startOffset; i > 0; i--) {
    const d = new Date(year, month, 1 - i);
    cells.push({
      date: d.getDate(),
      month: d.getMonth(),
      year: d.getFullYear(),
      isCurrentMonth: false,
      dateString: toDateString(d.getFullYear(), d.getMonth(), d.getDate()),
    });
  }

  // Fill current month days
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      date: d,
      month,
      year,
      isCurrentMonth: true,
      dateString: toDateString(year, month, d),
    });
  }

  // Fill next month days to reach exactly 42 cells
  let nextDay = 1;
  while (cells.length < 42) {
    const d = new Date(year, month + 1, nextDay);
    cells.push({
      date: d.getDate(),
      month: d.getMonth(),
      year: d.getFullYear(),
      isCurrentMonth: false,
      dateString: toDateString(d.getFullYear(), d.getMonth(), d.getDate()),
    });
    nextDay++;
  }

  return cells;
}

/** Returns today as "YYYY-MM-DD" */
export function todayString(): string {
  const now = new Date();
  return toDateString(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Returns "YYYY-MM" for the given year/month (month is 0-indexed) */
export function monthKey(year: number, month: number): string {
  return `${year}-${pad(month + 1)}`;
}

/** Returns the Japanese weekday name for a "YYYY-MM-DD" string */
export function formatWeekday(dateString: string): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  // Convert JS Sunday-start to Monday-start index
  const idx = (d.getDay() + 6) % 7;
  return WEEKDAY_LABELS[idx];
}
