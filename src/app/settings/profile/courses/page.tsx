"use client";

import { useState } from "react";
import { Search, Plus, X, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { useAuth } from "@/hooks/use-auth";
import { useFavoriteCourses, addFavoriteCourse, removeFavoriteCourse } from "@/hooks/use-profile";
import { apiFetch } from "@/lib/api-client";
import { Loading } from "@/components/loading";

const inputClass = "w-full rounded-lg border border-[#c4c4c4] bg-white px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]";

interface GoraCourse {
  golfCourseId: number;
  golfCourseName: string;
  address: string;
  golfCourseImageUrl: string;
  evaluation: number;
}

export default function FavoriteCoursesPage() {
  const { user } = useAuth();
  const { courses, isLoading, refetch } = useFavoriteCourses();
  const [keyword, setKeyword] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<GoraCourse[]>([]);
  const [showManual, setShowManual] = useState(false);
  const [manualName, setManualName] = useState("");

  if (!user) return null;

  async function handleSearch() {
    if (!keyword.trim()) return;
    setSearching(true);
    try {
      const res = await apiFetch(`/api/courses?keyword=${encodeURIComponent(keyword)}`);
      const data = await res.json();
      setResults(data.Items ?? []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function handleAddGora(course: GoraCourse) {
    await addFavoriteCourse({
      gora_course_id: course.golfCourseId,
      course_name: course.golfCourseName,
      course_image_url: course.golfCourseImageUrl,
      evaluation: course.evaluation,
      address: course.address,
      is_manual: false,
    });
    setResults([]);
    setKeyword("");
    refetch();
  }

  async function handleAddManual() {
    if (!manualName.trim()) return;
    await addFavoriteCourse({
      course_name: manualName,
      is_manual: true,
    });
    setManualName("");
    setShowManual(false);
    refetch();
  }

  async function handleRemove(id: string) {
    await removeFavoriteCourse(id);
    refetch();
  }

  return (
    <div className="relative flex flex-col px-2 py-2 space-y-2 bg-[#139847]" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
      <img src="/images/home-bg.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none" />
      <div className="relative z-10 flex flex-col space-y-2">
        <PageHeader title="お気に入りコース" variant="dark" />

        {/* Registered courses */}
        <h3 className="px-1 pt-2 text-base font-bold text-white">登録済み</h3>
        <div className="flex flex-col gap-1 rounded-lg bg-white p-3">
          {isLoading ? (
            <Loading />
          ) : courses.length === 0 ? (
            <p className="py-4 text-center text-sm text-[#8b8b8b]">まだ登録されていません</p>
          ) : (
            courses.map((c) => (
              <div key={c.id} className="flex items-center gap-2 py-2 border-b border-[#ececec] last:border-0">
                {c.course_image_url && (
                  <img src={c.course_image_url} alt="" className="h-10 w-14 rounded object-cover shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{c.course_name}</p>
                  {c.address && <p className="text-xs text-[#8b8b8b] truncate">{c.address}</p>}
                </div>
                <button onClick={() => handleRemove(c.id)} className="shrink-0 p-1 text-[#8b8b8b]">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Search */}
        <h3 className="px-1 pt-2 text-base font-bold text-white">コースを追加</h3>
        <div className="flex flex-col gap-2 rounded-lg bg-white p-3">
          <div className="flex gap-2">
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="コース名で検索..."
              className={inputClass}
            />
            <button onClick={handleSearch} disabled={searching} className="shrink-0 rounded-lg bg-[#006728] px-3 py-2 text-white">
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </button>
          </div>

          {results.length > 0 && (
            <div className="flex flex-col">
              {results.map((r) => (
                <button
                  key={r.golfCourseId}
                  onClick={() => handleAddGora(r)}
                  className="flex items-center gap-2 py-2 border-b border-[#ececec] text-left"
                >
                  {r.golfCourseImageUrl && (
                    <img src={r.golfCourseImageUrl} alt="" className="h-10 w-14 rounded object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{r.golfCourseName}</p>
                    <p className="text-xs text-[#8b8b8b] truncate">{r.address}</p>
                  </div>
                  <Plus className="h-4 w-4 shrink-0 text-[#006728]" />
                </button>
              ))}
            </div>
          )}

          {/* Manual add */}
          {showManual ? (
            <div className="flex gap-2 pt-2 border-t border-[#ececec]">
              <input value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="コース名を入力" className={inputClass} />
              <button onClick={handleAddManual} className="shrink-0 rounded-lg bg-[#006728] px-3 py-2 text-sm font-bold text-white">追加</button>
            </div>
          ) : (
            <button onClick={() => setShowManual(true)} className="pt-2 text-sm text-[#006728] font-bold text-left border-t border-[#ececec]">
              手動で入力する
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
