"use client";

import Image from "next/image";
import Link from "next/link";
import type { PracticeSessionWithClubs } from "@/types/database";

interface RecentPracticeProps {
  sessions: PracticeSessionWithClubs[];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export function RecentPractice({ sessions }: RecentPracticeProps) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-white p-3">
      <h3 className="text-base font-bold text-[#006728]">最近の練習記録</h3>
      <div className="flex flex-col gap-1.5">
        {sessions.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">まだ記録がありません</p>
        ) : (
          <div className="flex flex-col">
            {sessions.slice(0, 3).map((s, i) => (
              <Link key={s.id} href={`/practice/${s.id}`}>
                <div
                  className={`flex items-center gap-2.5 py-2 ${
                    i < Math.min(sessions.length, 3) - 1 ? "border-b border-[#dfdfdf]" : ""
                  }`}
                >
                  <div className="flex flex-1 flex-col gap-px">
                    <span className="text-xs font-medium text-[#8b8b8b]">
                      {formatDate(s.practiced_at)}
                    </span>
                    <span className="text-sm font-bold text-black">
                      {s.location || "場所未入力"}
                    </span>
                  </div>
                  {s.total_balls && (
                    <span className="rounded-full bg-[#c7e2ca] px-1.5 py-0.5 text-[10px] font-medium text-black">
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
        <div className="flex flex-col items-center pt-1">
          <Link
            href="/practice"
            className="rounded-full border border-[#006728] px-5 py-1 text-sm font-bold text-[#006728]"
          >
            すべて見る
          </Link>
        </div>
      </div>
    </div>
  );
}
