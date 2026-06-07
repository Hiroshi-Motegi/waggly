"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

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
    <span className="text-amber-500 text-sm">
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
  const [currentPage, setCurrentPage] = useState(1);

  async function search(page = 1) {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (keyword) params.set("keyword", keyword);
      if (areaCode) params.set("areaCode", areaCode);
      const res = await fetch(`/api/courses?${params}`);
      if (!res.ok) throw new Error("検索に失敗しました");
      const data = await res.json();
      setResults(data);
      setCurrentPage(page);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
      setResults(null);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    search(1);
  }

  return (
    <div className="space-y-4 px-4 py-6">
      <h2 className="text-xl font-bold">ゴルフ場を探す</h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          className="h-11"
          placeholder="コース名・キーワード"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <select
          value={areaCode}
          onChange={(e) => setAreaCode(e.target.value)}
          className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {AREA_CODES.map((area) => (
            <option key={area.code} value={area.code}>{area.label}</option>
          ))}
        </select>
        <Button type="submit" className="w-full h-11" disabled={isLoading}>
          {isLoading ? "検索中..." : "検索する"}
        </Button>
      </form>

      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}

      {results && (
        <>
          <p className="text-sm text-muted-foreground">
            {results.count.toLocaleString()}件のコース
          </p>

          {results.Items.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              コースが見つかりませんでした
            </p>
          ) : (
            <div className="space-y-3">
              {results.Items.map((course) => (
                <Link key={course.golfCourseId} href={`/courses/${course.golfCourseId}`}>
                  <Card className="hover:bg-muted/50 transition-colors">
                    <CardContent className="p-3">
                      <div className="flex gap-3">
                        {course.golfCourseImageUrl ? (
                          <div className="relative h-20 w-28 flex-shrink-0 rounded overflow-hidden bg-muted">
                            <Image
                              src={course.golfCourseImageUrl}
                              alt={course.golfCourseName}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <div className="h-20 w-28 flex-shrink-0 rounded bg-muted flex items-center justify-center">
                            <span className="text-xs text-muted-foreground">No Image</span>
                          </div>
                        )}
                        <div className="flex flex-col gap-1 min-w-0">
                          <p className="font-semibold text-sm leading-tight line-clamp-2">
                            {course.golfCourseName}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {course.address}
                          </p>
                          <div className="flex items-center gap-1">
                            <StarDisplay rating={course.evaluation} />
                            <span className="text-xs text-muted-foreground">
                              {course.evaluation.toFixed(1)} ({course.reviewCount.toLocaleString()}件)
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            {course.weekdayMinPrice > 0 && (
                              <p>平日 ¥{course.weekdayMinPrice.toLocaleString()}〜</p>
                            )}
                            {course.holidayMinPrice > 0 && (
                              <p>休日 ¥{course.holidayMinPrice.toLocaleString()}〜</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {results.pageCount > 1 && (
            <div className="flex justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1 || isLoading}
                onClick={() => search(currentPage - 1)}
              >
                前へ
              </Button>
              <span className="flex items-center text-sm text-muted-foreground px-2">
                {currentPage} / {results.pageCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= results.pageCount || isLoading}
                onClick={() => search(currentPage + 1)}
              >
                次へ
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
