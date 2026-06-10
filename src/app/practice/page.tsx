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
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(todayString());

  const currentMonthKey = monthKey(calYear, calMonth);
  const { sessions: monthSessions, isLoading: monthLoading } =
    usePracticeSessionsByMonth(viewMode === "calendar" ? currentMonthKey : null);

  const { sessions: allSessions, isLoading: listLoading } =
    usePracticeSessions();

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
