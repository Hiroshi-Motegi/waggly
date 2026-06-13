"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { nativeHref } from "@/lib/native-routes";
import Image from "next/image";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { useFavoriteCourses, addFavoriteCourse, removeFavoriteCourse } from "@/hooks/use-profile";

const STORAGE_KEY = "courses-search-state";

const AREA_CODES = [
  { code: "", label: "全国" },
  { code: "8", label: "北海道" },
  { code: "2", label: "東北" },
  { code: "3", label: "北関東" },
  { code: "4", label: "南関東" },
  { code: "5", label: "甲信越" },
  { code: "6", label: "北陸" },
  { code: "7", label: "東海" },
  { code: "9", label: "近畿" },
  { code: "10", label: "中国" },
  { code: "11", label: "四国" },
  { code: "12", label: "九州" },
  { code: "13", label: "沖縄" },
];

interface GolfCourse {
  golfCourseId: number;
  golfCourseName: string;
  golfCourseAbbr: string;
  address: string;
  golfCourseImageUrl: string;
  evaluation: number;
  reviewCount: number;
  weekdayMinPrice: number;
  holidayMinPrice: number;
  prefecture: string;
  areaName: string;
}

interface SearchResult {
  Items: GolfCourse[];
  pageCount: number;
  hits: number;
  page: number;
  count: number;
}

function StarDisplay({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <span className="text-amber-500 text-base">
      {"★".repeat(full)}
      {half ? "½" : ""}
      {"☆".repeat(empty)}
    </span>
  );
}

