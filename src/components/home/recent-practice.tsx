"use client";

import Image from "next/image";
import Link from "next/link";
import type { PracticeSessionWithClubs } from "@/types/database";
import { nativeHref } from "@/lib/native-routes";
import { formatDate } from "@/lib/utils";

interface RecentPracticeProps {
  sessions: PracticeSessionWithClubs[];
}

export function RecentPractice({ sessions }: RecentPracticeProps) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-white p-3">
      <div className="flex flex-col gap-1.5">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center px-4 py-2 gap-3">
            <p className="text-sm text-[#8b8b8b]">まだ記録がありません。</p>
            <Link href={nativeHref("/practice/new")} className="w-full text-center text-sm font-bold text-[#006728] border border-[#006728] rounded-full py-2">練習を記録する</Link>
          </div>
        ) : (
          <div className="flex flex-col">
            {sessions.slice(0, 3).map((s, i) => (
              <Link key={s.id} href={nativeHref(`/practice/${s.id}`)}>
                <div
                  className={`flex items-center gap-2.5 py-2 ${
                    i < Math.min(sessions.length, 3) - 1 ? "border-b border-[#dfdfdf]" : ""
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
                    className="opacity-60 w-auto h-auto"
                    style={{ width: "auto", height: "auto" }}
                  />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
