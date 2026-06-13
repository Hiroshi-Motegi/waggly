"use client";
import { Loading } from "@/components/loading";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { Plus, Calendar, List } from "lucide-react";
import { nativeHref } from "@/lib/native-routes";
import { PageHeader } from "@/components/layout/page-header";
import { MonthCalendar } from "@/components/practice/month-calendar";
import { SessionListGrouped } from "@/components/practice/session-list-grouped";
import { usePracticeSessions, usePracticeSessionsByMonth } from "@/hooks/use-practice";
import { todayString, monthKey } from "@/lib/calendar-utils";

function ViewToggle({ mode, onChange }: { mode: "calendar" | "list"; onChange: (m: "calendar" | "list") => void }) {
  return (
    <div className="flex h-[34px] rounded-full border border-white/30 overflow-hidden">
      <button
        onClick={() => onChange("calendar")}
        className={`flex items-center justify-center w-[34px] ${mode === "calendar" ? "bg-white" : ""}`}
      >
        <Calendar className={`h-4 w-4 ${mode === "calendar" ? "text-[#006728]" : "text-white/60"}`} />
      </button>
      <button
        onClick={() => onChange("list")}
        className={`flex items-center justify-center w-[34px] ${mode === "list" ? "bg-white" : ""}`}
      >
        <List className={`h-4 w-4 ${mode === "list" ? "text-[#006728]" : "text-white/60"}`} />
      </button>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function PracticePage() {
  const now = new Date();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [viewMode, setViewModeState] = useState<"calendar" | "list">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("practice-view-mode");
      if (saved === "list") return "list";
    }
    return "calendar";
  });
  function setViewMode(mode: "calendar" | "list") {
    setViewModeState(mode);
    localStorage.setItem("practice-view-mode", mode);
  }
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(todayString());
  const [toast, setToast] = useState<string | null>(null);

  // Show toast on delete
  useEffect(() => {
    if (searchParams.get("deleted") === "1") {
      setToast("記録を削除しました");
      window.history.replaceState(null, "", "/practice");
      const timer = setTimeout(() => setToast(null), 2500);
      return () => clearTimeout(timer);
    }
  }, []);

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
    <div className="relative flex flex-col px-2 py-2 space-y-2" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
      <div className="relative z-10 flex flex-col space-y-2">
        {viewMode === "calendar" ? (
          <>
            {/* Sticky header + calendar together */}
            <div data-sticky-calendar className="sticky top-0 z-20 -mx-2 -mt-2 px-2"
              style={{ backgroundImage: "url(/images/home-bg.jpg)", backgroundSize: "cover", backgroundPosition: "center" }}
            >
              <div className="absolute inset-0/60 pointer-events-none" />
              <div className="relative">
                <PageHeader title="練習記録" backHref="/" variant="dark">
                  <div className="flex items-center gap-2">
                    <ViewToggle mode={viewMode} onChange={setViewMode} />
                    <Link href="/practice/new">
                      <button className="flex items-center gap-1 rounded-full bg-white px-4 py-1.5 text-sm font-bold text-[#006728]">
                        <Plus className="h-4 w-4" />
                        記録する
                      </button>
                    </Link>
                  </div>
                </PageHeader>
                <div className="pt-2">
                  <MonthCalendar
                    year={calYear}
                    month={calMonth}
                    selectedDate={selectedDate}
                    practicedDates={practicedDates}
                    onSelectDate={setSelectedDate}
                    onChangeMonth={handleChangeMonth}
                  />
                </div>
              </div>
            </div>

            <div className="-mt-2">
            {monthLoading ? (
              <div className="rounded-b-lg bg-white p-4">
                <Loading />
              </div>
            ) : monthSessions.length === 0 ? (
              <div className="rounded-b-lg bg-white p-6 text-center">
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
            </div>
          </>
        ) : (
          <>
            <PageHeader title="練習記録" backHref="/" variant="dark">
              <div className="flex items-center gap-2">
                <ViewToggle mode={viewMode} onChange={setViewMode} />
                <Link href="/practice/new">
                  <button className="flex items-center gap-1 rounded-full bg-white px-4 py-1.5 text-sm font-bold text-[#006728]">
                    <Plus className="h-4 w-4" />
                    記録する
                  </button>
                </Link>
              </div>
            </PageHeader>

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

      {/* Toast via portal to escape transform context */}
      {toast && createPortal(
        <div className="fixed bottom-[calc(var(--bottom-nav-height)+16px)] left-1/2 -translate-x-1/2 z-50">
          <div className="rounded-full bg-[#333] px-5 py-2.5 text-sm font-medium text-white shadow-lg">
            {toast}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