export default function CoursesPage() {
  const [keyword, setKeyword] = useState("");
  const [areaCode, setAreaCode] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { courses: favCourses, refetch: refetchFav } = useFavoriteCourses();

  async function toggleFav(e: React.MouseEvent, course: GolfCourse) {
    e.preventDefault();
    e.stopPropagation();
    const existing = favCourses.find((c) => c.gora_course_id === course.golfCourseId);
    if (existing) {
      await removeFavoriteCourse(existing.id);
    } else {
      await addFavoriteCourse({
        gora_course_id: course.golfCourseId,
        course_name: course.golfCourseName,
        course_image_url: course.golfCourseImageUrl,
        evaluation: course.evaluation,
        address: course.address,
        is_manual: false,
      });
    }
    refetchFav();
  }
  const [currentPage, setCurrentPage] = useState(1);

  // Restore from sessionStorage on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        setKeyword(state.keyword ?? "");
        setAreaCode(state.areaCode ?? "");
        setCurrentPage(state.page ?? 1);
        setResults(state.results ?? null);
      }
    } catch {}
  }, []);

  function saveState(kw: string, area: string, page: number, data: SearchResult | null) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ keyword: kw, areaCode: area, page, results: data }));
    } catch {}
  }

  async function search(kw: string, area: string, page: number) {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (kw) params.set("keyword", kw);
      if (area) params.set("areaCode", area);
      const res = await apiFetch(`/api/courses?${params}`);
      if (!res.ok) throw new Error("検索に失敗しました");
      const data = await res.json();
      setResults(data);
      setCurrentPage(page);
      saveState(kw, area, page, data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
      setResults(null);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    search(keyword, areaCode, 1);
  }

  function handlePageChange(page: number) {
    search(keyword, areaCode, page);
  }

  return (
    <div className="relative flex flex-col px-2 py-2 space-y-2" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
      <div className="relative z-10 flex flex-col space-y-2">
      <PageHeader title="ゴルフ場を探す" backHref="/" variant="dark">
        <Link href="/courses/favorites" className="flex items-center gap-1 rounded-full border border-white px-3 h-[40px] text-sm font-bold text-white">
          <Heart className="h-4 w-4" />
          お気に入り一覧
        </Link>
      </PageHeader>

      <div className="rounded-lg bg-white p-3">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            placeholder="コース名・キーワード"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full rounded-lg border border-[#c4c4c4] bg-white px-3 py-2.5 text-base focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]"
          />
          <select
            value={areaCode}
            onChange={(e) => setAreaCode(e.target.value)}
            className="w-full rounded-lg border border-[#c4c4c4] bg-white px-3 py-2.5 text-base focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]"
          >
            {AREA_CODES.map((area) => (
              <option key={area.code} value={area.code}>{area.label}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-full bg-[#006728] py-2.5 text-base font-bold text-white disabled:opacity-50"
          >
            {isLoading ? "検索中..." : "検索する"}
          </button>
        </form>
      </div>

      {error && (
        <div className="rounded-lg bg-white p-4 text-center">
          <p className="text-base text-[#8b8b8b]">{error}</p>
        </div>
      )}

      {results && (
        <>
          <p className="px-1 text-sm text-white">
            {results.count.toLocaleString()}件のコース
          </p>

          {results.Items.length === 0 ? (
            <div className="rounded-lg bg-white p-6">
              <p className="text-center text-base text-[#8b8b8b]">
                コースが見つかりませんでした
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {results.Items.map((course) => (
                <Link key={course.golfCourseId} href={nativeHref(`/courses/${course.golfCourseId}`)}>
                  <div className="rounded-lg bg-white p-3 relative">
                    {user && (
                      <button
                        onClick={(e) => toggleFav(e, course)}
                        className="absolute top-2 right-2 z-10"
                      >
                        <Heart className={`h-5 w-5 ${favCourses.some((c) => c.gora_course_id === course.golfCourseId) ? "fill-red-500 text-red-500" : "text-[#c4c4c4]"}`} />
                      </button>
                    )}
                    <div className="flex gap-3">
                      {course.golfCourseImageUrl ? (
                        <img
                          src={course.golfCourseImageUrl}
                          alt={course.golfCourseName}
                          className="w-28 flex-shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-20 w-28 flex-shrink-0 rounded-lg bg-[#f5f5f5] flex items-center justify-center">
                          <span className="text-sm text-[#8b8b8b]">No Image</span>
                        </div>
                      )}
                      <div className="flex flex-col gap-1 min-w-0">
                        <p className="font-bold text-base leading-tight line-clamp-2">
                          {course.golfCourseName}
                        </p>
                        <p className="text-sm text-[#8b8b8b] line-clamp-1">
                          {course.address}
                        </p>
                        <div className="flex items-center gap-1">
                          <StarDisplay rating={course.evaluation} />
                          <span className="text-sm text-[#8b8b8b]">
                            {course.evaluation?.toFixed(1) ?? "—"}{course.reviewCount ? ` (${course.reviewCount.toLocaleString()}件)` : ""}
                          </span>
                        </div>
                        <div className="text-sm text-[#8b8b8b] space-y-0.5">
                          {course.weekdayMinPrice != null && course.weekdayMinPrice > 0 && (
                            <p>平日 ¥{course.weekdayMinPrice.toLocaleString()}〜</p>
                          )}
                          {course.holidayMinPrice != null && course.holidayMinPrice > 0 && (
                            <p>休日 ¥{course.holidayMinPrice.toLocaleString()}〜</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {results.pageCount > 1 && (
            <div className="flex justify-center items-center gap-3 pt-1">
              <button
                disabled={currentPage <= 1 || isLoading}
                onClick={() => handlePageChange(currentPage - 1)}
                className="rounded-full border border-white px-4 py-1.5 text-sm font-bold text-white disabled:opacity-50"
              >
                前へ
              </button>
              <span className="text-sm text-[#8b8b8b]">
                {currentPage} / {results.pageCount}
              </span>
              <button
                disabled={currentPage >= results.pageCount || isLoading}
                onClick={() => handlePageChange(currentPage + 1)}
                className="rounded-full border border-white px-4 py-1.5 text-sm font-bold text-white disabled:opacity-50"
              >
                次へ
              </button>
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
}
