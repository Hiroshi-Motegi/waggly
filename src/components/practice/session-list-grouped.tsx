"use client";

import Link from "next/link";
import { nativeHref } from "@/lib/native-routes";
import { formatWeekday } from "@/lib/calendar-utils";
import type { PracticeSessionWithClubs } from "@/types/database";

interface SessionListGroupedProps {
  sessions: PracticeSessionWithClubs[];
  selectedDate: string; // "YYYY-MM-DD"
}

export function SessionListGrouped({ sessions, selectedDate }: SessionListGroupedProps) {
  const filtered = sessions
    .filter((s) => s.practiced_at >= selectedDate)
    .sort((a, b) => a.practiced_at.localeCompare(b.practiced_at));

  if (filtered.length === 0) {
    return (
      <div className="rounded-lg bg-white p-6 text-center">
        <p className="text-base text-[#8b8b8b]">練習記録がありません</p>
      </div>
    );
  }

  // Group by date preserving descending order
  const groups: { date: string; sessions: PracticeSessionWithClubs[] }[] = [];
  for (const session of filtered) {
    const last = groups[groups.length - 1];
    if (last && last.date === session.practiced_at) {
      last.sessions.push(session);
    } else {
      groups.push({ date: session.practiced_at, sessions: [session] });
    }
  }

  return (
    <div className="rounded-lg bg-white overflow-hidden">
      {groups.map((group, groupIdx) => {
        const dayNumber = group.date.split("-")[2].replace(/^0/, "");
        const weekday = formatWeekday(group.date);
        return (
          <div key={group.date} className={groupIdx > 0 ? "border-t border-[#efefef]" : ""}>
            {group.sessions.map((session, idx) => (
              <Link
                key={session.id}
                href={nativeHref(`/practice/${session.id}`)}
                className="flex items-start gap-3 px-3 py-3"
              >
                {/* Date badge column */}
                <div className="w-[38px] shrink-0 flex flex-col items-center">
                  {idx === 0 ? (
                    <>
                      <span className="text-lg font-bold text-black leading-tight">{dayNumber}</span>
                      <span className="text-xs text-[#8b8b8b]">{weekday}</span>
                    </>
                  ) : null}
                </div>

                {/* Session card */}
                <div className={`flex-1 min-w-0${idx > 0 ? " border-t border-[#efefef] pt-3" : ""}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-base truncate">
                      {session.location ?? "場所未入力"}
                    </p>
                    {session.total_balls != null && session.total_balls > 0 && (
                      <span className="shrink-0 rounded-full bg-[#f0f0f0] px-2 py-0.5 text-xs font-medium text-[#555]">
                        {session.total_balls}球
                      </span>
                    )}
                  </div>
                  {session.rating != null && (
                    <div className="mt-1">
                      <span className="text-amber-400 text-sm">{"★".repeat(session.rating)}</span>
                      <span className="text-gray-300 text-sm">{"★".repeat(5 - session.rating)}</span>
                    </div>
                  )}
                  {session.memo != null && (
                    <p className="mt-1 line-clamp-2 text-sm text-[#8b8b8b]">{session.memo}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        );
      })}
    </div>
  );
}
