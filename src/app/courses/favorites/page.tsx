"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, X, ArrowUp, ArrowDown, GripVertical } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { useAuth } from "@/hooks/use-auth";
import { useFavoriteCourses, removeFavoriteCourse } from "@/hooks/use-profile";
import { apiFetch } from "@/lib/api-client";
import { Loading } from "@/components/loading";

export default function FavoriteCoursesPage() {
  const { user } = useAuth();
  const { courses, isLoading, refetch } = useFavoriteCourses();
  const [isReordering, setIsReordering] = useState(false);
  const [localCourses, setLocalCourses] = useState<typeof courses>([]);

  if (!user) return null;

  function startReorder() {
    setLocalCourses([...courses]);
    setIsReordering(true);
  }

  function moveCourse(index: number, direction: "up" | "down") {
    const next = [...localCourses];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setLocalCourses(next);
  }

  async function saveOrder() {
    await apiFetch("/api/profile/courses", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: localCourses.map((c, i) => ({ id: c.id, sort_order: i })) }),
    });
    setIsReordering(false);
    refetch();
  }

  function cancelReorder() {
    setIsReordering(false);
    setLocalCourses([]);
  }

  async function handleRemove(id: string) {
    await removeFavoriteCourse(id);
    refetch();
  }

  return (
    <div className="relative flex flex-col px-2 py-2 space-y-2 bg-[#139847]" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
      <div className="relative z-10 flex flex-col space-y-2">
        <PageHeader title="お気に入りコース" variant="dark">
          {!isReordering && (
            <Link href="/courses" className="flex items-center gap-1 rounded-full bg-white px-4 py-1.5 text-sm font-bold text-[#006728]">
              <Plus className="h-4 w-4" />
              追加
            </Link>
          )}
          {!isReordering && courses.length > 1 && (
            <button onClick={startReorder} className="flex items-center gap-1 rounded-full border border-white px-3 py-1.5 text-sm font-bold text-white">
              <GripVertical className="h-4 w-4" />
              並替
            </button>
          )}
        </PageHeader>
        <div className="flex flex-col gap-1 rounded-lg bg-white p-3">
          {isLoading ? (
            <Loading />
          ) : courses.length === 0 ? (
            <p className="py-4 text-center text-sm text-[#8b8b8b]">まだ登録されていません</p>
          ) : isReordering ? (
            <>
              {localCourses.map((c, i) => (
                <div key={c.id} className={`flex items-center gap-2 py-2 ${i < localCourses.length - 1 ? "border-b border-[#ececec]" : ""}`}>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button onClick={() => moveCourse(i, "up")} disabled={i === 0} className="p-0.5 text-[#8b8b8b] disabled:opacity-20">
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button onClick={() => moveCourse(i, "down")} disabled={i === localCourses.length - 1} className="p-0.5 text-[#8b8b8b] disabled:opacity-20">
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>
                  {c.course_image_url && (
                    <img src={c.course_image_url} alt="" className="h-10 w-14 rounded object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{c.course_name}</p>
                  </div>
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <button onClick={cancelReorder} className="flex-1 rounded-full border border-[#006728] py-2 text-base font-bold text-[#006728]">
                  キャンセル
                </button>
                <button onClick={saveOrder} className="flex-1 rounded-full bg-[#006728] py-2 text-base font-bold text-white">
                  保存
                </button>
              </div>
            </>
          ) : (
            courses.map((c) => {
              const goraUrl = c.gora_course_id
                ? `https://hb.afl.rakuten.co.jp/hgc/${process.env.NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID ?? ""}/gora/detail/id=${c.gora_course_id}/`
                : null;
              return (
                <div key={c.id} className="flex items-center gap-2 py-2 border-b border-[#ececec] last:border-0">
                  {c.course_image_url && (
                    <img src={c.course_image_url} alt="" className="h-10 w-14 rounded object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    {goraUrl ? (
                      <a href={goraUrl} target="_blank" rel="noopener" className="text-sm font-bold truncate block text-[#006728]">{c.course_name}</a>
                    ) : (
                      <p className="text-sm font-bold truncate">{c.course_name}</p>
                    )}
                    {c.address && <p className="text-xs text-[#8b8b8b] truncate">{c.address}</p>}
                  </div>
                  <button onClick={() => handleRemove(c.id)} className="shrink-0 p-1 text-[#8b8b8b]">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
