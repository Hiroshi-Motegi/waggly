"use client";

import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { usePracticeSessions } from "@/hooks/use-practice";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function PracticePage() {
  const { sessions, isLoading } = usePracticeSessions();

  return (
    <div className="flex flex-col gap-4 px-2 py-4">
      <div className="sticky top-0 z-10 bg-[#ebf1eb] flex items-center justify-between px-1 pb-1">
        <h2 className="text-lg font-bold text-[#006728]">練習記録</h2>
        <Link href="/practice/new">
          <button className="flex items-center gap-1 rounded-full bg-[#006728] px-4 py-1.5 text-xs font-bold text-white">
            <Plus className="h-4 w-4" />
            記録する
          </button>
        </Link>
      </div>

      {isLoading ? (
        <p className="text-center text-muted-foreground">読み込み中...</p>
      ) : sessions.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          まだ練習記録がありません
        </p>
      ) : (
        <div className="flex flex-col rounded-lg bg-white p-3">
          {sessions.map((s, i) => (
            <Link key={s.id} href={`/practice/${s.id}`}>
              <div
                className={`flex items-center gap-2.5 py-2 ${
                  i < sessions.length - 1 ? "border-b border-[#dfdfdf]" : ""
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
    </div>
  );
}
