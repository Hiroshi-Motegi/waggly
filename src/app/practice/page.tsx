"use client";
import { Loading } from "@/components/loading";

import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { nativeHref } from "@/lib/native-routes";
import { PageHeader } from "@/components/layout/page-header";
import { usePracticeSessions } from "@/hooks/use-practice";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function PracticePage() {
  const { sessions, isLoading } = usePracticeSessions();

  return (
    <div className="relative flex flex-col px-2 py-2 space-y-2 bg-[#139847]" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
      <img src="/images/home-bg.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none" />
      <div className="relative z-10 flex flex-col space-y-2">
      <PageHeader title="練習記録" showBack={false} variant="dark">
        <Link href="/practice/new">
          <button className="flex items-center gap-1 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-[#006728]">
            <Plus className="h-4 w-4" />
            記録する
          </button>
        </Link>
      </PageHeader>

      <div className="flex flex-col rounded-lg bg-white p-3">
        {isLoading ? (
          <Loading />
        ) : sessions.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            まだ練習記録がありません
          </p>
        ) : (
          <div className="flex flex-col">
            {sessions.map((s, i) => (
              <Link key={s.id} href={nativeHref(`/practice/${s.id}`)}>
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
      </div>
    </div>
  );
}
